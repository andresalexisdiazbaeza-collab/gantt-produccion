import { NavLink, Outlet } from 'react-router-dom'
import { CompleteExportButtons } from './ExportButtons'
import { useAuth } from '../auth/usePermissions'
import type { AppModule } from '../auth/types'
import { useI18n } from '../i18n/I18nProvider'
import type { Language } from '../i18n/types'

const LANG_OPTIONS: { code: Language; label: string }[] = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'sk', label: 'SK' },
  { code: 'it', label: 'IT' },
]

type NavItem = { to: string; label: string; module: AppModule; highlight?: boolean }

export default function Layout() {
  const { t } = useI18n()
  const { lang, setLang } = useI18n()
  const { user, logout, canView } = useAuth()

  const allMain: NavItem[] = [
    { to: '/', label: t('navDashboard'), module: 'dashboard' },
    { to: '/gantt', label: t('navGantt'), module: 'gantt' },
    { to: '/ordenes', label: t('navActiveOrders'), module: 'active_orders' },
    { to: '/optimizar', label: t('navOptimize'), module: 'optimize', highlight: true },
    { to: '/importar', label: t('navImport'), module: 'import' },
  ]

  const allOther: NavItem[] = [
    { to: '/terminadas', label: t('navCompleted'), module: 'completed' },
    { to: '/usuarios', label: t('navUsers'), module: 'users' },
    { to: '/materiales', label: t('navMaterials'), module: 'materials' },
    { to: '/maquinas', label: t('navMachines'), module: 'machines' },
  ]

  const mainLinks = allMain.filter((l) => canView(l.module))
  const otherLinks = allOther.filter((l) => canView(l.module))

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold">{t('appTitle')}</h1>
          <p className="text-xs text-slate-400 mt-1">{t('appSubtitle')}</p>
          {user && (
            <p className="text-xs text-slate-300 mt-2">
              {user.display_name}
              <span className="text-slate-500"> · {user.role}</span>
            </p>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {mainLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : l.highlight
                      ? 'text-amber-300 hover:bg-slate-800 font-medium'
                      : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {otherLinks.length > 0 && (
            <div className="pt-3 mt-2 border-t border-slate-700">
              <p className="px-3 text-[10px] uppercase tracking-wider text-slate-500 mb-1">{t('navConfig')}</p>
              {otherLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
        <div className="p-3 border-t border-slate-700 space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">{t('language')}</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
            className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-600"
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>{o.label}</option>
            ))}
          </select>
          <CompleteExportButtons className="pt-2 border-t border-slate-700" />
          <button
            type="button"
            onClick={logout}
            className="w-full text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg py-1.5 hover:bg-slate-800"
          >
            {t('logout')}
          </button>
          <NavLink
            to="/cuenta"
            className="block text-center text-xs text-slate-400 hover:text-slate-200"
          >
            {t('accountTitle')}
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
