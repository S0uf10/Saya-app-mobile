import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { colors, radius, fontSize, fontWeight } from '../../src/theme'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground
        source={require('../../assets/onboarding-bg.png')}
        style={styles.bg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(13,13,13,0.45)', 'rgba(13,13,13,0.97)']}
          locations={[0.35, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {/* Logo top center */}
          <View style={styles.logoRow}>
            <Image
              source={require('../../assets/sayacard-logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* Bottom content */}
          <View style={styles.bottom}>
            <View style={styles.headline}>
              <Text style={styles.welcomeLine}>Bienvenue chez</Text>
              <Text style={styles.brandLine}>Saya Card</Text>
              <Text style={styles.tagline}>Votre programme de fidélité</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push('/(auth)/sign-in')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Se connecter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push('/(auth)/register-client')}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>Créer un compte</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(auth)/register-merchant')}
                activeOpacity={0.75}
                style={styles.merchantLink}
              >
                <Text style={styles.merchantLinkText}>Espace commerçant →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  bg: { flex: 1 },
  safe: { flex: 1 },
  logoRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  logoImg: {
    width: 300,
    height: 200,
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 26,
    paddingBottom: 12,
  },
  headline: {
    marginBottom: 32,
  },
  welcomeLine: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: fontWeight.medium,
    letterSpacing: 0.3,
  },
  brandLine: {
    fontSize: 42,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
    letterSpacing: -1,
    lineHeight: 48,
    marginTop: 2,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius['2xl'],
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius['2xl'],
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  secondaryBtnText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
  },
  merchantLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  merchantLinkText: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
})
