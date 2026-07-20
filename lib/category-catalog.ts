import type {
  CategoryMetricDefinition,
  CategoryTrackingDefinition,
  MetricDirection,
  MetricFrequency,
  MetricType,
  PillarId,
} from '../types';

type MetricSeed = readonly [
  label: string,
  type: MetricType,
  frequency: MetricFrequency,
  target: number,
  unit?: string,
  direction?: MetricDirection,
  isPrivate?: boolean,
];

type CategorySeed = {
  id: string;
  pillar: PillarId;
  label: string;
  description: string;
  weight: number;
  metrics: readonly MetricSeed[];
};

const slug = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

const limitsFor = (type: MetricType, target: number) => {
  if (type === 'score') return { min: 0, max: 10, step: 1 };
  if (type === 'boolean') return { min: 0, max: 1, step: 1 };
  if (type === 'percentage') return { min: 0, max: 100, step: 1 };
  if (type === 'level') return { min: 0, max: Math.max(10, target), step: 1 };
  return { min: 0, step: type === 'currency' ? 100 : 1 };
};

const expandMetric = (categoryId: string, seed: MetricSeed): CategoryMetricDefinition => {
  const [label, type, frequency, target, unit, direction = 'higher', isPrivate = false] = seed;
  return {
    id: `${categoryId}_${slug(label)}`,
    label,
    description: `${label} · ${frequency}`,
    type,
    frequency,
    target,
    unit,
    direction,
    private: isPrivate,
    ...limitsFor(type, target),
  };
};

