import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { HttpError, requireAdmin, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery'];
const PAY_METHODS = ['cash', 'upi', 'card'];
const STATUSES = ['placed', 'preparing', 'ready', 'completed', 'cancelled'];

const round2 = (n) => Math.round(n * 100) / 100;

function validate(body) {
  const { customer, order_type, payment_method, items } = body ?? {};
  if (!customer?.name?.trim() || !/^\d{10}$/.test(customer?.phone ?? '')) {
    throw new HttpError(400, 'Customer name and a 10-digit phone are required');
  }
  if (!ORDER_TYPES.includes(order_type)) throw new HttpError(400, 'Invalid order_type');
  if (order_type === 'delivery' && !body.delivery_address?.trim()) {
    throw new HttpError(400, 'delivery_address is required for delivery');
  }
  if (!PAY_METHODS.includes(payment_method)) throw new HttpError(400, 'Invalid payment_method');
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw new HttpError(400, 'items must be an array of 1-20 entries');
  }
  for (const it of items) {
    if (!Number.isInteger(it.item_id) || !Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 20) {
      throw new HttpError(400, 'Each item needs an integer item_id and quantity (1-20)');
    }
    if (it.topping_ids !== undefined && !Array.isArray(it.topping_ids)) {
      throw new HttpError(400, 'topping_ids must be an array');
    }
  }
}

// POST /api/orders  (public) — places an order inside one transaction
// Body: { customer:{name,phone,email?}, order_type, delivery_address?, notes?,
//         payment_method, items:[{ item_id, quantity, topping_ids?:[] }] }
export async function POST(request) {
  let conn;
  try {
    const body = await request.json().catch(() => null);
    validate(body);
    const { customer, order_type, payment_method, items, notes, delivery_address } = body;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Upsert customer by phone; LAST_INSERT_ID trick returns the existing id on update
    const [custRes] = await conn.query(
      `INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         email = COALESCE(VALUES(email), email),
         customer_id = LAST_INSERT_ID(customer_id)`,
      [customer.name.trim(), customer.phone, customer.email ?? null]
    );
    const customerId = custRes.insertId;

    // Prices always come from the DB, never from the client
    const itemIds = [...new Set(items.map((i) => i.item_id))];
    const [menuRows] = await conn.query(
      'SELECT item_id, base_price FROM menu_items WHERE item_id IN (?) AND is_available = 1',
      [itemIds]
    );
    const basePrice = new Map(menuRows.map((r) => [r.item_id, r.base_price]));

    const [topRows] = await conn.query(
      `SELECT mt.item_id, t.topping_id, t.extra_price
         FROM menu_item_toppings mt
         JOIN toppings t ON t.topping_id = mt.topping_id
        WHERE mt.item_id IN (?) AND t.is_available = 1`,
      [itemIds]
    );
    const toppingPrice = new Map(topRows.map((r) => [`${r.item_id}:${r.topping_id}`, r.extra_price]));

    const [orderRes] = await conn.query(
      `INSERT INTO orders (customer_id, order_type, delivery_address, notes)
       VALUES (?, ?, ?, ?)`,
      [customerId, order_type, delivery_address?.trim() ?? null, notes?.slice(0, 255) ?? null]
    );
    const orderId = orderRes.insertId;

    for (const it of items) {
      if (!basePrice.has(it.item_id)) {
        throw new HttpError(400, `Item ${it.item_id} is unavailable`);
      }
      const toppingIds = [...new Set(it.topping_ids ?? [])];
      let extras = 0;
      for (const tid of toppingIds) {
        const p = toppingPrice.get(`${it.item_id}:${tid}`);
        if (p === undefined) {
          throw new HttpError(400, `Topping ${tid} is not available for item ${it.item_id}`);
        }
        extras += p;
      }

      const unit = basePrice.get(it.item_id);
      const lineTotal = round2((unit + extras) * it.quantity);

      const [oiRes] = await conn.query(
        `INSERT INTO order_items (order_id, item_id, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, it.item_id, it.quantity, unit, lineTotal]
      );

      for (const tid of toppingIds) {
        await conn.query(
          `INSERT INTO order_item_toppings (order_item_id, topping_id, extra_price)
           VALUES (?, ?, ?)`,
          [oiRes.insertId, tid, toppingPrice.get(`${it.item_id}:${tid}`)]
        );
      }
    }

    // Triggers have updated orders.total_amount by now; read it back for the payment row
    const [[order]] = await conn.query(
      'SELECT total_amount FROM orders WHERE order_id = ?',
      [orderId]
    );

    await conn.query(
      'INSERT INTO payments (order_id, method, amount) VALUES (?, ?, ?)',
      [orderId, payment_method, order.total_amount]
    );

    await conn.commit();
    return NextResponse.json(
      { order_id: orderId, total_amount: order.total_amount, status: 'placed' },
      { status: 201 }
    );
  } catch (err) {
    if (conn) await conn.rollback();
    return handleError(err);
  } finally {
    if (conn) conn.release();
  }
}

// GET /api/orders?status=placed  (admin) — latest 100 orders with their items
export async function GET(request) {
  try {
    requireAdmin(request);

    const status = new URL(request.url).searchParams.get('status');
    if (status && !STATUSES.includes(status)) throw new HttpError(400, 'Invalid status');

    const [rows] = await pool.query(
      `SELECT o.order_id, o.status, o.order_type, o.total_amount, o.notes,
              o.delivery_address, o.created_at,
              c.name AS customer, c.phone,
              p.method AS payment_method, p.status AS payment_status,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', m.name, 'quantity', oi.quantity))
                 FROM order_items oi
                 JOIN menu_items m ON m.item_id = oi.item_id
                WHERE oi.order_id = o.order_id) AS items
         FROM orders o
         JOIN customers c ON c.customer_id = o.customer_id
         LEFT JOIN payments p ON p.order_id = o.order_id
        WHERE (? IS NULL OR o.status = ?)
        ORDER BY o.created_at DESC
        LIMIT 100`,
      [status, status]
    );

    return NextResponse.json(rows);
  } catch (err) {
    return handleError(err);
  }
}
