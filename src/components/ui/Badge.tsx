import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, fontSize, fontWeight } from '../../theme'

type Color = 'purple' | 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'gold'

interface BadgeProps {
  label: string
  color?: Color
  size?: 'sm' | 'md'
  icon?: string
  iconName?: React.ComponentProps<typeof Ionicons>['name']
  style?: ViewStyle
}

export function Badge({ label, color = 'purple', size = 'sm', icon, iconName, style }: BadgeProps) {
  const { bg, text, border } = badgeColors[color]
  const sizeStyle = size === 'sm' ? styles.sm : styles.md
  const textSize = size === 'sm' ? styles.textSm : styles.textMd
  const iconSize = size === 'sm' ? 11 : 13

  return (
    <View style={[styles.base, sizeStyle, { backgroundColor: bg, borderColor: border }, style]}>
      {iconName && (
        <Ionicons name={iconName} size={iconSize} color={text} style={styles.iconName} />
      )}
      {icon && !iconName && <Text style={[textSize, { color: text }]}>{icon} </Text>}
      <Text style={[styles.label, textSize, { color: text }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconName: { marginRight: 4 },
  sm: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  md: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  label: {
    fontWeight: fontWeight.semibold,
  },
  textSm: {
    fontSize: fontSize.xs,
  },
  textMd: {
    fontSize: fontSize.sm,
  },
})

const badgeColors: Record<Color, { bg: string; text: string; border: string }> = {
  purple: {
    bg: 'rgba(147, 51, 234, 0.14)',
    text: '#a855f7',
    border: 'rgba(147, 51, 234, 0.30)',
  },
  green: {
    bg: colors.successLight,
    text: colors.successText,
    border: colors.successBorder,
  },
  amber: {
    bg: colors.warningLight,
    text: colors.warningText,
    border: colors.warningBorder,
  },
  red: {
    bg: colors.dangerLight,
    text: colors.dangerText,
    border: colors.dangerBorder,
  },
  blue: {
    bg: colors.infoLight,
    text: colors.infoText,
    border: colors.infoBorder,
  },
  gray: {
    bg: '#f1f5f9',
    text: '#475569',
    border: '#e2e8f0',
  },
  gold: {
    bg: 'rgba(241, 196, 15, 0.15)',
    text: '#d4ac0d',
    border: 'rgba(241, 196, 15, 0.35)',
  },
}
