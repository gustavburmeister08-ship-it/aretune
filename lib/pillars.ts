import type { MetricDefinition, Pillar, PillarId } from '../types';
import { CATEGORIES_BY_PILLAR } from './category-catalog';

const metric = (
  pillar: PillarId,
  categoryId: string,
  id: string,
  label: string,
  type: MetricDefinition['type'],
  target: number,
  options: Partial<MetricDefinition> = {}
): MetricDefinition => ({
  id,
  pillar,
  categoryId,
  label,
  description: options.description ?? label,
  type,
  target,
  frequency: options.frequency ?? 'daily',
  ...options,
});

const BODY_CATEGORIES = CATEGORIES_BY_PILLAR.body;
const MIND_CATEGORIES = CATEGORIES_BY_PILLAR.mind;
const SPIRIT_CATEGORIES = CATEGORIES_BY_PILLAR.spirit;
const RELATIONSHIP_CATEGORIES = CATEGORIES_BY_PILLAR.relationships;
const VOCATION_CATEGORIES = CATEGORIES_BY_PILLAR.vocation;
const LORE_CATEGORIES = CATEGORIES_BY_PILLAR.lore;

export const PILLARS: Pillar[] = [
  {
    id: 'body', label: 'Body', description: 'Health, energy, performance, and recovery',
    color: '#43D9AD', icon: '⚡', categories: BODY_CATEGORIES,
    northStarMetrics: [metric('body', BODY_CATEGORIES[0].id, 'body_energy', 'Energy Score', 'score', 8, { isNorthStar: true, frequency: 'weekly' })],
    leadingMetrics: [
      metric('body', BODY_CATEGORIES[3].id, 'body_sleep_hours', 'Sleep Hours', 'duration', 8, { unit: 'hrs', isLeading: true }),
      metric('body', BODY_CATEGORIES[0].id, 'body_training', 'Training Session', 'boolean', 1, { isLeading: true }),
    ], optionalMetrics: [],
  },
  {
    id: 'mind', label: 'Mind', description: 'Focus, learning, reasoning, and emotional intelligence',
    color: '#6C63FF', icon: '◈', categories: MIND_CATEGORIES,
    northStarMetrics: [metric('mind', MIND_CATEGORIES[0].id, 'mind_clarity', 'Cognitive Clarity', 'score', 8, { isNorthStar: true, frequency: 'weekly' })],
    leadingMetrics: [
      metric('mind', MIND_CATEGORIES[0].id, 'mind_deep_work_minutes', 'Deep Work Minutes', 'duration', 90, { unit: 'min', isLeading: true }),
      metric('mind', MIND_CATEGORIES[7].id, 'mind_regulation_used', 'Regulation Protocol Used', 'boolean', 1, { isLeading: true }),
    ], optionalMetrics: [],
  },
  {
    id: 'spirit', label: 'Spirit', description: 'Purpose, presence, identity, and inner development',
    color: '#C9A84C', icon: '◎', categories: SPIRIT_CATEGORIES,
    northStarMetrics: [metric('spirit', SPIRIT_CATEGORIES[0].id, 'spirit_alignment', 'Purpose Alignment', 'score', 8, { isNorthStar: true, frequency: 'weekly' })],
    leadingMetrics: [
      metric('spirit', SPIRIT_CATEGORIES[2].id, 'spirit_meditation_minutes', 'Meditation Minutes', 'duration', 15, { unit: 'min', isLeading: true }),
      metric('spirit', SPIRIT_CATEGORIES[4].id, 'spirit_reflection', 'Reflection Completed', 'boolean', 1, { isLeading: true }),
    ], optionalMetrics: [],
  },
  {
    id: 'relationships', label: 'Relationships', description: 'Intimacy, trust, family, friendship, and community',
    color: '#FF9A3C', icon: '◇', categories: RELATIONSHIP_CATEGORIES,
    northStarMetrics: [metric('relationships', RELATIONSHIP_CATEGORIES[0].id, 'relationships_quality', 'Relationship Quality', 'score', 8, { isNorthStar: true, frequency: 'weekly' })],
    leadingMetrics: [
      metric('relationships', RELATIONSHIP_CATEGORIES[2].id, 'relationships_meaningful_conversations', 'Meaningful Conversations', 'count', 1, { isLeading: true }),
      metric('relationships', RELATIONSHIP_CATEGORIES[7].id, 'relationships_repair', 'Repair Attempt', 'boolean', 1, { isLeading: true }),
    ], optionalMetrics: [],
  },
  {
    id: 'vocation', label: 'Vocation', description: 'Craft, output, wealth, influence, and autonomy',
    color: '#3C9EFF', icon: '◆', categories: VOCATION_CATEGORIES,
    northStarMetrics: [metric('vocation', VOCATION_CATEGORIES[0].id, 'vocation_output', 'Output Shipped', 'count', 1, { isNorthStar: true, frequency: 'weekly' })],
    leadingMetrics: [
      metric('vocation', VOCATION_CATEGORIES[0].id, 'vocation_deep_work_minutes', 'Craft Deep Work', 'duration', 90, { unit: 'min', isLeading: true }),
      metric('vocation', VOCATION_CATEGORIES[0].id, 'vocation_shipped', 'Deliverable Shipped', 'boolean', 1, { isLeading: true }),
    ], optionalMetrics: [],
  },
  {
    id: 'lore', label: 'Lore', description: 'Adventure, culture, rare skills, and a life worth remembering',
    color: '#FF6B6B', icon: '✦', categories: LORE_CATEGORIES,
    northStarMetrics: [metric('lore', LORE_CATEGORIES[3].id, 'lore_aliveness', 'Aliveness Score', 'score', 8, { isNorthStar: true, frequency: 'weekly' })],
    leadingMetrics: [
      metric('lore', LORE_CATEGORIES[0].id, 'lore_novel_experience', 'Novel Experience', 'boolean', 1, { isLeading: true }),
      metric('lore', LORE_CATEGORIES[5].id, 'lore_creation_minutes', 'Creation Minutes', 'duration', 30, { unit: 'min', isLeading: true }),
    ], optionalMetrics: [],
  },
];

export const PILLAR_MAP = Object.fromEntries(PILLARS.map((pillar) => [pillar.id, pillar])) as Record<PillarId, Pillar>;
export const ALL_CATEGORIES = PILLARS.flatMap((pillar) => pillar.categories);
export const ALL_METRICS = PILLARS.flatMap((pillar) => [
  ...pillar.northStarMetrics,
  ...pillar.leadingMetrics,
  ...pillar.optionalMetrics,
]);
