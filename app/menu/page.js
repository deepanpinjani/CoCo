'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../coco.css';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function ItemCard({ item, onAdd }) {
  const [picked, setPicked] = useState([]);
  const [qty, setQty] = useState(1);

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const extras = item.toppings.filter((t) => picked.includes(t.topping_id));
  const unit = item.base_price + extras.reduce((s, t) => s + t.extra_price, 0);

  return (
    <div className="coco-card">
      <div className="coco-card-head">
        <h3>{item.name}</h3>
        <span className="coco-price">{inr(item.base_price)}</span>
      </div>
      {item.description && <p className="coco-muted">{item.description}</p>}

      {item.toppings.length > 0 && (
        <div className="coco-toppings">
          {item.toppings.map((t) => (
            <label
              key={t.topping_id}
              className={`coco-chip ${picked.includes(t.topping_id) ? 'on' : ''}`}
            >
              <input
                type="checkbox"
                checked={picked.includes(t.topping_id)}
                onChange={() => toggle(t.topping_id)}
              />
              {t.name} +{inr(t.extra_price)}
            </label>
          ))}
        </div>
      )}

      <div className="coco-card-foot">
        <div className="coco-qty">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span>{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
        </div>
        <button
          type="button"
          className="coco-btn small"
          onClick={() => {
            onAdd({ item, toppings: extras, quantity: qty });
            setPicked([]);
            setQty(1);
          }}
        >
          Add · {inr(unit * qty)}
        </button>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const router = useRouter();
  const [menu, setMenu] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    order_type: 'takeaway',
    delivery_address: '',
    payment_method: 'upi',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setMenu)
      .catch(() => setLoadError('Could not load the menu. Please try again in a moment.'));
  }, []);

  const addToCart = ({ item, toppings, quantity }) => {
    const key = `${item.item_id}:${toppings.map((t) => t.topping_id).sort((a, b) => a - b).join(',')}`;
    const unit = item.base_price + toppings.reduce((s, t) => s + t.extra_price, 0);
    setCart((c) => {
      const found = c.find((l) => l.key === key);
      if (found) {
        return c.map((l) =>
          l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l
        );
      }
      return [...c, { key, item_id: item.item_id, name: item.name, toppings, unit, quantity }];
    });
  };

  const changeQty = (key, delta) =>
    setCart((c) =>
      c
        .map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0)
    );

  const total = cart.reduce((s, l) => s + l.unit * l.quantity, 0);
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const placeOrder = async (e) => {
    e.preventDefault();
    setFormError('');
    if (cart.length === 0) return setFormError('Your cart is empty.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: form.name,
            phone: form.phone,
            email: form.email || undefined,
          },
          order_type: form.order_type,
          delivery_address: form.order_type === 'delivery' ? form.delivery_address : undefined,
          notes: form.notes || undefined,
          payment_method: form.payment_method,
          items: cart.map((l) => ({
            item_id: l.item_id,
            quantity: l.quantity,
            topping_ids: l.toppings.map((t) => t.topping_id),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not place the order');
      router.push(`/order/${data.order_id}`);
    } catch (err) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="coco-page">
      <div className="coco-wrap">
        <nav className="coco-nav">
          <Link href="/" className="coco-logo">
            CoCo<small>waffles &amp; pancakes</small>
          </Link>
          <Link href="/" className="coco-link">← Back to home</Link>
        </nav>

        <h1 className="coco-title">Menu</h1>
        <p className="coco-muted">Freshly made · Served hot · Amravati, MH</p>

        <div className="coco-layout">
          <div>
            {loadError && <div className="coco-error">{loadError}</div>}
            {!menu && !loadError && <p className="coco-muted">Loading menu…</p>}
            {menu?.map((cat) => (
              <section key={cat.category}>
                <h2 className="coco-section">{cat.category}</h2>
                <div className="coco-grid">
                  {cat.items.map((item) => (
                    <ItemCard key={item.item_id} item={item} onAdd={addToCart} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="coco-cart">
            <h2>Your order</h2>
            {cart.length === 0 && <p className="coco-muted">Add something delicious.</p>}
            {cart.map((l) => (
              <div className="coco-line" key={l.key}>
                <div>
                  {l.name}
                  {l.toppings.length > 0 && (
                    <small>+ {l.toppings.map((t) => t.name).join(', ')}</small>
                  )}
                  <div className="coco-qty" style={{ marginTop: 6 }}>
                    <button type="button" onClick={() => changeQty(l.key, -1)}>−</button>
                    <span>{l.quantity}</span>
                    <button type="button" onClick={() => changeQty(l.key, 1)}>+</button>
                  </div>
                </div>
                <strong>{inr(l.unit * l.quantity)}</strong>
              </div>
            ))}

            {cart.length > 0 && (
              <>
                <div className="coco-total">
                  <span>Total</span>
                  <span>{inr(total)}</span>
                </div>

                <form className="coco-form" onSubmit={placeOrder}>
                  <label>
                    Name
                    <input required value={form.name} onChange={setField('name')} />
                  </label>
                  <label>
                    Phone (10 digits)
                    <input
                      required
                      inputMode="numeric"
                      pattern="\d{10}"
                      maxLength={10}
                      value={form.phone}
                      onChange={setField('phone')}
                    />
                  </label>
                  <label>
                    Email (optional)
                    <input type="email" value={form.email} onChange={setField('email')} />
                  </label>
                  <label>
                    Order type
                    <select value={form.order_type} onChange={setField('order_type')}>
                      <option value="takeaway">Takeaway</option>
                      <option value="dine_in">Dine in</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </label>
                  {form.order_type === 'delivery' && (
                    <label>
                      Delivery address
                      <textarea
                        required
                        rows={2}
                        value={form.delivery_address}
                        onChange={setField('delivery_address')}
                      />
                    </label>
                  )}
                  <label>
                    Payment
                    <select value={form.payment_method} onChange={setField('payment_method')}>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  </label>
                  <label>
                    Notes (optional)
                    <textarea rows={2} value={form.notes} onChange={setField('notes')} />
                  </label>

                  {formError && <div className="coco-error">{formError}</div>}
                  <button className="coco-btn" disabled={submitting}>
                    {submitting ? 'Placing order…' : `Place order · ${inr(total)}`}
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
