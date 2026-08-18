import { useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { ConfectionItem, ConfectionTeam } from '../types'

interface Props {
  teams: ConfectionTeam[]
  onClose: () => void
  onCreated: (item: ConfectionItem) => void
}

const INITIAL = {
  po_number: '',
  customer: '',
  id_code: '',
  purchase_order: '',
  pcs_label: '',
  quantity: '',
  product_type: '',
  color: '',
  cage_type: '',
  circumference: '',
  height: '',
  mesh_mm: '',
  twine_size: '',
  tag_numbers: '',
  kg_cage: '',
  netting_m2: '',
  netting_kg: '',
  total_hours: '',
  coating_hours: '',
  received_date: '',
  delivery_offered: '',
  requested_delivery_text: '',
  netting_status: '',
  payment_terms: '',
  team_id: '',
  workers_assigned: '',
  start_date: '',
  comments: '',
}

type FormState = typeof INITIAL

export default function NewConfectionOrderModal({ teams, onClose, onCreated }: Props) {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>({ ...INITIAL })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.po_number.trim()) return
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, unknown> = { po_number: form.po_number.trim() }
      const str = (v: string) => { if (v.trim()) payload[v.trim() ? v : ''] = v.trim() }
      void str // suppress lint — we use the pattern below
      const s = (k: string, v: string) => { if (v.trim()) payload[k] = v.trim() }
      const n = (k: string, v: string) => { if (v) payload[k] = parseFloat(v) }
      const i = (k: string, v: string) => { if (v) payload[k] = parseInt(v) }
      s('customer', form.customer)
      s('id_code', form.id_code)
      s('purchase_order', form.purchase_order)
      s('pcs_label', form.pcs_label)
      n('quantity', form.quantity)
      s('product_type', form.product_type)
      s('color', form.color)
      s('cage_type', form.cage_type)
      s('circumference', form.circumference)
      s('height', form.height)
      s('mesh_mm', form.mesh_mm)
      s('twine_size', form.twine_size)
      s('tag_numbers', form.tag_numbers)
      n('kg_cage', form.kg_cage)
      n('netting_m2', form.netting_m2)
      n('netting_kg', form.netting_kg)
      n('total_hours', form.total_hours)
      n('coating_hours', form.coating_hours)
      s('received_date', form.received_date)
      s('delivery_offered', form.delivery_offered)
      s('requested_delivery_text', form.requested_delivery_text)
      s('netting_status', form.netting_status)
      s('payment_terms', form.payment_terms)
      i('team_id', form.team_id)
      i('workers_assigned', form.workers_assigned)
      s('start_date', form.start_date)
      s('comments', form.comments)

      const item = await api.createConfectionItem(payload)
      onCreated(item)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={{ margin: '0 0 1rem' }}>{t('newConfOrderTitle')}</h2>
        {error && <div style={errorBox}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={grid}>
            {/* Required */}
            <Field label={t('fieldPoNumber')} required>
              <input style={inp} value={form.po_number} onChange={e => set('po_number', e.target.value)} required />
            </Field>

            <Field label={t('fieldCustomer')}>
              <input style={inp} value={form.customer} onChange={e => set('customer', e.target.value)} />
            </Field>
            <Field label={t('fieldIdCode')}>
              <input style={inp} value={form.id_code} onChange={e => set('id_code', e.target.value)} />
            </Field>
            <Field label={t('fieldPurchaseOrder')}>
              <input style={inp} value={form.purchase_order} onChange={e => set('purchase_order', e.target.value)} />
            </Field>
            <Field label={t('fieldPcsLabel')}>
              <input style={inp} value={form.pcs_label} onChange={e => set('pcs_label', e.target.value)} />
            </Field>
            <Field label={t('fieldQuantity')}>
              <input style={inp} type="number" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </Field>
            <Field label={t('fieldProductType')}>
              <input style={inp} value={form.product_type} onChange={e => set('product_type', e.target.value)} />
            </Field>
            <Field label={t('fieldColor')}>
              <input style={inp} value={form.color} onChange={e => set('color', e.target.value)} />
            </Field>
            <Field label={t('fieldCageType')}>
              <input style={inp} value={form.cage_type} onChange={e => set('cage_type', e.target.value)} />
            </Field>
            <Field label={t('fieldCircumference')}>
              <input style={inp} value={form.circumference} onChange={e => set('circumference', e.target.value)} />
            </Field>
            <Field label={t('fieldHeight')}>
              <input style={inp} value={form.height} onChange={e => set('height', e.target.value)} />
            </Field>
            <Field label={t('fieldMeshMm')}>
              <input style={inp} value={form.mesh_mm} onChange={e => set('mesh_mm', e.target.value)} />
            </Field>
            <Field label={t('fieldTwineSize')}>
              <input style={inp} value={form.twine_size} onChange={e => set('twine_size', e.target.value)} />
            </Field>
            <Field label={t('fieldTagNumbers')}>
              <input style={inp} value={form.tag_numbers} onChange={e => set('tag_numbers', e.target.value)} />
            </Field>

            <Field label={t('fieldKgCage')}>
              <input style={inp} type="number" step="any" value={form.kg_cage} onChange={e => set('kg_cage', e.target.value)} />
            </Field>
            <Field label={t('fieldNettingM2')}>
              <input style={inp} type="number" step="any" value={form.netting_m2} onChange={e => set('netting_m2', e.target.value)} />
            </Field>
            <Field label={t('fieldNettingKg')}>
              <input style={inp} type="number" step="any" value={form.netting_kg} onChange={e => set('netting_kg', e.target.value)} />
            </Field>
            <Field label={t('fieldTotalHours')}>
              <input style={inp} type="number" step="any" value={form.total_hours} onChange={e => set('total_hours', e.target.value)} />
            </Field>
            <Field label={t('fieldCoatingHours')}>
              <input style={inp} type="number" step="any" value={form.coating_hours} onChange={e => set('coating_hours', e.target.value)} />
            </Field>

            <Field label={t('fieldReceivedDate')}>
              <input style={inp} type="date" value={form.received_date} onChange={e => set('received_date', e.target.value)} />
            </Field>
            <Field label={t('fieldDeliveryOffered')}>
              <input style={inp} type="date" value={form.delivery_offered} onChange={e => set('delivery_offered', e.target.value)} />
            </Field>
            <Field label={t('fieldRequestedDelivery')}>
              <input style={inp} value={form.requested_delivery_text} onChange={e => set('requested_delivery_text', e.target.value)} />
            </Field>
            <Field label={t('fieldNettingStatus')}>
              <input style={inp} value={form.netting_status} onChange={e => set('netting_status', e.target.value)} />
            </Field>
            <Field label={t('fieldPaymentTerms')}>
              <input style={inp} value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} />
            </Field>

            {/* Planning */}
            <Field label={t('fieldTeam')}>
              <select style={inp} value={form.team_id} onChange={e => set('team_id', e.target.value)}>
                <option value="">—</option>
                {teams.map(tm => (
                  <option key={tm.id} value={tm.id}>{tm.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('fieldWorkersAssigned')}>
              <input style={inp} type="number" min="1" value={form.workers_assigned} onChange={e => set('workers_assigned', e.target.value)} />
            </Field>
            <Field label={t('fieldStartDate')}>
              <input style={inp} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </Field>

            <Field label={t('fieldComments')} fullWidth>
              <textarea style={{ ...inp, height: 60, resize: 'vertical' }} value={form.comments} onChange={e => set('comments', e.target.value)} />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" style={btnSecondary} onClick={onClose} disabled={saving}>
              {t('newOrderCancel')}
            </button>
            <button type="submit" style={btnPrimary} disabled={saving}>
              {saving ? t('loading') : t('newOrderSave')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, required, fullWidth }: { label: string; children: React.ReactNode; required?: boolean; fullWidth?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#e74c3c' }}> *</span>}
      </span>
      {children}
    </label>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal: React.CSSProperties = {
  background: '#1e2330', borderRadius: 10, padding: '1.5rem',
  width: '90%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
}
const grid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem',
}
const inp: React.CSSProperties = {
  background: '#161b27', border: '1px solid #334', borderRadius: 6,
  color: '#e8eaf0', padding: '6px 8px', fontSize: 13, width: '100%', boxSizing: 'border-box',
}
const btnPrimary: React.CSSProperties = {
  background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
}
const btnSecondary: React.CSSProperties = {
  background: '#334', color: '#aaa', border: 'none', borderRadius: 6,
  padding: '8px 20px', cursor: 'pointer', fontSize: 14,
}
const errorBox: React.CSSProperties = {
  background: '#3d1a1a', color: '#f87171', borderRadius: 6, padding: '8px 12px',
  marginBottom: 12, fontSize: 13,
}
