import { Linking, Platform } from 'react-native'

export async function openNavigationTo(address: string): Promise<void> {
  const encoded = encodeURIComponent(address)

  const wazeUrl = `waze://?q=${encoded}&navigate=yes`
  const canWaze = await Linking.canOpenURL(wazeUrl).catch(() => false)
  if (canWaze) {
    await Linking.openURL(wazeUrl)
    return
  }

  const mapsUrl =
    Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${encoded}`
      : `geo:0,0?q=${encoded}`

  const canMaps = await Linking.canOpenURL(mapsUrl).catch(() => false)
  if (canMaps) {
    await Linking.openURL(mapsUrl)
    return
  }

  await Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${encoded}`
  )
}
