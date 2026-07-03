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
import { downloadFromApi } from '../utils/export'
import { useI18n } from '../i18n/I18nProvider'
import type { DashboardStats } from '../types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function formatKg(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function Dashboard() {
  const { t } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.getDashboard().then(setStats).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!stats) return <div className="p-6 text-slate-500">{t('loading')}</div>

  const compliance = [
    { name: t('deliveryOnTime'), value: stats.delivery_compliance.on_time },
    { name: t('deliveryLate'), value: stats.delivery_compliance.late },
    { name: t('deliveryNoDate'), value: stats.delivery_compliance.no_date },
  ]

  const kpis = [
    { label: t('kpiActive'), value: stats.active_count, color: 'bg-blue-500' },
    { label: t('kpiCompleted'), value: stats.completed_count, color: 'bg-green-500' },
    { label: t('kpiMachines'), value: stats.machines_active, color: 'bg-purple-500' },
    { label: t('kpiKgPlanned'), value: formatKg(stats.total_planned_kg), color: 'bg-amber-500' },
    { label: t('kpiKgProduced'), value: formatKg(stats.total_produced_kg), color: 'bg-emerald-500' },
    { label: t('kpiKgRemaining'), value: formatKg(stats.total_remaining_kg), color: 'bg-orange-500' },
    { label: t('kpiMeters'), value: stats.total_planned_meters.toLocaleString(), color: 'bg-slate-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t('dashboardTitle')}</h2>
        <button
          onClick={async () => {
            setDownloading(true)
            try { await downloadFromApi('/export/dashboard', 'dashboard.xlsx') }
            catch (e) { setError(e instanceof Error ? e.message : t('error')) }
            finally { setDownloading(false) }
          }}
          disabled={downloading}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900 disabled:opacity-50"
        >
          {downloading ? t('downloading') : t('dashboardDownload')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
          <h3 className="font-semibold mb-4">{t('chartMachineLoad')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.machine_load}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="machine" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="working_days" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold mb-4">{t('chartMachineKg')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.machine_load}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="machine" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} kg`, t('kpiKgPlanned')]} />
              <Bar dataKey="kg" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold mb-4">{t('chartByMaterial')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.by_material} dataKey="kg" nameKey="material" cx="50%" cy="50%" outerRadius={90} label>
                {stats.by_material.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} kg`, t('kpiKgPlanned')]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold mb-4">{t('chartDelivery')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={compliance} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#94a3b8" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 lg:col-span-2">
          <h3 className="font-semibold mb-4">{t('chartTopCustomers')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.by_customer} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="customer" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} kg`, t('kpiKgPlanned')]} />
              <Bar dataKey="kg" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
