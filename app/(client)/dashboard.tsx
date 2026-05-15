import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { calculateLevelProgress } from '../../src/lib/levels'
import { LoyaltyRelation, Reward } from '../../src/types'
import {
  colors,
  gradients,
  radius,
  fontSize,
  fontWeight,
  shadows,
  levelColorWithOpacity,
} from '../../src/theme'
import { ProgressBar } from '../../src/components/ui/ProgressBar'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { Button } from '../../src/components/ui/Button'
import { MerchantCard } from '../../src/components/ui/MerchantCard'
import {
  addToAppleWallet,
  addToGoogleWallet,
  addToSamsungWallet,
  isIOS,
  isAndroid,
  isSamsung,
} from '../../src/services/wallet'

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://www.saya-card.com'

interface RelationWithRewards extends LoyaltyRelation {
  rewards: Reward[]
}

interface DiscoverMerchant {
  id: string
  name: string
  logo_url: string | null
  address: string | null
  category: string | null
  opening_hours: Record<string, { closed: boolean; open: string; close: string }> | null
  is_member: boolean
}

function getOpenStatus(hours: DiscoverMerchant['opening_hours']): { open: boolean; label: string } {
  if (!hours) return { open: false, label: 'Horaires non renseignés' }
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const now  = new Date()
  const key  = days[now.getDay()]
  const today = hours[key]
  if (!today || today.closed) return { open: false, label: "Fermé aujourd'hui" }
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (nowMin >= toMin(today.open) && nowMin < toMin(today.close))
    return { open: true, label: `Ouvert · Ferme à ${today.close}` }
  if (nowMin < toMin(today.open)) return { open: false, label: `Ouvre à ${today.open}` }
  return { open: false, label: 'Fermé · Ouvre demain' }
}

type WalletLoading = 'apple' | 'google' | 'samsung' | null

