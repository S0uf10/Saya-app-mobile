import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'

export default function Index() {
  const { loading, role, session } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    )
  }

  if (!session) return <Redirect href="/(auth)/login" />
  if (role === 'merchant') return <Redirect href="/(merchant)/dashboard" />
  if (role === 'client') return <Redirect href="/(client)/dashboard" />
  return <Redirect href="/(auth)/login" />
}
