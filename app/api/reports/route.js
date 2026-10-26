import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/reports  (admin) — powered by the MySQL views
export async function GET(request) {
  try {
    requireAdmin(request);

    const [[daily], [bestSellers], [hourly]] = await Promise.all([
      pool.query(
        `SELECT DATE_FORMAT(sale_date, '%Y-%m-%d') AS sale_date, orders, revenue, avg_order_value
           FROM v_daily_sales ORDER BY sale_date DESC LIMIT 14`
      ),
      pool.query('SELECT * FROM v_best_sellers ORDER BY sales_rank, name LIMIT 10'),
      pool.query('SELECT * FROM v_hourly_orders ORDER BY hour_of_day'),
    ]);

    return NextResponse.json({ daily, bestSellers, hourly });
  } catch (err) {
    return handleError(err);
  }
}
