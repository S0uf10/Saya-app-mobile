import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, radius, fontSize, fontWeight, shadows, gradients } from '../../theme'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'amber'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  onPress?: () => void
  children: React.ReactNode
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  fullWidth?: boolean
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading
  const sizeStyles = sizes[size]
  const variantStyle = variants[variant]

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.82}
        style={[styles.base, fullWidth && styles.fullWidth, style, isDisabled && styles.disabled]}
      >
        <LinearGradient
          colors={gradients.primaryBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, sizeStyles.container]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={[styles.text, variantStyle.text, sizeStyles.text, textStyle]}>
              {children}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        fullWidth && styles.fullWidth,
        sizeStyles.container,
        variantStyle.container,
        style,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? colors.primary : '#ffffff'}
          size="small"
        />
      ) : (
        <Text style={[styles.text, variantStyle.text, sizeStyles.text, textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius['2xl'],
    overflow: 'hidden',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  text: {
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.48,
  },
})

const sizes = {
  sm: StyleSheet.create({
    container: { paddingVertical: 10, paddingHorizontal: 16 },
    text: { fontSize: fontSize.sm },
  }),
  md: StyleSheet.create({
    container: { paddingVertical: 14, paddingHorizontal: 20 },
    text: { fontSize: fontSize.base },
  }),
  lg: StyleSheet.create({
    container: { paddingVertical: 17, paddingHorizontal: 24 },
    text: { fontSize: fontSize.md },
  }),
}

const variants: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: {
      ...shadows.purple,
    },
    text: {
      color: '#ffffff',
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.light.card,
      borderWidth: 1.5,
      borderColor: colors.light.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    text: {
      color: colors.light.text,
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primaryBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      color: colors.primaryLight,
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      color: colors.primary,
    },
  },
  danger: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.dangerBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      color: colors.danger,
    },
  },
  amber: {
    container: {
      backgroundColor: colors.amberBg,
      borderWidth: 1.5,
      borderColor: colors.amberBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      color: colors.warning,
    },
  },
}
