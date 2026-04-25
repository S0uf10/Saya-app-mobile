import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { ClientNotification } from '../../src/types'
import { colors, gradients, radius, fontSize, fontWeight } from '../../src/theme'
import { EmptyState } from '../../src/components/ui/EmptyState'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsScreen() {
  const { client } = useAuth()
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!client) return
    const { data } = await supabase
      .from('client_notifications')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(60)

    setNotifications(data ?? [])
    setLoading(false)
    setRefreshing(false)

    // Mark all unread as read (fire-and-forget)
    supabase
      .from('client_notifications')
      .update({ is_read: true })
      .eq('client_id', client.id)
      .eq('is_read', false)
  }, [client])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])

  return (
    <LinearGradient colors={gradients.clientBg} style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Notifications</Text>
        </View>

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
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                theme="dark"
                iconName="notifications-outline"
                title="Aucune notification"
                subtitle="Vos notifications apparaîtront ici après vos scans chez un commerçant."
              />
            </View>
          ) : (
            <View style={styles.list}>
              {notifications.map((n) => {
                const isPoints = n.type === 'points_add'
                const accentColor = isPoints ? colors.primaryLight : colors.warning
                return (
                  <View
                    key={n.id}
                    style={[styles.notifCard, !n.is_read && styles.notifUnread]}
                  >
                    <View
                      style={[
                        styles.notifIconBox,
                        { backgroundColor: isPoints
                          ? 'rgba(168,85,247,0.12)'
                          : 'rgba(245,158,11,0.12)' },
                      ]}
                    >
                      <Ionicons
                        name={isPoints ? 'add-circle-outline' : 'gift-outline'}
                        size={22}
                        color={accentColor}
                      />
                    </View>

                    <View style={styles.notifContent}>
                      <Text style={styles.notifMerchant}>{n.merchant_name}</Text>
                      <Text style={styles.notifMessage}>{n.message}</Text>
                      <Text style={styles.notifDate}>{formatDate(n.created_at)}</Text>
                    </View>

                    <View style={styles.notifRight}>
                      <Text style={[styles.notifPoints, { color: accentColor }]}>
                        {isPoints ? '+' : '-'}{Math.abs(n.points)} pts
                      </Text>
                      {!n.is_read && <View style={styles.unreadDot} />}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyWrap: { paddingHorizontal: 20, paddingTop: 40 },

  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.glass.bg,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: 14,
  },
  notifUnread: {
    borderColor: colors.glass.borderStrong,
    backgroundColor: colors.glass.bgStrong,
  },
  notifIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: { flex: 1, gap: 2 },
  notifMerchant: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  notifMessage: {
    fontSize: fontSize.xs,
    color: colors.dark.textSoft,
    lineHeight: 16,
  },
  notifDate: {
    fontSize: 10,
    color: colors.dark.subtle,
    marginTop: 2,
  },
  notifRight: { alignItems: 'flex-end', gap: 6 },
  notifPoints: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
})
