'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import '../coco.css';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const NEXT = { placed: 'preparing', preparing: 'ready', ready: 'completed' };
const FILTERS = ['', 'placed', 'preparing', 'ready', 'completed', 'cancelled'];

export default function AdminPage() {
  const [key, setKey] = useState('');
  const [draft, setDraft] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState(null);

  // restore the key for this browser tab
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('coco_admin_key');
      if (saved) setKey(saved);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!key) return;
    const headers = { 'x-admin-key': key };
    try {
      const [o, r] = await Promise.all([
        fetch(`/api/orders${filter ? `?status=${filter}` : ''}`, { headers, cache: 'no-store' }),
        fetch('/api/reports', { headers, cache: 'no-store' }),
      ]);
      if (o.status === 401) {
        setAuthed(false);
        setError('Wrong admin key.');
        try { sessionStorage.removeItem('coco_admin_key'); } catch {}
        return;
      }
      if (!o.ok || !r.ok) throw new Error('Server error');
      setOrders(await o.json());
      setReports(await r.json());
      setAuthed(true);
      setError('');
    } catch {
      setError('Could not load data. Check the database connection.');
    }
  }, [key, filter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const login = (e) => {
    e.preventDefault();
    try { sessionStorage.setItem('coco_admin_key', draft); } catch {}
    setKey(draft);
  };

  const update = async (id, body) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify(body),
    });
    load();
  };

  const maxHour = Math.max(1, ...(reports?.hourly ?? []).map((h) => h.orders));

  return (
    <div className="coco-page">
      <div className="coco-wrap">
        <nav className="coco-nav">
          <Link href="/" className="coco-logo">
            CoCo<small>admin</small>
          </Link>
          {authed && (
            <button
              className="coco-btn ghost small"
              onClick={() => {
                try { sessionStorage.removeItem('coco_admin_key'); } catch {}
                setKey('');
                setAuthed(false);
              }}
            >
              Log out
            </button>
          )}
        </nav>

        {!authed && (
          <form className="coco-form" style={{ maxWidth: 360 }} onSubmit={login}>
            <h1 className="coco-title">Admin login</h1>
            <input
              className="coco-input"
              type="password"
              placeholder="Admin key"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              required
            />
            {error && <div className="coco-error">{error}</div>}
            <button className="coco-btn">Enter</button>
          </form>
        )}

        {authed && (
          <>
            {error && <div className="coco-error">{error}</div>}
            <h1 className="coco-title">Orders</h1>
            <div className="coco-filters">
              {FILTERS.map((f) => (
                <button
                  key={f || 'all'}
                  className={`coco-btn small ${filter === f ? '' : 'ghost'}`}
                  onClick={() => setFilter(f)}
                >
                  {f || 'all'}
                </button>
              ))}
            </div>

            <div className="coco-orders">
              {orders.length === 0 && <p className="coco-muted">No orders here yet.</p>}
              {orders.map((o) => (
                <div className="coco-order" key={o.order_id}>
                  <div className="coco-order-top">
                    <strong>
                      #{o.order_id} · {o.customer} · {o.phone}
                    </strong>
                    <span>
                      <span className={`coco-badge ${o.status}`}>{o.status}</span>{' '}
                      <span className={`coco-badge ${o.payment_status}`}>
                        {o.payment_method} · {o.payment_status}
                      </span>
                    </span>
                  </div>
                  <div className="coco-muted">
                    {o.order_type.replace('_', ' ')} · {new Date(o.created_at).toLocaleString('en-IN')}
                    {o.delivery_address ? ` · ${o.delivery_address}` : ''}
                  </div>
                  <div>
                    {(o.items ?? []).map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </div>
                  {o.notes && <div className="coco-muted">Note: {o.notes}</div>}
                  <div className="coco-order-top">
                    <strong>{inr(o.total_amount)}</strong>
                    <div className="coco-actions">
                      {NEXT[o.status] && (
                        <button
                          className="coco-btn small"
                          onClick={() => update(o.order_id, { status: NEXT[o.status] })}
                        >
                          Mark {NEXT[o.status]}
                        </button>
                      )}
                      {o.payment_status === 'pending' && (
                        <button
                          className="coco-btn ghost small"
                          onClick={() => update(o.order_id, { payment_status: 'paid' })}
                        >
                          Mark paid
                        </button>
                      )}
                      {!['completed', 'cancelled'].includes(o.status) && (
                        <button
                          className="coco-btn danger small"
                          onClick={() => update(o.order_id, { status: 'cancelled' })}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {reports && (
              <>
                <h2 className="coco-section">Daily sales</h2>
                <table className="coco-table">
                  <thead>
                    <tr><th>Date</th><th>Orders</th><th>Revenue</th><th>Avg order</th></tr>
                  </thead>
                  <tbody>
                    {reports.daily.map((d) => (
                      <tr key={d.sale_date}>
                        <td>{d.sale_date}</td>
                        <td>{d.orders}</td>
                        <td>{inr(d.revenue)}</td>
                        <td>{inr(d.avg_order_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h2 className="coco-section">Best sellers</h2>
                <table className="coco-table">
                  <thead>
                    <tr><th>#</th><th>Item</th><th>Units</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {reports.bestSellers.map((b) => (
                      <tr key={b.item_id}>
                        <td>{b.sales_rank}</td>
                        <td>{b.name}</td>
                        <td>{b.units_sold}</td>
                        <td>{inr(b.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h2 className="coco-section">Orders by hour</h2>
                <div className="coco-bars" style={{ marginBottom: 28 }}>
                  {reports.hourly.map((h) => (
                    <div
                      key={h.hour_of_day}
                      className="coco-bar"
                      style={{ height: `${(h.orders / maxHour) * 100}%` }}
                      title={`${h.orders} orders`}
                    >
                      <span>{h.hour_of_day}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
