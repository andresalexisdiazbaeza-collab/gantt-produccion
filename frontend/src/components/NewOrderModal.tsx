import { useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { Machine, ProductionItem } from '../types'

interface Props {
  machines: Machine[]
  onClose: () => void
  onCreated: (item: ProductionItem) => void
}

const INITIAL = {
  order_number: '',
  customer: '',
  raw_material: '',
  titulo: '',
  color: '',
  treatment: '',
  order_type: '',
  braiding: '',
  model: '',
  matriz_mm: '',
  measure: '',
  meshes: '',
  knot: '',
  pieces: '',
  piece_length: '',
  kg_totales: '',
  delivery_date: '',
  machine_id: '',
  start_date: '',
  comments: '',
  notes: '',
}

type FormState = typeof INITIAL

export default function NewOrderModal({ machines, onClose, onCreated }: Props) {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>({ ...INITIAL })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.order_number.trim()) return
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, unknown> = { order_number: form.order_number.trim() }
      if (form.customer.trim()) payload.customer = form.customer.trim()
      if (form.raw_material.trim()) payload.raw_material = form.raw_material.trim()
      if (form.titulo.trim()) payload.titulo = form.titulo.trim()
      if (form.color.trim()) payload.color = form.color.trim()
      if (form.treatment.trim()) payload.treatment = form.treatment.trim()
      if (form.order_type.trim()) payload.order_type = form.order_type.trim()
      if (form.braiding.trim()) payload.braiding = form.braiding.trim()
      if (form.model.trim()) payload.model = form.model.trim()
      if (form.measure.trim()) payload.measure = form.measure.trim()
      if (form.matriz_mm) payload.matriz_mm = parseFloat(form.matriz_mm)
      if (form.meshes) payload.meshes = parseFloat(form.meshes)
      if (form.knot) payload.knot = parseFloat(form.knot)
      if (form.pieces) payload.pieces = parseFloat(form.pieces)
      if (form.piece_length) payload.piece_length = parseFloat(form.piece_length)
      if (form.kg_totales) payload.kg_totales = parseFloat(form.kg_totales)
      if (form.delivery_date) payload.delivery_date = form.delivery_date
      if (form.machine_id) payload.machine_id = parseInt(form.machine_id)
      if (form.start_date) payload.start_date = form.start_date
      if (form.comments.trim()) payload.comments = form.comments.trim()
      if (form.notes.trim()) payload.notes = form.notes.trim()

      const item = await api.createItem(payload)
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
        <h2 style={{ margin: '0 0 1rem' }}>{t('newOrderTitle')}</h2>
        {error && <div style={errorBox}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={grid}>
            {/* Required */}
            <Field label={t('fieldOrderNumber')} required>
              <input style={inp} value={form.order_number} onChange={e => set('order_number', e.target.value)} required />
            </Field>

            {/* Identity */}
            <Field label={t('fieldCustomer')}>
              <input style={inp} value={form.customer} onChange={e => set('customer', e.target.value)} />
            </Field>
            <Field label={t('fieldRawMaterial')}>
              <input style={inp} value={form.raw_material} onChange={e => set('raw_material', e.target.value)} />
            </Field>
            <Field label={t('fieldTitulo')}>
              <input style={inp} value={form.titulo} onChange={e => set('titulo', e.target.value)} />
            </Field>
            <Field label={t('fieldColor')}>
              <input style={inp} value={form.color} onChange={e => set('color', e.target.value)} />
            </Field>
            <Field label={t('fieldTreatment')}>
              <input style={inp} value={form.treatment} onChange={e => set('treatment', e.target.value)} />
            </Field>
            <Field label={t('fieldOrderType')}>
              <input style={inp} value={form.order_type} onChange={e => set('order_type', e.target.value)} />
            </Field>
            <Field label={t('fieldBraiding')}>
              <input style={inp} value={form.braiding} onChange={e => set('braiding', e.target.value)} />
            </Field>
            <Field label={t('fieldModel')}>
              <input style={inp} value={form.model} onChange={e => set('model', e.target.value)} />
            </Field>

            {/* Dimensions */}
            <Field label={t('fieldMatrizMm')}>
              <input style={inp} type="number" step="any" value={form.matriz_mm} onChange={e => set('matriz_mm', e.target.value)} />
            </Field>
            <Field label={t('fieldMeasure')}>
              <input style={inp} value={form.measure} onChange={e => set('measure', e.target.value)} />
            </Field>
            <Field label={t('fieldMeshes')}>
              <input style={inp} type="number" step="any" value={form.meshes} onChange={e => set('meshes', e.target.value)} />
            </Field>
            <Field label={t('fieldKnot')}>
              <input style={inp} type="number" step="any" value={form.knot} onChange={e => set('knot', e.target.value)} />
            </Field>
            <Field label={t('fieldPieces')}>
              <input style={inp} type="number" step="any" value={form.pieces} onChange={e => set('pieces', e.target.value)} />
            </Field>
            <Field label={t('fieldPieceLength')}>
              <input style={inp} type="number" step="any" value={form.piece_length} onChange={e => set('piece_length', e.target.value)} />
            </Field>
            <Field label={t('fieldKgTotales')}>
              <input style={inp} type="number" step="any" value={form.kg_totales} onChange={e => set('kg_totales', e.target.value)} />
            </Field>

            {/* Commercial */}
            <Field label={t('fieldDeliveryDate')}>
              <input style={inp} type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
            </Field>

            {/* Planning */}
            <Field label={t('fieldMachine')}>
              <select style={inp} value={form.machine_id} onChange={e => set('machine_id', e.target.value)}>
                <option value="">—</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('fieldStartDate')}>
              <input style={inp} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </Field>

            {/* Comments full width */}
            <Field label={t('fieldComments')} fullWidth>
              <textarea style={{ ...inp, height: 60, resize: 'vertical' }} value={form.comments} onChange={e => set('comments', e.target.value)} />
            </Field>
            <Field label={t('fieldNotes')} fullWidth>
              <textarea style={{ ...inp, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
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
  width: '90%', maxWidth: 860, maxHeight: '90vh', overflowY: 'auto',
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
