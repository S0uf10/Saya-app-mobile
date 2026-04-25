import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { colors, gradients, radius, fontSize, fontWeight } from '../../src/theme'

export default function RegisterMerchantScreen() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!businessName || !email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'merchant', business_name: businessName },
        },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Création du compte échouée.')

      const { error: merchantError } = await supabase.from('merchants').insert({
        user_id: authData.user.id,
        name: businessName,
        email,
        mode: 'points',
        points_per_visit: 1,
        reward_threshold: 10,
        reward_label: 'Récompense',
        scan_presets: [
          { label: 'Visite', points: 1 },
          { label: 'Café', points: 2 },
          { label: 'Repas', points: 5 },
        ],
        subscription_status: 'inactive',
      })
      if (merchantError) throw merchantError

      router.replace('/(merchant)/dashboard')
    } catch (err: any) {
      Alert.alert('Inscription échouée', err.message ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={gradients.clientBg} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color={colors.dark.textSoft} />
              </TouchableOpacity>
              <View>
                <Text style={styles.title}>Espace commerçant</Text>
                <Text style={styles.subtitle}>Créez votre programme de fidélité</Text>
              </View>
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerTitle}>🚀 Démarrez gratuitement</Text>
              <Text style={styles.infoBannerText}>
                Créez votre compte et gérez votre programme depuis l'application. Pour les fonctionnalités avancées, rendez-vous sur saya-card.com.
              </Text>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              <View style={styles.formGap}>
                <Input
                  label="Nom de votre commerce *"
                  theme="dark"
                  placeholder="Ex: Boulangerie Martin"
                  autoCapitalize="words"
                  value={businessName}
                  onChangeText={setBusinessName}
                />
                <Input
                  label="E-mail *"
                  theme="dark"
                  placeholder="contact@votrecommerce.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <Input
                  label="Mot de passe *"
                  theme="dark"
                  placeholder="Minimum 6 caractères"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View style={styles.btnSpacing}>
                <Button onPress={handleRegister} loading={loading} size="lg">
                  Créer mon espace commerçant
                </Button>
              </View>

              <Text style={styles.terms}>
                En créant un compte, vous acceptez nos conditions d'utilisation.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.dark.muted,
    marginTop: 2,
  },
  infoBanner: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    borderRadius: radius['2xl'],
    padding: 16,
    marginBottom: 20,
  },
  infoBannerTitle: {
    color: '#c4b5fd',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: 6,
  },
  infoBannerText: {
    color: '#a5b4fc',
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.glass.bg,
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: 24,
  },
  formGap: {
    gap: 14,
  },
  btnSpacing: {
    marginTop: 24,
  },
  terms: {
    fontSize: fontSize.xs,
    color: colors.dark.subtle,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 17,
  },
})
