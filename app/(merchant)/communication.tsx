import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { colors, radius, fontSize, fontWeight, shadows } from '../../src/theme'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'

type Channel = 'email' | 'push' | 'wallet'
type Segment = 'all' | 'inactive_30d' | 'top_clients' | 'age_range' | 'client_search'

const WEB_APP_URL = 'https://www.saya-card.com'

interface ClientResult {
  id: string
  first_name: string
  last_name: string
  email: string
  current_points: number
}

const SEGMENTS: {
  value: Segment
  label: string
  description: string
  iconName: React.ComponentProps<typeof Ionicons>['name']
}[] = [
  { value: 'all',           label: 'Tous les clients',    description: 'Envoyer à tous vos clients',        iconName: 'people-outline' },
  { value: 'inactive_30d',  label: 'Clients inactifs',    description: 'Pas de visite depuis 30+ jours',    iconName: 'moon-outline' },
  { value: 'top_clients',   label: 'Meilleurs clients',   description: 'Clients avec 10+ points',           iconName: 'star-outline' },
  { value: 'age_range',     label: 'Par tranche d\'âge',  description: 'Filtrer par âge des clients',       iconName: 'calendar-outline' },
  { value: 'client_search', label: 'Rechercher un client', description: 'Sélectionner des clients précis', iconName: 'search-outline' },
]

