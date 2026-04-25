import React from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native'
import { colors, radius, fontSize, fontWeight, spacing } from '../../theme'

type Theme = 'dark' | 'light'

interface InputProps extends TextInputProps {
  label?: string
  hint?: string
  error?: string
  theme?: Theme
  containerStyle?: ViewStyle
}

export function Input({
  label,
  hint,
  error,
  theme = 'dark',
  containerStyle,
  style,
  ...props
}: InputProps) {
  const isDark = theme === 'dark'

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          isDark ? styles.inputDark : styles.inputLight,
          error ? (isDark ? styles.inputErrorDark : styles.inputErrorLight) : null,
          style,
        ]}
        placeholderTextColor={isDark ? colors.dark.placeholder : colors.light.placeholder}
        {...props}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, isDark ? styles.hintDark : styles.hintLight]}>{hint}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  labelDark: {
    color: colors.dark.textSoft,
  },
  labelLight: {
    color: colors.light.textSoft,
  },
  input: {
    borderRadius: radius['2xl'],
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: fontSize.base,
    borderWidth: 1.5,
  },
  inputDark: {
    backgroundColor: colors.dark.input,
    color: colors.dark.text,
    borderColor: colors.dark.inputBorder,
  },
  inputLight: {
    backgroundColor: colors.light.input,
    color: colors.light.text,
    borderColor: colors.light.inputBorder,
  },
  inputErrorDark: {
    borderColor: colors.danger,
  },
  inputErrorLight: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 2,
  },
  hintText: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  hintDark: {
    color: colors.dark.subtle,
  },
  hintLight: {
    color: colors.light.muted,
  },
})
