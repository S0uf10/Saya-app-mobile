import { useRef, useState } from 'react'
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, radius, fontSize, fontWeight } from '../../theme'
import { Button } from './Button'

const ITEM_H = 48
const VISIBLE = 5  // impair — le centre est l'item sélectionné

const MONTHS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

// ─── Roue de défilement générique ───────────────────────────

interface WheelProps {
  items: string[]
  index: number
  onChangeIndex: (i: number) => void
  flex?: number
}

function PickerWheel({ items, index, onChangeIndex, flex = 1 }: WheelProps) {
  const ref = useRef<ScrollView>(null)
  const didInit = useRef(false)

  const scrollTo = (i: number, animated: boolean) =>
    ref.current?.scrollTo({ y: i * ITEM_H, animated })

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H)
    onChangeIndex(Math.max(0, Math.min(i, items.length - 1)))
  }

  return (
    <View style={{ flex, height: ITEM_H * VISIBLE, overflow: 'hidden' }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}
        onLayout={() => {
          if (!didInit.current) {
            didInit.current = true
            setTimeout(() => scrollTo(index, false), 80)
          }
        }}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
      >
        {items.map((label, i) => (
          <TouchableOpacity
            key={i}
            style={wStyles.item}
            onPress={() => { scrollTo(i, true); onChangeIndex(i) }}
            activeOpacity={0.6}
          >
            <Text style={wStyles.text}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const wStyles = StyleSheet.create({
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.light.text },
})

// ─── Séparateurs inline ─────────────────────────────────────

function DashSep() {
  return (
    <View style={{ width: 24, alignItems: 'center', justifyContent: 'center', height: ITEM_H * VISIBLE }}>
      <Text style={{ fontSize: fontSize.lg, color: colors.light.muted }}>—</Text>
    </View>
  )
}

function ColonSep() {
  return (
    <View style={{ width: 18, alignItems: 'center', justifyContent: 'center', height: ITEM_H * VISIBLE }}>
      <Text style={{ fontSize: 28, fontWeight: fontWeight.bold, color: colors.light.text }}>:</Text>
    </View>
  )
}

// ─── Shell modal partagé ─────────────────────────────────────

interface ModalShellProps {
  visible: boolean
  title: string
  onClose: () => void
  onConfirm: () => void
  children: React.ReactNode   // les roues uniquement
}

function ModalShell({ visible, title, onClose, onConfirm, children }: ModalShellProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* En-tête */}
          <View style={s.header}>
            <Text style={s.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.light.muted} />
            </TouchableOpacity>
          </View>

          {/* Zone des roues */}
          <View style={s.wheelZone}>
            {/* Barre de sélection (derrière les roues, transparent ScrollView) */}
            <View style={s.selectionBar} pointerEvents="none" />
            {/* Roues */}
            <View style={s.wheelsRow}>{children}</View>
            {/* Fondu haut */}
            <LinearGradient
              colors={['rgba(255,255,255,0.96)', 'rgba(255,255,255,0)']}
              style={s.fadeTop}
              pointerEvents="none"
            />
            {/* Fondu bas */}
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.96)']}
              style={s.fadeBottom}
              pointerEvents="none"
            />
          </View>

          {/* Bouton confirmer */}
          <Button onPress={onConfirm} size="lg">Confirmer</Button>
        </View>
      </View>
    </Modal>
  )
}

// ─── Déclencheur (imite visuellement Input) ──────────────────

interface TriggerProps {
  label?: string
  display: string | undefined
  placeholder: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  theme: 'light' | 'dark'
  onPress: () => void
}

function Trigger({ label, display, placeholder, icon, theme, onPress }: TriggerProps) {
  const dark = theme === 'dark'
  return (
    <View style={s.fieldWrap}>
      {label && (
        <Text style={[s.label, dark ? s.labelDark : s.labelLight]}>{label}</Text>
      )}
      <TouchableOpacity
        style={[s.trigger, dark ? s.triggerDark : s.triggerLight]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[
          s.triggerText,
          dark ? s.triggerTextDark : s.triggerTextLight,
          !display && (dark ? s.phDark : s.phLight),
        ]}>
          {display ?? placeholder}
        </Text>
        <Ionicons
          name={icon}
          size={18}
          color={dark ? colors.dark.placeholder : colors.light.placeholder}
        />
      </TouchableOpacity>
    </View>
  )
}

// ─── DatePicker ─────────────────────────────────────────────

interface DatePickerProps {
  label?: string
  value: string             // "YYYY-MM-DD"
  onChange: (v: string) => void
  theme?: 'light' | 'dark'
  placeholder?: string
  minYear?: number
  maxYear?: number
}

