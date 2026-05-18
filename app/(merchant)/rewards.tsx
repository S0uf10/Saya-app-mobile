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
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { Reward } from '../../src/types'
import { colors, radius, fontSize, fontWeight, shadows } from '../../src/theme'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'

const WEB_APP_URL = 'https://www.saya-card.com'

interface RewardForm {
  name: string
  description: string
  points_cost: string
  is_active: boolean
  image_url: string | null
}

const emptyForm: RewardForm = {
  name: '', description: '', points_cost: '', is_active: true, image_url: null,
}

export default function RewardsScreen() {
  const { merchant, session } = useAuth()
  const [rewards, setRewards]       = useState<Reward[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing]       = useState<Reward | null>(null)
  const [form, setForm]             = useState<RewardForm>(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)

  const loadRewards = useCallback(async () => {
    if (!merchant) return
    try {
      const { data } = await supabase
        .from('rewards')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('points_cost', { ascending: true })
      setRewards(data ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [merchant])

  useEffect(() => { loadRewards() }, [loadRewards])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalVisible(true)
  }

  function openEdit(reward: Reward) {
    setEditing(reward)
    setForm({
      name:        reward.name,
      description: reward.description ?? '',
      points_cost: String(reward.points_cost),
      is_active:   reward.is_active,
      image_url:   reward.image_url,
    })
    setModalVisible(true)
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie dans les paramètres.")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    })

    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', {
        uri:  asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? 'reward.jpg',
      } as any)

      const res = await fetch(`${WEB_APP_URL}/api/rewards/upload`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body:    formData,
      })
      const data = await res.json()

      if (data.url) {
        setForm(f => ({ ...f, image_url: data.url }))
      } else {
        Alert.alert('Erreur', data.error ?? "Impossible d'uploader l'image.")
      }
    } catch {
      Alert.alert('Erreur', 'Erreur réseau lors de l\'upload.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!merchant) return
    if (!form.name.trim()) {
      Alert.alert('Erreur', 'Le nom de la récompense est requis.')
      return
    }
    const cost = parseInt(form.points_cost, 10)
    if (!cost || cost <= 0) {
      Alert.alert('Erreur', 'Le coût en points doit être supérieur à 0.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from('rewards')
          .update({
            name:        form.name.trim(),
            description: form.description.trim() || null,
            points_cost: cost,
            is_active:   form.is_active,
            image_url:   form.image_url,
          })
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('rewards').insert({
          merchant_id: merchant.id,
          name:        form.name.trim(),
          description: form.description.trim() || null,
          points_cost: cost,
          is_active:   form.is_active,
          image_url:   form.image_url,
        })
        if (error) throw error
      }
      setModalVisible(false)
      await loadRewards()
    } catch (err: any) {
      Alert.alert('Erreur', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(reward: Reward) {
    Alert.alert(
      'Supprimer la récompense',
      `Supprimer "${reward.name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('rewards').delete().eq('id', reward.id)
            await loadRewards()
          },
        },
      ]
    )
  }

  async function toggleActive(reward: Reward) {
    await supabase.from('rewards').update({ is_active: !reward.is_active }).eq('id', reward.id)
    await loadRewards()
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Récompenses</Text>
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
              onRefresh={() => { setRefreshing(true); loadRewards() }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.listContainer}>
            {rewards.length === 0 ? (
              <EmptyState
                iconName="gift-outline"
                title="Aucune récompense"
                subtitle="Créez votre première récompense pour motiver vos clients."
                actionLabel="Créer une récompense"
                onAction={openCreate}
                theme="light"
              />
            ) : (
              <View style={styles.list}>
                {rewards.map((reward) => (
                  <View
                    key={reward.id}
                    style={[styles.rewardCard, !reward.is_active && styles.rewardCardInactive]}
                  >
                    {reward.image_url && (
                      <Image
                        source={{ uri: reward.image_url }}
                        style={styles.rewardImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.rewardBody}>
                      <View style={styles.rewardTop}>
                        <View style={styles.rewardInfo}>
                          <Text style={styles.rewardName}>{reward.name}</Text>
                          {reward.description && (
                            <Text style={styles.rewardDesc}>{reward.description}</Text>
                          )}
                          <View style={styles.rewardMeta}>
                            <Text style={styles.rewardPoints}>{reward.points_cost} pts</Text>
                            <View
                              style={[
                                styles.activeBadge,
                                reward.is_active ? styles.activeBadgeOn : styles.activeBadgeOff,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.activeBadgeText,
                                  reward.is_active ? styles.activeTextOn : styles.activeTextOff,
                                ]}
                              >
                                {reward.is_active ? 'Active' : 'Inactive'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Switch
                          value={reward.is_active}
                          onValueChange={() => toggleActive(reward)}
                          trackColor={{ false: colors.light.cardBorder, true: colors.primary }}
                          thumbColor="#ffffff"
                        />
                      </View>
                      <View style={styles.rewardActions}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => openEdit(reward)}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.actionBtnText}>Modifier</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnDanger]}
                          onPress={() => handleDelete(reward)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
                            Supprimer
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal créer / modifier */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing ? 'Modifier la récompense' : 'Nouvelle récompense'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.light.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGap}>

                {/* Sélecteur d'image */}
                <View style={styles.imageSection}>
                  <Text style={styles.imageLabel}>Photo (optionnel)</Text>
                  {form.image_url ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: form.image_url }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <View style={styles.imageOverlay}>
                        <TouchableOpacity
                          style={styles.imageChangeBtn}
                          onPress={pickImage}
                          activeOpacity={0.8}
                          disabled={uploading}
                        >
                          {uploading
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.imageChangeBtnText}>Changer</Text>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.imageRemoveBtn}
                          onPress={() => setForm(f => ({ ...f, image_url: null }))}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.imagePicker}
                      onPress={pickImage}
                      activeOpacity={0.75}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="image-outline" size={28} color={colors.light.muted} />
                          <Text style={styles.imagePickerText}>Ajouter une photo</Text>
                          <Text style={styles.imagePickerHint}>JPEG, PNG — max 2 Mo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                <Input
                  label="Nom *"
                  theme="light"
                  placeholder="Ex: Café offert"
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                />
                <Input
                  label="Description (optionnel)"
                  theme="light"
                  placeholder="Ex: Un café au choix"
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                />
                <Input
                  label="Coût en points *"
                  theme="light"
                  placeholder="Ex: 10"
                  keyboardType="numeric"
                  value={form.points_cost}
                  onChangeText={(v) => setForm((f) => ({ ...f, points_cost: v }))}
                />
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Récompense active</Text>
                  <Switch
                    value={form.is_active}
                    onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                    trackColor={{ false: colors.light.cardBorder, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
                <Button onPress={handleSave} loading={saving || uploading} size="lg">
                  {editing ? 'Enregistrer' : 'Créer la récompense'}
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
  root: { flex: 1, backgroundColor: colors.light.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addBtnText: { color: '#ffffff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  list: { gap: 10 },

  rewardCard: {
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    overflow: 'hidden',
    ...shadows.sm,
  },
  rewardCardInactive: { opacity: 0.6 },
  rewardImage: { width: '100%', height: 120 },
  rewardBody: { padding: 16 },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rewardInfo: { flex: 1, marginRight: 12 },
  rewardName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.light.text },
  rewardDesc: { fontSize: fontSize.sm, color: colors.light.muted, marginTop: 4 },
  rewardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  rewardPoints: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.primary },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  activeBadgeOn: { backgroundColor: colors.successLight },
  activeBadgeOff: { backgroundColor: colors.light.divider },
  activeBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  activeTextOn: { color: colors.successText },
  activeTextOff: { color: colors.light.muted },
  rewardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.light.cardBorder,
    borderRadius: radius.xl,
    paddingVertical: 9,
    alignItems: 'center',
  },
  actionBtnDanger: { borderColor: colors.dangerBorder },
  actionBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.light.textSoft },
  actionBtnTextDanger: { color: colors.danger },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.light.card,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.light.text },
  formGap: { gap: 14, paddingBottom: 16 },

  // Image picker
  imageSection: { gap: 8 },
  imageLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.light.textSoft },
  imagePicker: {
    height: 110,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.light.cardBorder,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.light.bg,
  },
  imagePickerText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.light.muted },
  imagePickerHint: { fontSize: fontSize.xs, color: colors.light.muted },
  imagePreviewContainer: { position: 'relative', borderRadius: radius.xl, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 140, borderRadius: radius.xl },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  imageChangeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 80,
    alignItems: 'center',
  },
  imageChangeBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  imageRemoveBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.lg,
    padding: 7,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.light.textSoft },
})
