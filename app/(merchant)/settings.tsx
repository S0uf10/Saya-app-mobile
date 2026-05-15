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
  Modal,
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

const CATEGORIES = [
  'Restaurant / Snack',
  'Café / Boulangerie',
  'Bar / Lounge',
  'Épicerie / Alimentation',
  'Coiffeur / Barbier',
  'Beauté / Esthétique',
  'Spa / Bien-être',
  'Sport / Fitness',
  'Mode / Vêtements',
  'Chaussures / Accessoires',
  'Librairie / Papeterie',
  'Santé / Pharmacie',
  'Services',
  'Autre',
]

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type DayKey = (typeof DAY_KEYS)[number]

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

type TimeModalState = {
  day: DayKey
  field: 'open' | 'close'
  hour: string
  minute: string
}

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
  const [category, setCategory] = useState<string | null>(merchant?.category ?? null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [timeModal, setTimeModal] = useState<TimeModalState | null>(null)

  const updateDay = useCallback(
    (day: DayKey, field: 'closed' | 'open' | 'close', value: string | boolean) => {
      setHours((h) => ({
        ...h,
        [day]: { ...h[day], [field]: value },
      }))
    },
    []
  )

  function openTimePicker(day: DayKey, field: 'open' | 'close') {
    const raw = hours[day][field]
    const [h, m] = raw.split(':')
    const mNum = parseInt(m ?? '0', 10)
    const minute = MINUTES.reduce((prev, curr) =>
      Math.abs(parseInt(curr, 10) - mNum) < Math.abs(parseInt(prev, 10) - mNum) ? curr : prev
    , '00')
    setTimeModal({ day, field, hour: h ?? '09', minute })
  }

  function confirmTime() {
    if (!timeModal) return
    updateDay(timeModal.day, timeModal.field, `${timeModal.hour}:${timeModal.minute}`)
    setTimeModal(null)
  }

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
          category: category || null,
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
        // Pas de stripe_customer_id → pas encore abonné → page d'abonnement
        Linking.openURL('https://www.saya-card.com/onboarding/subscribe')
      }
    } catch {
      Linking.openURL('https://www.saya-card.com/onboarding/subscribe')
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

  async function handleDeleteAccount() {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Votre espace commerçant et toutes les données associées seront supprimés définitivement.',
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
              Alert.alert('Erreur', 'Impossible de supprimer le compte. Contactez contact@saya-card.com.')
            }
          },
        },
      ]
    )
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

          {/* ── Catégorie ─────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Catégorie de commerce</Text>
            <TouchableOpacity
              style={styles.categoryBtn}
              onPress={() => setCategoryModalOpen(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="pricetag-outline" size={15} color={category ? colors.primary : colors.light.subtle} />
              <Text style={[styles.categoryBtnText, !category && styles.categoryBtnPlaceholder]}>
                {category ?? 'Sélectionner une catégorie'}
              </Text>
              <Ionicons name="chevron-down" size={15} color={colors.light.subtle} />
            </TouchableOpacity>
            <Text style={styles.inputHint}>Aide vos clients à vous trouver dans la section Découvrir.</Text>
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
                            <TouchableOpacity
                              style={styles.timePickerBtn}
                              onPress={() => openTimePicker(day, 'open')}
                              activeOpacity={0.75}
                            >
                              <Ionicons name="time-outline" size={13} color={colors.primary} />
                              <Text style={styles.timePickerBtnText}>{d.open}</Text>
                            </TouchableOpacity>
                          </View>
                          <Ionicons name="arrow-forward" size={14} color={colors.light.subtle} style={{ marginTop: 20 }} />
                          <View style={styles.timeField}>
                            <Text style={styles.timeLabel}>Fermeture</Text>
                            <TouchableOpacity
                              style={styles.timePickerBtn}
                              onPress={() => openTimePicker(day, 'close')}
                              activeOpacity={0.75}
                            >
                              <Ionicons name="time-outline" size={13} color={colors.primary} />
                              <Text style={styles.timePickerBtnText}>{d.close}</Text>
                            </TouchableOpacity>
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
              onPress={handleManageSubscription}
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

          {/* ── Suppression de compte ─────────── */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteBtnText}>Supprimer mon compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Category picker modal ─────────── */}
      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <View style={styles.tpOverlay}>
          <View style={[styles.tpCard, { paddingBottom: 48 }]}>
            <Text style={styles.tpTitle}>Catégorie de commerce</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {/* Reset option */}
              <TouchableOpacity
                style={[styles.catOptionRow, !category && styles.catOptionRowActive]}
                onPress={() => { setCategory(null); setCategoryModalOpen(false) }}
                activeOpacity={0.75}
              >
                <Text style={[styles.catOptionText, !category && styles.catOptionTextActive]}>
                  — Aucune catégorie —
                </Text>
                {!category && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catOptionRow, category === cat && styles.catOptionRowActive]}
                  onPress={() => { setCategory(cat); setCategoryModalOpen(false) }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catOptionText, category === cat && styles.catOptionTextActive]}>
                    {cat}
                  </Text>
                  {category === cat && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.tpCancelBtn, { marginTop: 16 }]}
              onPress={() => setCategoryModalOpen(false)}
              activeOpacity={0.75}
            >
              <Text style={styles.tpCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Time picker modal ─────────────── */}
      <Modal
        visible={!!timeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeModal(null)}
      >
        <View style={styles.tpOverlay}>
          <View style={styles.tpCard}>
            <Text style={styles.tpTitle}>
              {timeModal?.field === 'open' ? "Heure d'ouverture" : 'Heure de fermeture'}
            </Text>

            <View style={styles.tpBody}>
              {/* Hours grid — 6 cols × 4 rows */}
              <View style={styles.tpCol}>
                <Text style={styles.tpColLabel}>Heure</Text>
                <View style={styles.tpHoursGrid}>
                  {HOURS.map((h) => {
                    const selected = timeModal?.hour === h
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[styles.tpCell, selected && styles.tpCellSelected]}
                        onPress={() => setTimeModal((prev) => prev ? { ...prev, hour: h } : null)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tpCellText, selected && styles.tpCellTextSelected]}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              <Text style={styles.tpColon}>:</Text>

              {/* Minutes column */}
              <View style={styles.tpCol}>
                <Text style={styles.tpColLabel}>Min</Text>
                <View style={styles.tpMinCol}>
                  {MINUTES.map((m) => {
                    const selected = timeModal?.minute === m
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.tpMinCell, selected && styles.tpCellSelected]}
                        onPress={() => setTimeModal((prev) => prev ? { ...prev, minute: m } : null)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tpCellText, selected && styles.tpCellTextSelected]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            </View>

            <View style={styles.tpFooter}>
              <TouchableOpacity style={styles.tpCancelBtn} onPress={() => setTimeModal(null)} activeOpacity={0.75}>
                <Text style={styles.tpCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tpConfirmBtn} onPress={confirmTime} activeOpacity={0.8}>
                <Text style={styles.tpConfirmText}>
                  Confirmer {timeModal ? `${timeModal.hour}:${timeModal.minute}` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Category picker
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.light.inputBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.light.bg,
    marginTop: 8,
  },
  categoryBtnText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.light.text,
    fontWeight: fontWeight.medium,
  },
  categoryBtnPlaceholder: {
    color: colors.light.placeholder,
    fontWeight: fontWeight.regular,
  },
  catOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  catOptionRowActive: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
    marginBottom: 1,
  },
  catOptionText: {
    fontSize: fontSize.sm,
    color: colors.light.text,
  },
  catOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1.5,
    borderColor: 'rgba(220,38,38,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  deleteBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: '#dc2626',
    flex: 1,
  },

  // Time picker button (replaces TextInput)
  timePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
  },
  timePickerBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primaryDark,
  },

  // Time picker modal
  tpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  tpCard: {
    backgroundColor: colors.light.card,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: colors.light.cardBorder,
  },
  tpTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  tpBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
  },
  tpCol: { flex: 1 },
  tpColLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.light.subtle,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tpHoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
  },
  tpCell: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.bg,
    borderWidth: 1,
    borderColor: colors.light.inputBorder,
  },
  tpCellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tpCellText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.light.text,
  },
  tpCellTextSelected: {
    color: '#ffffff',
    fontWeight: fontWeight.bold,
  },
  tpColon: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.light.subtle,
    marginTop: 30,
    paddingHorizontal: 2,
  },
  tpMinCol: {
    gap: 6,
  },
  tpMinCell: {
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.bg,
    borderWidth: 1,
    borderColor: colors.light.inputBorder,
  },
  tpFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  tpCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.light.inputBorder,
    backgroundColor: colors.light.bg,
  },
  tpCancelText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.light.muted,
  },
  tpConfirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: radius.xl,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  tpConfirmText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
})
