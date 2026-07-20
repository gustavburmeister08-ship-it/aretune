export type PillarId =
  | 'body'
  | 'mind'
  | 'spirit'
  | 'relationships'
  | 'vocation'
  | 'lore';

export type Phase = 'dissonance' | 'uncertainty' | 'discovery';
export type Level = '1.0' | '2.0' | '3.0';
export type AIProvider = 'anthropic' | 'openai';
export type SocialPlatform =
  | 'x'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'substack'
  | 'youtube'
  | 'tiktok'
  | 'github'
  | 'website';

export interface SocialProfile {
  userId: string;
  username?: string;
  bio: string;
  avatarPath?: string;
  avatarUrl?: string;
  isDiscoverable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLink {
  id?: string;
  userId: string;
  platform: SocialPlatform;
  url: string;
  handle?: string;
  position: number;
}

export interface CommunityProfile {
  userId: string;
  username?: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
}

export interface PublicCommunityProfile extends CommunityProfile {
  phase: Phase;
  level: Level;
  activePillars: PillarId[];
  pillarScores: Partial<Record<PillarId, number>>;
  memberSince: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  author: CommunityProfile;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  body: string;
  createdAt: string;
  author: CommunityProfile;
}

export interface SocialMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  otherUser: CommunityProfile;
  lastMessage?: SocialMessage;
  unread: boolean;
}

export type SocialReportReason = 'spam' | 'harassment' | 'hate' | 'nudity' | 'violence' | 'other';

export type MetricType =
  | 'score'
  | 'count'
  | 'boolean'
  | 'duration'
  | 'percentage'
  | 'currency'
  | 'level';

export type MetricFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'milestone';

export interface CategoryDefinition {
  id: string;
  pillar: PillarId;
  label: string;
  description?: string;
  weight?: number;
}

export interface MetricDefinition {
  id: string;
  pillar: PillarId;
  categoryId: string;
  label: string;
  description: string;
  type: MetricType;
  frequency: MetricFrequency;
  unit?: string;
  target?: number;
  isNorthStar?: boolean;
  isLeading?: boolean;
}

export type MetricDirection = 'higher' | 'lower' | 'range';

export interface CategoryMetricDefinition {
  id: string;
  label: string;
  description: string;
  type: MetricType;
  frequency: MetricFrequency;
  target: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  direction?: MetricDirection;
  private?: boolean;
  optional?: boolean;
}

export interface CategoryTrackingDefinition extends CategoryDefinition {
  description: string;
  weight: number;
  metrics: CategoryMetricDefinition[];
}

export interface CategoryTrackingEntry {
  id: string;
  userId: string;
  categoryId: string;
  values: Record<string, number>;
  note?: string;
  loggedAt: string;
  createdAt: string;
}

export interface Pillar {
  id: PillarId;
  label: string;
  description: string;
  color: string;
  icon: string;
  categories: CategoryDefinition[];
  northStarMetrics: MetricDefinition[];
  leadingMetrics: MetricDefinition[];
  optionalMetrics: MetricDefinition[];
}

export interface MetricEntry {
  id: string;
  metricId: string;
  userId: string;
  value: number;
  loggedAt: string;
  note?: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  entries: MetricEntry[];
  completedAt: string;
  mood: number;
  energyLevel: number;
  note?: string;
}

export type DirectiveStatus = 'pending' | 'completed' | 'skipped';
export type DirectiveFeedback = 'helpful' | 'too_easy' | 'too_hard' | 'not_relevant';

export interface Directive {
  id: string;
  userId: string;
  pillar: PillarId;
  title: string;
  body: string;
  why: string;
  action: string;
  generatedAt: string;
  completedAt?: string;
  skippedAt?: string;
  feedback?: DirectiveFeedback;
  model: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  phase: Phase;
  level: Level;
  activePillars: PillarId[];
  onboardingComplete: boolean;
  subscriptionTier: 'free' | 'pro';
  createdAt: string;
  pillarScores: Partial<Record<PillarId, number>>;
  legalConsentComplete: boolean;
  aiProcessingConsent: boolean;
  termsVersion?: string;
  privacyVersion?: string;
}

export interface OnboardingAnswer {
  questionId: string;
  answer: string | number | boolean;
}

export interface OnboardingResult {
  phase: Phase;
  topPillars: PillarId[];
  initialScores: Partial<Record<PillarId, number>>;
}

export interface WeeklyAudit {
  id: string;
  userId: string;
  weekStart: string;
  pillarScores: Partial<Record<PillarId, number>>;
  highlights: string[];
  gaps: string[];
  directiveCompletion: number;
  aiSummary?: string;
  completedAt: string;
}

export interface DirectiveGenerationInput {
  userId: string;
  phase: Phase;
  activePillars: PillarId[];
  pillarScores: Partial<Record<PillarId, number>>;
  recentMoods: number[];
  recentEnergy: number[];
  recentMetrics: Record<string, number[]>;
  provider?: AIProvider;
}

export interface DirectiveGenerationResult {
  pillar: PillarId;
  title: string;
  body: string;
  why: string;
  action: string;
  model: string;
}

export interface AuditGenerationInput {
  userId: string;
  phase: Phase;
  pillarScores: Partial<Record<PillarId, number>>;
  weeklyMetrics: Record<string, number[]>;
  directiveCompletion: number;
  provider?: AIProvider;
}

export interface AuditGenerationResult {
  summary: string;
  highlights: string[];
  gaps: string[];
}

export interface ScoreBreakdown {
  consistency: number;
  progression: number;
  breadth: number;
  intensity: number;
  lifestyle: number;
  performance?: number;
  pillar?: number;
}

export interface PillarScoreSnapshot {
  pillar: PillarId;
  score: number;
  breakdown: ScoreBreakdown;
  formulaVersion: string;
  calculatedAt: string;
}

export type IntegrationMode = 'oauth' | 'device' | 'file' | 'webhook' | 'fhir' | 'partner';
export type IntegrationStatus = 'pending' | 'active' | 'needs_attention' | 'disconnected';
export type IntegrationCategory = 'fitness' | 'nutrition' | 'mental' | 'sleep' | 'medical' | 'mindfulness' | 'productivity' | 'generic';
export type IntegrationEventType =
  | 'steps' | 'active_energy_kcal' | 'workout_minutes' | 'workout'
  | 'sleep_duration_hours' | 'sleep_score' | 'sleep_latency_minutes' | 'hrv_ms'
  | 'recovery_score' | 'resting_heart_rate_bpm' | 'weight_kg' | 'body_fat_percent'
  | 'calorie_adherence_percent' | 'macro_quality_score' | 'meal_quality_score'
  | 'hydration_liters' | 'mood_score' | 'stress_score' | 'meditation_minutes'
  | 'focus_minutes' | 'therapy_session' | 'glucose_mg_dl'
  | 'blood_pressure_systolic' | 'blood_pressure_diastolic' | 'spo2_percent';

export interface IntegrationProvider {
  id: string;
  name: string;
  category: IntegrationCategory;
  mode: IntegrationMode;
  description: string;
  dataTypes: IntegrationEventType[];
  permissions: string[];
  oauthReady?: boolean;
  partnerApproval?: boolean;
  nativeOnly?: boolean;
  accent: string;
}

export interface IntegrationConnection {
  id: string;
  userId: string;
  providerId: string;
  mode: IntegrationMode;
  status: IntegrationStatus;
  displayName: string;
  scopes: string[];
  lastSyncedAt?: string;
  lastError?: string;
  createdAt: string;
}

export interface IntegrationEvent {
  id: string;
  type: IntegrationEventType;
  value: number;
  unit?: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
}
