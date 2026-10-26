'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../coco.css';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const STEPS = ['placed', 'preparing', 'ready', 'completed'];
const LABEL = {
  placed: 'Order placed',
  preparing: 'Being prepared',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let timer;
    let stopped = false;

    async function load() {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load order');
        if (stopped) return;
        setOrder(data);
        setError('');
        // keep refreshing until the order is finished
        if (!['completed', 'cancelled'].includes(data.status)) {
          timer = setTimeout(load, 8000);
        }
      } catch (err) {
        if (!stopped) setError(err.message);
      }
    }

    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id]);

  const stepIndex = order ? STEPS.indexOf(order.status) : -1;

  return (
    <div className="coco-page">
      <div className="coco-wrap">
        <nav className="coco-nav">
          <Link href="/" className="coco-logo">
            CoCo<small>waffles &amp; pancakes</small>
          </Link>
          <Link href="/menu" className="coco-link">Order more →</Link>
        </nav>

        {error && <div className="coco-error">{error}</div>}
        {!order && !error && <p className="coco-muted">Loading your order…</p>}

        {order && (
          <>
            <h1 className="coco-title">Order #{order.order_id}</h1>
            <p className="coco-muted">
              {order.order_type.replace('_', ' ')} · placed{' '}
              {new Date(order.created_at).toLocaleString('en-IN')}
            </p>

            {order.status === 'cancelled' ? (
              <div className="coco-error" style={{ marginTop: 20 }}>This order was cancelled.</div>
            ) : (
              <div className="coco-steps">
                {STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`coco-step ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'now' : ''}`}
                  >
                    {LABEL[s]}
                  </div>
                ))}
              </div>
            )}

            <h2 className="coco-section">Items</h2>
            <table className="coco-table">
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.name}</td>
                    <td>× {it.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{inr(it.line_total)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td style={{ textAlign: 'right' }}><strong>{inr(order.total_amount)}</strong></td>
                </tr>
              </tbody>
            </table>

            <h2 className="coco-section">Timeline</h2>
            <table className="coco-table">
              <tbody>
                {order.history.map((h, i) => (
                  <tr key={i}>
                    <td>{LABEL[h.status] ?? h.status}</td>
                    <td style={{ textAlign: 'right' }}>
                      {new Date(h.changed_at).toLocaleTimeString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="coco-muted" style={{ marginTop: 20 }}>
              Save your order number: <strong>#{order.order_id}</strong>. This page updates automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
