import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import {
  colors,
  gradients,
  radius,
  fontSize,
  fontWeight,
} from '../../src/theme'

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
  const now   = new Date()
  const key   = days[now.getDay()]
  const today = hours[key]
  if (!today || today.closed) return { open: false, label: "Fermé aujourd'hui" }
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (nowMin >= toMin(today.open) && nowMin < toMin(today.close))
    return { open: true, label: `Ouvert · Ferme à ${today.close}` }
  if (nowMin < toMin(today.open)) return { open: false, label: `Ouvre à ${today.open}` }
  return { open: false, label: 'Fermé · Ouvre demain' }
}

export default function DecouvertePage() {
  const { client } = useAuth()
  const router = useRouter()
  const [merchants, setMerchants] = useState<DiscoverMerchant[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())

  const loadMemberIds = useCallback(async () => {
    if (!client) return
    const { data } = await supabase
      .from('loyalty_relations')
      .select('merchant_id')
      .eq('client_id', client.id)
    setMemberIds(new Set((data ?? []).map((r: { merchant_id: string }) => r.merchant_id)))
  }, [client])

  const loadMerchants = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('merchants')
        .select('id, name, logo_url, address, category, opening_hours')
        .eq('subscription_status', 'active')
        .not('category', 'is', null)
        .order('name')

      if (selectedCat) query = query.eq('category', selectedCat)

      const { data } = await query
      const result: DiscoverMerchant[] = (data ?? []).map((m: Omit<DiscoverMerchant, 'is_member'>) => ({
        ...m,
        is_member: memberIds.has(m.id),
      }))
      setMerchants(result)

      if (!selectedCat) {
        const cats = [...new Set(result.map(m => m.category).filter(Boolean) as string[])].sort()
        setCategories(cats)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedCat, memberIds])

  useEffect(() => { loadMemberIds() }, [loadMemberIds])
  useEffect(() => { loadMerchants() }, [loadMerchants])

  // Group by category when no filter active
  const grouped: Record<string, DiscoverMerchant[]> = {}
  if (!selectedCat) {
    for (const m of merchants) {
      const cat = m.category ?? 'Autre'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(m)
    }
  }

  return (
    <LinearGradient colors={gradients.clientBg} style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={colors.dark.text} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Découvrir</Text>
              <Text style={styles.headerSub}>Commerçants partenaires</Text>
            </View>
          </View>

          {/* Category chips */}
          {categories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catScrollContent}
            >
              <TouchableOpacity
                style={[styles.catChip, !selectedCat && styles.catChipActive]}
                onPress={() => setSelectedCat(null)}
              >
                <Text style={[styles.catChipText, !selectedCat && styles.catChipTextActive]}>Tous</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, selectedCat === cat && styles.catChipActive]}
                  onPress={() => setSelectedCat(selectedCat === cat ? null : cat)}
                >
                  <Text style={[styles.catChipText, selectedCat === cat && styles.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
            ) : merchants.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="storefront-outline" size={40} color={colors.dark.subtle} />
                <Text style={styles.emptyText}>
                  {selectedCat ? `Aucun commerçant dans "${selectedCat}"` : "Aucun commerçant disponible pour l'instant."}
                </Text>
              </View>
            ) : selectedCat ? (
              merchants.map(m => <MerchantCard key={m.id} m={m} />)
            ) : (
              Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, list]) => (
                <View key={cat}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{cat}</Text>
                    <View style={styles.groupDivider} />
                    <Text style={styles.groupCount}>{list.length}</Text>
                  </View>
                  {list.map(m => <MerchantCard key={m.id} m={m} />)}
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}

function MerchantCard({ m }: { m: DiscoverMerchant }) {
  const status = getOpenStatus(m.opening_hours)
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{m.name[0]}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{m.name}</Text>
            {m.is_member && (
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>Membre</Text>
              </View>
            )}
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: status.open ? '#4ade80' : 'rgba(255,255,255,0.3)' }]} />
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
          {m.category && (
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{m.category}</Text>
            </View>
          )}
        </View>
      </View>
      {m.address && (
        <Text style={styles.address} numberOfLines={1}>📍 {m.address}</Text>
      )}
      {!m.is_member && (
        <Text style={styles.hint}>Présentez votre QR code en magasin pour rejoindre</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.dark.muted,
    marginTop: 1,
  },

  catScroll: { marginTop: 8, paddingHorizontal: 20 },
  catScrollContent: { gap: 8, paddingRight: 4 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  catChipActive: { backgroundColor: colors.primary },
  catChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255,255,255,0.60)',
  },
  catChipTextActive: { color: '#ffffff' },

  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 10 },

  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.dark.muted,
    textAlign: 'center',
  },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  groupTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.dark.muted,
  },
  groupDivider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  groupCount: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.25)' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: 'rgba(255,255,255,0.70)',
  },
  cardInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: {
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
  memberBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, color: '#4ade80' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, color: colors.dark.muted },
  catBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168,85,247,0.20)',
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  catBadgeText: { fontSize: 10, fontWeight: fontWeight.semibold, color: '#c084fc' },
  address: { fontSize: fontSize.xs, color: colors.dark.subtle },
  hint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
  },
})
