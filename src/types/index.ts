export interface LevelDefinition {
  level_number: number
  name: string
  emoji: string
  color: string
  min_scans: number
  max_scans: number | null
  description: string
}

export interface LevelProgress {
  currentLevel: LevelDefinition
  nextLevel: LevelDefinition | null
  totalScansLast30d: number
  scansToNextLevel: number
  progressPercent: number
  maintainPercent: number
  isInGracePeriod: boolean
  gracePeriodEndsAt: string | null
  daysUntilGraceEnds: number | null
  levelAlert: 'level_up' | 'level_down' | null
}

export type MaintainStatus = 'safe' | 'warning' | 'danger' | 'grace' | 'max'

export interface ScanPreset {
  label: string
  points: number
}

export interface DayHours {
  closed: boolean
  open: string   // "HH:MM"
  close: string  // "HH:MM"
}

export type OpeningHours = Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  DayHours
>

export interface Merchant {
  id: string
  user_id: string
  name: string
  email: string
  logo_url: string | null
  mode: 'points' | 'visits'
  points_per_visit: number
  reward_threshold: number
  reward_label: string
  scan_presets: ScanPreset[] | null
  address: string | null
  category: string | null
  opening_hours: OpeningHours | null
  subscription_plan: 'starter' | 'business' | 'premium' | null
  subscription_status: 'active' | 'inactive' | 'past_due' | 'canceled'
  created_at: string
}

export interface Client {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  birth_date: string | null
  qr_token: string
  current_level: number
  scans_last_30d: number
  level_updated_at: string | null
  level_alert: 'level_up' | 'level_down' | null
  created_at: string
}

export interface LoyaltyRelation {
  id: string
  client_id: string
  merchant_id: string
  current_points: number
  total_points_earned: number
  visits_count: number
  last_visit: string | null
  created_at: string
  merchants?: Merchant
  clients?: Client
}

export interface Reward {
  id: string
  merchant_id: string
  name: string
  description: string | null
  points_cost: number
  is_active: boolean
  image_url: string | null
  created_at: string
}

export interface ClientNotification {
  id: string
  client_id: string
  merchant_id: string
  type: 'points_add' | 'reward_used'
  points: number
  merchant_name: string
  message: string
  is_read: boolean
  created_at: string
}

export type BonusRuleType =
  | 'birthday'
  | 'first_visit'
  | 'loyalty_anniversary'
  | 'happy_hour'
  | 'day_of_week'
  | 'flash_offer'

export interface BonusRule {
  id: string
  merchant_id: string
  name: string
  rule_type: BonusRuleType
  is_active: boolean
  bonus_type: 'points' | 'multiplier'
  bonus_points: number | null
  bonus_multiplier: number | null
  time_start: string | null
  time_end: string | null
  days_of_week: number[] | null
  date_start: string | null
  date_end: string | null
  created_at: string
}
