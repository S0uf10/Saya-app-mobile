import { supabase } from '../lib/supabase'

const WEB_APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://www.saya-card.com'

export type AnalyticsPeriod = 'today' | '7d' | '30d'

export interface AnalyticsData {
  period: string
  kpis: {
    clientsInPeriod: number
    clientsInPeriodDelta: number | null
    scansInPeriod: number
    scansInPeriodDelta: number | null
    scansToday: number
    scansTodayDelta: number | null
    totalClients: number
    avgPointsPerVisit: number
    retentionRate: number
  }
  dailyScans: Array<{ date: string; label: string; scans: number; clients: number }>
  hourly: Array<{ hour: string; rawHour: number; scans: number }>
  dayOfWeek: Array<{ day: string; scans: number }>
  ageDistribution: Array<{ range: string; clients: number; scans: number }>
  levelDistribution: Array<{ name: string; emoji: string; color: string; count: number }>
  presets: Array<{ label: string; points: number; uses: number }>
  insights: string[]
  hasData: boolean
}

export async function fetchAnalytics(period: AnalyticsPeriod): Promise<AnalyticsData> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Non authentifié')

  const res = await fetch(`${WEB_APP_URL}/api/merchants/analytics?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Erreur serveur')
  }

  return res.json()
}
