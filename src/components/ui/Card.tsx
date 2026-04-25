import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius, shadows } from '../../theme'

type Variant = 'light' | 'dark' | 'glass' | 'glassStrong' | 'darkSolid'

interface CardProps {
  children: React.ReactNode
  variant?: Variant
  style?: ViewStyle
  padding?: number | 'none'
}

export function Card({ children, variant = 'light', style, padding }: CardProps) {
  const baseStyle = cardVariants[variant]
  const paddingStyle = padding === 'none'
    ? {}
    : { padding: padding ?? 16 }

  return (
    <View style={[baseStyle, paddingStyle, style]}>
      {children}
    </View>
  )
}

const cardVariants: Record<Variant, ViewStyle> = {
  // White card for light (merchant) theme
  light: {
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    ...shadows.sm,
  },
  // Slate-800 card for dark (client) theme
  dark: {
    backgroundColor: colors.dark.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  // Glass morphism on dark background
  glass: {
    backgroundColor: colors.glass.bg,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  // Stronger glass effect
  glassStrong: {
    backgroundColor: colors.glass.bgStrong,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.borderStrong,
  },
  // Deeper dark card (used for nested cards)
  darkSolid: {
    backgroundColor: colors.dark.bg,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
}
