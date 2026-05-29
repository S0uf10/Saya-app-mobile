import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { BonusRule, BonusRuleType } from '../../src/types'
import { DatePicker, TimePicker } from '../../src/components/ui/DatePicker'
import { colors, radius, fontSize, fontWeight, shadows } from '../../src/theme'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'

const RULE_META: Record<BonusRuleType, {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  color: string
  bg: string
}> = {
  birthday:            { icon: 'gift-outline',       label: 'Anniversaire',        color: '#db2777', bg: '#fdf2f8' },
  first_visit:         { icon: 'person-add-outline', label: 'Premier passage',      color: '#16a34a', bg: '#f0fdf4' },
  loyalty_anniversary: { icon: 'calendar-outline',   label: 'Anniv. fidélité',      color: '#2563eb', bg: '#eff6ff' },
  happy_hour:          { icon: 'time-outline',        label: 'Happy hour',           color: '#ea580c', bg: '#fff7ed' },
  day_of_week:         { icon: 'star-outline',        label: 'Jour de la semaine',   color: '#9333ea', bg: '#faf5ff' },
  flash_offer:         { icon: 'flash-outline',       label: 'Offre flash',          color: '#ca8a04', bg: '#fefce8' },
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface RuleForm {
  name: string
  rule_type: BonusRuleType
  bonus_type: 'points' | 'multiplier'
  bonus_value: string
  time_start: string
  time_end: string
  days_of_week: number[]
  date_start: string
  date_end: string
}

const emptyForm: RuleForm = {
  name:         '',
  rule_type:    'birthday',
  bonus_type:   'points',
  bonus_value:  '50',
  time_start:   '12:00',
  time_end:     '14:00',
  days_of_week: [],
  date_start:   '',
  date_end:     '',
}

function formatBonus(rule: BonusRule): string {
  return rule.bonus_type === 'points'
    ? `+${rule.bonus_points} pts`
    : `×${rule.bonus_multiplier}`
}

function formatSubtitle(rule: BonusRule): string {
  switch (rule.rule_type) {
    case 'happy_hour':   return `${rule.time_start} – ${rule.time_end}`
    case 'day_of_week':  return (rule.days_of_week ?? []).map(d => DAYS[d]).join(', ')
    case 'flash_offer':  return rule.date_start && rule.date_end
      ? `${rule.date_start} → ${rule.date_end}`
      : ''
    default: return 'Automatique'
  }
}

export default function BonusRulesScreen() {
  const { merchant } = useAuth()
  const [rules, setRules]               = useState<BonusRule[]>([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing]           = useState<BonusRule | null>(null)
  const [form, setForm]                 = useState<RuleForm>(emptyForm)
  const [saving, setSaving]             = useState(false)

  const loadRules = useCallback(async () => {
    if (!merchant) return
    try {
      const { data } = await supabase
        .from('bonus_rules')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
      setRules(data ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [merchant])

  useEffect(() => { loadRules() }, [loadRules])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalVisible(true)
  }

  function openEdit(rule: BonusRule) {
    setEditing(rule)
    setForm({
      name:         rule.name,
      rule_type:    rule.rule_type,
      bonus_type:   rule.bonus_type,
      bonus_value:  rule.bonus_type === 'points'
        ? String(rule.bonus_points ?? 50)
        : String(rule.bonus_multiplier ?? 2),
      time_start:   rule.time_start ?? '12:00',
      time_end:     rule.time_end ?? '14:00',
      days_of_week: rule.days_of_week ?? [],
      date_start:   rule.date_start ?? '',
      date_end:     rule.date_end ?? '',
    })
    setModalVisible(true)
  }

  async function handleSave() {
    if (!merchant) return
    if (!form.name.trim()) { Alert.alert('Erreur', 'Le nom est requis.'); return }
    const numVal = parseFloat(form.bonus_value)
    if (!numVal || numVal <= 0) { Alert.alert('Erreur', 'Valeur de bonus invalide.'); return }
    if (form.bonus_type === 'multiplier' && numVal <= 1) {
      Alert.alert('Erreur', 'Le multiplicateur doit être supérieur à 1 (ex : 2 pour ×2).'); return
    }
    if (form.rule_type === 'day_of_week' && form.days_of_week.length === 0) {
      Alert.alert('Erreur', 'Sélectionne au moins un jour.'); return
    }
    if (form.rule_type === 'flash_offer' && (!form.date_start || !form.date_end)) {
      Alert.alert('Erreur', 'Les dates de début et fin sont requises.'); return
    }

    setSaving(true)
    try {
      const payload = {
        merchant_id:      merchant.id,
        name:             form.name.trim(),
        rule_type:        form.rule_type,
        bonus_type:       form.bonus_type,
        bonus_points:     form.bonus_type === 'points'      ? Math.round(numVal) : null,
        bonus_multiplier: form.bonus_type === 'multiplier'  ? numVal             : null,
        time_start:       form.rule_type === 'happy_hour'   ? form.time_start    : null,
        time_end:         form.rule_type === 'happy_hour'   ? form.time_end      : null,
        days_of_week:     form.rule_type === 'day_of_week'  ? form.days_of_week  : null,
        date_start:       form.rule_type === 'flash_offer'  ? form.date_start    : null,
        date_end:         form.rule_type === 'flash_offer'  ? form.date_end      : null,
      }
      if (editing) {
        const { error } = await supabase.from('bonus_rules').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('bonus_rules').insert(payload)
        if (error) throw error
      }
      setModalVisible(false)
      await loadRules()
    } catch (err: any) {
      Alert.alert('Erreur', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(rule: BonusRule) {
    Alert.alert(
      'Supprimer la règle',
      `Supprimer "${rule.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            await supabase.from('bonus_rules').delete().eq('id', rule.id)
            await loadRules()
          },
        },
      ]
    )
  }

  async function toggleActive(rule: BonusRule) {
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    await supabase.from('bonus_rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
  }

  function toggleDay(day: number) {
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort((a, b) => a - b),
    }))
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Bonus automatiques</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadRules() }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.listContainer}>
            {rules.length === 0 ? (
              <EmptyState
                iconName="flash-outline"
                title="Aucune règle de bonus"
                subtitle="Configurez des bonus automatiques pour récompenser vos clients fidèles."
                actionLabel="Créer une règle"
                onAction={openCreate}
                theme="light"
              />
            ) : (
              <View style={styles.list}>
                {rules.map(rule => {
                  const meta = RULE_META[rule.rule_type]
                  return (
                    <View key={rule.id} style={[styles.ruleCard, !rule.is_active && styles.ruleCardInactive]}>
                      <View style={styles.ruleTop}>
                        <View style={[styles.ruleIcon, { backgroundColor: meta.bg }]}>
                          <Ionicons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View style={styles.ruleInfo}>
                          <Text style={styles.ruleName}>{rule.name}</Text>
                          <View style={styles.ruleBadgeRow}>
                            <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                              <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                            <View style={styles.bonusBadge}>
                              <Text style={styles.bonusBadgeText}>{formatBonus(rule)}</Text>
                            </View>
                          </View>
                          <Text style={styles.ruleSubtitle}>{formatSubtitle(rule)}</Text>
                        </View>
                        <Switch
                          value={rule.is_active}
                          onValueChange={() => toggleActive(rule)}
                          trackColor={{ false: colors.light.cardBorder, true: colors.primary }}
                          thumbColor="#ffffff"
                        />
                      </View>
                      <View style={styles.ruleActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(rule)} activeOpacity={0.75}>
                          <Text style={styles.actionBtnText}>Modifier</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(rule)} activeOpacity={0.75}>
                          <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Supprimer</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Modal créer / modifier ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Modifier la règle' : 'Nouvelle règle'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.light.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.formGap}>

                <Input
                  label="Nom *"
                  theme="light"
                  placeholder="Ex : Happy hour midi, Cadeau anniversaire…"
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                />

                {/* Sélecteur type d'événement */}
                <View>
                  <Text style={styles.fieldLabel}>Événement déclencheur</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {(Object.keys(RULE_META) as BonusRuleType[]).map(type => {
                        const meta = RULE_META[type]
                        const selected = form.rule_type === type
                        return (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setForm(f => ({ ...f, rule_type: type }))}
                            style={[styles.chip, selected && styles.chipSelected]}
                            activeOpacity={0.75}
                          >
                            <Ionicons name={meta.icon} size={13} color={selected ? colors.primary : colors.light.muted} />
                            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{meta.label}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Champs conditionnels */}
                {form.rule_type === 'happy_hour' && (
                  <View style={styles.timeRow}>
                    <View style={styles.timeField}>
                      <TimePicker
                        label="Début"
                        theme="light"
                        value={form.time_start}
                        onChange={v => setForm(f => ({ ...f, time_start: v }))}
                      />
                    </View>
                    <View style={styles.timeField}>
                      <TimePicker
                        label="Fin"
                        theme="light"
                        value={form.time_end}
                        onChange={v => setForm(f => ({ ...f, time_end: v }))}
                      />
                    </View>
                  </View>
                )}

                {form.rule_type === 'day_of_week' && (
                  <View>
                    <Text style={styles.fieldLabel}>Jours de la semaine</Text>
                    <View style={styles.daysRow}>
                      {DAYS.map((label, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => toggleDay(idx)}
                          style={[styles.dayBtn, form.days_of_week.includes(idx) && styles.dayBtnActive]}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.dayBtnText, form.days_of_week.includes(idx) && styles.dayBtnTextActive]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {form.rule_type === 'flash_offer' && (
                  <>
                    <DatePicker
                      label="Date de début *"
                      theme="light"
                      value={form.date_start}
                      onChange={v => setForm(f => ({ ...f, date_start: v }))}
                      minYear={new Date().getFullYear()}
                      maxYear={new Date().getFullYear() + 5}
                    />
                    <DatePicker
                      label="Date de fin *"
                      theme="light"
                      value={form.date_end}
                      onChange={v => setForm(f => ({ ...f, date_end: v }))}
                      minYear={new Date().getFullYear()}
                      maxYear={new Date().getFullYear() + 5}
                    />
                  </>
                )}

                {/* Type de bonus */}
                <View>
                  <Text style={styles.fieldLabel}>Type de bonus</Text>
                  <View style={styles.bonusTypeRow}>
                    <TouchableOpacity
                      style={[styles.bonusTypeBtn, form.bonus_type === 'points' && styles.bonusTypeBtnActive]}
                      onPress={() => setForm(f => ({ ...f, bonus_type: 'points' }))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.bonusTypeBtnText, form.bonus_type === 'points' && styles.bonusTypeBtnTextActive]}>
                        Points fixes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bonusTypeBtn, form.bonus_type === 'multiplier' && styles.bonusTypeBtnActive]}
                      onPress={() => setForm(f => ({ ...f, bonus_type: 'multiplier' }))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.bonusTypeBtnText, form.bonus_type === 'multiplier' && styles.bonusTypeBtnTextActive]}>
                        Multiplicateur
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Input
                  label={form.bonus_type === 'points' ? 'Points à ajouter *' : 'Multiplicateur * (ex : 2 pour ×2)'}
                  theme="light"
                  placeholder={form.bonus_type === 'points' ? '50' : '2'}
                  keyboardType="decimal-pad"
                  value={form.bonus_value}
                  onChangeText={v => setForm(f => ({ ...f, bonus_value: v }))}
                />

                <Button onPress={handleSave} loading={saving} size="lg">
                  {editing ? 'Enregistrer' : 'Créer la règle'}
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.light.bg },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  pageTitle:    { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.light.text },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText:   { color: '#ffffff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  loadingBox:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContainer:{ paddingHorizontal: 20, paddingBottom: 40 },
  list:         { gap: 10 },

  ruleCard:        { backgroundColor: colors.light.card, borderRadius: radius['2xl'], borderWidth: 1, borderColor: colors.light.cardBorder, padding: 16, ...shadows.sm },
  ruleCardInactive:{ opacity: 0.55 },
  ruleTop:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  ruleIcon:        { width: 40, height: 40, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  ruleInfo:        { flex: 1 },
  ruleName:        { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.light.text },
  ruleBadgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  typeBadge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  typeBadgeText:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  bonusBadge:      { backgroundColor: '#ede9fe', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  bonusBadgeText:  { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },
  ruleSubtitle:    { fontSize: fontSize.xs, color: colors.light.muted, marginTop: 4 },
  ruleActions:     { flexDirection: 'row', gap: 10 },
  actionBtn:       { flex: 1, borderWidth: 1.5, borderColor: colors.light.cardBorder, borderRadius: radius.xl, paddingVertical: 9, alignItems: 'center' },
  actionBtnDanger: { borderColor: colors.dangerBorder ?? '#fecaca' },
  actionBtnText:        { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.light.textSoft },
  actionBtnTextDanger:  { color: colors.danger ?? '#dc2626' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: colors.light.card, borderTopLeftRadius: radius['3xl'], borderTopRightRadius: radius['3xl'], paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, maxHeight: '92%' },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.light.text },
  formGap:      { gap: 14, paddingBottom: 16 },
  fieldLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.light.textSoft, marginBottom: 8 },

  // Chip selector
  chipRow:      { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.light.cardBorder, backgroundColor: colors.light.bg },
  chipSelected: { borderColor: colors.primary, backgroundColor: '#f5f0ff' },
  chipText:     { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.light.muted },
  chipTextSelected: { color: colors.primary },

  // Happy hour time row
  timeRow:  { flexDirection: 'row', gap: 12 },
  timeField:{ flex: 1 },

  // Days row
  daysRow:         { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayBtn:          { paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.lg, backgroundColor: colors.light.bg, borderWidth: 1.5, borderColor: colors.light.cardBorder },
  dayBtnActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  dayBtnText:      { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.light.muted },
  dayBtnTextActive:{ color: '#ffffff' },

  // Bonus type toggle
  bonusTypeRow:        { flexDirection: 'row', gap: 10 },
  bonusTypeBtn:        { flex: 1, paddingVertical: 10, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.light.cardBorder, alignItems: 'center' },
  bonusTypeBtnActive:  { borderColor: colors.primary, backgroundColor: '#f5f0ff' },
  bonusTypeBtnText:    { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.light.muted },
  bonusTypeBtnTextActive: { color: colors.primary },
})
