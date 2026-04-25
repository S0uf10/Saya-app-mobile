import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { LoyaltyRelation } from '../../src/types'
import { colors, radius, fontSize, fontWeight, shadows } from '../../src/theme'
import { Avatar } from '../../src/components/ui/Avatar'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { Badge } from '../../src/components/ui/Badge'
import { Button } from '../../src/components/ui/Button'
import { ProgressBar } from '../../src/components/ui/ProgressBar'
import { MiniLineChart } from '../../src/components/ui/MiniLineChart'
import { MiniBarChart } from '../../src/components/ui/MiniBarChart'
import { fetchAnalytics, AnalyticsPeriod, AnalyticsData } from '../../src/services/analytics'

const SCREEN_W = Dimensions.get('window').width
// screen paddingH (20×2=40) + card padding (14×2=28)
const CHART_W = SCREEN_W - 40 - 28
// screen paddingH (40) + inter-card gap (10) + card padding (14×2=28)
const HALF_W  = (SCREEN_W - 50) / 2 - 28

const planLabel: Record<string, { label: string; color: 'purple' | 'amber' | 'blue' }> = {
  starter:  { label: 'Starter',  color: 'blue' },
  business: { label: 'Business', color: 'purple' },
  premium:  { label: 'Premium',  color: 'amber' },
}

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7d',    label: '7 jours' },
  { key: '30d',   label: '30 jours' },
]

// ── Delta badge ──────────────────────────────────────────────────────────────

function Delta({ value }: { value: number | null }) {
  if (value === null) return null
  const up = value >= 0
  return (
    <Text style={[styles.delta, { color: up ? colors.success : colors.danger }]}>
      {up ? '▲' : '▼'} {Math.abs(value)}%
    </Text>
  )
}

// ── Analytics KPI card ───────────────────────────────────────────────────────

function AnalyticsKPI({
  icon, iconColor, iconBg, label, value, suffix, delta, deltaLabel,
}: {
  icon: string; iconColor: string; iconBg: string; label: string
  value: number | string; suffix?: string; delta?: number | null; deltaLabel?: string
}) {
  return (
    <View style={styles.analyticsKpiCard}>
      <View style={[styles.analyticsKpiIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={styles.analyticsKpiBody}>
        <View style={styles.analyticsKpiValueRow}>
          <Text style={[styles.analyticsKpiValue, { color: iconColor }]}>{value}</Text>
          {suffix && <Text style={[styles.analyticsKpiSuffix, { color: iconColor }]}>{suffix}</Text>}
        </View>
        <Text style={styles.analyticsKpiLabel} numberOfLines={2}>{label}</Text>
        {delta !== undefined && (
          <View style={styles.analyticsKpiDeltaRow}>
            <Delta value={delta ?? null} />
            {deltaLabel && <Text style={styles.analyticsKpiDeltaLbl}> {deltaLabel}</Text>}
          </View>
        )}
      </View>
    </View>
  )
}

// ── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {subtitle && <Text style={styles.chartSubtitle}>{subtitle}</Text>}
      <View style={styles.chartBody}>{children}</View>
    </View>
  )
}

// ── Insights ─────────────────────────────────────────────────────────────────