const CATEGORY_SEEDS: readonly CategorySeed[] = [
  {
    id: 'body_fitness_athletics', pillar: 'body', label: 'Fitness & Athletics', weight: 22,
    description: 'Training consistency, volume, performance, combat sports and endurance.',
    metrics: [
      ['Training Days', 'count', 'weekly', 4, 'days'],
      ['Training Volume', 'count', 'weekly', 60, 'working sets'],
      ['Athletic Performance', 'score', 'weekly', 8],
      ['Combat Sport Level', 'level', 'monthly', 5],
      ['Endurance & Conditioning', 'score', 'weekly', 8],
    ],
  },
  {
    id: 'body_nutrition', pillar: 'body', label: 'Nutrition', weight: 20,
    description: 'Energy balance, macros, food quality, supplements and hydration.',
    metrics: [
      ['Calorie Target Adherence', 'percentage', 'daily', 100, '%'],
      ['Macro Ratio Quality', 'score', 'daily', 8],
      ['Meal Quality', 'score', 'daily', 8],
      ['Supplement Protocol', 'boolean', 'daily', 1],
      ['Hydration', 'count', 'daily', 2.5, 'litres'],
    ],
  },
  {
    id: 'body_wellness_recovery', pillar: 'body', label: 'Wellness & Recovery', weight: 8,
    description: 'Deliberate recovery through heat, cold, light, bodywork and movement.',
    metrics: [
      ['Sauna Sessions', 'count', 'weekly', 2, 'sessions'],
      ['Cold Therapy', 'count', 'weekly', 2, 'sessions'],
      ['Ice Baths', 'count', 'weekly', 1, 'sessions'],
      ['Red Light Therapy', 'count', 'weekly', 3, 'sessions'],
      ['Massage & Bodywork', 'count', 'monthly', 2, 'sessions'],
      ['Active Recovery', 'duration', 'weekly', 120, 'min'],
    ],
  },
  {
    id: 'body_sleep', pillar: 'body', label: 'Sleep', weight: 25,
    description: 'Sleep duration, quality, timing and physiological recovery.',
    metrics: [
      ['Sleep Duration', 'duration', 'daily', 8, 'hours'],
      ['Sleep Quality', 'score', 'daily', 8],
      ['Sleep Latency', 'duration', 'daily', 20, 'min', 'lower'],
      ['Wake Time Consistency', 'score', 'daily', 8],
      ['HRV', 'count', 'daily', 60, 'ms'],
      ['Recovery', 'score', 'daily', 8],
    ],
  },
  {
    id: 'body_medicine_prevention', pillar: 'body', label: 'Medicine & Prevention', weight: 15,
    description: 'Preventive medicine, laboratory status, hormones and check-up cadence.',
    metrics: [
      ['Blood Markers In Range', 'percentage', 'monthly', 100, '%', 'higher', true],
      ['Hormone Status', 'score', 'monthly', 8, undefined, 'higher', true],
      ['Peptide Protocol Adherence', 'percentage', 'daily', 100, '%', 'higher', true],
      ['Check-up Frequency', 'count', 'quarterly', 1, 'check-ups'],
      ['Disease Prevention', 'score', 'quarterly', 8],
    ],
  },
  {
    id: 'body_body_aesthetics_style', pillar: 'body', label: 'Body, Aesthetics & Style', weight: 5,
    description: 'Grooming, style, posture and the quality of your overall appearance.',
    metrics: [
      ['Grooming Quality', 'score', 'weekly', 8],
      ['Clothing Style', 'score', 'monthly', 8],
      ['Posture', 'score', 'weekly', 8],
      ['Overall Appearance', 'score', 'weekly', 8],
    ],
  },
  {
    id: 'body_communication_presence', pillar: 'body', label: 'Communication & Presence', weight: 3,
    description: 'Verbal and non-verbal presence, clarity and charisma.',
    metrics: [
      ['Articulation', 'score', 'weekly', 8],
      ['Body Language', 'score', 'weekly', 8],
      ['Facial Expression & Gestures', 'score', 'weekly', 8],
      ['Tonality', 'score', 'weekly', 8],
      ['Charisma & Presence', 'score', 'weekly', 8],
    ],
  },
  {
    id: 'body_sexual_health', pillar: 'body', label: 'Sexual Health', weight: 2,
    description: 'Private tracking for libido, hormonal energy and intimate connection.',
    metrics: [
      ['Libido & Energy', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Hormonal Wellbeing', 'score', 'monthly', 8, undefined, 'higher', true],
      ['Intimacy & Connection', 'score', 'weekly', 8, undefined, 'higher', true],
    ],
  },

  {
    id: 'mind_deep_work_productivity', pillar: 'mind', label: 'Deep Work & Productivity', weight: 12,
    description: 'Focused work, flow, output quality, distraction resistance and systems.',
    metrics: [
      ['Focus Time', 'duration', 'daily', 120, 'min'],
      ['Flow Sessions', 'count', 'weekly', 4, 'sessions'],
      ['Output Quality', 'score', 'weekly', 8],
      ['Distraction Resistance', 'score', 'daily', 8],
      ['System Efficiency', 'score', 'weekly', 8],
    ],
  },
  {
    id: 'mind_skills_expertise_knowledge_network', pillar: 'mind', label: 'Skills, Expertise & Knowledge Network', weight: 11,
    description: 'Breadth, depth and application of an interconnected skill portfolio.',
    metrics: [
      ['Active Skill Areas', 'count', 'monthly', 3, 'areas'],
      ['Expertise Depth', 'score', 'monthly', 8],
      ['Knowledge Network Density', 'score', 'monthly', 8],
      ['Application Rate', 'percentage', 'weekly', 80, '%'],
      ['Cross-domain Connections', 'count', 'monthly', 4, 'connections'],
    ],
  },
  {
    id: 'mind_technical_understanding', pillar: 'mind', label: 'Technical Understanding', weight: 11,
    description: 'Technical literacy, tools, systems thinking, AI and automation.',
    metrics: [
      ['Technical Literacy', 'score', 'monthly', 8],
      ['Tool Mastery', 'score', 'monthly', 8],
      ['Systems Understanding', 'score', 'monthly', 8],
      ['AI & Automation', 'score', 'monthly', 8],
    ],
  },
  {
    id: 'mind_literacy_general_knowledge', pillar: 'mind', label: 'Literacy & General Knowledge', weight: 11,
    description: 'Reading, broad knowledge and the quality of information consumed.',
    metrics: [
      ['Books Read', 'count', 'milestone', 24, 'books'],
      ['Reading Depth', 'score', 'monthly', 8],
      ['General Knowledge Breadth', 'score', 'quarterly', 8],
      ['Information Quality', 'score', 'weekly', 8],
    ],
  },
  {
    id: 'mind_arts_creative_hobbies', pillar: 'mind', label: 'Arts & Creative Hobbies', weight: 11,
    description: 'Active practice in music, strategy, visual art, poetry and writing.',
    metrics: [
      ['Piano Level', 'level', 'monthly', 7],
      ['Instrument Level', 'level', 'monthly', 7],
      ['Chess Level', 'level', 'monthly', 7],
      ['Drawing & Visual Art', 'score', 'monthly', 8],
      ['Poetry & Writing', 'score', 'monthly', 8],
      ['Creative Practice', 'duration', 'weekly', 180, 'min'],
    ],
  },
  {
    id: 'mind_languages', pillar: 'mind', label: 'Languages', weight: 11,
    description: 'Number, proficiency and real-world use of active languages.',
    metrics: [
      ['Active Languages', 'count', 'milestone', 3, 'languages'],
      ['Highest CEFR Level', 'level', 'quarterly', 6, 'A1–C2'],
      ['Active Language Use', 'duration', 'weekly', 180, 'min'],
    ],
  },
  {
    id: 'mind_worldview_philosophy', pillar: 'mind', label: 'Worldview & Philosophy', weight: 11,
    description: 'Clarity, depth and consistency of values, beliefs and mental models.',
    metrics: [
      ['Belief Clarity', 'score', 'quarterly', 8],
      ['Philosophical Depth', 'score', 'quarterly', 8],
      ['Value Consistency', 'score', 'monthly', 8],
      ['Mental Model Breadth', 'score', 'quarterly', 8],
    ],
  },
  {
    id: 'mind_emotional_intelligence', pillar: 'mind', label: 'Emotional Intelligence', weight: 11,
    description: 'Self-awareness, impulse control, empathy and emotional regulation.',
    metrics: [
      ['Self-awareness', 'score', 'weekly', 8],
      ['Impulse Control', 'score', 'weekly', 8],
      ['Empathy', 'score', 'weekly', 8],
      ['Emotional Regulation', 'score', 'weekly', 8],
    ],
  },
  {
    id: 'mind_order_systems', pillar: 'mind', label: 'Order & Systems', weight: 11,
    description: 'Environment, digital hygiene, personal knowledge and journaling systems.',
    metrics: [
      ['Environment Quality', 'score', 'weekly', 8],
      ['Digital Hygiene', 'score', 'weekly', 8],
      ['PKM System Quality', 'score', 'monthly', 8],
      ['Journaling Consistency', 'percentage', 'weekly', 80, '%'],
    ],
  },

  {
    id: 'spirit_purpose_meaning', pillar: 'spirit', label: 'Purpose & Meaning', weight: 15,
    description: 'Clarity of purpose, daily alignment and a lived inner why.',
    metrics: [
      ['Purpose Clarity', 'score', 'monthly', 8, undefined, 'higher', true],
      ['Daily Alignment', 'score', 'daily', 8, undefined, 'higher', true],
      ['Meaningful Activity', 'percentage', 'weekly', 80, '%', 'higher', true],
      ['Inner Why', 'score', 'monthly', 8, undefined, 'higher', true],
    ],
  },
  {
    id: 'spirit_psychological_development', pillar: 'spirit', label: 'Psychological Development', weight: 15,
    description: 'Developmental work through reflection, therapy, coaching and shadow work.',
    metrics: [
      ['Developmental Stage', 'level', 'quarterly', 7, undefined, 'higher', true],
      ['Therapy Sessions', 'count', 'monthly', 2, 'sessions', 'higher', true],
      ['Coaching Sessions', 'count', 'monthly', 2, 'sessions', 'higher', true],
      ['Shadow Work', 'count', 'weekly', 1, 'sessions', 'higher', true],
      ['Belief Work', 'count', 'weekly', 1, 'sessions', 'higher', true],
    ],
  },
  {
    id: 'spirit_transcendence_meditation', pillar: 'spirit', label: 'Transcendence & Meditation', weight: 15,
    description: 'Meditation practice and responsibly reported transcendent experience.',
    metrics: [
      ['Meditation', 'duration', 'daily', 20, 'min', 'higher', true],
      ['Meditation Depth', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Altered States', 'count', 'monthly', 1, 'experiences', 'higher', true],
      ['Mystical Experiences', 'count', 'milestone', 1, 'experiences', 'higher', true],
    ],
  },
  {
    id: 'spirit_rituals_practices', pillar: 'spirit', label: 'Rituals & Practices', weight: 14,
    description: 'Morning, evening and spiritual practices sustained over time.',
    metrics: [
      ['Morning Routine Quality', 'score', 'daily', 8, undefined, 'higher', true],
      ['Evening Routine Quality', 'score', 'daily', 8, undefined, 'higher', true],
      ['Spiritual Practice Consistency', 'percentage', 'weekly', 80, '%', 'higher', true],
    ],
  },
  {
    id: 'spirit_gratitude_presence', pillar: 'spirit', label: 'Gratitude & Presence', weight: 14,
    description: 'Gratitude entries, presence quality and awareness of the current moment.',
    metrics: [
      ['Gratitude Entries', 'count', 'daily', 3, 'entries', 'higher', true],
      ['Presence Quality', 'score', 'daily', 8, undefined, 'higher', true],
      ['Moment Awareness', 'score', 'daily', 8, undefined, 'higher', true],
    ],
  },
  {
    id: 'spirit_ego_identity', pillar: 'spirit', label: 'Ego & Identity', weight: 14,
    description: 'Awareness, flexibility, clarity and authenticity of identity.',
    metrics: [
      ['Ego Awareness', 'score', 'monthly', 8, undefined, 'higher', true],
      ['Identity Flexibility', 'score', 'monthly', 8, undefined, 'higher', true],
      ['Self-image Clarity', 'score', 'monthly', 8, undefined, 'higher', true],
      ['Authenticity', 'score', 'weekly', 8, undefined, 'higher', true],
    ],
  },
  {
    id: 'spirit_mortality_awareness', pillar: 'spirit', label: 'Mortality Awareness', weight: 13,
    description: 'Memento mori practice, priority clarity and healthy urgency.',
    metrics: [
      ['Memento Mori Practice', 'boolean', 'weekly', 1, undefined, 'higher', true],
      ['Priority Clarity', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Life Urgency', 'score', 'weekly', 8, undefined, 'higher', true],
    ],
  },

  {
    id: 'relationships_romance_intimacy', pillar: 'relationships', label: 'Romance & Intimacy', weight: 13,
    description: 'Private reflection on romantic quality, emotional depth and intimacy.',
    metrics: [
      ['Relationship Quality', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Emotional Depth', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Communication Quality', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Intimacy Quality', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Quality Time', 'duration', 'weekly', 240, 'min', 'higher', true],
    ],
  },
  {
    id: 'relationships_family', pillar: 'relationships', label: 'Family', weight: 13,
    description: 'Depth, frequency, quality and repair in family relationships.',
    metrics: [
      ['Connection Depth', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Contact Frequency', 'count', 'weekly', 2, 'contacts', 'higher', true],
      ['Relationship Quality', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Unresolved Conflicts', 'count', 'weekly', 0, 'conflicts', 'lower', true],
    ],
  },
  {
    id: 'relationships_friendships', pillar: 'relationships', label: 'Friendships', weight: 13,
    description: 'Depth, maintenance, reciprocity and growth alignment in friendships.',
    metrics: [
      ['Deep Friendships', 'count', 'quarterly', 5, 'friendships', 'higher', true],
      ['Friendship Maintenance', 'count', 'weekly', 2, 'contacts', 'higher', true],
      ['Reciprocity', 'score', 'monthly', 8, undefined, 'higher', true],
      ['Growth Alignment', 'score', 'monthly', 8, undefined, 'higher', true],
      ['Meaningful Conversations', 'count', 'weekly', 3, 'conversations', 'higher', true],
    ],
  },
  {
    id: 'relationships_children', pillar: 'relationships', label: 'Children', weight: 13,
    description: 'Presence, depth and the quality of role modelling with children.',
    metrics: [
      ['Presence Quality', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Connection Depth', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Role Model Quality', 'score', 'monthly', 8, undefined, 'higher', true],
    ],
  },
  {
    id: 'relationships_network_contacts', pillar: 'relationships', label: 'Network & Contacts', weight: 12,
    description: 'Reach, quality and strategic relevance of a maintained network.',
    metrics: [
      ['Network Reach', 'count', 'monthly', 50, 'active contacts'],
      ['Connection Quality', 'score', 'monthly', 8],
      ['Strategic Contacts', 'count', 'monthly', 5, 'contacts'],
    ],
  },
  {
    id: 'relationships_mentors_role_models', pillar: 'relationships', label: 'Mentors & Role Models', weight: 12,
    description: 'Active mentors, learning cadence and implementation of their guidance.',
    metrics: [
      ['Active Mentors', 'count', 'quarterly', 2, 'mentors'],
      ['Mentor Sessions', 'count', 'monthly', 1, 'sessions'],
      ['Learning Frequency', 'count', 'monthly', 2, 'sessions'],
      ['Implementation Rate', 'percentage', 'monthly', 80, '%'],
    ],
  },
  {
    id: 'relationships_community_belonging', pillar: 'relationships', label: 'Community & Belonging', weight: 12,
    description: 'Participation, contribution and a real sense of belonging.',
    metrics: [
      ['Group Engagement', 'count', 'weekly', 1, 'activities'],
      ['Community Contribution', 'count', 'weekly', 1, 'contributions'],
      ['Sense of Belonging', 'score', 'weekly', 8, undefined, 'higher', true],
    ],
  },
  {
    id: 'relationships_conflict_antagonists', pillar: 'relationships', label: 'Conflict & Antagonists', weight: 12,
    description: 'Open conflicts, constructive resolution and composure under opposition.',
    metrics: [
      ['Open Conflicts', 'count', 'weekly', 0, 'conflicts', 'lower', true],
      ['Conflict Resolution Quality', 'score', 'weekly', 8, undefined, 'higher', true],
      ['Conflicts Resolved', 'count', 'milestone', 1, 'conflicts', 'higher', true],
      ['Handling Antagonists', 'score', 'monthly', 8, undefined, 'higher', true],
    ],
  },

  {
    id: 'vocation_career_output', pillar: 'vocation', label: 'Career & Output', weight: 13,
    description: 'Project momentum, milestones, position and tangible output.',
    metrics: [
      ['Project Progress', 'percentage', 'weekly', 100, '%'],
      ['Milestones Reached', 'count', 'monthly', 2, 'milestones'],
      ['Professional Position', 'score', 'quarterly', 8],
      ['Output Volume', 'count', 'weekly', 1, 'deliverables'],
    ],
  },
  {
    id: 'vocation_finance_wealth', pillar: 'vocation', label: 'Finance & Wealth', weight: 13,
    description: 'Income, savings, investments, net worth and passive income.',
    metrics: [
      ['Monthly Income', 'currency', 'monthly', 5000, 'EUR', 'higher', true],
      ['Savings Rate', 'percentage', 'monthly', 30, '%', 'higher', true],
      ['Investment Portfolio', 'currency', 'monthly', 50000, 'EUR', 'higher', true],
      ['Net Worth', 'currency', 'monthly', 100000, 'EUR', 'higher', true],
      ['Passive Income Sources', 'count', 'quarterly', 2, 'sources', 'higher', true],
    ],
  },
  {
    id: 'vocation_skill_stack', pillar: 'vocation', label: 'Skill Stack', weight: 13,
    description: 'T-shaped growth, depth of core competencies and rare combinations.',
    metrics: [
      ['T-shape Development', 'score', 'quarterly', 8],
      ['Core Competency Depth', 'score', 'monthly', 8],
      ['Rare Skill Combinations', 'count', 'quarterly', 3, 'combinations'],
    ],
  },
  {
    id: 'vocation_influence_reach', pillar: 'vocation', label: 'Influence & Reach', weight: 13,
    description: 'Audience, engagement, measurable impact and thought leadership.',
    metrics: [
      ['Audience Size', 'count', 'monthly', 1000, 'people'],
      ['Engagement Rate', 'percentage', 'monthly', 5, '%'],
      ['Impact', 'score', 'monthly', 8],
      ['Thought Leadership', 'score', 'quarterly', 8],
    ],
  },
  {
    id: 'vocation_personal_brand', pillar: 'vocation', label: 'Personal Brand', weight: 12,
    description: 'Clarity, public perception, reputation and message consistency.',
    metrics: [
      ['Brand Clarity', 'score', 'monthly', 8],
      ['Public Perception', 'score', 'quarterly', 8],
      ['Reputation', 'score', 'quarterly', 8],
      ['Message Consistency', 'score', 'monthly', 8],
    ],
  },
  {
    id: 'vocation_power_autonomy', pillar: 'vocation', label: 'Power & Autonomy', weight: 12,
    description: 'Freedom of decision, resource control, time and financial independence.',
    metrics: [
      ['Decision Freedom', 'score', 'monthly', 8],
      ['Resource Control', 'score', 'monthly', 8],
      ['Time Autonomy', 'percentage', 'weekly', 80, '%'],
      ['Financial Independence', 'percentage', 'monthly', 100, '%', 'higher', true],
    ],
  },
  {
    id: 'vocation_creative_output', pillar: 'vocation', label: 'Creative Output', weight: 12,
    description: 'Published works, quality and consistency of creative production.',
    metrics: [
      ['Works Published', 'count', 'milestone', 1, 'works'],
      ['Output Quality', 'score', 'monthly', 8],
      ['Creative Consistency', 'percentage', 'weekly', 80, '%'],
    ],
  },
  {
    id: 'vocation_legacy', pillar: 'vocation', label: 'Legacy', weight: 12,
    description: 'Long-term contribution, systems built, people influenced and lasting work.',
    metrics: [
      ['Long-term Contribution', 'score', 'quarterly', 8],
      ['Systems Built', 'count', 'milestone', 3, 'systems'],
      ['People Influenced', 'count', 'milestone', 100, 'people'],
      ['Lasting Work', 'count', 'milestone', 1, 'works'],
    ],
  },

  {
    id: 'lore_adventure_extreme_experiences', pillar: 'lore', label: 'Adventure & Extreme Experiences', weight: 17,
    description: 'Boundary experiences, expeditions, survival and courageous decisions.',
    metrics: [
      ['Boundary Experiences', 'count', 'milestone', 3, 'experiences'],
      ['Physical Expeditions', 'count', 'milestone', 2, 'expeditions'],
      ['Survival Experiences', 'count', 'milestone', 1, 'experiences'],
      ['Courageous Decisions', 'count', 'monthly', 1, 'decisions'],
    ],
  },
  {
    id: 'lore_travel_cultures', pillar: 'lore', label: 'Travel & Cultures', weight: 17,
    description: 'Countries visited, cultural depth and lived experience on location.',
    metrics: [
      ['Countries Visited', 'count', 'milestone', 30, 'countries'],
      ['Cultural Depth', 'score', 'quarterly', 8],
      ['Lived Local Experiences', 'count', 'milestone', 20, 'experiences'],
    ],
  },
  {
    id: 'lore_rare_skills', pillar: 'lore', label: 'Rare Skills', weight: 17,
    description: 'Licences and uncommon abilities across air, road, sea and outdoors.',
    metrics: [
      ['Aircraft Skill', 'level', 'milestone', 5],
      ['Motorcycle Skill', 'level', 'milestone', 5],
      ['Boat Handling', 'level', 'milestone', 5],
      ['Diving Skill', 'level', 'milestone', 5],
      ['Climbing Skill', 'level', 'milestone', 5],
      ['Other Rare Skills', 'count', 'milestone', 3, 'skills'],
    ],
  },
  {
    id: 'lore_personal_mythology', pillar: 'lore', label: 'Personal Mythology', weight: 17,
    description: 'Defining stories, turning points and identity-shaping moments.',
    metrics: [
      ['Defining Stories', 'count', 'milestone', 5, 'stories', 'higher', true],
      ['Turning Points', 'count', 'milestone', 3, 'moments', 'higher', true],
      ['Formative Moments', 'count', 'milestone', 5, 'moments', 'higher', true],
      ['Identity-shaping Experiences', 'count', 'milestone', 5, 'experiences', 'higher', true],
    ],
  },
  {
    id: 'lore_lived_cultures', pillar: 'lore', label: 'Lived Cultures', weight: 16,
    description: 'Languages lived, time abroad and genuine cultural integration.',
    metrics: [
      ['Languages Lived Daily', 'count', 'milestone', 2, 'languages'],
      ['Time In Foreign Countries', 'duration', 'milestone', 12, 'months'],
      ['Cultural Integration', 'score', 'quarterly', 8],
    ],
  },
  {
    id: 'lore_creative_works_projects', pillar: 'lore', label: 'Creative Works & Projects', weight: 16,
    description: 'Unusual projects, created works and singular undertakings.',
    metrics: [
      ['Extraordinary Projects', 'count', 'milestone', 3, 'projects'],
      ['Works Created', 'count', 'milestone', 5, 'works'],
      ['Unique Undertakings', 'count', 'milestone', 3, 'undertakings'],
    ],
  },
];

export const CATEGORY_CATALOG: CategoryTrackingDefinition[] = CATEGORY_SEEDS.map((category) => ({
  ...category,
  metrics: category.metrics.map((metric) => expandMetric(category.id, metric)),
}));

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORY_CATALOG.map((category) => [category.id, category])
) as Record<string, CategoryTrackingDefinition>;

export const CATEGORY_METRICS = CATEGORY_CATALOG.flatMap((category) => category.metrics);

export const CATEGORIES_BY_PILLAR = Object.fromEntries(
  (['body', 'mind', 'spirit', 'relationships', 'vocation', 'lore'] as PillarId[])
    .map((pillar) => [pillar, CATEGORY_CATALOG.filter((category) => category.pillar === pillar)])
) as Record<PillarId, CategoryTrackingDefinition[]>;

export const CATEGORY_COUNT = CATEGORY_CATALOG.length;
export const CATEGORY_METRIC_COUNT = CATEGORY_METRICS.length;
