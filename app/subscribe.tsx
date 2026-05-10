import { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  AppState,
  Linking,
  StyleSheet,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../src/context/AuthContext'
import { supabase } from '../src/lib/supabase'
import { colors, radius, fontSize, fontWeight, shadows } from '../src/theme'

const FEATURES = [
  'Gestion clients',
  'QR codes illimités',
  'Points fidélité',
  'Dashboard web complet',
  'Carte de fidélité digitale',
  'Support par email',
]

const SUBSCRIBE_URL = 'https://www.saya-card.com/onboarding/subscribe'

export default function SubscribeScreen() {
  const { merchant, loading, refreshProfile, signOut } = useAuth()
  const router = useRouter()
  const appState = useRef(AppState.currentState)

  // Redirect to dashboard when subscription becomes active
  useEffect(() => {
    if (!loading && merchant?.subscription_status === 'active') {
      router.replace('/(merchant)/dashboard')
    }
  }, [merchant?.subscription_status, loading])

  // Refresh profile when app returns to foreground (after web checkout)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        await refreshProfile()
      }
      appState.current = nextState
    })
    return () => sub.remove()
  }, [refreshProfile])

  function handleSubscribe() {
    Linking.openURL(SUBSCRIBE_URL)
  }

  async function handleManageSubscription() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('https://www.saya-card.com/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.url) {
        Linking.openURL(data.url)
      } else {
        Alert.alert('Erreur', data.error ?? 'Impossible d\'ouvrir le portail')
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue, veuillez réessayer')
    }
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
            <Text style={styles.logoS}>S</Text>aya card
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Commencez dès aujourd'hui</Text>
          <Text style={styles.subtitle}>
            Fidélisez vos clients avec votre carte digitale
          </Text>
        </View>

        {/* Plan card */}
        <View style={styles.card}>
          {/* Plan header */}
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>Starter</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>29.99€</Text>
                <Text style={styles.pricePeriod}>/mois</Text>
              </View>
              <Text style={styles.priceNote}>ou 23.99€/mois en annuel (−20%)</Text>
            </View>
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>⭐ Populaire</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Features */}
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

          {/* CTA button */}
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={handleSubscribe}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Commencer maintenant</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.finePrint}>
            Aucune carte requise avant validation · Annulation à tout moment
          </Text>
        </View>

        {/* Info note */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            Après votre abonnement, revenez sur l'app — l'accès se déverrouille automatiquement.
          </Text>
        </View>

        {/* Gérer abonnement existant */}
        {merchant?.subscription_plan && (
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={handleManageSubscription}
            activeOpacity={0.75}
          >
            <Ionicons name="settings-outline" size={15} color={colors.primary} />
            <Text style={styles.manageBtnText}>Gérer mon abonnement</Text>
          </TouchableOpacity>
        )}

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

  header: { alignItems: 'center', marginBottom: 28, paddingHorizontal: 16 },
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
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    padding: 20,
    marginBottom: 16,
    ...shadows.md,
  },

  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: 6,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.light.text,
    letterSpacing: -1,
  },
  pricePeriod: { fontSize: fontSize.sm, color: colors.light.muted },
  priceNote: { fontSize: fontSize.xs, color: colors.light.subtle, marginTop: 3 },

  popularBadge: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },

  divider: {
    height: 1,
    backgroundColor: colors.light.divider,
    marginBottom: 16,
  },

  features: { gap: 10, marginBottom: 20 },
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
  featureText: { fontSize: fontSize.sm, color: colors.light.text },

  ctaBtn: {
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
  ctaBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: '#fff' },

  finePrint: {
    fontSize: fontSize.xs,
    color: colors.light.subtle,
    textAlign: 'center',
    lineHeight: 18,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: 14,
    width: '100%',
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.primary,
    lineHeight: 18,
  },

  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.xl,
    paddingVertical: 11,
    paddingHorizontal: 20,
    backgroundColor: colors.primaryBg,
    marginBottom: 12,
  },
  manageBtnText: {
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
