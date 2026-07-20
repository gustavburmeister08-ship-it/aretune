-- Versioned Alpha catalog (46 categories) and first-party product events.

insert into public.categories (id, pillar, label, position) values
  ('body_fitness_athletics','body','Fitness & Athletics',1),
  ('body_nutrition','body','Nutrition',2),
  ('body_wellness_recovery','body','Wellness & Recovery',3),
  ('body_sleep','body','Sleep',4),
  ('body_medicine_prevention','body','Medicine & Prevention',5),
  ('body_body_aesthetics_style','body','Body, Aesthetics & Style',6),
  ('body_communication_presence','body','Communication & Presence',7),
  ('body_sexual_health','body','Sexual Health',8),
  ('mind_deep_work_productivity','mind','Deep Work & Productivity',1),
  ('mind_skills_expertise_knowledge_network','mind','Skills, Expertise & Knowledge Network',2),
  ('mind_technical_understanding','mind','Technical Understanding',3),
  ('mind_literacy_general_knowledge','mind','Literacy & General Knowledge',4),
  ('mind_arts_creative_hobbies','mind','Arts & Creative Hobbies',5),
  ('mind_languages','mind','Languages',6),
  ('mind_worldview_philosophy','mind','Worldview & Philosophy',7),
  ('mind_emotional_intelligence','mind','Emotional Intelligence',8),
  ('mind_order_systems','mind','Order & Systems',9),
  ('spirit_purpose_meaning','spirit','Purpose & Meaning',1),
  ('spirit_psychological_development','spirit','Psychological Development',2),
  ('spirit_transcendence_meditation','spirit','Transcendence & Meditation',3),
  ('spirit_rituals_practices','spirit','Rituals & Practices',4),
  ('spirit_gratitude_presence','spirit','Gratitude & Presence',5),
  ('spirit_ego_identity','spirit','Ego & Identity',6),
  ('spirit_mortality_awareness','spirit','Mortality Awareness',7),
  ('relationships_romance_intimacy','relationships','Romance & Intimacy',1),
  ('relationships_family','relationships','Family',2),
  ('relationships_friendships','relationships','Friendships',3),
  ('relationships_children','relationships','Children',4),
  ('relationships_network_contacts','relationships','Network & Contacts',5),
  ('relationships_mentors_role_models','relationships','Mentors & Role Models',6),
  ('relationships_community_belonging','relationships','Community & Belonging',7),
  ('relationships_conflict_antagonists','relationships','Conflict & Antagonists',8),
  ('vocation_career_output','vocation','Career & Output',1),
  ('vocation_finance_wealth','vocation','Finance & Wealth',2),
  ('vocation_skill_stack','vocation','Skill Stack',3),
  ('vocation_influence_reach','vocation','Influence & Reach',4),
  ('vocation_personal_brand','vocation','Personal Brand',5),
  ('vocation_power_autonomy','vocation','Power & Autonomy',6),
  ('vocation_creative_output','vocation','Creative Output',7),
  ('vocation_legacy','vocation','Legacy',8),
  ('lore_adventure_extreme_experiences','lore','Adventure & Extreme Experiences',1),
  ('lore_travel_cultures','lore','Travel & Cultures',2),
  ('lore_rare_skills','lore','Rare Skills',3),
  ('lore_personal_mythology','lore','Personal Mythology',4),
  ('lore_lived_cultures','lore','Lived Cultures',5),
  ('lore_creative_works_projects','lore','Creative Works & Projects',6)
on conflict (id) do update set label = excluded.label, position = excluded.position, active = true;

insert into public.metric_definitions
  (id, pillar, category_id, label, description, metric_type, frequency, unit, target) values
  ('body_sleep_hours','body','body_sleep','Sleep Hours','Hours slept last night','duration','daily','hrs',8),
  ('body_training','body','body_fitness_athletics','Training Session','Completed a training session','boolean','daily',null,1),
  ('mind_deep_work_minutes','mind','mind_deep_work_productivity','Deep Work Minutes','Focused work without distraction','duration','daily','min',90),
  ('mind_regulation_used','mind','mind_emotional_intelligence','Regulation Protocol Used','Used a deliberate regulation protocol','boolean','daily',null,1),
  ('spirit_meditation_minutes','spirit','spirit_transcendence_meditation','Meditation Minutes','Deliberate stillness or meditation','duration','daily','min',15),
  ('spirit_reflection','spirit','spirit_gratitude_presence','Reflection Completed','Completed a deliberate reflection','boolean','daily',null,1),
  ('relationships_meaningful_conversations','relationships','relationships_friendships','Meaningful Conversations','Conversations with attention and depth','count','daily',null,1),
  ('relationships_repair','relationships','relationships_conflict_antagonists','Repair Attempt','Addressed friction constructively','boolean','daily',null,1),
  ('vocation_deep_work_minutes','vocation','vocation_career_output','Craft Deep Work','Focused minutes on core craft','duration','daily','min',90),
  ('vocation_shipped','vocation','vocation_career_output','Deliverable Shipped','Shipped a concrete deliverable','boolean','daily',null,1),
  ('lore_novel_experience','lore','lore_adventure_extreme_experiences','Novel Experience','Did something meaningfully new','boolean','daily',null,1),
  ('lore_creation_minutes','lore','lore_creative_works_projects','Creation Minutes','Time spent making rather than consuming','duration','daily','min',30)
on conflict (id) do update set
  label = excluded.label, description = excluded.description, metric_type = excluded.metric_type,
  frequency = excluded.frequency, unit = excluded.unit, target = excluded.target, active = true;

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_name text not null,
  properties jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

alter table public.product_events enable row level security;
create policy "Users can insert own product events"
  on public.product_events for insert with check (auth.uid() = user_id);
create policy "Users can read own product events"
  on public.product_events for select using (auth.uid() = user_id);
create index if not exists product_events_user_time_idx on public.product_events(user_id, occurred_at desc);
create index if not exists product_events_name_time_idx on public.product_events(event_name, occurred_at desc);
