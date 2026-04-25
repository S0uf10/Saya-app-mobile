import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerPushToken(clientId: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Saya Card',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#9333ea',
      })
    }

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') {
      console.warn('[push] Permission notifications refusée')
      return
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId

    if (!projectId) {
      console.warn('[push] Aucun EAS projectId trouvé dans la config Expo')
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {}
    )
    const token = tokenData.data
    const platform = Platform.OS as 'ios' | 'android'

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { client_id: clientId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,token' }
      )
    if (error) throw error
  } catch (error) {
    console.warn('[push] Impossible d’enregistrer le token Expo', error)
    // Push notifications are optional — never crash the app
  }
}

export async function unregisterPushToken(clientId: string): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({})
    const token = tokenData.data
    await supabase
      .from('push_tokens')
      .delete()
      .eq('client_id', clientId)
      .eq('token', token)
  } catch {
    // Silent
  }
}
