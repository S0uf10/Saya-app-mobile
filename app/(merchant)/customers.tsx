import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { LoyaltyRelation } from '../../src/types'
import { colors, radius, fontSize, fontWeight, shadows } from '../../src/theme'
import { Avatar } from '../../src/components/ui/Avatar'
import { EmptyState } from '../../src/components/ui/EmptyState'

export default function CustomersScreen() {
  const { merchant } = useAuth()
  const router = useRouter()
  const [relations, setRelations] = useState<LoyaltyRelation[]>([])
  const [filtered, setFiltered] = useState<LoyaltyRelation[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    if (!merchant) return
    try {
      const { data } = await supabase
        .from('loyalty_relations')
        .select('*, clients(id, first_name, last_name, email, phone, current_level, scans_last_30d)')
        .eq('merchant_id', merchant.id)
        .order('last_visit', { ascending: false })
      setRelations(data ?? [])
      setFiltered(data ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [merchant])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!search) { setFiltered(relations); return }
    const q = search.toLowerCase()
    setFiltered(
      relations.filter((rel) => {
        const c = rel.clients as any
        if (!c) return false
        return (
          c.first_name?.toLowerCase().includes(q) ||
          c.last_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
        )
      })
    )
  }, [search, relations])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header + search */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Clients ({relations.length})</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.light.subtle} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un client..."
            placeholderTextColor={colors.light.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={colors.light.subtle} />
            </TouchableOpacity>
          )}
        </View>
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
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.listContainer}>
            {filtered.length === 0 ? (
              <EmptyState
                iconName={search ? 'search-outline' : 'people-outline'}
                title={search ? 'Aucun résultat' : 'Aucun client encore'}
                subtitle={
                  search
                    ? 'Essayez un autre terme de recherche.'
                    : 'Scannez votre premier client pour le voir apparaître ici.'
                }
                theme="light"
              />
            ) : (
              <View style={styles.list}>
                {filtered.map((rel) => {
                  const c = rel.clients as any
                  if (!c) return null
                  const name = `${c.first_name} ${c.last_name}`
                  return (
                    <TouchableOpacity
                      key={rel.id}
                      style={styles.customerCard}
                      activeOpacity={0.75}
                      onPress={() =>
                        router.push({
                          pathname: '/(merchant)/customer-detail',
                          params: { clientId: rel.client_id, relationId: rel.id },
                        })
                      }
                    >
                      <Avatar name={name} size="md" theme="light" />
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>{name}</Text>
                        <Text style={styles.customerEmail}>{c.email}</Text>
                        <Text style={styles.customerMeta}>
                          {rel.visits_count} visite{rel.visits_count > 1 ? 's' : ''}
                          {rel.last_visit
                            ? ` · Dernière : ${new Date(rel.last_visit).toLocaleDateString('fr-FR')}`
                            : ''}
                        </Text>
                      </View>
                      <View style={styles.customerRight}>
                        <Text style={styles.customerPoints}>{rel.current_points}</Text>
                        <Text style={styles.customerPtsLabel}>pts</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.light.subtle} style={{ marginTop: 4 }} />
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.light.bg,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.light.text,
    padding: 0,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  list: { gap: 8 },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.light.cardBorder,
    padding: 14,
    gap: 12,
    ...shadows.sm,
  },
  customerInfo: { flex: 1 },
  customerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
  },
  customerEmail: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
    marginTop: 1,
  },
  customerMeta: {
    fontSize: fontSize.xs,
    color: colors.light.subtle,
    marginTop: 2,
  },
  customerRight: { alignItems: 'flex-end' },
  customerPoints: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  customerPtsLabel: {
    fontSize: fontSize.xs,
    color: colors.light.muted,
  },
})
