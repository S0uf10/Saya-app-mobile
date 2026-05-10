import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  AppState,
  Linking,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'
import { colors, radius, fontSize, fontWeight, shadows } from '../src/theme'

const FEATURES = [
  'Scanner les QR codes de vos clients',
  'Gestion des points et récompenses',
  'Tableau de bord complet sur le web',
  'Carte de fidélité digitale (Apple/Google Wallet)',
  'Envoi de campagnes email à vos clients',
  'Support par email',
]

const WEB_URL = 'https://www.saya-card.com'

export default function SubscribeScreen() {
  const { merchant, loading, refreshProfile, signOut } = useAuth()
  const router = useRouter()
  const appState = useRef(AppState.currentState)
  const [refreshing, setRefreshing] = useState(false)

  // Redirect to dashboard when subscription becomes active
  useEffect(() => {
    if (!loading && merchant?.subscription_status === 'active') {
      router.replace('/(merchant)/dashboard')
    }
  }, [merchant?.subscription_status, loading])

  // Auto-refresh when app returns to foreground (after browser session)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        await refreshProfile()
      }
      appState.current = nextState
    })
    return () => sub.remove()
  }, [refreshProfile])

  async function handleRefresh() {
    setRefreshing(true)
    await refreshProfile()
    setRefreshing(false)
  }

  async function handleSignOut() {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logo}>
            <Text style={styles.logoS}>S</Text>aya Card
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Abonnement requis</Text>
          <Text style={styles.subtitle}>
            Votre compte nécessite un abonnement actif pour accéder à l'application.
          </Text>
        </View>

        {/* Features card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ce qui est inclus</Text>
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* How to subscribe */}
        <View style={styles.instructionBox}>
          <Ionicons name="globe-outline" size={20} color={colors.primary} />
          <View style={styles.instructionText}>
            <Text style={styles.instructionTitle}>Comment activer votre accès</Text>
            <Text style={styles.instructionBody}>
              Rendez-vous sur notre site web pour découvrir nos offres et activer votre abonnement. Revenez ensuite sur l'application — votre accès se déverrouille automatiquement.
            </Text>
            <Text style={styles.url}>www.saya-card.com</Text>
          </View>
        </View>

        {/* Open website button — links to marketing page, NOT checkout */}
        <TouchableOpacity
          style={styles.webBtn}
          onPress={() => Linking.openURL(WEB_URL)}
          activeOpacity={0.85}
        >
          <Ionicons name="open-outline" size={18} color="#fff" />
          <Text style={styles.webBtnText}>Visiter saya-card.com</Text>
        </TouchableOpacity>

        {/* Refresh button */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={refreshing}
          activeOpacity={0.75}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          )}
          <Text style={styles.refreshBtnText}>
            {refreshing ? 'Vérification...' : "J'ai souscrit — Actualiser"}
          </Text>
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.light.subtle} />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.bg },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },

  logoRow: { marginBottom: 28 },
  logo: { fontSize: 22, fontWeight: '700', color: colors.light.text, letterSpacing: -0.3 },
  logoS: { color: colors.primary },

  header: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 8 },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
  },

  card: {
    width: '100%',
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 20,
    marginBottom: 16,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginBottom: 14,
  },
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: { fontSize: fontSize.sm, color: colors.light.text, flex: 1 },

  instructionBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: 16,
    marginBottom: 20,
  },
  instructionText: { flex: 1 },
  instructionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: 6,
  },
  instructionBody: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
    lineHeight: 18,
    marginBottom: 8,
  },
  url: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  webBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 14,
    marginBottom: 12,
    ...shadows.md,
  },
  webBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: '#fff' },

  refreshBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderRadius: radius.xl,
    paddingVertical: 13,
    backgroundColor: colors.primaryBg,
    marginBottom: 24,
  },
  refreshBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signOutText: { fontSize: fontSize.sm, color: colors.light.subtle },
})
