import { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { OpeningHours, ScanPreset } from '../../src/types'
import { colors, radius, fontSize, fontWeight, shadows } from '../../src/theme'
import { Avatar } from '../../src/components/ui/Avatar'
import { Badge } from '../../src/components/ui/Badge'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type DayKey = (typeof DAY_KEYS)[number]

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi',
  thu: 'Jeudi', fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche',
}

const DEFAULT_HOURS: OpeningHours = {
  mon: { closed: false, open: '09:00', close: '19:00' },
  tue: { closed: false, open: '09:00', close: '19:00' },
  wed: { closed: false, open: '09:00', close: '19:00' },
  thu: { closed: false, open: '09:00', close: '19:00' },
  fri: { closed: false, open: '09:00', close: '19:00' },
  sat: { closed: true,  open: '10:00', close: '17:00' },
  sun: { closed: true,  open: '10:00', close: '17:00' },
}

function mergeHours(stored: OpeningHours | null | undefined): OpeningHours {
  if (!stored) return { ...DEFAULT_HOURS }
  return {
    ...DEFAULT_HOURS,
    ...stored,
  }
}

export default function SettingsScreen() {
  const { merchant, signOut, refreshProfile } = useAuth()
  const router = useRouter()

  const [signingOut, setSigningOut] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)

  const [hours, setHours] = useState<OpeningHours>(() =>
    mergeHours(merchant?.opening_hours)
  )
  const [presets, setPresets] = useState<ScanPreset[]>(
    () => merchant?.scan_presets ?? []
  )
  const [address, setAddress] = useState(merchant?.address ?? '')

  const updateDay = useCallback(
    (day: DayKey, field: 'closed' | 'open' | 'close', value: string | boolean) => {
      setHours((h) => ({
        ...h,
        [day]: { ...h[day], [field]: value },
      }))
    },
    []
  )

  const addPreset = () =>
    setPresets((p) => [...p, { label: '', points: 10 }])

  const removePreset = (i: number) =>
    setPresets((p) => p.filter((_, idx) => idx !== i))

  const updatePreset = (i: number, field: keyof ScanPreset, value: string | number) =>
    setPresets((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))

  async function handleSave() {
    if (!merchant) return
    const validPresets = presets.filter((p) => p.label.trim() !== '')
    setSaving(true)
    try {
      const { error } = await supabase
        .from('merchants')
        .update({
          opening_hours: hours,
          scan_presets: validPresets,
          address: address.trim() || null,
        })
        .eq('id', merchant.id)

      if (error) throw error
      await refreshProfile()
      Alert.alert('Succès', 'Paramètres enregistrés avec succès.')
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

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

  if (!merchant) return null

  const planConfig: Record<string, { label: string; color: 'blue' | 'purple' | 'amber' }> = {
    starter:  { label: 'Starter',  color: 'blue' },
    business: { label: 'Business', color: 'purple' },
    premium:  { label: 'Premium',  color: 'amber' },
  }
  const statusConfig: Record<string, { label: string; color: string }> = {
    active:   { label: 'Actif',              color: colors.success },
    inactive: { label: 'Inactif',            color: colors.light.muted },
    past_due: { label: 'Paiement en retard', color: colors.danger },
    canceled: { label: 'Annulé',             color: colors.danger },
  }

  const plan = merchant.subscription_plan ? planConfig[merchant.subscription_plan] : null
  const status = statusConfig[merchant.subscription_status] ?? statusConfig.inactive

  const infoItems = [
    { icon: 'business-outline' as const,    label: 'Nom du commerce', value: merchant.name },
    { icon: 'mail-outline' as const,        label: 'E-mail',          value: merchant.email },
    { icon: 'star-outline' as const,        label: 'Mode',            value: merchant.mode === 'points' ? 'Points' : 'Visites' },
    { icon: 'add-circle-outline' as const,  label: 'Points / visite', value: String(merchant.points_per_visit) },
  ]

  const links = [
    { icon: 'globe-outline' as const,        label: 'Tableau de bord web',    url: 'https://www.saya-card.com/dashboard' },
    { icon: 'settings-outline' as const,     label: 'Paramètres avancés',     url: 'https://www.saya-card.com/dashboard/settings' },
    { icon: 'help-circle-outline' as const,  label: 'Aide & support',         url: 'https://www.saya-card.com' },
  ]

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Text style={styles.pageTitle}>Paramètres</Text>

          {/* ── Profile ───────────────────────── */}
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <Avatar name={merchant.name} size="lg" theme="light" />
              <View style={styles.profileText}>
                <Text style={styles.profileName}>{merchant.name}</Text>
                <Text style={styles.profileEmail}>{merchant.email}</Text>
              </View>
            </View>
            {infoItems.map((item, idx) => (
              <View
                key={item.label}
                style={[styles.infoRow, idx < infoItems.length - 1 && styles.infoRowBorder]}
              >
                <Ionicons name={item.icon} size={15} color={colors.light.subtle} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Adresse ───────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Adresse du commerce</Text>
            <TextInput
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Ex : 12 rue de la Paix, 75001 Paris"
              placeholderTextColor={colors.light.placeholder}
            />
            <Text style={styles.inputHint}>Visible par vos clients pour s'y rendre.</Text>
          </View>

          {/* ── Horaires ──────────────────────── */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.sectionToggleRow}
              onPress={() => setHoursOpen((v) => !v)}
              activeOpacity={0.75}
            >
              <View style={styles.sectionToggleLeft}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Horaires d'ouverture</Text>
              </View>
              <Ionicons
                name={hoursOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.light.subtle}
              />
            </TouchableOpacity>

            {hoursOpen && (
              <View style={styles.hoursContainer}>
                {DAY_KEYS.map((day) => {
                  const d = hours[day]
                  return (
                    <View key={day} style={styles.dayRow}>
                      <View style={styles.dayHeader}>
                        <Text style={styles.dayLabel}>{DAY_LABELS[day]}</Text>
                        <View style={styles.dayToggleRow}>
                          <Text style={[styles.dayToggleText, d.closed && styles.dayToggleTextOff]}>
                            {d.closed ? 'Fermé' : 'Ouvert'}
                          </Text>
                          <Switch
                            value={!d.closed}
                            onValueChange={(v) => updateDay(day, 'closed', !v)}
                            trackColor={{ false: colors.light.cardBorder, true: colors.primaryBorder }}
                            thumbColor={d.closed ? colors.light.subtle : colors.primary}
                          />
                        </View>
                      </View>

                      {!d.closed && (
                        <View style={styles.timeRow}>
                          <View style={styles.timeField}>
                            <Text style={styles.timeLabel}>Ouverture</Text>
                            <TextInput
                              style={styles.timeInput}
                              value={d.open}
                              onChangeText={(v) => updateDay(day, 'open', v)}
                              placeholder="09:00"
                              placeholderTextColor={colors.light.placeholder}
                              keyboardType="numbers-and-punctuation"
                              maxLength={5}
                            />
                          </View>
                          <Ionicons name="arrow-forward" size={14} color={colors.light.subtle} style={{ marginTop: 20 }} />
                          <View style={styles.timeField}>
                            <Text style={styles.timeLabel}>Fermeture</Text>
                            <TextInput
                              style={styles.timeInput}
                              value={d.close}
                              onChangeText={(v) => updateDay(day, 'close', v)}
                              placeholder="19:00"
                              placeholderTextColor={colors.light.placeholder}
                              keyboardType="numbers-and-punctuation"
                              maxLength={5}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            )}
          </View>

          {/* ── Presets de scan ───────────────── */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.sectionToggleRow}
              onPress={() => setPresetsOpen((v) => !v)}
              activeOpacity={0.75}
            >
              <View style={styles.sectionToggleLeft}>
                <Ionicons name="flash-outline" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Raccourcis de scan</Text>
              </View>
              <Ionicons
                name={presetsOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.light.subtle}
              />
            </TouchableOpacity>

            {presetsOpen && (
              <View style={styles.presetsContainer}>
                <Text style={styles.presetsHint}>
                  Ces raccourcis apparaissent lors du scan pour ajouter des points rapidement.
                </Text>

                {presets.map((preset, idx) => (
                  <View key={idx} style={styles.presetEditRow}>
                    <TextInput
                      style={[styles.presetLabelInput, { flex: 1 }]}
                      value={preset.label}
                      onChangeText={(v) => updatePreset(idx, 'label', v)}
                      placeholder="Label (ex : Café)"
                      placeholderTextColor={colors.light.placeholder}
                    />
                    <TextInput
                      style={[styles.presetLabelInput, styles.presetPtsInput]}
                      value={String(preset.points)}
                      onChangeText={(v) => updatePreset(idx, 'points', parseInt(v) || 0)}
                      placeholder="pts"
                      placeholderTextColor={colors.light.placeholder}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.ptsSuffix}>pts</Text>
                    <TouchableOpacity onPress={() => removePreset(idx)} style={styles.removeBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addPresetBtn} onPress={addPreset} activeOpacity={0.75}>
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.addPresetText}>Ajouter un raccourci</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Save button ───────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Abonnement ────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Abonnement</Text>
            <View style={styles.subRow}>
              <Text style={styles.subKey}>Plan</Text>
              {plan ? (
                <Badge label={plan.label} color={plan.color} size="sm" />
              ) : (
                <Text style={styles.subValueMuted}>Aucun</Text>
              )}
            </View>
            <View style={[styles.subRow, styles.subRowLast]}>
              <Text style={styles.subKey}>Statut</Text>
              <Text style={[styles.subValue, { color: status.color }]}>{status.label}</Text>
            </View>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => Linking.openURL('https://www.saya-card.com/onboarding/subscribe')}
              activeOpacity={0.75}
            >
              <Text style={styles.manageBtnText}>Gérer mon abonnement</Text>
            </TouchableOpacity>
          </View>

          {/* ── Liens ─────────────────────────── */}
          <View style={[styles.card, styles.cardNopad]}>
            {links.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.linkRow, idx > 0 && styles.linkRowBorder]}
                onPress={() => Linking.openURL(item.url)}
                activeOpacity={0.75}
              >
                <View style={styles.linkIconBox}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.linkLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.light.subtle} />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Déconnexion ───────────────────── */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.75}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.signOutText}>
              {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
            </Text>
            {signingOut && <ActivityIndicator size="small" color={colors.danger} />}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.bg },
  inner: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  pageTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 16,
    marginBottom: 12,
    ...shadows.sm,
  },
  cardNopad: { padding: 0, overflow: 'hidden' },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginBottom: 0,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
    gap: 12,
  },
  profileText: { flex: 1 },
  profileName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.light.text },
  profileEmail: { fontSize: fontSize.sm, color: colors.light.muted, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.light.divider },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: fontSize.xs, color: colors.light.subtle },
  infoValue: { fontSize: fontSize.sm, color: colors.light.text, fontWeight: fontWeight.medium, marginTop: 1 },

  // Address input
  textInput: {
    borderWidth: 1,
    borderColor: colors.light.inputBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: fontSize.sm,
    color: colors.light.text,
    backgroundColor: colors.light.bg,
  },
  inputHint: { fontSize: fontSize.xs, color: colors.light.subtle, marginTop: 6 },

  // Section toggle
  sectionToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Opening hours
  hoursContainer: { marginTop: 16, gap: 12 },
  dayRow: {
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
    paddingTop: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.light.text },
  dayToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayToggleText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.success },
  dayToggleTextOff: { color: colors.light.muted },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 10 },
  timeField: { flex: 1 },
  timeLabel: { fontSize: fontSize.xs, color: colors.light.subtle, marginBottom: 4 },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.light.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: fontSize.sm,
    color: colors.light.text,
    backgroundColor: colors.light.bg,
    textAlign: 'center',
  },

  // Presets
  presetsContainer: { marginTop: 16 },
  presetsHint: { fontSize: fontSize.xs, color: colors.light.subtle, marginBottom: 12 },
  presetEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  presetLabelInput: {
    borderWidth: 1,
    borderColor: colors.light.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: fontSize.sm,
    color: colors.light.text,
    backgroundColor: colors.light.bg,
  },
  presetPtsInput: { flex: 0, width: 52, textAlign: 'center' },
  ptsSuffix: { fontSize: fontSize.xs, color: colors.light.subtle },
  removeBtn: { padding: 4 },
  addPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryBg,
  },
  addPresetText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.primary },

  // Save
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius['2xl'],
    paddingVertical: 14,
    marginBottom: 12,
    ...shadows.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: '#ffffff' },

  // Subscription
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  subRowLast: { borderBottomWidth: 0, marginBottom: 12 },
  subKey: { fontSize: fontSize.sm, color: colors.light.muted },
  subValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  subValueMuted: { fontSize: fontSize.sm, color: colors.light.subtle },
  manageBtn: {
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderRadius: radius.xl,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
  },
  manageBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.primary },

  // Links
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  linkRowBorder: { borderTopWidth: 1, borderTopColor: colors.light.divider },
  linkIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  linkLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.light.text,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1.5,
    borderColor: colors.dangerBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadows.sm,
  },
  signOutText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.danger,
    flex: 1,
  },
})
