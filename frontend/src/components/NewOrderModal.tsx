import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { Machine, OrderCatalog, ProductionItem } from '../types'

interface Props {
  machines: Machine[]
  onClose: () => void
  onCreated: (items: ProductionItem[]) => void
}

interface ArticleLine {
  titleMaterialId: string
  titulo: string
  raw_material: string
  color: string
  treatment: string
  order_type: string
  braiding: string
  model: string
  matriz_mm: string
  measure: string
  meshes: string
  knot: string
  pieces: string
  piece_length: string
  kg_totales: string
}

const EMPTY_ARTICLE = (): ArticleLine => ({
  titleMaterialId: '',
  titulo: '',
  raw_material: '',
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
})

export default function NewOrderModal({ machines, onClose, onCreated }: Props) {
  const { t } = useI18n()
  const [catalog, setCatalog] = useState<OrderCatalog | null>(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [customer, setCustomer] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [machineId, setMachineId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [comments, setComments] = useState('')
  const [notes, setNotes] = useState('')
  const [articles, setArticles] = useState<ArticleLine[]>([EMPTY_ARTICLE()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [importReplace, setImportReplace] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    api.getOrderCatalog().then(setCatalog).catch((e) => setError(e.message))
  }, [])

  const updateArticle = (idx: number, patch: Partial<ArticleLine>) => {
    setArticles((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  }

  const onTitleMaterialChange = (idx: number, id: string) => {
    const entry = catalog?.title_materials.find((x) => String(x.id) === id)
    updateArticle(idx, {
      titleMaterialId: id,
      titulo: entry?.titulo ?? '',
      raw_material: entry?.material ?? '',
    })
  }

  const addArticle = () => setArticles((prev) => [...prev, EMPTY_ARTICLE()])
  const removeArticle = (idx: number) => {
    if (articles.length <= 1) return
    setArticles((prev) => prev.filter((_, i) => i !== idx))
  }

  const parseNum = (v: string) => {
    if (!v.trim()) return undefined
    const n = parseFloat(v)
    return Number.isNaN(n) ? undefined : n
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    setImportMsg('')
    setError('')
    try {
      const res = await api.importTitleMaterialCatalog(file, importReplace)
      setImportMsg(t('catalogImportSuccess', { count: res.imported_count, total: res.total_count }))
      const fresh = await api.getOrderCatalog()
      setCatalog(fresh)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setImporting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderNumber.trim()) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        order_number: orderNumber.trim(),
        customer: customer.trim() || undefined,
        delivery_date: deliveryDate || undefined,
        machine_id: machineId ? parseInt(machineId) : undefined,
        start_date: startDate || undefined,
        comments: comments.trim() || undefined,
        notes: notes.trim() || undefined,
        articles: articles.map((a) => ({
          titulo: a.titulo.trim() || undefined,
          raw_material: a.raw_material.trim() || undefined,
          color: a.color.trim() || undefined,
          treatment: a.treatment.trim() || undefined,
          order_type: a.order_type || undefined,
          braiding: a.braiding || undefined,
          model: a.model || undefined,
          matriz_mm: parseNum(a.matriz_mm),
          measure: a.measure.trim() || undefined,
          meshes: parseNum(a.meshes),
          knot: parseNum(a.knot),
          pieces: parseNum(a.pieces),
          piece_length: parseNum(a.piece_length),
          kg_totales: parseNum(a.kg_totales),
        })),
      }
      const res = await api.createItemsBatch(payload)
      onCreated(res.items)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setSaving(false)
    }
  }

  const opts = catalog?.options

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={{ margin: '0 0 1rem' }}>{t('newOrderTitle')}</h2>
        {error && <div style={errorBox}>{error}</div>}

        <div style={importBox}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t('catalogImportTitleMaterial')}</div>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>{t('catalogImportHint')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleImport(f)
                e.target.value = ''
              }}
              style={{ fontSize: 12, color: '#ccc' }}
            />
            <label style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={importReplace} onChange={(e) => setImportReplace(e.target.checked)} />
              {t('catalogImportReplace')}
            </label>
          </div>
          {importMsg && <p style={{ fontSize: 12, color: '#4ade80', marginTop: 6 }}>{importMsg}</p>}
        </div>

        <form onSubmit={handleSubmit}>
          <h3 style={sectionTitle}>{t('newOrderHeader')}</h3>
          <div style={grid}>
            <Field label={t('fieldOrderNumber')} required>
              <input style={inp} value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required />
            </Field>
            <Field label={t('fieldCustomer')}>
              <input style={inp} value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </Field>
            <Field label={t('fieldDeliveryDate')}>
              <input style={inp} type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </Field>
            <Field label={t('fieldMachine')}>
              <select style={inp} value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                <option value="">{t('fieldSelect')}</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('fieldStartDate')}>
              <input style={inp} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <h3 style={{ ...sectionTitle, margin: 0 }}>{t('newOrderArticles')}</h3>
            <button type="button" style={btnSecondary} onClick={addArticle}>{t('newOrderAddArticle')}</button>
          </div>

          {articles.map((art, idx) => (
            <div key={idx} style={articleBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#888' }}>#{idx + 1}</span>
                {articles.length > 1 && (
                  <button type="button" style={btnLink} onClick={() => removeArticle(idx)}>{t('newOrderRemoveArticle')}</button>
                )}
              </div>
              <div style={grid}>
                <Field label={`${t('fieldTitulo')} / ${t('fieldRawMaterial')}`}>
                  <select style={inp} value={art.titleMaterialId} onChange={(e) => onTitleMaterialChange(idx, e.target.value)}>
                    <option value="">{t('fieldSelect')}</option>
                    {catalog?.title_materials.map((tm) => (
                      <option key={tm.id} value={tm.id}>{tm.titulo} — {tm.material}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('fieldRawMaterial')}>
                  <input style={{ ...inp, opacity: 0.85 }} value={art.raw_material} readOnly />
                </Field>
                <Field label={t('fieldOrderType')}>
                  <select style={inp} value={art.order_type} onChange={(e) => updateArticle(idx, { order_type: e.target.value })}>
                    <option value="">{t('fieldSelect')}</option>
                    {opts?.order_type.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label={t('fieldBraiding')}>
                  <select style={inp} value={art.braiding} onChange={(e) => updateArticle(idx, { braiding: e.target.value })}>
                    <option value="">{t('fieldSelect')}</option>
                    {opts?.braiding.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label={t('fieldModel')}>
                  <select style={inp} value={art.model} onChange={(e) => updateArticle(idx, { model: e.target.value })}>
                    <option value="">{t('fieldSelect')}</option>
                    {opts?.model.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label={t('fieldMeshes')}>
                  <select style={inp} value={art.meshes} onChange={(e) => updateArticle(idx, { meshes: e.target.value })}>
                    <option value="">{t('fieldSelect')}</option>
                    {opts?.meshes.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label={t('fieldKnot')}>
                  <select style={inp} value={art.knot} onChange={(e) => updateArticle(idx, { knot: e.target.value })}>
                    <option value="">{t('fieldSelect')}</option>
                    {opts?.knot.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label={t('fieldColor')}>
                  <input style={inp} value={art.color} onChange={(e) => updateArticle(idx, { color: e.target.value })} />
                </Field>
                <Field label={t('fieldTreatment')}>
                  <input style={inp} value={art.treatment} onChange={(e) => updateArticle(idx, { treatment: e.target.value })} />
                </Field>
                <Field label={t('fieldMatrizMm')}>
                  <input style={inp} type="number" step="any" value={art.matriz_mm} onChange={(e) => updateArticle(idx, { matriz_mm: e.target.value })} />
                </Field>
                <Field label={t('fieldMeasure')}>
                  <input style={inp} value={art.measure} onChange={(e) => updateArticle(idx, { measure: e.target.value })} />
                </Field>
                <Field label={t('fieldPieces')}>
                  <input style={inp} type="number" step="any" value={art.pieces} onChange={(e) => updateArticle(idx, { pieces: e.target.value })} />
                </Field>
                <Field label={t('fieldPieceLength')}>
                  <input style={inp} type="number" step="any" value={art.piece_length} onChange={(e) => updateArticle(idx, { piece_length: e.target.value })} />
                </Field>
                <Field label={t('fieldKgTotales')}>
                  <input style={inp} type="number" step="any" value={art.kg_totales} onChange={(e) => updateArticle(idx, { kg_totales: e.target.value })} />
                </Field>
              </div>
            </div>
          ))}

          <div style={{ ...grid, marginTop: 12 }}>
            <Field label={t('fieldComments')} fullWidth>
              <textarea style={{ ...inp, height: 50, resize: 'vertical' }} value={comments} onChange={(e) => setComments(e.target.value)} />
            </Field>
            <Field label={t('fieldNotes')} fullWidth>
              <textarea style={{ ...inp, height: 50, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" style={btnSecondary} onClick={onClose} disabled={saving}>{t('newOrderCancel')}</button>
            <button type="submit" style={btnPrimary} disabled={saving}>{saving ? t('loading') : t('newOrderSave')}</button>
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
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal: React.CSSProperties = {
  background: '#1e2330', borderRadius: 10, padding: '1.25rem 1.5rem',
  width: '95%', maxWidth: 980, maxHeight: '92vh', overflowY: 'auto',
  boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
}
const grid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem',
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
  padding: '6px 14px', cursor: 'pointer', fontSize: 13,
}
const btnLink: React.CSSProperties = {
  background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12,
}
const errorBox: React.CSSProperties = {
  background: '#3d1a1a', color: '#f87171', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13,
}
const importBox: React.CSSProperties = {
  background: '#161b27', border: '1px dashed #445', borderRadius: 8, padding: '10px 12px', marginBottom: 14,
}
const sectionTitle: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: '#cbd5e1', margin: '0 0 8px',
}
const articleBox: React.CSSProperties = {
  border: '1px solid #334', borderRadius: 8, padding: '10px 12px', marginTop: 10, background: '#161b27',
}
