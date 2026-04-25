import { LevelDefinition, LevelProgress, MaintainStatus } from '../types'

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  {
    level_number: 1,
    name: 'Explorateur',
    emoji: '🗺️',
    color: '#8B9DC3',
    min_scans: 0,
    max_scans: 4,
    description: 'Bienvenue dans la communauté Saya Card !',
  },
  {
    level_number: 2,
    name: 'Habitué',
    emoji: '⭐',
    color: '#F4A460',
    min_scans: 5,
    max_scans: 11,
    description: 'Tu commences à prendre tes habitudes !',
  },
  {
    level_number: 3,
    name: 'Aventurier',
    emoji: '🧭',
    color: '#2ECC71',
    min_scans: 12,
    max_scans: 19,
    description: 'Tu explores de nouveaux horizons !',
  },
  {
    level_number: 4,
    name: 'Champion',
    emoji: '🏆',
    color: '#9B59B6',
    min_scans: 20,
    max_scans: 29,
    description: 'Tu es un vrai champion de la fidélité !',
  },
  {
    level_number: 5,
    name: 'Héros Local',
    emoji: '🦸',
    color: '#E74C3C',
    min_scans: 30,
    max_scans: 44,
    description: 'Tu es le héros de ton quartier !',
  },
  {
    level_number: 6,
    name: 'Légende',
    emoji: '👑',
    color: '#F1C40F',
    min_scans: 45,
    max_scans: null,
    description: 'Tu es une légende vivante !',
  },
]

const GRACE_DAYS = 7

export function getLevelDefinition(levelNumber: number): LevelDefinition | undefined {
  return LEVEL_DEFINITIONS.find((l) => l.level_number === levelNumber)
}

export function calculateLevelFromScans(scans: number): number {
  for (let i = LEVEL_DEFINITIONS.length - 1; i >= 0; i--) {
    if (scans >= LEVEL_DEFINITIONS[i].min_scans) {
      return LEVEL_DEFINITIONS[i].level_number
    }
  }
  return 1
}

export function calculateLevelProgress(
  scansLast30d: number,
  currentLevelNumber: number,
  levelUpdatedAt: string | null,
  levelAlert: 'level_up' | 'level_down' | null
): LevelProgress {
  const currentLevel = getLevelDefinition(currentLevelNumber) ?? LEVEL_DEFINITIONS[0]
  const nextLevel = getLevelDefinition(currentLevelNumber + 1) ?? null

  const progressPercent = nextLevel
    ? Math.min(
        100,
        Math.max(
          0,
          ((scansLast30d - currentLevel.min_scans) /
            (nextLevel.min_scans - currentLevel.min_scans)) *
            100
        )
      )
    : 100

  const scansToNextLevel = nextLevel ? Math.max(0, nextLevel.min_scans - scansLast30d) : 0

  const maintainPercent =
    currentLevel.min_scans === 0
      ? 100
      : Math.min(100, (scansLast30d / currentLevel.min_scans) * 100)

  let isInGracePeriod = false
  let gracePeriodEndsAt: string | null = null
  let daysUntilGraceEnds: number | null = null

  if (levelUpdatedAt) {
    const updatedAt = new Date(levelUpdatedAt)
    const graceEnd = new Date(updatedAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)
    const now = new Date()
    if (now < graceEnd) {
      isInGracePeriod = true
      gracePeriodEndsAt = graceEnd.toISOString()
      daysUntilGraceEnds = Math.ceil(
        (graceEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      )
    }
  }

  return {
    currentLevel,
    nextLevel,
    totalScansLast30d: scansLast30d,
    scansToNextLevel,
    progressPercent,
    maintainPercent,
    isInGracePeriod,
    gracePeriodEndsAt,
    daysUntilGraceEnds,
    levelAlert,
  }
}

export function getMaintainStatus(progress: LevelProgress): MaintainStatus {
  if (progress.currentLevel.level_number === 6) return 'max'
  if (progress.isInGracePeriod) return 'grace'
  if (progress.maintainPercent >= 70) return 'safe'
  if (progress.maintainPercent >= 30) return 'warning'
  return 'danger'
}

export function formatLevelAlert(progress: LevelProgress): string | null {
  if (!progress.levelAlert) return null
  if (progress.levelAlert === 'level_up') {
    return `Félicitations ! Tu es passé(e) ${progress.currentLevel.emoji} ${progress.currentLevel.name} !`
  }
  return `Ton niveau a baissé. Tu es maintenant ${progress.currentLevel.emoji} ${progress.currentLevel.name}.`
}
