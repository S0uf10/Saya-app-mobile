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
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { colors, gradients, radius, fontSize, fontWeight } from '../../src/theme'

export default function SignInScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const role = data.user?.user_metadata?.role
      router.replace(role === 'merchant' ? '/(merchant)/dashboard' : '/(client)/dashboard')
    } catch (err: any) {
      Alert.alert('Connexion échouée', err.message ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={gradients.clientBg} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>Content de vous revoir</Text>

            <View style={styles.card}>
              <View style={styles.formGap}>
                <Input
                  label="Adresse e-mail"
                  theme="dark"
                  placeholder="vous@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
                <Input
                  label="Mot de passe"
                  theme="dark"
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View style={styles.btnSpacing}>
                <Button onPress={handleLogin} loading={loading} size="lg">
                  Se connecter
                </Button>
              </View>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>pas encore de compte ?</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.registerGap}>
              <TouchableOpacity
                style={styles.outlinePurple}
                onPress={() => router.push('/(auth)/register-client')}
                activeOpacity={0.75}
              >
                <Text style={styles.outlinePurpleText}>Créer un compte client</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineGray}
                onPress={() => router.push('/(auth)/register-merchant')}
                activeOpacity={0.75}
              >
                <Text style={styles.outlineGrayText}>Créer un espace commerçant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: {},
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  backBtn: {
    marginTop: 8,
    marginLeft: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.dark.muted,
    marginBottom: 28,
  },
  card: {
    backgroundColor: colors.glass.bg,
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: 24,
    marginBottom: 28,
  },
  formGap: { gap: 14 },
  btnSpacing: { marginTop: 20 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.10)' },
  dividerText: { color: colors.dark.subtle, fontSize: fontSize.sm, marginHorizontal: 14 },
  registerGap: { gap: 12 },
  outlinePurple: {
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderRadius: radius['2xl'],
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
  },
  outlinePurpleText: {
    color: colors.primaryLight,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
  },
  outlineGray: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: radius['2xl'],
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: colors.glass.bg,
  },
  outlineGrayText: {
    color: colors.dark.textSoft,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
  },
})
