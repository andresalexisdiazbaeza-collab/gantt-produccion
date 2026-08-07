import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api/client'
import ExportButtons from '../components/ExportButtons'
import { useI18n } from '../i18n/I18nProvider'
import type { ConfectionDashboardStats } from '../types'

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ConfeccionDashboard() {
  const { t } = useI18n()
  const [stats, setStats] = useState<ConfectionDashboardStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getConfectionDashboard().then(setStats).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!stats) return <div className="p-6 text-slate-500">{t('loading')}</div>

  const compliance = [
    { name: t('deliveryOnTime'), value: stats.delivery_compliance.on_time },
    { name: t('deliveryLate'), value: stats.delivery_compliance.late },
    { name: t('deliveryNoDate'), value: stats.delivery_compliance.no_date },
  ]

  const kpis = [
    { label: t('kpiActive'), value: stats.active_count, color: 'bg-teal-500' },
    { label: t('kpiCompleted'), value: stats.completed_count, color: 'bg-green-500' },
    { label: t('confKpiTeams'), value: stats.teams_active, color: 'bg-purple-500' },
    { label: t('confKpiHours'), value: stats.total_hours.toLocaleString(), color: 'bg-amber-500' },
    { label: t('confKpiPct'), value: `${stats.avg_pct_done}%`, color: 'bg-blue-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t('confDashboardTitle')}</h2>
        <ExportButtons
          basePath="/confection/export?status=activa"
          filenameBase="confection"
          onError={setError}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border p-4">
            <div className={`w-2 h-2 rounded-full ${kpi.color} mb-2`} />
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold mb-4">{t('confChartTeamLoad')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.team_load}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="team" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="working_days" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold mb-4">{t('chartDelivery')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={compliance} dataKey="value" nameKey="name" outerRadius={100} label>
                {compliance.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold mb-4">{t('confChartByType')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.by_type.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold mb-4">{t('chartTopCustomers')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.by_customer} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="customer" width={80} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
