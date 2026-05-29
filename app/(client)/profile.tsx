import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { LEVEL_DEFINITIONS } from '../../src/lib/levels'
import {
  colors,
  gradients,
  radius,
  fontSize,
  fontWeight,
  levelColorWithOpacity,
} from '../../src/theme'
import { Avatar } from '../../src/components/ui/Avatar'
import { DatePicker } from '../../src/components/ui/DatePicker'

export default function ProfileScreen() {
  const { client, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(
    (client as any)?.marketing_consent ?? false
  )
  const [updatingConsent, setUpdatingConsent] = useState(false)
  const [birthDate, setBirthDate] = useState(client?.birth_date ?? '')
  const [savingBirthDate, setSavingBirthDate] = useState(false)

  if (!client) return null

  const levelDef = LEVEL_DEFINITIONS.find((l) => l.level_number === client.current_level)

  async function handleSignOut() {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          await signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('delete-account')
              if (error) throw error
              await signOut()
              router.replace('/(auth)/login')
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer le compte. Rendez-vous sur saya-card.com.')
            }
          },
        },
      ]
    )
  }

  async function handleBirthDateChange(value: string) {
    setBirthDate(value)
    setSavingBirthDate(true)
    try {
      await supabase.from('clients').update({ birth_date: value }).eq('id', client.id)
      await refreshProfile()
    } finally {
      setSavingBirthDate(false)
    }
  }

  async function toggleMarketingConsent(value: boolean) {
    if (!client) return
    setMarketingConsent(value)
    setUpdatingConsent(true)
    try {
      await supabase.from('clients').update({ marketing_consent: value }).eq('id', client.id)
    } finally {
      setUpdatingConsent(false)
    }
  }

  const infoItems = [
    { icon: 'person-outline' as const, label: 'Prénom', value: client.first_name },
    { icon: 'person-outline' as const, label: 'Nom', value: client.last_name },
    { icon: 'mail-outline' as const, label: 'E-mail', value: client.email },
    { icon: 'call-outline' as const, label: 'Téléphone', value: client.phone ?? 'Non renseigné' },
    {
      icon: 'time-outline' as const,
      label: 'Membre depuis',
      value: new Date(client.created_at).toLocaleDateString('fr-FR'),
    },
  ]

  return (
    <LinearGradient colors={gradients.clientBg} style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <Text style={styles.pageTitle}>Mon profil</Text>

            {/* ── Avatar section ────────────────── */}
            <View style={styles.avatarSection}>
              <Avatar
                name={client.first_name}
                size="2xl"
                theme="dark"
              />
              <Text style={styles.fullName}>
                {client.first_name} {client.last_name}
              </Text>
              {levelDef && (
                <View
                  style={[
                    styles.levelPill,
                    {
                      backgroundColor: levelColorWithOpacity(levelDef.color, 0.15),
                      borderColor: levelColorWithOpacity(levelDef.color, 0.35),
                    },
                  ]}
                >
                  <Text style={styles.levelPillEmoji}>{levelDef.emoji}</Text>
                  <Text style={[styles.levelPillName, { color: levelDef.color }]}>
                    {levelDef.name}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Info card ─────────────────────── */}
            <View style={styles.card}>
              {infoItems.map((item, idx) => (
                <View
                  key={item.label}
                  style={[
                    styles.infoRow,
                    styles.infoRowBorder,
                  ]}
                >
                  <View style={styles.infoIconBox}>
                    <Ionicons name={item.icon} size={16} color={colors.dark.muted} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoValue}>{item.value}</Text>
                  </View>
                </View>
              ))}

              {/* Date de naissance — éditable */}
              <View style={[styles.infoRow, styles.birthRow]}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="calendar-outline" size={16} color={colors.dark.muted} />
                </View>
                <View style={styles.infoContent}>
                  <View style={styles.birthLabelRow}>
                    <Text style={styles.infoLabel}>Date de naissance</Text>
                    {savingBirthDate && (
                      <Text style={styles.savingText}>Enregistrement…</Text>
                    )}
                  </View>
                  <DatePicker
                    theme="dark"
                    value={birthDate}
                    onChange={handleBirthDateChange}
                    placeholder={birthDate ? undefined : 'Ajouter'}
                    maxYear={new Date().getFullYear() - 10}
                  />
                </View>
              </View>
            </View>

            {/* ── Preferences ───────────────────── */}
            <View style={styles.card}>
              <View style={styles.prefRow}>
                <View style={styles.prefText}>
                  <Text style={styles.prefTitle}>Emails promotionnels</Text>
                  <Text style={styles.prefSub}>Recevoir les offres de vos commerçants</Text>
                </View>
                <Switch
                  value={marketingConsent}
                  onValueChange={toggleMarketingConsent}
                  trackColor={{ false: colors.dark.cardBorder, true: colors.primary }}
                  thumbColor="#ffffff"
                  disabled={updatingConsent}
                />
              </View>
            </View>

            {/* ── Actions ───────────────────────── */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.75}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.actionTextDanger}>
                {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, styles.actionRowDestructive]}
              onPress={handleDeleteAccount}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text style={[styles.actionTextDanger, styles.actionTextDeep]}>
                Supprimer mon compte
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginBottom: 24,
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fullName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginTop: 14,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  levelPillEmoji: { fontSize: 15 },
  levelPillName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // Info card
  card: {
    backgroundColor: colors.glass.bg,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  infoIconBox: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.muted,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.dark.text,
    fontWeight: fontWeight.medium,
  },
  birthRow: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  birthLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  savingText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontStyle: 'italic',
  },

  // Preferences
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  prefText: { flex: 1, marginRight: 16 },
  prefTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
  },
  prefSub: {
    fontSize: fontSize.xs,
    color: colors.dark.muted,
    marginTop: 2,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.glass.bg,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.20)',
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 10,
  },
  actionRowDestructive: {
    borderColor: 'rgba(220,38,38,0.25)',
  },
  actionTextDanger: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.danger,
  },
  actionTextDeep: {
    color: '#dc2626',
  },
})
