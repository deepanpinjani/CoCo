import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/menu  ->  [{ category, items: [{ item_id, name, base_price, toppings: [...] }] }]
export async function GET() {
  try {
    const [items] = await pool.query(
      `SELECT c.category_id, c.name AS category, m.item_id, m.name,
              m.description, m.base_price, m.image_url
         FROM menu_items m
         JOIN categories c ON c.category_id = m.category_id
        WHERE m.is_available = 1
        ORDER BY c.sort_order, m.name`
    );

    const [toppings] = await pool.query(
      `SELECT mt.item_id, t.topping_id, t.name, t.extra_price
         FROM menu_item_toppings mt
         JOIN toppings t ON t.topping_id = mt.topping_id
        WHERE t.is_available = 1
        ORDER BY t.name`
    );

    const toppingsByItem = new Map();
    for (const t of toppings) {
      if (!toppingsByItem.has(t.item_id)) toppingsByItem.set(t.item_id, []);
      toppingsByItem.get(t.item_id).push({
        topping_id: t.topping_id,
        name: t.name,
        extra_price: t.extra_price,
      });
    }

    const categories = new Map();
    for (const it of items) {
      if (!categories.has(it.category_id)) {
        categories.set(it.category_id, { category: it.category, items: [] });
      }
      categories.get(it.category_id).items.push({
        item_id: it.item_id,
        name: it.name,
        description: it.description,
        base_price: it.base_price,
        image_url: it.image_url,
        toppings: toppingsByItem.get(it.item_id) ?? [],
      });
    }

    return NextResponse.json([...categories.values()]);
  } catch (err) {
    return handleError(err);
  }
}
