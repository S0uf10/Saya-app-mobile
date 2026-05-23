import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'

export default function Index() {
  const { isBootstrapping, bootError, bootStep, retryBoot, session, role } = useAuth()

  // ── Error state: always show a retry button, never block indefinitely ────────
  if (bootError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Impossible de démarrer</Text>
        <Text style={styles.errorMsg}>{bootError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={retryBoot} activeOpacity={0.8}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isBootstrapping) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#9333ea" />
        {__DEV__ && <Text style={styles.stepLabel}>{bootStep}</Text>}
      </View>
    )
  }

  // ── Routing ──────────────────────────────────────────────────────────────────
  if (!session) return <Redirect href="/(auth)/login" />
  if (role === 'merchant') return <Redirect href="/(merchant)/dashboard" />
  if (role === 'client') return <Redirect href="/(client)/dashboard" />
  return <Redirect href="/(auth)/login" />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMsg: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 11,
    color: '#475569',
    marginTop: 16,
    fontFamily: 'monospace',
  },
})
