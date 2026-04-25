import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius } from '../../theme'

interface ProgressBarProps {
  percent: number
  color?: string
  height?: number
  trackColor?: string
  style?: ViewStyle
}

export function ProgressBar({
  percent,
  color = colors.primary,
  height = 6,
  trackColor,
  style,
}: ProgressBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent))
  const track = trackColor ?? 'rgba(255,255,255,0.10)'

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: track, borderRadius: height / 2 },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedPercent}%`,
            height,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {},
})