function InsightsPanel({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null
  return (
    <View style={styles.chartCard}>
      <View style={styles.insightsTitleRow}>
        <Ionicons name="bulb-outline" size={14} color={colors.warning} />
        <Text style={styles.insightsTitle}>Insights automatiques</Text>
      </View>
      <View style={styles.insightsList}>
        {insights.map((txt, i) => (
          <View key={i} style={styles.insightItem}>
            <Text style={styles.insightText}>{txt}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonKpiRow}>
        {[0, 1, 2, 3].map(i => <View key={i} style={styles.skeletonKpi} />)}
      </View>
      <View style={styles.skeletonChart} />
      <View style={styles.skeletonRow}>
        <View style={[styles.skeletonChart, { flex: 1 }]} />
        <View style={[styles.skeletonChart, { flex: 1 }]} />
      </View>
    </View>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function MerchantDashboard() {
  const { merchant } = useAuth()
  const router = useRouter()
  const [recentRelations, setRecentRelations] = useState<LoyaltyRelation[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [period, setPeriod] = useState<AnalyticsPeriod>('7d')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    if (!merchant) return
    setAnalyticsLoading(true)
    setAnalyticsError(null)
    try {
      const data = await fetchAnalytics(period)
      setAnalytics(data)
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [merchant, period])

  const loadRecent = useCallback(async () => {
    if (!merchant) return
    const { data } = await supabase
      .from('loyalty_relations')
      .select('*, clients(first_name, last_name, email)')
      .eq('merchant_id', merchant.id)
      .order('last_visit', { ascending: false })
      .limit(10)
    setRecentRelations(data ?? [])
    setRecentLoading(false)
    setRefreshing(false)
  }, [merchant])

  useEffect(() => { loadAnalytics() }, [loadAnalytics])
  useEffect(() => { loadRecent() }, [loadRecent])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadAnalytics()
    loadRecent()
  }, [loadAnalytics, loadRecent])

  if (!merchant) return null

  const plan = merchant.subscription_plan ? planLabel[merchant.subscription_plan] : null
  const k = analytics?.kpis

  // Hourly: filter to hours 7-22 that have scans or are typical business hours
  const hourlyData = (analytics?.hourly ?? [])
    .filter(h => h.rawHour >= 7 && h.rawHour <= 22)
    .map(h => ({ label: `${h.rawHour}h`, value: h.scans }))

  const dowData = (analytics?.dayOfWeek ?? []).map((d, i) => ({
    label: d.day,
    value: d.scans,
    highlight: i === 0 || i === 6,
  }))

  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? ''

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.inner}>

          {/* ── Header ──────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.merchantName}>{merchant.name}</Text>
            </View>
            {plan && <Badge label={plan.label} color={plan.color} size="md" />}
          </View>

          {/* ── Scan CTA ────────────────────────────────────────── */}
          <Button onPress={() => router.push('/(merchant)/scan')} size="lg" style={styles.scanBtn}>
            <Ionicons name="scan-outline" size={20} color="#ffffff" />
            {'  '}Scanner un QR code
          </Button>

          {/* ── Period selector ──────────────────────────────────── */}
          <View style={styles.periodRow}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
                onPress={() => setPeriod(p.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Analytics ───────────────────────────────────────── */}
          {analyticsLoading ? (
            <AnalyticsSkeleton />
          ) : analyticsError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{analyticsError}</Text>
            </View>
          ) : analytics && (
            <>
              {/* KPI grid 2×2 */}
              <View style={styles.kpiGrid}>
                <AnalyticsKPI
                  icon="people"
                  iconColor="#9333ea"
                  iconBg="rgba(147,51,234,0.10)"
                  label={`Clients sur ${periodLabel.toLowerCase()}`}
                  value={k!.clientsInPeriod}
                  delta={k!.clientsInPeriodDelta}
                  deltaLabel="vs période préc."
                />
                <AnalyticsKPI
                  icon="scan"
                  iconColor="#10b981"
                  iconBg="rgba(16,185,129,0.10)"
                  label={`Scans sur ${periodLabel.toLowerCase()}`}
                  value={k!.scansInPeriod}
                  delta={k!.scansInPeriodDelta}
                  deltaLabel="vs période préc."
                />
                <AnalyticsKPI
                  icon="repeat"
                  iconColor="#3b82f6"
                  iconBg="rgba(59,130,246,0.10)"
                  label="Taux de rétention"
                  value={Math.round(k!.retentionRate * 100)}
                  suffix="%"
                  deltaLabel="clients revenus 2× ou +"
                />
                <AnalyticsKPI
                  icon="star"
                  iconColor="#f59e0b"
                  iconBg="rgba(245,158,11,0.10)"
                  label="Points / visite"
                  value={k!.avgPointsPerVisit.toFixed(1)}
                  suffix=" pts"
                  deltaLabel="moyenne générale"
                />
              </View>

              {/* Sub KPIs row */}
              <View style={styles.subKpiRow}>
                <View style={styles.subKpiCard}>
                  <Text style={styles.subKpiValue}>{k!.totalClients}</Text>
                  <Text style={styles.subKpiLabel}>Clients actifs</Text>
                </View>
                <View style={styles.subKpiCard}>
                  <Text style={styles.subKpiValue}>{k!.scansToday}</Text>
                  <View style={styles.subKpiDeltaRow}>
                    <Text style={styles.subKpiLabel}>Scans aujourd'hui</Text>
                    <Delta value={k!.scansTodayDelta} />
                  </View>
                </View>
              </View>

              {/* Line chart: daily evolution */}
              {analytics.hasData && analytics.dailyScans.length > 0 && (
                <ChartCard
                  title={`Évolution — ${periodLabel}`}
                  subtitle="Scans (violet) · Clients uniques (vert)"
                >
                  <MiniLineChart
                    data={analytics.dailyScans.map(d => ({
                      label: d.label,
                      v1: d.scans,
                      v2: d.clients,
                    }))}
                    width={CHART_W}
                    height={140}
                    color1={colors.primary}
                    color2={colors.success}
                  />
                </ChartCard>
              )}

              {analytics.hasData && (
                <>
                  {/* Hourly + Day of week side by side */}
                  <View style={styles.chartRow}>
                    <View style={[styles.chartCard, { flex: 1 }]}>
                      <Text style={styles.chartTitle}>Par heure</Text>
                      <Text style={styles.chartSubtitle}>7h–22h</Text>
                      <View style={styles.chartBody}>
                        <MiniBarChart
                          data={hourlyData}
                          width={HALF_W}
                          height={110}
                          barColor={colors.primary}
                          labelStep={4}
                          showLastLabel={false}
                        />
                      </View>
                    </View>
                    <View style={[styles.chartCard, { flex: 1 }]}>
                      <Text style={styles.chartTitle}>Par jour</Text>
                      <Text style={styles.chartSubtitle}>Semaine</Text>
                      <View style={styles.chartBody}>
                        <MiniBarChart
                          data={dowData}
                          width={HALF_W}
                          height={110}
                          barColor={colors.primary}
                          highlightColor="#ddd6fe"
                          labelStep={1}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Level distribution */}
                  {analytics.levelDistribution.some(l => l.count > 0) && (
                    <ChartCard
                      title="Répartition par niveau"
                      subtitle="Clients par niveau de fidélité"
                    >
                      <View style={styles.levelList}>
                        {(() => {
                          const maxCount = Math.max(...analytics.levelDistribution.map(l => l.count), 1)
                          return analytics.levelDistribution.map(l => (
                            <View key={l.name} style={styles.levelRow}>
                              <Text style={styles.levelEmoji}>{l.emoji}</Text>
                              <Text style={styles.levelName} numberOfLines={1}>{l.name}</Text>
                              <View style={styles.levelBarWrap}>
                                <ProgressBar
                                  percent={Math.round((l.count / maxCount) * 100)}
                                  color={l.color}
                                  trackColor="#f1f5f9"
                                  height={6}
                                />
                              </View>
                              <Text style={[styles.levelCount, { color: l.color }]}>{l.count}</Text>
                            </View>
                          ))
                        })()}
                      </View>
                    </ChartCard>
                  )}

                  {/* Age distribution */}
                  {analytics.ageDistribution.some(a => a.scans > 0) && (
                    <ChartCard
                      title="Répartition par âge"
                      subtitle="Scans par tranche d'âge"
                    >
                      <View style={styles.levelList}>
                        {(() => {
                          const maxScans = Math.max(...analytics.ageDistribution.map(a => a.scans), 1)
                          return analytics.ageDistribution
                            .filter(a => a.scans > 0)
                            .map(a => (
                              <View key={a.range} style={styles.levelRow}>
                                <Text style={styles.ageLabel}>{a.range}</Text>
                                <View style={styles.levelBarWrap}>
                                  <ProgressBar
                                    percent={Math.round((a.scans / maxScans) * 100)}
                                    color={colors.primary}
                                    trackColor="#f1f5f9"
                                    height={6}
                                  />
                                </View>
                                <Text style={styles.levelCount}>{a.scans}</Text>
                              </View>
                            ))
                        })()}
                      </View>
                    </ChartCard>
                  )}

                  {/* Presets ranking */}
                  {analytics.presets.length > 0 && analytics.presets.some(p => p.uses > 0) && (
                    <ChartCard
                      title="Raccourcis les plus utilisés"
                      subtitle="Sur la période sélectionnée"
                    >
                      <View style={styles.presetList}>
                        {(() => {
                          const maxUses = Math.max(...analytics.presets.map(p => p.uses), 1)
                          const total = analytics.presets.reduce((s, p) => s + p.uses, 0)
                          return analytics.presets.slice(0, 8).map((p, i) => (
                            <View key={i} style={styles.presetRow}>
                              <Text style={styles.presetRank}>#{i + 1}</Text>
                              <View style={styles.presetInfo}>
                                <View style={styles.presetTopRow}>
                                  <Text style={styles.presetLabel} numberOfLines={1}>{p.label}</Text>
                                  <Text style={styles.presetUses}>
                                    {p.uses}×{total > 0 ? ` · ${Math.round((p.uses / total) * 100)}%` : ''}
                                  </Text>
                                </View>
                                <ProgressBar
                                  percent={Math.round((p.uses / maxUses) * 100)}
                                  color={colors.primary}
                                  trackColor="#f1f5f9"
                                  height={4}
                                />
                              </View>
                              <Text style={styles.presetPts}>{p.points} pts</Text>
                            </View>
                          ))
                        })()}
                      </View>
                    </ChartCard>
                  )}

                  {/* Insights */}
                  <InsightsPanel insights={analytics.insights} />
                </>
              )}

              {!analytics.hasData && (
                <View style={styles.noDataBox}>
                  <Ionicons name="bar-chart-outline" size={24} color={colors.light.muted} />
                  <Text style={styles.noDataTitle}>Aucune donnée</Text>
                  <Text style={styles.noDataSub}>Effectuez des scans pour voir vos statistiques.</Text>
                </View>
              )}
            </>
          )}

          {/* ── Recent visits ────────────────────────────────────── */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Dernières visites</Text>

          {recentLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : recentRelations.length === 0 ? (
            <EmptyState
              iconName="scan-outline"
              title="Aucune visite encore"
              subtitle="Scannez votre premier client pour commencer."
              theme="light"
            />
          ) : (
            <View style={styles.visitList}>
              {recentRelations.map((rel) => {
                const c = rel.clients as any
                const name = c ? `${c.first_name} ${c.last_name}` : 'Client inconnu'
                return (
                  <TouchableOpacity
                    key={rel.id}
                    style={styles.visitCard}
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push({
                        pathname: '/(merchant)/customer-detail',
                        params: { clientId: rel.client_id, relationId: rel.id },
                      })
                    }
                  >
                    <Avatar name={name} size="md" theme="light" />
                    <View style={styles.visitInfo}>
                      <Text style={styles.visitName}>{name}</Text>
                      <Text style={styles.visitMeta}>
                        {rel.visits_count} visite{rel.visits_count > 1 ? 's' : ''}
                        {rel.last_visit
                          ? ` · ${new Date(rel.last_visit).toLocaleDateString('fr-FR')}`
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.visitRight}>
                      <Text style={styles.visitPoints}>{rel.current_points} pts</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.light.muted} />
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.bg },
  inner: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: fontSize.sm, color: colors.light.muted },
  merchantName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginTop: 2,
  },

  // Scan button
  scanBtn: { marginBottom: 20 },

  // Period selector
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: radius.xl,
    padding: 3,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#ffffff',
    ...shadows.sm,
  },
  periodBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.light.muted,
  },
  periodBtnTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff1f2',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: fontSize.sm, color: colors.danger, flex: 1 },

  // Analytics KPI grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  analyticsKpiCard: {
    width: (SCREEN_W - 50) / 2,
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    ...shadows.sm,
  },
  analyticsKpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  analyticsKpiBody: { flex: 1 },
  analyticsKpiValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  analyticsKpiValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  analyticsKpiSuffix: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  analyticsKpiLabel: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
    marginTop: 2,
    lineHeight: 14,
  },
  analyticsKpiDeltaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  analyticsKpiDeltaLbl: { fontSize: 9, color: colors.light.subtle },

  delta: { fontSize: 10, fontWeight: fontWeight.semibold },

  // Sub KPIs
  subKpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  subKpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 14,
    ...shadows.sm,
  },
  subKpiValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  subKpiLabel: { fontSize: fontSize.xs, color: colors.light.muted, marginTop: 2 },
  subKpiDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },

  // Chart card
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  chartTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
  },
  chartSubtitle: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
    marginTop: 2,
    marginBottom: 8,
  },
  chartBody: { marginTop: 4 },

  chartRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 0,
  },

  // Level distribution
  levelList: { gap: 8 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelEmoji: { fontSize: 14, width: 20, textAlign: 'center' },
  levelName: {
    fontSize: fontSize.xs,
    color: colors.light.text,
    width: 70,
    fontWeight: fontWeight.medium,
  },
  levelBarWrap: { flex: 1 },
  levelCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    width: 24,
    textAlign: 'right',
  },

  ageLabel: {
    fontSize: fontSize.xs,
    color: colors.light.text,
    width: 46,
    fontWeight: fontWeight.medium,
  },

  // Presets
  presetList: { gap: 10 },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetRank: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.muted,
    width: 24,
  },
  presetInfo: { flex: 1 },
  presetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  presetLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.light.text,
    flex: 1,
  },
  presetUses: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
    marginLeft: 6,
  },
  presetPts: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
    width: 36,
    textAlign: 'right',
  },

  // Insights
  insightsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
  },
  insightsList: { gap: 8 },
  insightItem: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  insightText: {
    fontSize: fontSize.sm,
    color: '#374151',
    lineHeight: 18,
  },

  // No data
  noDataBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  noDataTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.light.muted,
  },
  noDataSub: {
    fontSize: fontSize.sm,
    color: colors.light.subtle,
    textAlign: 'center',
  },

  // Skeleton
  skeletonWrap: { gap: 10, marginBottom: 12 },
  skeletonKpiRow: { flexDirection: 'row', gap: 10 },
  skeletonKpi: {
    flex: 1,
    height: 88,
    backgroundColor: '#f1f5f9',
    borderRadius: radius.xl,
  },
  skeletonChart: {
    height: 140,
    backgroundColor: '#f1f5f9',
    borderRadius: radius.xl,
  },
  skeletonRow: { flexDirection: 'row', gap: 10 },

  // Section title
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: 12,
  },
  loader: { marginTop: 16 },

  // Recent visits
  visitList: { gap: 8 },
  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 14,
    gap: 12,
    ...shadows.sm,
  },
  visitInfo: { flex: 1 },
  visitName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
  },
  visitMeta: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
    marginTop: 2,
  },
  visitRight: { alignItems: 'flex-end', gap: 4 },
  visitPoints: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
})
