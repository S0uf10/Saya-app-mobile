import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius, fontWeight } from '../../theme'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type Theme = 'dark' | 'light'

interface AvatarProps {
  name: string
  size?: Size
  theme?: Theme
  style?: ViewStyle
}

const sizeMap: Record<Size, { container: number; font: number }> = {
  xs: { container: 28, font: 11 },
  sm: { container: 36, font: 14 },
  md: { container: 44, font: 16 },
  lg: { container: 52, font: 20 },
  xl: { container: 64, font: 24 },
  '2xl': { container: 80, font: 30 },
}

export function Avatar({ name, size = 'md', theme = 'dark', style }: AvatarProps) {
  const { container, font } = sizeMap[size]
  const letter = (name ?? '?').charAt(0).toUpperCase()

  const bgColor = theme === 'dark' ? 'rgba(124,58,237,0.25)' : colors.primaryBg
  const borderColor = theme === 'dark' ? colors.primaryBorder : 'rgba(124,58,237,0.20)'
  const textColor = theme === 'dark' ? colors.primaryLight : colors.primary

  return (
    <View
      style={[
        styles.base,
        {
          width: container,
          height: container,
          borderRadius: container / 2,
          backgroundColor: bgColor,
          borderColor,
        },
        style,
      ]}
    >
      <Text style={[styles.letter, { fontSize: font, color: textColor }]}>{letter}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  letter: {
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
})