export default function ClientDashboard() {
  const { client, refreshProfile } = useAuth()
  const router = useRouter()
  const [relations, setRelations] = useState<RelationWithRewards[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [levelAlertVisible, setLevelAlertVisible] = useState(false)
  const [walletLoading, setWalletLoading] = useState<WalletLoading>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Discover tab
  const [merchantTab, setMerchantTab] = useState<'mine' | 'discover'>('mine')
  const [discoverMerchants, setDiscoverMerchants] = useState<DiscoverMerchant[]>([])
  const [discoverCategories, setDiscoverCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [discoverLoading, setDiscoverLoading] = useState(false)

  useEffect(() => {
    if (client?.level_alert) setLevelAlertVisible(true)
  }, [client?.level_alert])

  const loadData = useCallback(async () => {
    if (!client) return
    try {
      const { data: relData } = await supabase
        .from('loyalty_relations')
        .select('*, merchants(*)')
        .eq('client_id', client.id)
        .order('last_visit', { ascending: false })

      if (!relData) return

      const enriched: RelationWithRewards[] = await Promise.all(
        relData.map(async (rel) => {
          const { data: rewardsData } = await supabase
            .from('rewards')
            .select('*')
            .eq('merchant_id', rel.merchant_id)
            .eq('is_active', true)
            .order('points_cost', { ascending: true })
          return { ...rel, rewards: rewardsData ?? [] }
        })
      )
      setRelations(enriched)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [client])

  useEffect(() => { loadData() }, [loadData])

  const loadDiscover = useCallback(async () => {
    if (!client) return
    setDiscoverLoading(true)
    try {
      let query = supabase
        .from('merchants')
        .select('id, name, logo_url, address, category, opening_hours')
        .eq('subscription_status', 'active')
        .not('category', 'is', null)
        .order('name')

      if (selectedCategory) query = query.eq('category', selectedCategory)

      const { data } = await query
      const memberOf = new Set(relations.map(r => r.merchant_id))
      const result: DiscoverMerchant[] = (data ?? []).map(m => ({ ...m, is_member: memberOf.has(m.id) }))
      setDiscoverMerchants(result)

      // Extract categories
      if (!selectedCategory) {
        const cats = [...new Set(result.map(m => m.category).filter(Boolean) as string[])].sort()
        setDiscoverCategories(cats)
      }
    } finally {
      setDiscoverLoading(false)
    }
  }, [client, selectedCategory, relations])

  useEffect(() => {
    if (merchantTab === 'discover') loadDiscover()
  }, [merchantTab, loadDiscover])

  async function dismissLevelAlert() {
    setLevelAlertVisible(false)
    if (!client) return
    await supabase.from('clients').update({ level_alert: null }).eq('id', client.id)
    await refreshProfile()
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
    refreshProfile()
  }, [loadData, refreshProfile])

  async function handleWallet(type: 'apple' | 'google' | 'samsung') {
    setWalletLoading(type)
    try {
      const fn =
        type === 'apple'
          ? addToAppleWallet
          : type === 'google'
          ? addToGoogleWallet
          : addToSamsungWallet
      const result = await fn()
      if (!result.success) Alert.alert('Erreur', result.error ?? 'Une erreur est survenue.')
    } finally {
      setWalletLoading(null)
    }
  }

  if (!client) {
    return (
      <LinearGradient colors={gradients.clientBg} style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </LinearGradient>
    )
  }

  const progress = calculateLevelProgress(
    client.scans_last_30d,
    client.current_level,
    client.level_updated_at,
    client.level_alert
  )
  const qrValue = `${APP_URL}/card/${client.qr_token}`
  const isLevelUp = progress.levelAlert === 'level_up'

  return (
    <LinearGradient colors={gradients.clientBg} style={styles.root}>
      {/* ── Level alert modal ───────────────── */}
      <Modal
        visible={levelAlertVisible}
        transparent
        animationType="fade"
        onRequestClose={dismissLevelAlert}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[
              styles.modalIconBox,
              { backgroundColor: isLevelUp ? 'rgba(168,85,247,0.15)' : 'rgba(239,68,68,0.12)' },
            ]}>
              <Ionicons
                name={isLevelUp ? 'trophy' : 'trending-down'}
                size={36}
                color={isLevelUp ? colors.primary : colors.danger}
              />
            </View>
            <Text style={styles.modalTitle}>
              {isLevelUp ? 'Félicitations !' : 'Niveau baissé'}
            </Text>
            <Text style={styles.modalBody}>
              {isLevelUp
                ? `Tu es passé(e) au niveau ${progress.currentLevel.emoji} ${progress.currentLevel.name} !`
                : `Tu es maintenant ${progress.currentLevel.emoji} ${progress.currentLevel.name}.`}
            </Text>
            <Button onPress={dismissLevelAlert} size="md">Super !</Button>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* ── Header ─────────────────────────── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.headerName}>{client.first_name} {client.last_name}</Text>
              <Text style={styles.headerEmail}>{client.email}</Text>
            </View>
          </View>

          {/* ── QR Code card ────────────────────── */}
          <View style={styles.section}>
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Ma carte de fidélité</Text>
              <View style={styles.qrCodeBox}>
                <QRCode
                  value={qrValue}
                  size={180}
                  color="#1e1b4b"
                  backgroundColor="white"
                />
              </View>
              <Text style={styles.qrHint}>Présentez ce QR code à votre commerçant</Text>

              {/* ── Wallet buttons ───────────────── */}
              <View style={styles.walletRow}>
                {isIOS && (
                  <TouchableOpacity
                    style={styles.walletBtn}
                    onPress={() => handleWallet('apple')}
                    disabled={walletLoading !== null}
                    activeOpacity={0.8}
                  >
                    {walletLoading === 'apple' ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="wallet-outline" size={16} color="#fff" />
                        <Text style={styles.walletBtnText}>Apple Wallet</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {isAndroid && (
                  <TouchableOpacity
                    style={[styles.walletBtn, styles.walletBtnGoogle]}
                    onPress={() => handleWallet('google')}
                    disabled={walletLoading !== null}
                    activeOpacity={0.8}
                  >
                    {walletLoading === 'google' ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="wallet-outline" size={16} color="#fff" />
                        <Text style={styles.walletBtnText}>Google Wallet</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {isSamsung && (
                  <TouchableOpacity
                    style={[styles.walletBtn, styles.walletBtnSamsung]}
                    onPress={() => handleWallet('samsung')}
                    disabled={walletLoading !== null}
                    activeOpacity={0.8}
                  >
                    {walletLoading === 'samsung' ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="wallet-outline" size={16} color="#fff" />
                        <Text style={styles.walletBtnText}>Samsung Wallet</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* ── Level widget ────────────────────── */}
          <View style={styles.section}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(client)/levels')}
              style={[
                styles.levelCard,
                {
                  backgroundColor: levelColorWithOpacity(progress.currentLevel.color, 0.10),
                  borderColor: levelColorWithOpacity(progress.currentLevel.color, 0.30),
                },
              ]}
            >
              <View style={styles.levelTopRow}>
                <View style={styles.levelLeft}>
                  <Text style={styles.levelEmoji}>{progress.currentLevel.emoji}</Text>
                  <View>
                    <Text style={styles.levelName}>{progress.currentLevel.name}</Text>
                    <Text style={styles.levelSub}>Niveau {progress.currentLevel.level_number}/6</Text>
                  </View>
                </View>
                <View style={styles.levelRight}>
                  <Text style={[styles.levelScans, { color: progress.currentLevel.color }]}>
                    {client.scans_last_30d}
                  </Text>
                  <Text style={styles.levelScansLabel}>scans / 30j</Text>
                </View>
              </View>

              {progress.nextLevel && (
                <>
                  <View style={styles.levelProgressRow}>
                    <Text style={styles.levelProgressLabel}>
                      Prochain : {progress.nextLevel.emoji} {progress.nextLevel.name}
                    </Text>
                    <Text style={styles.levelProgressLabel}>
                      {progress.scansToNextLevel} restant{progress.scansToNextLevel > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <ProgressBar
                    percent={progress.progressPercent}
                    color={progress.currentLevel.color}
                    trackColor="rgba(255,255,255,0.12)"
                    height={6}
                  />
                </>
              )}

              {!progress.nextLevel && (
                <View style={styles.levelMaxRow}>
                  <Ionicons name="trophy" size={14} color="#f1c40f" />
                  <Text style={styles.levelMax}>Niveau maximum atteint</Text>
                </View>
              )}

              {progress.isInGracePeriod && (
                <View style={styles.graceBox}>
                  <Ionicons name="shield-checkmark" size={13} color="#93c5fd" />
                  <Text style={styles.graceText}>
                    Période de grâce :{' '}
                    <Text style={styles.graceBold}>
                      {progress.daysUntilGraceEnds} jour{(progress.daysUntilGraceEnds ?? 0) > 1 ? 's' : ''}
                    </Text>{' '}
                    restant{(progress.daysUntilGraceEnds ?? 0) > 1 ? 's' : ''}
                  </Text>
                </View>
              )}

              <View style={styles.levelSeeMore}>
                <Text style={styles.levelSeeMoreText}>Voir les détails</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.dark.muted} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Merchants ───────────────────────── */}
          <View style={styles.section}>

            {/* Tabs */}
            <View style={styles.tabRow}>
              {(['mine', 'discover'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, merchantTab === tab && styles.tabActive]}
                  onPress={() => setMerchantTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, merchantTab === tab && styles.tabTextActive]}>
                    {tab === 'mine' ? `Mes commerçants (${relations.length})` : 'Découvrir'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Onglet Mes commerçants ── */}
            {merchantTab === 'mine' && (
              <>
                {!loading && relations.length > 0 && (
                  <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={15} color={colors.dark.muted} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Rechercher un commerçant..."
                      placeholderTextColor={colors.dark.subtle}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                        <Ionicons name="close-circle" size={15} color={colors.dark.subtle} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {loading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
                ) : relations.length === 0 ? (
                  <EmptyState
                    theme="dark"
                    iconName="storefront-outline"
                    title="Aucun commerçant encore"
                    subtitle="Scannez votre QR code chez un commerçant pour commencer à cumuler des points."
                  />
                ) : (() => {
                  const filtered = searchQuery.trim()
                    ? relations.filter((r) =>
                        r.merchants?.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                      )
                    : relations
                  return filtered.length === 0 ? (
                    <Text style={styles.noResults}>Aucun commerçant trouvé</Text>
                  ) : (
                    <View style={styles.merchantList}>
                      {filtered.map((rel) => {
                        const merchant = rel.merchants
                        if (!merchant) return null
                        const availableRewards = rel.rewards.filter(
                          (r) => rel.current_points >= r.points_cost
                        )
                        return (
                          <MerchantCard
                            key={rel.id}
                            name={merchant.name}
                            logoUrl={merchant.logo_url}
                            currentPoints={rel.current_points}
                            visitsCount={rel.visits_count}
                            lastVisit={rel.last_visit}
                            address={merchant.address}
                            openingHours={merchant.opening_hours}
                            rewards={rel.rewards}
                            availableRewards={availableRewards}
                          />
                        )
                      })}
                    </View>
                  )
                })()}
              </>
            )}

            {/* ── Onglet Découvrir ── */}
            {merchantTab === 'discover' && (
              <>
                {/* Filtres catégorie */}
                {discoverCategories.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.catScroll}
                    contentContainerStyle={styles.catScrollContent}
                  >
                    <TouchableOpacity
                      style={[styles.catChip, !selectedCategory && styles.catChipActive]}
                      onPress={() => setSelectedCategory(null)}
                    >
                      <Text style={[styles.catChipText, !selectedCategory && styles.catChipTextActive]}>
                        Tous
                      </Text>
                    </TouchableOpacity>
                    {discoverCategories.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                        onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      >
                        <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {discoverLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
                ) : discoverMerchants.length === 0 ? (
                  <EmptyState
                    theme="dark"
                    iconName="storefront-outline"
                    title="Aucun commerçant"
                    subtitle={selectedCategory ? `Aucun commerçant dans "${selectedCategory}"` : "Aucun commerçant disponible pour l'instant."}
                  />
                ) : (
                  <View style={[styles.merchantList]}>
                    {discoverMerchants.map(m => {
                      const status = getOpenStatus(m.opening_hours)
                      return (
                        <View key={m.id} style={styles.discoverCard}>
                          <View style={styles.discoverHeader}>
                            <View style={styles.discoverAvatar}>
                              <Text style={styles.discoverAvatarText}>{m.name[0]}</Text>
                            </View>
                            <View style={styles.discoverInfo}>
                              <View style={styles.discoverNameRow}>
                                <Text style={styles.discoverName} numberOfLines={1}>{m.name}</Text>
                                {m.is_member && (
                                  <View style={styles.memberBadge}>
                                    <Text style={styles.memberBadgeText}>Membre</Text>
                                  </View>
                                )}
                              </View>
                              <View style={styles.discoverBadgeRow}>
                                <View style={[styles.statusDot, { backgroundColor: status.open ? '#4ade80' : 'rgba(255,255,255,0.3)' }]} />
                                <Text style={styles.discoverStatusText}>{status.label}</Text>
                              </View>
                              {m.category && (
                                <View style={styles.catBadge}>
                                  <Text style={styles.catBadgeText}>{m.category}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          {m.address && (
                            <Text style={styles.discoverAddress} numberOfLines={1}>
                              📍 {m.address}
                            </Text>
                          )}
                          {!m.is_member && (
                            <Text style={styles.discoverHint}>
                              Présentez votre QR code en magasin pour rejoindre
                            </Text>
                          )}
                        </View>
                      )
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.dark.card,
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
    padding: 28,
    width: '100%',
    alignItems: 'center',
  },
  modalIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: fontSize.base,
    color: colors.dark.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  // Layout
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: { fontSize: fontSize.sm, color: colors.dark.muted, marginBottom: 2 },
  headerName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  headerEmail: { fontSize: fontSize.sm, color: colors.dark.subtle, marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 16 },

  // QR Card
  qrCard: {
    backgroundColor: colors.glass.bgStrong,
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.glass.borderStrong,
    padding: 24,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: 18,
  },
  qrCodeBox: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: 14,
    ...shadows.lg,
  },
  qrHint: {
    fontSize: fontSize.xs,
    color: colors.dark.muted,
    marginTop: 14,
    textAlign: 'center',
  },

  // Wallet buttons
  walletRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  walletBtnGoogle: { backgroundColor: '#1a73e8' },
  walletBtnSamsung: { backgroundColor: '#1428a0' },
  walletBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#ffffff',
  },

  // Level widget
  levelCard: {
    borderRadius: radius['3xl'],
    borderWidth: 1,
    padding: 18,
  },
  levelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelEmoji: { fontSize: 28 },
  levelName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  levelSub: { fontSize: fontSize.xs, color: colors.dark.muted, marginTop: 1 },
  levelRight: { alignItems: 'flex-end' },
  levelScans: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  levelScansLabel: { fontSize: fontSize.xs, color: colors.dark.muted },
  levelProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  levelProgressLabel: { fontSize: fontSize.xs, color: colors.dark.muted },
  levelMaxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  levelMax: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#f1c40f',
  },
  graceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  graceText: { fontSize: fontSize.xs, color: '#93c5fd', flex: 1 },
  graceBold: { fontWeight: fontWeight.bold },
  levelSeeMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 4,
  },
  levelSeeMoreText: { fontSize: fontSize.xs, color: colors.dark.muted },

  // Section title
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginBottom: 12,
  },

  // Merchant list
  merchantList: { gap: 10, paddingBottom: 32 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.dark.text,
  },
  noResults: {
    fontSize: fontSize.sm,
    color: colors.dark.muted,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 32,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.xl,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255,255,255,0.55)',
  },
  tabTextActive: {
    color: '#6d28d9',
  },

  // Category chips
  catScroll: { marginBottom: 12 },
  catScrollContent: { gap: 8, paddingRight: 4 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  catChipActive: {
    backgroundColor: '#ffffff',
  },
  catChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255,255,255,0.60)',
  },
  catChipTextActive: {
    color: '#6d28d9',
  },

  // Discover card
  discoverCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    gap: 8,
  },
  discoverHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  discoverAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  discoverAvatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: 'rgba(255,255,255,0.70)',
  },
  discoverInfo: { flex: 1, gap: 3 },
  discoverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discoverName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    flexShrink: 1,
  },
  memberBadge: {
    backgroundColor: 'rgba(74,222,128,0.20)',
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#4ade80',
  },
  discoverBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  discoverStatusText: { fontSize: 10, color: colors.dark.muted },
  catBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168,85,247,0.20)',
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: '#c084fc',
  },
  discoverAddress: {
    fontSize: fontSize.xs,
    color: colors.dark.subtle,
  },
  discoverHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
  },
})
