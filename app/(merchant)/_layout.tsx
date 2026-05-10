import { useEffect } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import { colors } from '../../src/theme'
import { useAuth } from '../../src/context/AuthContext'

export default function MerchantLayout() {
  const { merchant, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (merchant && merchant.subscription_status !== 'active') {
      router.replace('/subscribe')
    }
  }, [merchant?.subscription_status, loading])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.light.subtle,
        tabBarStyle: {
          backgroundColor: colors.light.card,
          borderTopColor: colors.light.cardBorder,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'scan' : 'scan-outline'}
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Récompenses',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="communication"
        options={{
          title: 'Promos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customer-detail"
        options={{ href: null }}
      />
    </Tabs>
  )
}
