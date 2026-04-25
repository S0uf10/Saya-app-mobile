import { Linking, Platform } from 'react-native'
import { supabase } from '../lib/supabase'

const WEB_APP_URL = 'https://www.saya-card.com'

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function addToAppleWallet(): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'Non authentifié' }

    // Ouvrir dans Safari : iOS détecte le .pkpass et déclenche Apple Wallet directement
    const url = `${WEB_APP_URL}/api/wallet/apple?token=${encodeURIComponent(token)}`
    await Linking.openURL(url)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

export async function addToGoogleWallet(): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'Non authentifié' }

    const res = await fetch(`${WEB_APP_URL}/api/wallet/google`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: (data as { error?: string }).error ?? 'Erreur serveur' }
    }

    const { url } = await res.json() as { url: string }
    await Linking.openURL(url)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

export async function addToSamsungWallet(): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'Non authentifié' }

    const res = await fetch(`${WEB_APP_URL}/api/wallet/samsung`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: (data as { error?: string }).error ?? 'Erreur serveur' }
    }

    const { cdata, partnerCode, cardId } = await res.json() as {
      cdata: string; partnerCode: string; cardId: string
    }

    const deepLink = `samsungwallet://addCard?partnerCode=${partnerCode}&cardId=${cardId}&cdata=${encodeURIComponent(cdata)}`
    const webUrl = `https://a.swallet.link/atw/v1/${partnerCode}/${cardId}?cdata=${encodeURIComponent(cdata)}`

    const canDeep = await Linking.canOpenURL(deepLink).catch(() => false)
    await Linking.openURL(canDeep ? deepLink : webUrl)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

export const isIOS = Platform.OS === 'ios'
export const isAndroid = Platform.OS === 'android'
export const isSamsung =
  Platform.OS === 'android' &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((Platform.constants as any)?.Brand?.toLowerCase?.() === 'samsung' ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Platform.constants as any)?.Manufacturer?.toLowerCase?.() === 'samsung')
