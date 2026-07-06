import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/usePermissions'
import { applyRoleDefaults, togglePermission } from '../auth/usePermissions'
import type { UserPermissions } from '../auth/types'
import { useI18n } from '../i18n/I18nProvider'

interface AdminUser {
  username: string
  role: string
  display_name: string
  email: string | null
  active: boolean
  permissions: UserPermissions
}

interface Schema {
  modules: string[]
  items: string[]
  roles: string[]
  defaults: Record<string, UserPermissions>
}

function PermissionMatrix({
  title,
  group,
  keys,
  labels,
  perms,
  onChange,
}: {
  title: string
  group: 'modules' | 'items'
  keys: string[]
  labels: Record<string, string>
  perms: UserPermissions
  onChange: (next: UserPermissions) => void
}) {
  const { t } = useI18n()
  const data = group === 'modules' ? perms.modules : perms.items

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-3 py-2 font-semibold text-sm border-b">{title}</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-slate-50/50">
            <th className="text-left p-2">{t('permName')}</th>
            <th className="p-2 w-16 text-center">{t('permView')}</th>
            <th className="p-2 w-16 text-center">{t('permModify')}</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const entry = data[key] ?? { view: false, modify: false }
            return (
              <tr key={key} className="border-b last:border-0">
                <td className="p-2">{labels[key] ?? key}</td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={entry.view}
                    onChange={(e) => onChange(togglePermission(perms, group, key, 'view', e.target.checked))}
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={entry.modify}
                    onChange={(e) => onChange(togglePermission(perms, group, key, 'modify', e.target.checked))}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function UsersAdminPage() {
  const { t } = useI18n()
  const { canManageUsers } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [schema, setSchema] = useState<Schema | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)

  const [newUser, setNewUser] = useState({
    username: '',
    password: '12345',
    role: 'sales',
    display_name: '',
    email: '',
    permissions: null as UserPermissions | null,
  })

  const [editPerms, setEditPerms] = useState<UserPermissions | null>(null)
  const [editMeta, setEditMeta] = useState({ role: '', display_name: '', email: '', active: true })
  const [customPasswords, setCustomPasswords] = useState<Record<string, string>>({})

  const moduleLabels: Record<string, string> = {
    dashboard: t('navDashboard'),
    gantt: t('navGantt'),
    active_orders: t('navActiveOrders'),
    optimize: t('navOptimize'),
    import: t('navImport'),
    completed: t('navCompleted'),
    materials: t('navMaterials'),
    machines: t('navMachines'),
    users: t('navUsers'),
  }

  const itemLabels: Record<string, string> = {
    machine: t('permItemMachine'),
    start_date: t('permItemStartDate'),
    pieces: t('colPieces'),
    piece_length: t('colPieceLength'),
    notes: t('colNotes'),
    meters_produced: t('colMetersProduced'),
    complete: t('permItemComplete'),
    delete_all: t('permItemDeleteAll'),
  }

  const load = useCallback(() => {
    Promise.all([api.listUsers(), api.getPermissionsSchema()])
      .then(([u, s]) => { setUsers(u); setSchema(s) })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const u = users.find((x) => x.username === selected)
    if (u) {
      setEditPerms(u.permissions)
      setEditMeta({
        role: u.role,
        display_name: u.display_name,
        email: u.email ?? '',
        active: u.active,
      })
    }
  }, [selected, users])

  if (!canManageUsers) return <Navigate to="/" replace />

  const selectUser = (username: string) => {
    setSelected(username)
    setCreating(false)
    setError('')
    setMessage('')
  }

  const startCreate = () => {
    setCreating(true)
    setSelected(null)
    const perms = schema ? applyRoleDefaults('sales', schema.defaults) : null
    setNewUser({ username: '', password: '12345', role: 'sales', display_name: '', email: '', permissions: perms })
    setError('')
    setMessage('')
  }

  const onNewRoleChange = (role: string) => {
    const perms = schema ? applyRoleDefaults(role, schema.defaults) : null
    setNewUser((prev) => ({ ...prev, role, permissions: perms }))
  }

  const createUser = async () => {
    setSaving(true)
    setError('')
    try {
      await api.createUser({
        username: newUser.username.trim(),
        password: newUser.password,
        role: newUser.role,
        display_name: newUser.display_name.trim(),
        email: newUser.email.trim() || null,
        permissions: newUser.permissions ?? undefined,
      })
      setMessage(t('userCreated'))
      setCreating(false)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setSaving(false)
    }
  }

  const saveUser = async () => {
    if (!selected || !editPerms) return
    setSaving(true)
    setError('')
    try {
      await api.updateUser(selected, {
        role: editMeta.role,
        display_name: editMeta.display_name.trim(),
        email: editMeta.email.trim() || null,
        active: editMeta.active,
        permissions: editPerms,
      })
      setMessage(t('userSaved'))
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async (username: string, newPassword?: string) => {
    setResetting(username)
    setError('')
    try {
      const res = await api.adminResetPassword(username, newPassword)
      setMessage(res.message)
      setCustomPasswords((prev) => ({ ...prev, [username]: '' }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setResetting(null)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t('usersAdminTitle')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('usersAdminSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          {t('userCreate')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border divide-y max-h-[70vh] overflow-auto">
          {users.map((u) => (
            <button
              key={u.username}
              type="button"
              onClick={() => selectUser(u.username)}
              className={`w-full text-left p-3 hover:bg-slate-50 ${selected === u.username ? 'bg-blue-50' : ''}`}
            >
              <p className="font-semibold text-sm">
                {u.display_name}
                {!u.active && <span className="text-red-500 ml-1">({t('userInactive')})</span>}
              </p>
              <p className="text-xs text-slate-500">{u.username} · {u.role}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {creating && schema && newUser.permissions && (
            <div className="bg-white rounded-xl border p-4 space-y-4">
              <h3 className="font-semibold">{t('userCreate')}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm block">
                  {t('userUsername')}
                  <input className="border rounded-lg w-full mt-1 px-3 py-1.5" value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} />
                </label>
                <label className="text-sm block">
                  {t('userDisplayName')}
                  <input className="border rounded-lg w-full mt-1 px-3 py-1.5" value={newUser.display_name} onChange={(e) => setNewUser((p) => ({ ...p, display_name: e.target.value }))} />
                </label>
                <label className="text-sm block">
                  {t('userRole')}
                  <select className="border rounded-lg w-full mt-1 px-3 py-1.5" value={newUser.role} onChange={(e) => onNewRoleChange(e.target.value)}>
                    {schema.roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="text-sm block">
                  {t('userEmail')}
                  <input type="email" className="border rounded-lg w-full mt-1 px-3 py-1.5" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
                </label>
                <label className="text-sm block sm:col-span-2">
                  {t('userPassword')}
                  <input type="password" className="border rounded-lg w-full mt-1 px-3 py-1.5" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
                </label>
              </div>
              <PermissionMatrix title={t('permModules')} group="modules" keys={schema.modules} labels={moduleLabels} perms={newUser.permissions} onChange={(p) => setNewUser((prev) => ({ ...prev, permissions: p }))} />
              <PermissionMatrix title={t('permItems')} group="items" keys={schema.items} labels={itemLabels} perms={newUser.permissions} onChange={(p) => setNewUser((prev) => ({ ...prev, permissions: p }))} />
              <button type="button" onClick={createUser} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? '...' : t('userCreate')}
              </button>
            </div>
          )}

          {selected && editPerms && schema && (
            <div className="bg-white rounded-xl border p-4 space-y-4">
              <h3 className="font-semibold">{selected}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm block">
                  {t('userDisplayName')}
                  <input className="border rounded-lg w-full mt-1 px-3 py-1.5" value={editMeta.display_name} onChange={(e) => setEditMeta((p) => ({ ...p, display_name: e.target.value }))} />
                </label>
                <label className="text-sm block">
                  {t('userRole')}
                  <select className="border rounded-lg w-full mt-1 px-3 py-1.5" value={editMeta.role} onChange={(e) => {
                    const role = e.target.value
                    setEditMeta((p) => ({ ...p, role }))
                    setEditPerms(applyRoleDefaults(role, schema.defaults))
                  }}>
                    {schema.roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="text-sm block">
                  {t('userEmail')}
                  <input type="email" className="border rounded-lg w-full mt-1 px-3 py-1.5" value={editMeta.email} onChange={(e) => setEditMeta((p) => ({ ...p, email: e.target.value }))} />
                </label>
                <label className="text-sm flex items-center gap-2 mt-6">
                  <input type="checkbox" checked={editMeta.active} onChange={(e) => setEditMeta((p) => ({ ...p, active: e.target.checked }))} />
                  {t('userActive')}
                </label>
              </div>
              <PermissionMatrix title={t('permModules')} group="modules" keys={schema.modules} labels={moduleLabels} perms={editPerms} onChange={setEditPerms} />
              <PermissionMatrix title={t('permItems')} group="items" keys={schema.items} labels={itemLabels} perms={editPerms} onChange={setEditPerms} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={saveUser} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? '...' : t('userSave')}
                </button>
                <button type="button" onClick={() => resetPassword(selected)} disabled={resetting === selected} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
                  {resetting === selected ? '...' : t('adminResetDefault', { pwd: '12345' })}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="password"
                  placeholder={t('adminCustomPassword')}
                  className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40"
                  value={customPasswords[selected] ?? ''}
                  onChange={(e) => setCustomPasswords((prev) => ({ ...prev, [selected]: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => {
                    const pwd = customPasswords[selected]?.trim()
                    if (pwd) void resetPassword(selected, pwd)
                  }}
                  disabled={resetting === selected || !customPasswords[selected]?.trim()}
                  className="text-sm border px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  {t('adminResetCustom')}
                </button>
              </div>
            </div>
          )}

          {!creating && !selected && (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-500 text-sm">
              {t('userSelectHint')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
