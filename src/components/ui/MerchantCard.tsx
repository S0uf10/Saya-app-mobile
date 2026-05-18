import React, { useState } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, fontSize, fontWeight } from '../../theme'
import { ProgressBar } from './ProgressBar'
import { openNavigationTo } from '../../services/navigation'
import type { Reward, OpeningHours } from '../../types'

const PREVIEW_COUNT = 2

function getOpenStatus(hours: OpeningHours | null | undefined): 'open' | 'closed' | 'unknown' {
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
  const [expanded, setExpanded] = useState(false)
  const openStatus = getOpenStatus(openingHours)
  const isOpen = openStatus === 'open'

  const lockedRewards  = rewards.filter(r => r.points_cost > currentPoints)
  const nextReward     = lockedRewards[0] ?? null
  const hasMore        = rewards.length > PREVIEW_COUNT
  const displayed      = expanded ? rewards : rewards.slice(0, PREVIEW_COUNT)

  return (
    <View style={styles.card}>
      {/* ── Header ──────────────────────────── */}
      <View style={styles.header}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{getInitial(name)}</Text>
          </View>
        )}

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
                {isOpen ? `Ouvert · ferme à ${getCloseTime(openingHours!)}` : 'Fermé'}
              </Text>
            </View>
          )}
        </View>

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

      {/* ── Rewards ─────────────────────────── */}
      {rewards.length === 0 ? (
        <Text style={styles.noRewards}>Aucune récompense configurée</Text>
      ) : (
        <View style={styles.rewardsSection}>
          {/* Section header */}
          <View style={styles.rewardsSectionHeader}>
            <Text style={styles.rewardsSectionTitle}>Récompenses</Text>
            {availableRewards.length > 0 && (
              <View style={styles.unlockedBadge}>
                <Ionicons name="gift-outline" size={11} color="#fcd34d" />
                <Text style={styles.unlockedBadgeText}>
                  {availableRewards.length} disponible{availableRewards.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Rewards list */}
          <View style={styles.rewardsList}>
            {displayed.map((reward) => {
              const isUnlocked = reward.points_cost <= currentPoints
              const isNext     = reward.id === nextReward?.id
              const pct        = Math.min(100, (currentPoints / reward.points_cost) * 100)

              return (
                <View
                  key={reward.id}
                  style={[
                    styles.rewardItem,
                    isUnlocked ? styles.rewardItemUnlocked : styles.rewardItemLocked,
                  ]}
                >
                  {reward.image_url && (
                    <Image
                      source={{ uri: reward.image_url }}
                      style={styles.rewardImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.rewardBody}>
                    <View style={styles.rewardRow}>
                      <Text style={styles.rewardIcon}>{isUnlocked ? '🎁' : '🔒'}</Text>
                      <View style={styles.rewardInfo}>
                        <Text
                          numberOfLines={1}
                          style={[styles.rewardName, isUnlocked ? styles.rewardNameUnlocked : styles.rewardNameLocked]}
                        >
                          {reward.name}
                        </Text>
                        {reward.description && (
                          <Text numberOfLines={1} style={styles.rewardDesc}>{reward.description}</Text>
                        )}
                      </View>
                      <Text style={[styles.rewardPts, isUnlocked ? styles.rewardPtsUnlocked : styles.rewardPtsLocked]}>
                        {reward.points_cost} pts
                      </Text>
                    </View>

                    {isUnlocked && (
                      <Text style={styles.rewardHintUnlocked}>✓ Montrez votre QR au commerçant</Text>
                    )}

                    {!isUnlocked && isNext && (
                      <View style={styles.progressWrap}>
                        <ProgressBar
                          percent={pct}
                          color={colors.primary}
                          trackColor="rgba(255,255,255,0.10)"
                          height={4}
                        />
                        <Text style={styles.progressHint}>
                          {currentPoints} / {reward.points_cost} pts
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            })}
          </View>

          {/* Expand / collapse */}
          {hasMore && (
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={() => setExpanded(e => !e)}
              activeOpacity={0.7}
            >
              <Text style={styles.expandBtnText}>
                {expanded ? 'Voir moins' : `Voir toutes les récompenses (${rewards.length})`}
              </Text>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={13}
                color={colors.dark.muted}
              />
            </TouchableOpacity>
          )}
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
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: radius.lg },
  avatarFallback: {
    width: 48, height: 48, borderRadius: radius.lg,
    backgroundColor: colors.primaryDeep,
    borderWidth: 1, borderColor: colors.primaryBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primaryLight },
  info: { flex: 1, gap: 3 },
  name: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.dark.text },
  meta: { fontSize: fontSize.xs, color: colors.dark.muted },
  openBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1,
    alignSelf: 'flex-start', marginTop: 2,
  },
  openBadgeOpen:   { backgroundColor: 'rgba(74,222,128,0.10)', borderColor: 'rgba(74,222,128,0.25)' },
  openBadgeClosed: { backgroundColor: 'rgba(248,113,113,0.10)', borderColor: 'rgba(248,113,113,0.25)' },
  openDot:  { width: 5, height: 5, borderRadius: 3 },
  openText: { fontSize: 10, fontWeight: fontWeight.semibold },
  pointsBox: { alignItems: 'flex-end' },
  pointsValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primaryLight },
  pointsLabel: { fontSize: fontSize.xs, color: colors.dark.muted },

  // Navigation
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: 'rgba(168,85,247,0.10)',
    borderRadius: radius.md, borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.20)',
  },
  navText: { fontSize: fontSize.xs, color: colors.primaryLight, flex: 1 },

  // Rewards section
  noRewards: {
    marginTop: 10,
    fontSize: fontSize.xs,
    color: colors.dark.subtle,
    textAlign: 'center',
    paddingVertical: 4,
  },
  rewardsSection: { marginTop: 12, gap: 8 },
  rewardsSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  rewardsSectionTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.dark.muted,
  },
  unlockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.amberBg,
    borderWidth: 1, borderColor: colors.amberBorder,
    borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  unlockedBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: '#fcd34d' },

  rewardsList: { gap: 8 },
  rewardItem: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rewardItemUnlocked: {
    backgroundColor: 'rgba(251,191,36,0.10)',
    borderColor: 'rgba(251,191,36,0.30)',
  },
  rewardItemLocked: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  rewardImage: { width: '100%', height: 90 },
  rewardBody:  { padding: 10, gap: 6 },
  rewardRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardIcon:  { fontSize: 16 },
  rewardInfo:  { flex: 1, minWidth: 0, gap: 1 },
  rewardName:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  rewardNameUnlocked: { color: '#fcd34d' },
  rewardNameLocked:   { color: colors.dark.text },
  rewardDesc:  { fontSize: fontSize.xs, color: colors.dark.muted },
  rewardPts:   { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  rewardPtsUnlocked: { color: '#fbbf24' },
  rewardPtsLocked:   { color: colors.dark.muted },
  rewardHintUnlocked: {
    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
    color: 'rgba(251,191,36,0.70)',
  },
  progressWrap: { gap: 4 },
  progressHint: { fontSize: fontSize.xs, color: colors.dark.muted, textAlign: 'right' },

  // Expand
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 6,
  },
  expandBtnText: { fontSize: fontSize.xs, color: colors.dark.muted },
})
