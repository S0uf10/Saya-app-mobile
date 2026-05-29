import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Vibration,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { Client, LoyaltyRelation, Reward, ScanPreset } from '../../src/types'
import { colors, radius, fontSize, fontWeight, shadows } from '../../src/theme'
import { Avatar } from '../../src/components/ui/Avatar'
import { Button } from '../../src/components/ui/Button'
import { ProgressBar } from '../../src/components/ui/ProgressBar'

type Step = 'scan' | 'choice' | 'add_points' | 'use_reward' | 'result'
type ResultType = 'points' | 'reward' | 'error'

interface ScanResult {
  client: Client
  relation: LoyaltyRelation
  token: string
}

interface Result {
  type: ResultType
  title: string
  subtitle: string
  detail: string
  bonuses?: { name: string; points: number }[]
}

export default function ScanScreen() {
  const { merchant } = useAuth()
  const [permission, requestPermission] = useCameraPermissions()
  const [step, setStep] = useState<Step>('scan')
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scanData, setScanData] = useState<ScanResult | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [selectedPresets, setSelectedPresets] = useState<ScanPreset[]>([])
  const [manualPoints, setManualPoints] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  const lastScanned = useRef<string | null>(null)
  const scanTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const presets: ScanPreset[] = merchant?.scan_presets ?? [
    { label: 'Visite', points: 1 },
    { label: 'Café', points: 2 },
    { label: 'Repas', points: 5 },
  ]

  useEffect(() => {
    return () => { if (scanTimeout.current) clearTimeout(scanTimeout.current) }
  }, [])

  const resetScan = useCallback(() => {
    setStep('scan')
    setScanning(false)
    setScanData(null)
    setRewards([])
    setSelectedPresets([])
    setManualPoints('')
    setResult(null)
    lastScanned.current = null
  }, [])

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scanning || !merchant) return
    if (lastScanned.current === data) return
    lastScanned.current = data
    setScanning(true)
    Vibration.vibrate(50)
    setLoading(true)

    try {
      const token = data.includes('/card/')
        ? data.split('/card/')[1].split('?')[0]
        : data

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('qr_token', token)
        .single()

      if (clientError || !clientData) throw new Error('Client introuvable pour ce QR code.')

      let { data: relData } = await supabase
        .from('loyalty_relations')
        .select('*')
        .eq('client_id', clientData.id)
        .eq('merchant_id', merchant.id)
        .single()

      if (!relData) {
        const { data: newRel, error: relError } = await supabase
          .from('loyalty_relations')
          .insert({
            client_id: clientData.id,
            merchant_id: merchant.id,
            current_points: 0,
            total_points_earned: 0,
            visits_count: 0,
          })
          .select()
          .single()
        if (relError) throw relError
        relData = newRel
      }

      const { data: rewardData } = await supabase
        .from('rewards')
        .select('*')
        .eq('merchant_id', merchant.id)
        .eq('is_active', true)
        .order('points_cost', { ascending: true })

      setScanData({ client: clientData, relation: relData, token })
      setRewards(rewardData ?? [])
      setStep('choice')
    } catch (err: any) {
      setResult({
        type: 'error',
        title: 'Erreur de scan',
        subtitle: err.message ?? 'Une erreur est survenue.',
        detail: 'Vérifiez que le QR code est valide.',
      })
      setStep('result')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddPoints() {
    if (!scanData || !merchant) return
    const total =
      selectedPresets.reduce((s, p) => s + p.points, 0) +
      (parseInt(manualPoints, 10) || 0)

    if (total <= 0) {
      Alert.alert('Points requis', 'Sélectionnez au moins un preset ou entrez des points.')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('https://www.saya-card.com/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          token: scanData.token,
          mode: 'add_points',
          presets_used: selectedPresets.length > 0 ? selectedPresets : undefined,
          points_override: parseInt(manualPoints, 10) || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Erreur serveur')

      // Mise à jour du solde local pour le step use_reward
      setScanData(prev => prev ? {
        ...prev,
        relation: { ...prev.relation, current_points: json.currentPoints, visits_count: json.visitsCount },
      } : prev)
      setSelectedPresets([])
      setManualPoints('')

      setResult({
        type: 'points',
        title: 'Points ajoutés !',
        subtitle: `${scanData.client.first_name} ${scanData.client.last_name}`,
        detail: `+${json.pointsAdded} pt${json.pointsAdded > 1 ? 's' : ''} · Solde : ${json.currentPoints} pts`,
        bonuses: json.appliedBonuses,
      })
      setStep('result')
    } catch (err: any) {
      Alert.alert('Erreur', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUseReward(reward: Reward) {
    if (!scanData || !merchant) return
    const rel = scanData.relation

    if (rel.current_points < reward.points_cost) {
      Alert.alert(
        'Points insuffisants',
        `Ce client a ${rel.current_points} pts, il en faut ${reward.points_cost}.`
      )
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('https://www.saya-card.com/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          token: scanData.token,
          mode: 'use_reward',
          reward_id: reward.id,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Erreur serveur')

      setResult({
        type: 'reward',
        title: 'Récompense appliquée !',
        subtitle: reward.name,
        detail: `−${reward.points_cost} pts · Solde : ${json.currentPoints} pts`,
      })
      setStep('result')
    } catch (err: any) {
      Alert.alert('Erreur', err.message)
    } finally {
      setLoading(false)
    }
  }

  function togglePreset(preset: ScanPreset) {
    setSelectedPresets((prev) => {
      const idx = prev.findIndex((p) => p.label === preset.label)
      if (idx >= 0) return prev.filter((_, i) => i !== idx)
      return [...prev, preset]
    })
  }

  const totalPoints =
    selectedPresets.reduce((s, p) => s + p.points, 0) + (parseInt(manualPoints, 10) || 0)

  // ── Permission check ────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen} edges={['top']}>
        <Ionicons name="camera-outline" size={64} color={colors.primary} />
        <Text style={styles.permissionTitle}>Accès à la caméra requis</Text>
        <Text style={styles.permissionBody}>
          L'application a besoin d'accéder à votre caméra pour scanner les QR codes.
        </Text>
        <Button onPress={requestPermission} size="lg" fullWidth={false} style={{ paddingHorizontal: 32 }}>
          Autoriser la caméra
        </Button>
      </SafeAreaView>
    )
  }

  // ── Step: SCAN ───────────────────────────────────────
  if (step === 'scan') {
    return (
      <View style={styles.cameraRoot}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={loading ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        {/* Dark overlay top */}
        <LinearGradient
          colors={['rgba(0,0,0,0.65)', 'transparent']}
          style={styles.cameraOverlayTop}
        />
        {/* Dark overlay bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.70)']}
          style={styles.cameraOverlayBottom}
        />

        <SafeAreaView style={styles.cameraContent} edges={['top', 'bottom']}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>Scanner un QR code</Text>
            <Text style={styles.cameraSubtitle}>
              Pointez la caméra sur le QR code du client
            </Text>
          </View>

          {/* Scan frame */}
          <View style={styles.frameContainer}>
            <View style={[styles.scanFrame, loading && styles.scanFrameLoading]}>
              {/* Corner marks */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fbbf24" />
                <Text style={styles.loadingText}>Recherche du client...</Text>
              </View>
            )}
          </View>

          <View style={styles.cameraFooter}>
            <Text style={styles.cameraHint}>
              Le QR code sera détecté automatiquement
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ── Step: CHOICE ────────────────────────────────────
  if (step === 'choice' && scanData) {
    const c = scanData.client
    const rel = scanData.relation
    const availableRewards = rewards.filter((r) => rel.current_points >= r.points_cost)

    return (
      <SafeAreaView style={styles.lightScreen} edges={['top']}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={resetScan} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Client identifié</Text>
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContent}>
            {/* Client card */}
            <View style={styles.clientCard}>
              <View style={styles.clientCardTop}>
                <Avatar name={`${c.first_name} ${c.last_name}`} size="lg" theme="light" />
                <View style={styles.clientCardInfo}>
                  <Text style={styles.clientName}>{c.first_name} {c.last_name}</Text>
                  <Text style={styles.clientEmail}>{c.email}</Text>
                </View>
              </View>
              <View style={styles.clientStats}>
                <View style={styles.clientStat}>
                  <Text style={[styles.clientStatValue, { color: colors.primary }]}>
                    {rel.current_points}
                  </Text>
                  <Text style={styles.clientStatLabel}>points</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.clientStat}>
                  <Text style={styles.clientStatValue}>{rel.visits_count}</Text>
                  <Text style={styles.clientStatLabel}>visites</Text>
                </View>
              </View>
            </View>

            {availableRewards.length > 0 && (
              <View style={styles.rewardAlert}>
                <Ionicons name="gift-outline" size={16} color={colors.warning} />
                <Text style={styles.rewardAlertText}>
                  {availableRewards.length} récompense{availableRewards.length > 1 ? 's' : ''} disponible{availableRewards.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}

            <View style={styles.actionGap}>
              <Button onPress={() => setStep('add_points')} size="lg">
                ⭐  Ajouter des points
              </Button>
              <TouchableOpacity
                style={styles.amberBtn}
                onPress={() => setStep('use_reward')}
                activeOpacity={0.8}
              >
                <Ionicons name="gift-outline" size={16} color={colors.warning} style={styles.amberBtnIcon} />
                <Text style={styles.amberBtnText}>Appliquer une récompense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Step: ADD POINTS ────────────────────────────────
  if (step === 'add_points' && scanData) {
    return (
      <SafeAreaView style={styles.lightScreen} edges={['top']}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep('choice')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Ajouter des points</Text>
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContent}>
            <Text style={styles.sectionLabel}>Sélectionnez un ou plusieurs presets</Text>

            <View style={styles.presetGrid}>
              {presets.map((preset) => {
                const selected = selectedPresets.some((p) => p.label === preset.label)
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.presetBtn, selected && styles.presetBtnActive]}
                    onPress={() => togglePreset(preset)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetBtnLabel, selected && styles.presetBtnLabelActive]}>
                      {preset.label}
                    </Text>
                    <Text style={[styles.presetBtnPts, selected && styles.presetBtnPtsActive]}>
                      +{preset.points} pts
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.manualCard}>
              <Text style={styles.manualLabel}>Points manuels (optionnel)</Text>
              <TextInput
                style={styles.manualInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.light.placeholder}
                value={manualPoints}
                onChangeText={setManualPoints}
              />
            </View>

            {totalPoints > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTotal}>
                  Total : {totalPoints} point{totalPoints > 1 ? 's' : ''}
                </Text>
                {selectedPresets.length > 0 && (
                  <Text style={styles.summaryDetail}>
                    {selectedPresets.map((p) => `${p.label} (+${p.points})`).join(', ')}
                  </Text>
                )}
              </View>
            )}

            <Button
              onPress={handleAddPoints}
              loading={loading}
              disabled={totalPoints === 0}
              size="lg"
            >
              Valider (+{totalPoints} pts)
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Step: USE REWARD ────────────────────────────────
  if (step === 'use_reward' && scanData) {
    const rel = scanData.relation
    return (
      <SafeAreaView style={styles.lightScreen} edges={['top']}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep('choice')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Récompenses</Text>
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContent}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Solde actuel du client</Text>
              <Text style={styles.balanceValue}>{rel.current_points} pts</Text>
            </View>

            {rewards.length === 0 ? (
              <View style={styles.noRewardBox}>
                <View style={styles.noRewardIconBox}>
                  <Ionicons name="gift-outline" size={28} color={colors.light.muted} />
                </View>
                <Text style={styles.noRewardTitle}>Aucune récompense configurée</Text>
                <Text style={styles.noRewardSub}>Créez des récompenses dans l'onglet Récompenses.</Text>
              </View>
            ) : (
              <View style={styles.rewardList}>
                {rewards.map((reward) => {
                  const canUse = rel.current_points >= reward.points_cost
                  const ptsNeeded = reward.points_cost - rel.current_points
                  const progress = Math.min(100, (rel.current_points / reward.points_cost) * 100)
                  return (
                    <View
                      key={reward.id}
                      style={[styles.rewardItem, canUse && styles.rewardItemAvailable]}
                    >
                      <View style={styles.rewardItemTop}>
                        <Text style={styles.rewardItemName}>{reward.name}</Text>
                        <Text style={[styles.rewardItemCost, canUse && styles.rewardItemCostReady]}>
                          {reward.points_cost} pts
                        </Text>
                      </View>
                      {reward.description && (
                        <Text style={styles.rewardItemDesc}>{reward.description}</Text>
                      )}
                      {!canUse && (
                        <View style={styles.rewardProgressWrap}>
                          <ProgressBar
                            percent={progress}
                            color={colors.warning}
                            trackColor={colors.light.cardBorder}
                            height={4}
                          />
                          <Text style={styles.rewardProgressLabel}>
                            Encore {ptsNeeded} pts
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.useBtn, canUse ? styles.useBtnActive : styles.useBtnDisabled]}
                        onPress={() => handleUseReward(reward)}
                        disabled={!canUse || loading}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.useBtnText, !canUse && styles.useBtnTextDisabled]}>
                          {canUse ? 'Appliquer' : `Manque ${ptsNeeded} pts`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Step: RESULT ────────────────────────────────────
  if (step === 'result' && result) {
    const configs = {
      points: {
        bg: ['#f0fdf4', '#dcfce7'] as const,
        iconName: 'checkmark-circle' as const,
        iconColor: '#16a34a',
        iconBg: 'rgba(22,163,74,0.10)',
      },
      reward: {
        bg: ['#fffbeb', '#fef3c7'] as const,
        iconName: 'gift' as const,
        iconColor: '#d97706',
        iconBg: 'rgba(217,119,6,0.10)',
      },
      error: {
        bg: ['#fff1f2', '#ffe4e6'] as const,
        iconName: 'close-circle' as const,
        iconColor: '#dc2626',
        iconBg: 'rgba(220,38,38,0.10)',
      },
    }
    const cfg = configs[result.type]

    return (
      <LinearGradient colors={cfg.bg} style={styles.resultRoot}>
        <SafeAreaView style={styles.resultContent} edges={['top', 'bottom']}>
          <View style={[styles.resultIconBox, { backgroundColor: cfg.iconBg }]}>
            <Ionicons name={cfg.iconName} size={52} color={cfg.iconColor} />
          </View>
          <Text style={styles.resultTitle}>{result.title}</Text>
          <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
          <Text style={styles.resultDetail}>{result.detail}</Text>

          {result.bonuses && result.bonuses.length > 0 && (
            <View style={styles.bonusTags}>
              {result.bonuses.map((b, i) => (
                <View key={i} style={styles.bonusTag}>
                  <Ionicons name="flash" size={11} color={colors.primary} />
                  <Text style={styles.bonusTagText}>{b.name} +{b.points} pts</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.resultActions}>
            {result.type === 'points' && rewards.length > 0 && (
              <TouchableOpacity
                style={styles.resultSecondaryBtn}
                onPress={() => setStep('use_reward')}
                activeOpacity={0.8}
              >
                <Ionicons name="gift-outline" size={16} color={colors.warning} style={{ marginRight: 6 }} />
                <Text style={styles.resultSecondaryBtnText}>Appliquer une récompense</Text>
              </TouchableOpacity>
            )}

            {result.type === 'reward' && (
              <TouchableOpacity
                style={styles.resultSecondaryBtn}
                onPress={() => setStep('choice')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.resultSecondaryBtnText, { color: colors.primary }]}>Retour au client</Text>
              </TouchableOpacity>
            )}

            <Button onPress={resetScan} size="lg">
              {result.type === 'error' ? 'Réessayer' : 'Scanner un autre client'}
            </Button>
          </View>
        </SafeAreaView>
      </LinearGradient>
    )
  }

  return null
}

const CORNER_SIZE = 22
const CORNER_THICK = 3

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.bg },

  permissionScreen: {
    flex: 1,
    backgroundColor: colors.light.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permissionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    textAlign: 'center',
    marginTop: 8,
  },
  permissionBody: {
    fontSize: fontSize.base,
    color: colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },

  // Camera step
  cameraRoot: { flex: 1, backgroundColor: '#000' },
  cameraOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 1,
  },
  cameraOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 1,
  },
  cameraContent: {
    flex: 1,
    zIndex: 2,
  },
  cameraHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  cameraTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
  cameraSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  scanFrameLoading: {
    opacity: 0.6,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.primary,
    borderWidth: 0,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderBottomRightRadius: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fbbf24',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  cameraFooter: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    alignItems: 'center',
  },
  cameraHint: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.40)',
  },

  // Light steps
  lightScreen: { flex: 1, backgroundColor: colors.light.bg },
  flex: { flex: 1 },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
    backgroundColor: colors.light.card,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  stepContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Choice step
  clientCard: {
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 16,
    marginBottom: 14,
    ...shadows.md,
  },
  clientCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  clientCardInfo: { flex: 1 },
  clientName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  clientEmail: {
    fontSize: fontSize.sm,
    color: colors.light.muted,
    marginTop: 2,
  },
  clientStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientStat: { flex: 1, alignItems: 'center' },
  clientStatValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  clientStatLabel: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.light.divider,
  },
  rewardAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  rewardAlertText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.warningText,
  },
  actionGap: { gap: 12 },
  amberBtn: {
    borderWidth: 1.5,
    borderColor: colors.warningBorder,
    borderRadius: radius['2xl'],
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.warningLight,
  },
  amberBtnIcon: {},
  amberBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.warningText,
  },

  // Add points step
  sectionLabel: {
    fontSize: fontSize.sm,
    color: colors.light.muted,
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.light.cardBorder,
    backgroundColor: colors.light.card,
    alignItems: 'center',
    ...shadows.sm,
  },
  presetBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetBtnLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.light.textSoft,
  },
  presetBtnLabelActive: { color: '#ffffff' },
  presetBtnPts: { fontSize: fontSize.xs, color: colors.light.muted, marginTop: 2 },
  presetBtnPtsActive: { color: 'rgba(255,255,255,0.75)' },
  manualCard: {
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 14,
    marginBottom: 14,
    ...shadows.sm,
  },
  manualLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.light.textSoft,
    marginBottom: 8,
  },
  manualInput: {
    borderWidth: 1.5,
    borderColor: colors.light.inputBorder,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: fontSize.md,
    color: colors.light.text,
  },
  summaryCard: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius['2xl'],
    padding: 14,
    marginBottom: 14,
  },
  summaryTotal: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  summaryDetail: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: 4,
  },

  // Use reward step
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryBg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  balanceLabel: { fontSize: fontSize.sm, color: colors.primaryDark },
  balanceValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  noRewardBox: {
    alignItems: 'center',
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 32,
  },
  noRewardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  noRewardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
  },
  noRewardSub: {
    fontSize: fontSize.sm,
    color: colors.light.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  rewardList: { gap: 10 },
  rewardItem: {
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 14,
    ...shadows.sm,
  },
  rewardItemAvailable: {
    borderColor: colors.warningBorder,
  },
  rewardItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rewardItemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  rewardItemCost: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.light.muted,
  },
  rewardItemCostReady: { color: colors.warning },
  rewardItemDesc: {
    fontSize: fontSize.sm,
    color: colors.light.muted,
    marginBottom: 8,
  },
  rewardProgressWrap: { marginBottom: 10 },
  rewardProgressLabel: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
    marginTop: 4,
  },
  useBtn: {
    borderRadius: radius.xl,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  useBtnActive: { backgroundColor: colors.warning },
  useBtnDisabled: { backgroundColor: colors.light.divider },
  useBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#ffffff' },
  useBtnTextDisabled: { color: colors.light.muted },

  // Result
  resultRoot: { flex: 1 },
  resultContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultIconBox: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: fontSize.lg,
    color: colors.light.textSoft,
    textAlign: 'center',
    marginBottom: 4,
  },
  resultDetail: {
    fontSize: fontSize.base,
    color: colors.light.muted,
    textAlign: 'center',
    marginBottom: 12,
  },
  bonusTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  bonusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bonusTagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  resultBtn: { width: '100%' },
  resultActions: {
    width: '100%',
    gap: 12,
  },
  resultSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.warningBorder,
    borderRadius: radius['2xl'],
    paddingVertical: 15,
    backgroundColor: colors.warningLight,
  },
  resultSecondaryBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.warningText,
  },
})
