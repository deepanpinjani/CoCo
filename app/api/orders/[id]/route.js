import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { HttpError, requireAdmin, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const STATUSES = ['placed', 'preparing', 'ready', 'completed', 'cancelled'];
const PAY_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

// GET /api/orders/:id  (public) — order tracking page
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId)) throw new HttpError(400, 'Invalid order id');

    const [[order]] = await pool.query(
      `SELECT order_id, status, order_type, total_amount, created_at
         FROM orders WHERE order_id = ?`,
      [orderId]
    );
    if (!order) throw new HttpError(404, 'Order not found');

    const [items] = await pool.query(
      `SELECT m.name, oi.quantity, oi.line_total
         FROM order_items oi JOIN menu_items m ON m.item_id = oi.item_id
        WHERE oi.order_id = ?`,
      [orderId]
    );

    const [history] = await pool.query(
      `SELECT new_status AS status, changed_at
         FROM order_status_history WHERE order_id = ? ORDER BY history_id`,
      [orderId]
    );

    return NextResponse.json({ ...order, items, history });
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/orders/:id  (admin) — body: { status?, payment_status? }
export async function PATCH(request, { params }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId)) throw new HttpError(400, 'Invalid order id');

    const { status, payment_status } = (await request.json().catch(() => null)) ?? {};
    if (!status && !payment_status) throw new HttpError(400, 'Nothing to update');
    if (status && !STATUSES.includes(status)) throw new HttpError(400, 'Invalid status');
    if (payment_status && !PAY_STATUSES.includes(payment_status)) {
      throw new HttpError(400, 'Invalid payment_status');
    }

    if (status) {
      const [res] = await pool.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);
      if (res.affectedRows === 0) throw new HttpError(404, 'Order not found');
    }
    if (payment_status) {
      await pool.query(
        `UPDATE payments
            SET status = ?, paid_at = IF(? = 'paid', NOW(), paid_at)
          WHERE order_id = ?`,
        [payment_status, payment_status, orderId]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
