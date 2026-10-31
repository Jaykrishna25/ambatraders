import { useState } from 'react';
import { api } from '../lib/api/index.js';
import { Field } from './ui.jsx';

export default function CustomerForm({ initial = {}, onSaved, onCancel, submitLabel = 'Save customer' }) {
  const [f, setF] = useState({
    shop_name: '',
    contact_name: '',
    phone: '',
    city: '',
    gstin: '',
    address: '',
    notes: '',
    ...initial,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <form
      className="aform"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr('');
        setBusy(true);
        try {
          const id = await api.saveCustomer(f);
          onSaved(id, f);
        } catch (e2) {
          setErr(e2.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="agrid">
        <Field label="Shop / business name *" full>
          <input value={f.shop_name} onChange={set('shop_name')} required maxLength={120} autoFocus />
        </Field>
        <Field label="Contact person">
          <input value={f.contact_name || ''} onChange={set('contact_name')} maxLength={80} />
        </Field>
        <Field label="Mobile *" hint="10 digits, used for WhatsApp">
          <input value={f.phone} onChange={set('phone')} type="tel" inputMode="tel" required maxLength={16} />
        </Field>
        <Field label="City">
          <input value={f.city || ''} onChange={set('city')} maxLength={80} />
        </Field>
        <Field label="GSTIN">
          <input value={f.gstin || ''} onChange={set('gstin')} maxLength={15} style={{ textTransform: 'uppercase' }} />
        </Field>
        <Field label="Address / transport" full>
          <textarea value={f.address || ''} onChange={set('address')} rows={2} maxLength={300} />
        </Field>
        <Field label="Notes (internal)" full>
          <textarea value={f.notes || ''} onChange={set('notes')} rows={2} maxLength={500} />
        </Field>
      </div>
      {err && (
        <p className="aerror" role="alert">
          {err}
        </p>
      )}
      <div className="aform__actions">
        {onCancel && (
          <button type="button" className="abtn abtn--ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="abtn abtn--primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
