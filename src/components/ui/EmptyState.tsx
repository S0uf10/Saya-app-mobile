import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from './Button'
import { colors, fontSize, fontWeight, spacing } from '../../theme'

type Theme = 'dark' | 'light'

interface EmptyStateProps {
  emoji?: string
  iconName?: React.ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  theme?: Theme
  style?: ViewStyle
}

export function EmptyState({
  emoji,
  iconName,
  title,
  subtitle,
  actionLabel,
  onAction,
  theme = 'light',
  style,
}: EmptyStateProps) {
  const isDark = theme === 'dark'
  const iconColor = isDark ? colors.dark.muted : colors.light.muted

  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight, style]}>
      {iconName ? (
        <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <Ionicons name={iconName} size={32} color={iconColor} />
        </View>
      ) : emoji ? (
        <Text style={styles.emoji}>{emoji}</Text>
      ) : null}
      <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button onPress={onAction} size="sm" fullWidth={false}>
            {actionLabel}
          </Button>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  containerDark: {
    backgroundColor: colors.dark.card,
    borderColor: colors.dark.cardBorder,
  },
  containerLight: {
    backgroundColor: colors.light.card,
    borderColor: colors.light.cardBorder,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: 6,
  },
  titleDark: { color: colors.dark.text },
  titleLight: { color: colors.light.text },
  subtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  subtitleDark: { color: colors.dark.muted },
  subtitleLight: { color: colors.light.muted },
  action: {
    marginTop: 20,
  },
})