export function DatePicker({
  label,
  value,
  onChange,
  theme = 'light',
  placeholder = 'Sélectionner une date',
  minYear = 1924,
  maxYear = new Date().getFullYear(),
}: DatePickerProps) {
  const [visible, setVisible] = useState(false)
  const [openKey, setOpenKey] = useState(0)

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(maxYear - i))
  const days  = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

  function parse() {
    if (!value) return { d: 0, m: 0, y: 0 }
    const [y, m, d] = value.split('-')
    const yi = years.indexOf(y)
    return {
      d: Math.max(0, Math.min(30, (parseInt(d) || 1) - 1)),
      m: Math.max(0, Math.min(11, (parseInt(m) || 1) - 1)),
      y: yi >= 0 ? yi : 0,
    }
  }

  const [dayIdx,   setDayIdx]   = useState(() => parse().d)
  const [monthIdx, setMonthIdx] = useState(() => parse().m)
  const [yearIdx,  setYearIdx]  = useState(() => parse().y)

  function open() {
    const p = parse()
    setDayIdx(p.d); setMonthIdx(p.m); setYearIdx(p.y)
    setOpenKey(k => k + 1)
    setVisible(true)
  }

  function confirm() {
    const d = String(dayIdx + 1).padStart(2, '0')
    const m = String(monthIdx + 1).padStart(2, '0')
    onChange(`${years[yearIdx]}-${m}-${d}`)
    setVisible(false)
  }

  function formatDisplay() {
    if (!value) return undefined
    const [y, m, d] = value.split('-')
    if (!y || !m || !d) return undefined
    return `${d}/${m}/${y}`
  }

  return (
    <>
      <Trigger
        label={label}
        display={formatDisplay()}
        placeholder={placeholder}
        icon="calendar-outline"
        theme={theme}
        onPress={open}
      />
      <ModalShell
        visible={visible}
        title={label ?? 'Date'}
        onClose={() => setVisible(false)}
        onConfirm={confirm}
      >
        <PickerWheel key={`d${openKey}`} items={days}      index={dayIdx}   onChangeIndex={setDayIdx}   flex={1}   />
        <DashSep />
        <PickerWheel key={`m${openKey}`} items={MONTHS_FR} index={monthIdx} onChangeIndex={setMonthIdx} flex={1.4} />
        <DashSep />
        <PickerWheel key={`y${openKey}`} items={years}     index={yearIdx}  onChangeIndex={setYearIdx}  flex={1.6} />
      </ModalShell>
    </>
  )
}

// ─── TimePicker ─────────────────────────────────────────────

interface TimePickerProps {
  label?: string
  value: string             // "HH:MM"
  onChange: (v: string) => void
  theme?: 'light' | 'dark'
}

export function TimePicker({ label, value, onChange, theme = 'light' }: TimePickerProps) {
  const [visible, setVisible] = useState(false)
  const [openKey, setOpenKey] = useState(0)

  const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

  function parse() {
    if (!value) return { h: 12, m: 0 }
    const [hh, mm] = value.split(':')
    return {
      h: Math.max(0, Math.min(23, parseInt(hh) || 0)),
      m: Math.max(0, Math.min(11, Math.round((parseInt(mm) || 0) / 5))),
    }
  }

  const [hourIdx, setHourIdx] = useState(() => parse().h)
  const [minIdx,  setMinIdx]  = useState(() => parse().m)

  function open() {
    const p = parse()
    setHourIdx(p.h); setMinIdx(p.m)
    setOpenKey(k => k + 1)
    setVisible(true)
  }

  function confirm() {
    onChange(`${hours[hourIdx]}:${minutes[minIdx]}`)
    setVisible(false)
  }

  return (
    <>
      <Trigger
        label={label}
        display={value || undefined}
        placeholder="-- : --"
        icon="time-outline"
        theme={theme}
        onPress={open}
      />
      <ModalShell
        visible={visible}
        title={label ?? 'Heure'}
        onClose={() => setVisible(false)}
        onConfirm={confirm}
      >
        <PickerWheel key={`h${openKey}`} items={hours}   index={hourIdx} onChangeIndex={setHourIdx} />
        <ColonSep />
        <PickerWheel key={`m${openKey}`} items={minutes} index={minIdx}  onChangeIndex={setMinIdx}  />
      </ModalShell>
    </>
  )
}

// ─── Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  // Déclencheur
  fieldWrap:  { gap: 6 },
  label:      { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 2 },
  labelDark:  { color: colors.dark.textSoft  },
  labelLight: { color: colors.light.textSoft },

  trigger: {
    borderRadius:      radius['2xl'],
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderWidth:       1.5,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
  },
  triggerLight: { backgroundColor: colors.light.input, borderColor: colors.light.inputBorder },
  triggerDark:  { backgroundColor: colors.dark.input,  borderColor: colors.dark.inputBorder  },

  triggerText:     { fontSize: fontSize.base },
  triggerTextLight:{ color: colors.light.text },
  triggerTextDark: { color: colors.dark.text  },
  phLight: { color: colors.light.placeholder },
  phDark:  { color: colors.dark.placeholder  },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor:    '#ffffff',
    borderTopLeftRadius:  radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    paddingTop:         24,
    paddingBottom:      48,
    paddingHorizontal:  24,
    gap:                24,
  },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.light.text },

  // Roues
  wheelZone: {
    position: 'relative',
    height:   ITEM_H * VISIBLE,
  },
  wheelsRow:    { flexDirection: 'row', alignItems: 'center', height: ITEM_H * VISIBLE },
  selectionBar: {
    position:          'absolute',
    left: 0, right: 0,
    top:               ITEM_H * Math.floor(VISIBLE / 2),
    height:            ITEM_H,
    backgroundColor:   'rgba(124,58,237,0.06)',
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       'rgba(124,58,237,0.12)',
  },
  fadeTop: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height:   ITEM_H * Math.floor(VISIBLE / 2),
    zIndex:   1,
  },
  fadeBottom: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height:   ITEM_H * Math.floor(VISIBLE / 2),
    zIndex:   1,
  },
})