export default function CommunicationScreen() {
  const { merchant, session } = useAuth()

  const [channel, setChannel]     = useState<Channel>('push')
  const [subject, setSubject]     = useState('')
  const [title, setTitle]         = useState('')
  const [message, setMessage]     = useState('')
  const [segment, setSegment]     = useState<Segment>('all')
  const [sending, setSending]     = useState(false)
  const [previewCount, setPreviewCount]     = useState<number | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Wallet channel state
  const [walletStats, setWalletStats]           = useState<{ walletClientCount: number; googleClientCount: number; history: { id: string; message: string; created_at: string; sent_google?: number }[] } | null>(null)
  const [loadingWalletStats, setLoadingWalletStats] = useState(false)
  const [walletSending, setWalletSending]       = useState(false)
  const [walletMessage, setWalletMessage]       = useState('')
  const [walletSuccess, setWalletSuccess]       = useState<{ sent_apple: number; sent_google: number; failed: number } | null>(null)
  const [walletError, setWalletError]           = useState<string | null>(null)
  const WALLET_MSG_MAX = 100

  // Age range
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')

  // Client search
  const [searchQuery, setSearchQuery]         = useState('')
  const [searchResults, setSearchResults]     = useState<ClientResult[]>([])
  const [selectedClients, setSelectedClients] = useState<ClientResult[]>([])
  const [searching, setSearching]             = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (channel === 'wallet') {
      fetchWalletStats()
      setWalletSuccess(null)
      setWalletError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel])

  useEffect(() => {
    if (segment !== 'client_search') {
      setSearchQuery('')
      setSearchResults([])
      setSelectedClients([])
    }
    if (segment !== 'age_range') {
      setMinAge('')
      setMaxAge('')
    }
    setPreviewCount(null)
  }, [segment])

  // Live search with debounce
  useEffect(() => {
    if (segment !== 'client_search') return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    searchTimeout.current = setTimeout(() => searchClients(searchQuery), 350)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery])

  async function searchClients(q: string) {
    if (!merchant) return
    setSearching(true)
    try {
      const term = q.trim().toLowerCase()
      const { data } = await supabase
        .from('loyalty_relations')
        .select(`
          current_points,
          clients!inner(id, first_name, last_name, email)
        `)
        .eq('merchant_id', merchant.id)
        .limit(30)

      type Row = { current_points: number; clients: { id: string; first_name: string; last_name: string; email: string } | { id: string; first_name: string; last_name: string; email: string }[] }
      const results: ClientResult[] = (data ?? [])
        .map((r) => {
          const row = r as Row
          const c = Array.isArray(row.clients) ? row.clients[0] : row.clients
          if (!c) return null
          return { id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email, current_points: row.current_points }
        })
        .filter((c): c is ClientResult => c !== null)
        .filter((c) => {
          const full = `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase()
          return full.includes(term)
        })
      setSearchResults(results)
    } finally {
      setSearching(false)
    }
  }

  function toggleClient(client: ClientResult) {
    setSelectedClients(prev =>
      prev.some(c => c.id === client.id)
        ? prev.filter(c => c.id !== client.id)
        : [...prev, client]
    )
  }

  function resetForm() {
    setSubject('')
    setTitle('')
    setMessage('')
    setPreviewCount(null)
  }

  async function getRecipientCount(): Promise<number> {
    if (!merchant) return 0

    if (segment === 'client_search') return selectedClients.length

    let query = supabase
      .from('loyalty_relations')
      .select('client_id, last_visit, current_points', { count: 'exact', head: segment !== 'age_range' })
      .eq('merchant_id', merchant.id)

    if (segment === 'inactive_30d') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      query = query.lt('last_visit', thirtyDaysAgo.toISOString())
    } else if (segment === 'top_clients') {
      query = query.gte('current_points', 10)
    }

    if (segment === 'age_range') {
      const min = minAge ? parseInt(minAge, 10) : null
      const max = maxAge ? parseInt(maxAge, 10) : null
      const { data } = await supabase
        .from('loyalty_relations')
        .select('clients!inner(birth_date)')
        .eq('merchant_id', merchant.id)

      type AgRow = { clients: { birth_date: string | null } | { birth_date: string | null }[] }
      return (data ?? []).filter((r) => {
        const row = r as AgRow
        const c = Array.isArray(row.clients) ? row.clients[0] : row.clients
        if (!c?.birth_date) return false
        const age = getAge(c.birth_date)
        if (min !== null && age < min) return false
        if (max !== null && age > max) return false
        return true
      }).length
    }

    const { count } = await (query as any)
    return count ?? 0
  }

  async function fetchWalletStats() {
    if (!session) return
    setLoadingWalletStats(true)
    try {
      const res = await fetch(`${WEB_APP_URL}/api/merchant/notify`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) setWalletStats(await res.json())
    } finally {
      setLoadingWalletStats(false)
    }
  }

  async function handleWalletSend() {
    if (!session || !walletMessage.trim()) return
    setWalletSending(true)
    setWalletError(null)
    setWalletSuccess(null)
    try {
      const res = await fetch(`${WEB_APP_URL}/api/merchant/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message: walletMessage.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de l\'envoi')
      setWalletSuccess(data)
      setWalletMessage('')
      await fetchWalletStats()
    } catch (err: any) {
      setWalletError(err.message)
    } finally {
      setWalletSending(false)
    }
  }

  async function handlePreview() {
    setLoadingPreview(true)
    try {
      const count = await getRecipientCount()
      setPreviewCount(count)
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleSend() {
    if (!merchant || !session) return

    if (channel === 'email' && (!subject.trim() || !message.trim())) {
      Alert.alert('Erreur', 'Veuillez remplir le sujet et le message.')
      return
    }
    if (channel === 'push' && !message.trim()) {
      Alert.alert('Erreur', 'Veuillez rédiger un message.')
      return
    }
    if (segment === 'client_search' && selectedClients.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un client.')
      return
    }
    if (segment === 'age_range' && !minAge && !maxAge) {
      Alert.alert('Erreur', "Veuillez saisir au moins un âge (min ou max).")
      return
    }

    const count = segment === 'client_search'
      ? selectedClients.length
      : (previewCount ?? await getRecipientCount())

    if (count === 0) {
      Alert.alert('Aucun destinataire', "Il n'y a aucun client dans ce segment.")
      return
    }

    const channelLabel = channel === 'email' ? 'e-mail' : 'notification'
    Alert.alert(
      "Confirmer l'envoi",
      `Envoyer cet ${channelLabel} à ${count} client${count > 1 ? 's' : ''} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            setSending(true)
            try {
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              }

              const body: Record<string, unknown> = {
                merchant_id: merchant.id,
                segment,
                message: message.trim(),
              }
              if (segment === 'age_range') {
                if (minAge) body.minAge = parseInt(minAge, 10)
                if (maxAge) body.maxAge = parseInt(maxAge, 10)
              }
              if (segment === 'client_search') {
                body.clientIds = selectedClients.map(c => c.id)
              }

              if (channel === 'email') {
                body.subject = subject.trim()
                const res = await fetch(`${WEB_APP_URL}/api/merchants/send-promo`, {
                  method: 'POST', headers, body: JSON.stringify(body),
                })
                if (!res.ok) throw new Error((await res.json()).error ?? 'Envoi échoué')
                const data = await res.json()
                Alert.alert('Envoyé !', `${data.sent ?? count} e-mail${(data.sent ?? count) > 1 ? 's' : ''} envoyé${(data.sent ?? count) > 1 ? 's' : ''}.`)
              } else {
                const res = await fetch(`${WEB_APP_URL}/api/merchants/send-push`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    ...body,
                    title: title.trim() || merchant.name,
                    body: message.trim(),
                  }),
                })
                if (!res.ok) throw new Error((await res.json()).error ?? 'Envoi échoué')
                const data = await res.json()
                if (data.noTokens) {
                  Alert.alert('Aucun appareil', "Aucun client n'a activé les notifications push.")
                } else {
                  Alert.alert('Envoyé !', `${data.sent ?? 0} notification${(data.sent ?? 0) > 1 ? 's' : ''} envoyée${(data.sent ?? 0) > 1 ? 's' : ''}.`)
                }
              }
              resetForm()
            } catch (err: any) {
              Alert.alert('Erreur', err.message)
            } finally {
              setSending(false)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={styles.pageTitle}>Communication</Text>
            <Text style={styles.pageSubtitle}>Contactez vos clients par e-mail, notification push ou Wallet</Text>

            {/* Channel toggle */}
            <View style={styles.channelRow}>
              <TouchableOpacity
                style={[styles.channelBtn, channel === 'push' && styles.channelBtnActive]}
                onPress={() => { setChannel('push'); resetForm() }}
                activeOpacity={0.75}
              >
                <Ionicons name="notifications-outline" size={15} color={channel === 'push' ? colors.primary : colors.light.muted} />
                <Text style={[styles.channelBtnText, channel === 'push' && styles.channelBtnTextActive]}>Push</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.channelBtn, channel === 'email' && styles.channelBtnActive]}
                onPress={() => { setChannel('email'); resetForm() }}
                activeOpacity={0.75}
              >
                <Ionicons name="mail-outline" size={15} color={channel === 'email' ? colors.primary : colors.light.muted} />
                <Text style={[styles.channelBtnText, channel === 'email' && styles.channelBtnTextActive]}>E-mail</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.channelBtn, channel === 'wallet' && styles.channelBtnActive]}
                onPress={() => setChannel('wallet')}
                activeOpacity={0.75}
              >
                <Ionicons name="wallet-outline" size={15} color={channel === 'wallet' ? colors.primary : colors.light.muted} />
                <Text style={[styles.channelBtnText, channel === 'wallet' && styles.channelBtnTextActive]}>Wallet</Text>
              </TouchableOpacity>
            </View>

            {/* ── Wallet channel ─────────────────── */}
            {channel === 'wallet' && (
              <View>
                {/* Stats */}
                <View style={styles.walletStatsBanner}>
                  <Ionicons name="people-outline" size={17} color={colors.primary} />
                  {loadingWalletStats ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.walletStatsText}>
                      <Text style={styles.walletStatsCount}>
                        {(walletStats?.walletClientCount ?? 0) + (walletStats?.googleClientCount ?? 0)}
                      </Text>
                      {' '}client{((walletStats?.walletClientCount ?? 0) + (walletStats?.googleClientCount ?? 0)) > 1 ? 's' : ''} seront notifiés
                      {((walletStats?.walletClientCount ?? 0) > 0 || (walletStats?.googleClientCount ?? 0) > 0) && (
                        <Text style={styles.walletStatsSub}>
                          {' '}({walletStats?.walletClientCount ?? 0} Apple · {walletStats?.googleClientCount ?? 0} Android)
                        </Text>
                      )}
                    </Text>
                  )}
                </View>

                {/* Info rate limit */}
                <View style={styles.walletInfoRow}>
                  <Ionicons name="information-circle-outline" size={15} color={colors.light.muted} />
                  <Text style={styles.walletInfoText}>
                    Limite : 1 notification par heure. Le message apparaît sur la carte de fidélité.
                  </Text>
                </View>

                {/* Success */}
                {walletSuccess && (
                  <View style={styles.walletSuccess}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.walletSuccessText}>
                      {[
                        walletSuccess.sent_apple > 0 && `${walletSuccess.sent_apple} Apple`,
                        walletSuccess.sent_google > 0 && `${walletSuccess.sent_google} Android`,
                      ].filter(Boolean).join(', ') || '0'} client{(walletSuccess.sent_apple + walletSuccess.sent_google) > 1 ? 's' : ''} notifié{(walletSuccess.sent_apple + walletSuccess.sent_google) > 1 ? 's' : ''}
                      {walletSuccess.failed > 0 && ` · ${walletSuccess.failed} échec`}
                    </Text>
                  </View>
                )}

                {/* Error */}
                {walletError && (
                  <View style={styles.walletError}>
                    <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                    <Text style={styles.walletErrorText}>{walletError}</Text>
                  </View>
                )}

                {/* Textarea */}
                <View style={{ marginBottom: 6 }}>
                  <View style={styles.walletMsgHeader}>
                    <Text style={styles.areaLabel}>Message</Text>
                    <Text style={[styles.charCount, walletMessage.length > WALLET_MSG_MAX - 10 && { color: '#dc2626' }]}>
                      {WALLET_MSG_MAX - walletMessage.length} restants
                    </Text>
                  </View>
                  <TextInput
                    style={styles.textarea}
                    placeholder="Ex : -20% ce week-end, venez en profiter !"
                    placeholderTextColor={colors.light.placeholder}
                    multiline
                    numberOfLines={4}
                    maxLength={WALLET_MSG_MAX}
                    value={walletMessage}
                    onChangeText={(v) => { setWalletMessage(v); setWalletSuccess(null) }}
                    textAlignVertical="top"
                  />
                </View>

                {/* Send button */}
                <View style={styles.sendBtnSpacing}>
                  <Button
                    onPress={handleWalletSend}
                    loading={walletSending}
                    size="lg"
                    disabled={!walletMessage.trim() || walletMessage.length > WALLET_MSG_MAX}
                  >
                    <Ionicons name="wallet-outline" size={18} color="#ffffff" />
                    {'  '}Envoyer sur les Wallets
                  </Button>
                </View>

                {/* History */}
                {(walletStats?.history?.length ?? 0) > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={styles.walletHistoryTitle}>Historique des envois</Text>
                    {walletStats!.history.map((notif) => (
                      <View key={notif.id} style={styles.walletHistoryItem}>
                        <Text style={styles.walletHistoryMsg} numberOfLines={2}>{notif.message}</Text>
                        <View style={styles.walletHistoryMeta}>
                          {(notif.sent_google ?? 0) > 0 && (
                            <View style={styles.walletHistoryBadge}>
                              <Ionicons name="logo-android" size={10} color={colors.light.muted} />
                              <Text style={styles.walletHistoryBadgeText}>{notif.sent_google}</Text>
                            </View>
                          )}
                          <Text style={styles.walletHistoryDate}>
                            {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Push / Email sections */}
            {channel !== 'wallet' && <>
            <Text style={styles.sectionLabel}>Destinataires</Text>
            <View style={styles.segmentList}>
              {SEGMENTS.map((seg) => {
                const isSelected = segment === seg.value
                return (
                  <TouchableOpacity
                    key={seg.value}
                    style={[styles.segmentItem, isSelected && styles.segmentItemActive]}
                    onPress={() => setSegment(seg.value)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.radio, isSelected && styles.radioActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={[styles.segmentIconBox, isSelected && styles.segmentIconBoxActive]}>
                      <Ionicons name={seg.iconName} size={16} color={isSelected ? colors.primary : colors.light.muted} />
                    </View>
                    <View style={styles.segmentText}>
                      <Text style={[styles.segmentLabel, isSelected && styles.segmentLabelActive]}>{seg.label}</Text>
                      <Text style={styles.segmentDesc}>{seg.description}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Age range inputs */}
            {segment === 'age_range' && (
              <View style={styles.ageCard}>
                <Text style={styles.ageCardTitle}>Tranche d'âge</Text>
                <View style={styles.ageRow}>
                  <View style={styles.ageField}>
                    <Text style={styles.ageFieldLabel}>Âge minimum</Text>
                    <TextInput
                      style={styles.ageInput}
                      placeholder="Ex: 18"
                      placeholderTextColor={colors.light.placeholder}
                      keyboardType="number-pad"
                      value={minAge}
                      onChangeText={v => { setMinAge(v.replace(/[^0-9]/g, '')); setPreviewCount(null) }}
                      maxLength={3}
                    />
                  </View>
                  <View style={styles.ageSeparator}>
                    <Text style={styles.ageSeparatorText}>—</Text>
                  </View>
                  <View style={styles.ageField}>
                    <Text style={styles.ageFieldLabel}>Âge maximum</Text>
                    <TextInput
                      style={styles.ageInput}
                      placeholder="Ex: 35"
                      placeholderTextColor={colors.light.placeholder}
                      keyboardType="number-pad"
                      value={maxAge}
                      onChangeText={v => { setMaxAge(v.replace(/[^0-9]/g, '')); setPreviewCount(null) }}
                      maxLength={3}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Client search */}
            {segment === 'client_search' && (
              <View style={styles.searchCard}>
                <View style={styles.searchInputRow}>
                  <Ionicons name="search-outline" size={18} color={colors.light.muted} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Nom, prénom ou e-mail..."
                    placeholderTextColor={colors.light.placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]) }} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.light.subtle} />
                    </TouchableOpacity>
                  )}
                </View>

                {searching && (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />
                )}

                {!searching && searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((client) => {
                      const isSelected = selectedClients.some(c => c.id === client.id)
                      return (
                        <TouchableOpacity
                          key={client.id}
                          style={[styles.clientRow, isSelected && styles.clientRowSelected]}
                          onPress={() => toggleClient(client)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.clientAvatar, isSelected && styles.clientAvatarSelected]}>
                            <Text style={[styles.clientAvatarText, isSelected && styles.clientAvatarTextSelected]}>
                              {client.first_name[0]?.toUpperCase() ?? '?'}
                            </Text>
                          </View>
                          <View style={styles.clientInfo}>
                            <Text style={[styles.clientName, isSelected && styles.clientNameSelected]}>
                              {client.first_name} {client.last_name}
                            </Text>
                            <Text style={styles.clientEmail}>{client.email}</Text>
                          </View>
                          <View style={[styles.checkBox, isSelected && styles.checkBoxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}

                {!searching && searchQuery.length > 1 && searchResults.length === 0 && (
                  <Text style={styles.noResults}>Aucun client trouvé</Text>
                )}

                {selectedClients.length > 0 && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                    <Text style={styles.selectedBadgeText}>
                      {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} sélectionné{selectedClients.length > 1 ? 's' : ''}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedClients([])} hitSlop={8}>
                      <Text style={styles.clearSelected}>Effacer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Preview count */}
            {segment !== 'client_search' && (
              <TouchableOpacity
                style={styles.previewBtn}
                onPress={handlePreview}
                disabled={loadingPreview}
                activeOpacity={0.75}
              >
                {loadingPreview ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="people-outline" size={17} color={colors.primary} />
                    <Text style={styles.previewBtnText}>
                      {previewCount !== null
                        ? `${previewCount} destinataire${previewCount > 1 ? 's' : ''}`
                        : 'Voir le nombre de destinataires'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Message form */}
            <View style={styles.formGap}>
              {channel === 'push' ? (
                <>
                  <Input
                    label="Titre (optionnel)"
                    theme="light"
                    placeholder={merchant?.name ?? 'Titre de la notification'}
                    value={title}
                    onChangeText={setTitle}
                  />
                  <View>
                    <Text style={styles.areaLabel}>Message *</Text>
                    <TextInput
                      style={styles.textarea}
                      placeholder="Ex: Votre prochaine visite vous offre un café gratuit !"
                      placeholderTextColor={colors.light.placeholder}
                      multiline
                      numberOfLines={4}
                      value={message}
                      onChangeText={setMessage}
                      textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{message.length} / 178 caractères</Text>
                  </View>
                </>
              ) : (
                <>
                  <Input
                    label="Sujet de l'e-mail *"
                    theme="light"
                    placeholder="Ex: Offre exclusive pour vous !"
                    value={subject}
                    onChangeText={setSubject}
                  />
                  <View>
                    <Text style={styles.areaLabel}>Message *</Text>
                    <TextInput
                      style={styles.textarea}
                      placeholder="Rédigez votre message promotionnel ici..."
                      placeholderTextColor={colors.light.placeholder}
                      multiline
                      numberOfLines={6}
                      value={message}
                      onChangeText={setMessage}
                      textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{message.length} caractères</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.sendBtnSpacing}>
              <Button onPress={handleSend} loading={sending} size="lg">
                <Ionicons
                  name={channel === 'push' ? 'notifications-outline' : 'send-outline'}
                  size={18}
                  color="#ffffff"
                />
                {'  '}{channel === 'push' ? 'Envoyer la notification' : 'Envoyer le message'}
              </Button>
            </View>

            <Text style={styles.disclaimer}>
              {channel === 'push'
                ? "Seuls les clients ayant activé les notifications sur leur appareil recevront ce message."
                : "Seuls les clients ayant accepté les communications marketing recevront cet e-mail."}
            </Text>
            </>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function getAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.bg },
  flex: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  pageTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.light.text },
  pageSubtitle: { fontSize: fontSize.sm, color: colors.light.muted, marginTop: 4, marginBottom: 20 },

  channelRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  channelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 12, borderRadius: radius['2xl'],
    borderWidth: 1.5, borderColor: colors.light.cardBorder, backgroundColor: colors.light.card,
    ...shadows.sm,
  },
  channelBtnActive: { borderColor: colors.primaryBorder, backgroundColor: colors.primaryBg },
  channelBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.light.muted },
  channelBtnTextActive: { color: colors.primary },

  sectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.light.textSoft, marginBottom: 10 },
  segmentList: { gap: 8, marginBottom: 16 },
  segmentItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.light.card, borderRadius: radius['2xl'],
    borderWidth: 1, borderColor: colors.light.cardBorder,
    padding: 14, gap: 10, ...shadows.sm,
  },
  segmentItemActive: {
    borderColor: Platform.OS === 'android' ? '#D9B8F8' : colors.primaryBorder,
    backgroundColor: Platform.OS === 'android' ? '#F2E7FD' : colors.primaryBg,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.light.subtle, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
  segmentIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.light.inputBorder, alignItems: 'center', justifyContent: 'center' },
  segmentIconBoxActive: { backgroundColor: colors.primaryBg },
  segmentText: { flex: 1 },
  segmentLabel: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.light.text },
  segmentLabelActive: { color: colors.primaryDark },
  segmentDesc: { fontSize: fontSize.xs, color: colors.light.muted, marginTop: 2 },

  // Age range
  ageCard: {
    backgroundColor: colors.light.card, borderRadius: radius['2xl'],
    borderWidth: 1.5, borderColor: colors.primaryBorder,
    padding: 16, marginBottom: 16, ...shadows.sm,
  },
  ageCardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primaryDark, marginBottom: 12 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ageField: { flex: 1 },
  ageFieldLabel: { fontSize: fontSize.xs, color: colors.light.textSoft, fontWeight: fontWeight.medium, marginBottom: 6 },
  ageInput: {
    backgroundColor: colors.light.input, borderWidth: 1.5, borderColor: colors.light.inputBorder,
    borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: fontSize.base, color: colors.light.text, textAlign: 'center', fontWeight: fontWeight.semibold,
  },
  ageSeparator: { paddingTop: 20 },
  ageSeparatorText: { fontSize: fontSize.lg, color: colors.light.subtle, fontWeight: fontWeight.bold },

  // Client search
  searchCard: {
    backgroundColor: colors.light.card, borderRadius: radius['2xl'],
    borderWidth: 1.5, borderColor: colors.primaryBorder,
    padding: 14, marginBottom: 16, ...shadows.sm,
  },
  searchInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.light.input, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: colors.light.inputBorder,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: fontSize.base, color: colors.light.text },
  searchSpinner: { marginTop: 14 },
  searchResults: { marginTop: 10, gap: 6 },
  noResults: { fontSize: fontSize.sm, color: colors.light.muted, textAlign: 'center', marginTop: 14 },

  clientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: radius.xl,
    backgroundColor: colors.light.bg,
    borderWidth: 1, borderColor: 'transparent',
  },
  clientRowSelected: {
    backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder,
  },
  clientAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.light.inputBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  clientAvatarSelected: { backgroundColor: colors.primaryBgStrong },
  clientAvatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.light.textSoft },
  clientAvatarTextSelected: { color: colors.primary },
  clientInfo: { flex: 1 },
  clientName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.light.text },
  clientNameSelected: { color: colors.primaryDark },
  clientEmail: { fontSize: fontSize.xs, color: colors.light.muted, marginTop: 1 },
  checkBox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.light.subtle,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },

  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.light.cardBorder,
  },
  selectedBadgeText: { flex: 1, fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  clearSelected: { fontSize: fontSize.xs, color: colors.light.muted, textDecorationLine: 'underline' },

  previewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.primaryBorder, borderRadius: radius.xl,
    paddingVertical: 12, marginBottom: 20, backgroundColor: colors.primaryBg,
  },
  previewBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.primary },

  formGap: { gap: 14 },
  areaLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.light.textSoft, marginBottom: 6 },
  textarea: {
    backgroundColor: colors.light.input, borderWidth: 1.5, borderColor: colors.light.inputBorder,
    borderRadius: radius['2xl'], paddingHorizontal: 16, paddingVertical: 14,
    fontSize: fontSize.base, color: colors.light.text, minHeight: 110,
  },
  charCount: { fontSize: fontSize.xs, color: colors.light.subtle, textAlign: 'right', marginTop: 6 },
  sendBtnSpacing: { marginTop: 20 },
  disclaimer: { fontSize: fontSize.xs, color: colors.light.subtle, textAlign: 'center', marginTop: 14, lineHeight: 17 },

  // Wallet channel
  walletStatsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primaryBg, borderWidth: 1, borderColor: colors.primaryBorder,
    borderRadius: radius['2xl'], paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  walletStatsText: { flex: 1, fontSize: fontSize.sm, color: colors.light.text },
  walletStatsCount: { fontWeight: fontWeight.bold, color: colors.primaryDark },
  walletStatsSub: { color: colors.light.muted },
  walletInfoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.cardBorder,
    borderRadius: radius['2xl'], paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
  },
  walletInfoText: { flex: 1, fontSize: fontSize.xs, color: colors.light.muted, lineHeight: 17 },
  walletSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: radius['2xl'], paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  walletSuccessText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#15803d' },
  walletError: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: radius['2xl'], paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  walletErrorText: { flex: 1, fontSize: fontSize.sm, color: '#dc2626' },
  walletMsgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  walletHistoryTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.light.textSoft, marginBottom: 10,
  },
  walletHistoryItem: {
    backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.cardBorder,
    borderRadius: radius['2xl'], paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  walletHistoryMsg: { fontSize: fontSize.sm, color: colors.light.text, marginBottom: 6 },
  walletHistoryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletHistoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.light.inputBorder, borderRadius: radius.md,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  walletHistoryBadgeText: { fontSize: 10, color: colors.light.muted, fontWeight: fontWeight.medium },
  walletHistoryDate: { fontSize: fontSize.xs, color: colors.light.subtle },
})
