import React from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, fontSize, fontWeight } from '../../theme'
import { ProgressBar } from './ProgressBar'
import { openNavigationTo } from '../../services/navigation'
import type { Reward, OpeningHours } from '../../types'

function getOpenStatus(
  hours: OpeningHours | null | undefined
): 'open' | 'closed' | 'unknown' {
  if (!hours) return 'unknown'
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const now = new Date()
  const day = hours[dayMap[now.getDay()]]
  if (!day || day.closed) return 'closed'
  const [oH, oM] = day.open.split(':').map(Number)
  const [cH, cM] = day.close.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  return cur >= oH * 60 + oM && cur < cH * 60 + cM ? 'open' : 'closed'
}

function getCloseTime(hours: OpeningHours): string {
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const day = hours[dayMap[new Date().getDay()]]
  return day?.close ?? ''
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

interface MerchantCardProps {
  name: string
  logoUrl?: string | null
  currentPoints: number
  visitsCount: number
  lastVisit?: string | null
  address?: string | null
  openingHours?: OpeningHours | null
  rewards: Reward[]
  availableRewards: Reward[]
}

export function MerchantCard({
  name,
  logoUrl,
  currentPoints,
  visitsCount,
  lastVisit,
  address,
  openingHours,
  rewards,
  availableRewards,
}: MerchantCardProps) {
  const openStatus = getOpenStatus(openingHours)
  const cheapestReward = rewards[0]
  const isOpen = openStatus === 'open'

  return (
    <View style={styles.card}>
      {/* ── Header: avatar + info + points ──── */}
      <View style={styles.header}>
        {/* Avatar */}
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{getInitial(name)}</Text>
          </View>
        )}

        {/* Name + meta */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {visitsCount} visite{visitsCount > 1 ? 's' : ''}
            {lastVisit ? ` · ${new Date(lastVisit).toLocaleDateString('fr-FR')}` : ''}
          </Text>
          {openStatus !== 'unknown' && (
            <View style={[styles.openBadge, isOpen ? styles.openBadgeOpen : styles.openBadgeClosed]}>
              <View style={[styles.openDot, { backgroundColor: isOpen ? '#4ade80' : '#f87171' }]} />
              <Text style={[styles.openText, { color: isOpen ? '#4ade80' : '#f87171' }]}>
                {isOpen
                  ? `Ouvert · ferme à ${getCloseTime(openingHours!)}`
                  : 'Fermé'}
              </Text>
            </View>
          )}
        </View>

        {/* Points */}
        <View style={styles.pointsBox}>
          <Text style={styles.pointsValue}>{currentPoints}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>

      {/* ── Navigation ──────────────────────── */}
      {address && (
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => openNavigationTo(address)}
          activeOpacity={0.75}
        >
          <Ionicons name="navigate-outline" size={13} color={colors.primaryLight} />
          <Text style={styles.navText} numberOfLines={1}>{address}</Text>
        </TouchableOpacity>
      )}

      {/* ── Available rewards ───────────────── */}
      {availableRewards.length > 0 && (
        <View style={styles.rewardBanner}>
          {availableRewards[0].image_url && (
            <Image
              source={{ uri: availableRewards[0].image_url }}
              style={styles.rewardBannerImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.rewardBannerContent}>
            <View style={styles.rewardBannerRow}>
              <Ionicons name="gift-outline" size={13} color="#fcd34d" />
              <Text style={styles.rewardBannerTitle}>
                {availableRewards.length} récompense{availableRewards.length > 1 ? 's' : ''} disponible{availableRewards.length > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.rewardBannerSub} numberOfLines={1}>
              {availableRewards.map((r) => r.name).join(', ')}
            </Text>
          </View>
        </View>
      )}

      {/* ── Progress to next reward ─────────── */}
      {availableRewards.length === 0 && cheapestReward && (
        <View style={styles.progressSection}>
          {cheapestReward.image_url && (
            <Image
              source={{ uri: cheapestReward.image_url }}
              style={styles.rewardProgressImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Prochaine : {cheapestReward.name}</Text>
            <Text style={styles.progressLabel}>
              {cheapestReward.points_cost - currentPoints} pts restants
            </Text>
          </View>
          <ProgressBar
            percent={Math.min(100, (currentPoints / cheapestReward.points_cost) * 100)}
            color={colors.primary}
            trackColor="rgba(255,255,255,0.10)"
            height={5}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass.bg,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryDeep,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primaryLight,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.dark.muted,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  openBadgeOpen: {
    backgroundColor: 'rgba(74,222,128,0.10)',
    borderColor: 'rgba(74,222,128,0.25)',
  },
  openBadgeClosed: {
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.25)',
  },
  openDot: { width: 5, height: 5, borderRadius: 3 },
  openText: { fontSize: 10, fontWeight: fontWeight.semibold },
  pointsBox: { alignItems: 'flex-end' },
  pointsValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primaryLight,
  },
  pointsLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.muted,
  },

  // Navigation
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(168,85,247,0.10)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.20)',
  },
  navText: {
    fontSize: fontSize.xs,
    color: colors.primaryLight,
    flex: 1,
  },

  // Reward banner
  rewardBanner: {
    marginTop: 10,
    backgroundColor: colors.amberBg,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  rewardBannerImage: {
    width: '100%',
    height: 80,
  },
  rewardBannerContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 3,
  },
  rewardBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardBannerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: '#fcd34d',
  },
  rewardBannerSub: {
    fontSize: fontSize.xs,
    color: '#fde68a',
    marginLeft: 19,
  },

  // Progress
  progressSection: { marginTop: 10 },
  rewardProgressImage: {
    width: '100%',
    height: 72,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: { fontSize: fontSize.xs, color: colors.dark.muted },
})
