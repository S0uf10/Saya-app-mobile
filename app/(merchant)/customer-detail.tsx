import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { Client, LoyaltyRelation, Reward } from '../../src/types'
import { LEVEL_DEFINITIONS } from '../../src/lib/levels'
import { colors, radius, fontSize, fontWeight, shadows, levelColorWithOpacity } from '../../src/theme'
import { Avatar } from '../../src/components/ui/Avatar'
import { Button } from '../../src/components/ui/Button'

export default function CustomerDetailScreen() {
  const { clientId, relationId } = useLocalSearchParams<{
    clientId: string
    relationId: string
  }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [relation, setRelation] = useState<LoyaltyRelation | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!clientId || !relationId) return
      try {
        const [clientRes, relRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', clientId).single(),
          supabase.from('loyalty_relations').select('*, merchants(*)').eq('id', relationId).single(),
        ])
        setClient(clientRes.data)
        setRelation(relRes.data)

        if (relRes.data?.merchant_id) {
          const { data: rewardData } = await supabase
            .from('rewards')
            .select('*')
            .eq('merchant_id', relRes.data.merchant_id)
            .eq('is_active', true)
            .order('points_cost', { ascending: true })
          setRewards(rewardData ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId, relationId])

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!client || !relation) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TouchableOpacity style={styles.backBtnSimple} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.light.text} />
        </TouchableOpacity>
        <View style={styles.loadingBox}>
          <Text style={styles.notFound}>Client introuvable.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const levelDef = LEVEL_DEFINITIONS.find((l) => l.level_number === client.current_level)
  const availableRewards = rewards.filter((r) => relation.current_points >= r.points_cost)

  const infoRows = [
    { icon: 'mail-outline' as const,     value: client.email },
    { icon: 'call-outline' as const,     value: client.phone ?? 'Non renseigné' },
    {
      icon: 'calendar-outline' as const,
      value: client.birth_date
        ? new Date(client.birth_date).toLocaleDateString('fr-FR')
        : 'Non renseigné',
    },
    {
      icon: 'time-outline' as const,
      value: `Membre depuis le ${new Date(client.created_at).toLocaleDateString('fr-FR')}`,
    },
  ]

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {client.first_name} {client.last_name}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              <Avatar name={`${client.first_name} ${client.last_name}`} size="xl" theme="light" />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {client.first_name} {client.last_name}
                </Text>
                {levelDef && (
                  <View
                    style={[
                      styles.levelPill,
                      {
                        backgroundColor: levelColorWithOpacity(levelDef.color, 0.12),
                        borderColor: levelColorWithOpacity(levelDef.color, 0.30),
                      },
                    ]}
                  >
                    <Text>{levelDef.emoji}</Text>
                    <Text style={[styles.levelPillText, { color: levelDef.color }]}>
                      {levelDef.name}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {infoRows.map((item, idx) => (
              <View
                key={idx}
                style={[styles.infoRow, idx < infoRows.length - 1 && styles.infoRowBorder]}
              >
                <Ionicons name={item.icon} size={15} color={colors.light.subtle} />
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardHighlight]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {relation.current_points}
              </Text>
              <Text style={styles.statLabel}>points actuels</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{relation.visits_count}</Text>
              <Text style={styles.statLabel}>visites</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{relation.total_points_earned}</Text>
              <Text style={styles.statLabel}>pts gagnés</Text>
            </View>
          </View>

          {relation.last_visit && (
            <Text style={styles.lastVisit}>
              Dernière visite :{' '}
              {new Date(relation.last_visit).toLocaleDateString('fr-FR', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          )}

          {/* Available rewards banner */}
          {availableRewards.length > 0 && (
            <View style={styles.rewardBanner}>
              <View style={styles.rewardBannerTitleRow}>
                <Ionicons name="gift-outline" size={14} color="#fcd34d" />
                <Text style={styles.rewardBannerTitle}>Récompenses disponibles</Text>
              </View>
              {availableRewards.map((r) => (
                <Text key={r.id} style={styles.rewardBannerItem}>
                  • {r.name} ({r.points_cost} pts)
                </Text>
              ))}
            </View>
          )}

          {/* All rewards */}
          {rewards.length > 0 && (
            <View style={styles.rewardsSection}>
              <Text style={styles.sectionTitle}>Toutes les récompenses</Text>
              <View style={styles.rewardList}>
                {rewards.map((reward) => {
                  const canUse = relation.current_points >= reward.points_cost
                  return (
                    <View
                      key={reward.id}
                      style={[styles.rewardRow, canUse && styles.rewardRowReady]}
                    >
                      <Text style={styles.rewardRowName}>{reward.name}</Text>
                      <Text
                        style={[
                          styles.rewardRowCost,
                          canUse && styles.rewardRowCostReady,
                        ]}
                      >
                        {reward.points_cost} pts
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* Scan button */}
          <Button onPress={() => router.push('/(merchant)/scan')} size="lg">
            <Ionicons name="scan-outline" size={20} color="#ffffff" />
            {'  '}Scanner ce client
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.bg },
  notFound: { fontSize: fontSize.base, color: colors.light.muted },
  backBtnSimple: { padding: 20 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 14,
    backgroundColor: colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.cardBorder,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  inner: { padding: 20, paddingBottom: 40 },

  // Profile card
  profileCard: {
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 16,
    marginBottom: 14,
    ...shadows.md,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: 6,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  levelPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.light.textSoft,
    flex: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.light.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  statCardHighlight: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryBg,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.light.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  lastVisit: {
    fontSize: fontSize.xs,
    color: colors.light.subtle,
    textAlign: 'center',
    marginBottom: 14,
  },

  // Rewards
  rewardBanner: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius['2xl'],
    padding: 14,
    marginBottom: 14,
  },
  rewardBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rewardBannerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warningText,
  },
  rewardBannerItem: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginTop: 2,
  },
  rewardsSection: { marginBottom: 20 },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginBottom: 10,
  },
  rewardList: { gap: 8 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...shadows.sm,
  },
  rewardRowReady: { borderColor: colors.warningBorder },
  rewardRowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.light.text,
  },
  rewardRowCost: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.muted,
  },
  rewardRowCostReady: { color: colors.warning },
})
