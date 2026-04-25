# Saya Card — Application Mobile

Application mobile React Native pour le programme de fidélité Saya Card.

## Stack technique

- **Expo** SDK 52 + **Expo Router** v4 (file-based routing)
- **TypeScript**
- **NativeWind** v4 (Tailwind CSS pour React Native)
- **Supabase** (même backend que l'app web)
- **expo-camera** pour le scan QR
- **react-native-qrcode-svg** pour l'affichage QR client

## Prérequis

- Node.js 18+
- npm ou yarn
- Expo CLI : `npm install -g expo-cli`
- EAS CLI (pour les builds) : `npm install -g eas-cli`
- Expo Go sur votre téléphone (pour le développement)

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Copier et configurer les variables d'environnement
# Le fichier .env est déjà configuré avec les clés Supabase du projet
# Vérifiez les valeurs dans .env

# 3. Lancer l'application en mode développement
npm start
```

## Lancer sur votre appareil

```bash
# Sur iOS (Expo Go)
npm run ios

# Sur Android (Expo Go)
npm run android

# Sur le web (pour tester rapidement)
npm run web
```

## Assets requis

Ajoutez ces fichiers dans le dossier `assets/` :

| Fichier | Dimensions | Usage |
|---------|-----------|-------|
| `icon.png` | 1024×1024 | Icône de l'app |
| `splash.png` | 1284×2778 | Écran de démarrage |
| `adaptive-icon.png` | 1024×1024 | Icône Android adaptive |
| `favicon.png` | 32×32 | Favicon web |

> **Note :** Créez des images temporaires avec la couleur `#4c1d95` (violet) pour les tests.

## Structure du projet

```
saya-mobile/
├── app/                         # Routes Expo Router
│   ├── _layout.tsx              # Layout racine + AuthProvider
│   ├── index.tsx                # Redirection selon le rôle
│   ├── (auth)/                  # Écrans d'authentification
│   │   ├── login.tsx            # Connexion (client + commerçant)
│   │   ├── register-client.tsx  # Inscription client
│   │   └── register-merchant.tsx
│   ├── (client)/                # Espace client (tab bar sombre)
│   │   ├── dashboard.tsx        # QR code + niveau + commerçants
│   │   ├── levels.tsx           # Détail des niveaux
│   │   └── profile.tsx          # Profil + déconnexion
│   └── (merchant)/              # Espace commerçant (tab bar clair)
│       ├── dashboard.tsx        # KPIs + dernières visites
│       ├── scan.tsx             # Scanner QR (flux complet)
│       ├── customers.tsx        # Liste clients
│       ├── customer-detail.tsx  # Détail client
│       ├── rewards.tsx          # Gestion récompenses
│       ├── communication.tsx    # Envoi promos
│       └── settings.tsx         # Paramètres + déconnexion
├── src/
│   ├── context/
│   │   └── AuthContext.tsx      # Contexte auth + profil
│   ├── lib/
│   │   ├── supabase.ts          # Client Supabase
│   │   └── levels.ts            # Logique calcul niveaux
│   └── types/
│       └── index.ts             # Interfaces TypeScript
├── global.css                   # Tailwind CSS entry point
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
├── app.json                     # Config Expo
├── eas.json                     # Config EAS Build
└── .env                         # Variables d'environnement
```

## Niveaux de fidélité

| Niveau | Nom | Emoji | Scans (30j) |
|--------|-----|-------|-------------|
| 1 | Explorateur | 🗺️ | 0–4 |
| 2 | Habitué | ⭐ | 5–11 |
| 3 | Aventurier | 🧭 | 12–19 |
| 4 | Champion | 🏆 | 20–29 |
| 5 | Héros Local | 🦸 | 30–44 |
| 6 | Légende | 👑 | 45+ |

## Build avec EAS

```bash
# Connexion à Expo
eas login

# Build de développement (pour Expo Dev Client)
eas build --profile development --platform all

# Build de preview (APK Android / IPA iOS interne)
eas build --profile preview --platform all

# Build de production
eas build --profile production --platform all
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `EXPO_PUBLIC_APP_URL` | URL de l'app web (https://www.saya-card.com) |

## Architecture

- **Même backend Supabase** que l'app web Next.js
- Auth via `supabase.auth.signInWithPassword` avec `user_metadata.role`
- Session persistée via `@react-native-async-storage/async-storage`
- Navigation basée sur le rôle : clients → `(client)/`, commerçants → `(merchant)/`
- La logique de scan (écran `scan.tsx`) accède directement à Supabase sans passer par les API Next.js

## Ce qui n'est PAS dans cette version

- Stripe / abonnements (géré sur web uniquement)
- Apple Wallet / Google Wallet
- Notifications push (expo-notifications installé mais non configuré)
- Graphiques analytics
- Landing page
