import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthContext'
import { calculateLevelProgress, LEVEL_DEFINITIONS, getMaintainStatus } from '../../src/lib/levels'
import {
  colors,
  gradients,
  radius,
  fontSize,
  fontWeight,
  levelColorWithOpacity,
} from '../../src/theme'
import { ProgressBar } from '../../src/components/ui/ProgressBar'
import { Badge } from '../../src/components/ui/Badge'

export default function LevelsScreen() {
  const { client } = useAuth()

  if (!client) return null

  const progress = calculateLevelProgress(
    client.scans_last_30d,
    client.current_level,
    client.level_updated_at,
    client.level_alert
  )
  const maintainStatus = getMaintainStatus(progress)

  type StatusKey = 'max' | 'grace' | 'safe' | 'warning' | 'danger'

  const statusConfig: Record<StatusKey, {
    badgeColor: 'gold' | 'blue' | 'green' | 'amber' | 'red'
    label: string
    iconName: React.ComponentProps<typeof Ionicons>['name']
  }> = {
    max:     { badgeColor: 'gold',  label: 'Niveau maximum',   iconName: 'trophy' },
    grace:   { badgeColor: 'blue',  label: 'Période de grâce', iconName: 'shield-checkmark' },
    safe:    { badgeColor: 'green', label: 'Niveau sécurisé',  iconName: 'checkmark-circle' },
    warning: { badgeColor: 'amber', label: 'Attention',         iconName: 'warning' },
    danger:  { badgeColor: 'red',   label: 'Risque de baisse', iconName: 'alert-circle' },
  }

  const status = statusConfig[maintainStatus as StatusKey] ?? statusConfig.safe

  return (
    <LinearGradient colors={gradients.clientBg} style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <Text style={styles.pageTitle}>Niveaux de fidélité</Text>
            <Text style={styles.pageSubtitle}>
              Basés sur vos scans des 30 derniers jours
            </Text>

            {/* ── Current level summary ───────────── */}
            <View
              style={[
                styles.currentCard,
                {
                  backgroundColor: levelColorWithOpacity(progress.currentLevel.color, 0.10),
                  borderColor: levelColorWithOpacity(progress.currentLevel.color, 0.28),
                },
              ]}
            >
              {/* Level header */}
              <View style={styles.currentHeader}>
                <View>
                  <Text style={styles.currentSub}>Votre niveau actuel</Text>
                  <View style={styles.currentNameRow}>
                    <Text style={styles.currentEmoji}>{progress.currentLevel.emoji}</Text>
                    <Text style={styles.currentName}>{progress.currentLevel.name}</Text>
                  </View>
                </View>
                <Badge
                  label={status.label}
                  iconName={status.iconName}
                  color={status.badgeColor}
                  size="sm"
                />
              </View>

              <Text style={styles.currentDesc}>{progress.currentLevel.description}</Text>

              {/* Scan count / progress */}
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>
                  {client.scans_last_30d} scan{client.scans_last_30d > 1 ? 's' : ''} ce mois
                </Text>
                {progress.nextLevel && (
                  <Text style={styles.progressLabel}>
                    {progress.scansToNextLevel} avant {progress.nextLevel.name}
                  </Text>
                )}
              </View>
              {progress.nextLevel && (
                <ProgressBar
                  percent={progress.progressPercent}
                  color={progress.currentLevel.color}
                  trackColor="rgba(255,255,255,0.12)"
                  height={7}
                />
              )}

              {/* Grace period banner */}
              {progress.isInGracePeriod && (
                <View style={styles.graceBox}>
                  <Ionicons name="shield-checkmark" size={13} color="#93c5fd" style={styles.graceIcon} />
                  <Text style={styles.graceText}>
                    Période de grâce : votre niveau est protégé encore{' '}
                    <Text style={styles.graceBold}>
                      {progress.daysUntilGraceEnds} jour{(progress.daysUntilGraceEnds ?? 0) > 1 ? 's' : ''}
                    </Text>
                  </Text>
                </View>
              )}
            </View>

            {/* ── All levels ──────────────────────── */}
            <Text style={styles.sectionTitle}>Tous les niveaux</Text>
            <View style={styles.levelList}>
              {LEVEL_DEFINITIONS.map((level) => {
                const isCurrent = level.level_number === client.current_level
                const isReached = level.level_number < client.current_level
                const isLocked = level.level_number > client.current_level

                return (
                  <View
                    key={level.level_number}
                    style={[
                      styles.levelItem,
                      {
                        backgroundColor: isCurrent
                          ? levelColorWithOpacity(level.color, 0.12)
                          : isReached
                          ? colors.dark.card
                          : colors.dark.bg,
                        borderColor: isCurrent
                          ? levelColorWithOpacity(level.color, 0.35)
                          : isReached
                          ? colors.dark.cardBorder
                          : 'rgba(255,255,255,0.06)',
                        opacity: isLocked ? 0.55 : 1,
                      },
                    ]}
                  >
                    <View style={styles.levelItemRow}>
                      <View style={styles.levelItemLeft}>
                        <Text style={styles.levelItemEmoji}>{level.emoji}</Text>
                        <View>
                          <View style={styles.levelItemNameRow}>
                            <Text style={styles.levelItemName}>{level.name}</Text>
                            {isCurrent && (
                              <View
                                style={[
                                  styles.inProgressBadge,
                                  { backgroundColor: levelColorWithOpacity(level.color, 0.22) },
                                ]}
                              >
                                <Text style={[styles.inProgressText, { color: level.color }]}>
                                  En cours
                                </Text>
                              </View>
                            )}
                            {isReached && (
                              <View style={styles.reachedRow}>
                                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                                <Text style={styles.reachedText}>Atteint</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.levelItemRange}>
                            {level.max_scans !== null
                              ? `${level.min_scans}–${level.max_scans} scans / 30j`
                              : `${level.min_scans}+ scans / 30j`}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.levelNumber, { color: level.color }]}>
                        Niv. {level.level_number}
                      </Text>
                    </View>

                    {isCurrent && progress.nextLevel && (
                      <View style={styles.levelItemProgress}>
                        <ProgressBar
                          percent={progress.progressPercent}
                          color={level.color}
                          trackColor="rgba(255,255,255,0.10)"
                          height={5}
                        />
                        <Text style={styles.levelItemProgressLabel}>
                          {Math.round(progress.progressPercent)}% vers le niveau suivant
                        </Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>

            {/* ── Info card ───────────────────────── */}
            <View style={styles.infoCard}>
              <View style={styles.infoTitleRow}>
                <Ionicons name="information-circle-outline" size={15} color={colors.dark.textSoft} />
                <Text style={styles.infoTitle}>Comment ça marche ?</Text>
              </View>
              <Text style={styles.infoText}>
                Votre niveau est calculé à partir du nombre de scans effectués chez tous vos commerçants au cours des 30 derniers jours.
              </Text>
              <Text style={[styles.infoText, { marginTop: 8 }]}>
                Après un changement de niveau, vous bénéficiez de 7 jours de période de grâce pendant lesquels votre niveau est protégé.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  pageSubtitle: {
    fontSize: fontSize.sm,
    color: colors.dark.muted,
    marginTop: 4,
    marginBottom: 20,
  },

  // Current level card
  currentCard: {
    borderRadius: radius['3xl'],
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  currentSub: {
    fontSize: fontSize.xs,
    color: colors.dark.muted,
    marginBottom: 4,
  },
  currentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentEmoji: { fontSize: 28 },
  currentName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  currentDesc: {
    fontSize: fontSize.sm,
    color: colors.dark.muted,
    lineHeight: 20,
    marginBottom: 14,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.muted,
  },
  graceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  graceIcon: { marginTop: 2 },
  graceText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#93c5fd',
    lineHeight: 19,
  },
  graceBold: { fontWeight: fontWeight.bold },

  // All levels
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginBottom: 12,
  },
  levelList: { gap: 8, marginBottom: 20 },
  levelItem: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: 14,
  },
  levelItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  levelItemEmoji: { fontSize: 22 },
  levelItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelItemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  inProgressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  inProgressText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  reachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reachedText: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  levelItemRange: {
    fontSize: fontSize.xs,
    color: colors.dark.muted,
    marginTop: 2,
  },
  levelNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  levelItemProgress: {
    marginTop: 10,
  },
  levelItemProgressLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.muted,
    marginTop: 5,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.glass.bg,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: 16,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.textSoft,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.dark.muted,
    lineHeight: 20,
  },
})
