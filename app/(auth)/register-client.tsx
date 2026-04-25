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
import { colors, gradients, radius, fontSize, fontWeight, spacing } from '../../src/theme'
import 'react-native-get-random-values'

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default function RegisterClientScreen() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires.')
      return
    }
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'client', first_name: firstName, last_name: lastName },
        },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Création du compte échouée.')

      const qrToken = generateUUID()
      const { error: clientError } = await supabase.from('clients').insert({
        user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        birth_date: birthDate || null,
        qr_token: qrToken,
        current_level: 1,
        scans_last_30d: 0,
        marketing_consent: false,
        accepted_terms: true,
        accepted_terms_at: new Date().toISOString(),
      })
      if (clientError) throw clientError

      router.replace('/(client)/dashboard')
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
              <View style={styles.headerText}>
                <Text style={styles.title}>Créer un compte</Text>
                <Text style={styles.subtitle}>Rejoignez Saya Card</Text>
              </View>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              <View style={styles.formGap}>
                {/* First & Last name row */}
                <View style={styles.row}>
                  <View style={styles.halfCol}>
                    <Input
                      label="Prénom *"
                      theme="dark"
                      placeholder="Jean"
                      autoCapitalize="words"
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>
                  <View style={styles.halfCol}>
                    <Input
                      label="Nom *"
                      theme="dark"
                      placeholder="Dupont"
                      autoCapitalize="words"
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>
                </View>

                <Input
                  label="E-mail *"
                  theme="dark"
                  placeholder="vous@exemple.com"
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

                <Input
                  label="Téléphone (optionnel)"
                  theme="dark"
                  placeholder="+33 6 00 00 00 00"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                <Input
                  label="Date de naissance (optionnel)"
                  theme="dark"
                  placeholder="AAAA-MM-JJ"
                  value={birthDate}
                  onChangeText={setBirthDate}
                />
              </View>

              <View style={styles.btnSpacing}>
                <Button onPress={handleRegister} loading={loading} size="lg">
                  Créer mon compte
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
    marginBottom: 28,
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
  headerText: {
    flex: 1,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
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
