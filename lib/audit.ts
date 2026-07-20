import { generateWeeklySummary } from './ai';
import { persistLifestyleScores } from './score-service';
import { supabase } from './supabase';
import { trackEvent } from './analytics';
import type { CheckIn, UserProfile, WeeklyAudit } from '../types';

export function getWeekStart(): Date {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

const localDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function generateAndPersistWeeklyAudit(profile: UserProfile): Promise<WeeklyAudit> {
  if (!profile.aiProcessingConsent) {
    throw new Error('AI processing consent is required to generate the coaching summary.');
  }
  const weekStart = getWeekStart();
  const { data: checkInRows, error: checkInError } = await supabase
    .from('check_ins')
    .select('*, metric_entries(*)')
    .eq('user_id', profile.id)
    .gte('completed_at', weekStart.toISOString())
    .order('completed_at', { ascending: false });
  if (checkInError) throw checkInError;

  const checkIns: CheckIn[] = ((checkInRows ?? []) as any[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    mood: row.mood,
    energyLevel: row.energy_level,
    note: row.note ?? undefined,
    completedAt: row.completed_at,
    entries: (row.metric_entries ?? []).map((entry: any) => ({
      id: entry.id,
      metricId: entry.metric_id,
      userId: entry.user_id,
      value: Number(entry.value),
      note: entry.note ?? undefined,
      loggedAt: entry.logged_at,
    })),
  }));
  if (checkIns.length < 3) throw new Error('Complete at least 3 check-ins before generating an audit.');

  const pillarScores = await persistLifestyleScores(profile.id, profile.activePillars, checkIns);
  const { data: directiveRows, error: directiveError } = await supabase
    .from('directives')
    .select('completed_at, skipped_at')
    .eq('user_id', profile.id)
    .gte('generated_at', weekStart.toISOString());
  if (directiveError) throw directiveError;
  const directives = directiveRows ?? [];
  const directiveCompletion = directives.length
    ? (directives.filter((directive) => directive.completed_at).length / directives.length) * 100
    : 0;

  const weeklyMetrics: Record<string, number[]> = {};
  checkIns.forEach((checkIn) => checkIn.entries.forEach((entry) => {
    (weeklyMetrics[entry.metricId] ??= []).push(entry.value);
  }));
  const generated = await generateWeeklySummary({
    userId: profile.id,
    phase: profile.phase,
    pillarScores,
    weeklyMetrics,
    directiveCompletion,
  });

  const weekStartDate = localDate(weekStart);
  const { data, error } = await supabase
    .from('weekly_audits')
    .upsert({
      user_id: profile.id,
      week_start: weekStartDate,
      pillar_scores: pillarScores,
      highlights: generated.highlights,
      gaps: generated.gaps,
      directive_completion: directiveCompletion,
      ai_summary: generated.summary,
      formula_version: 'lifestyle-v1',
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not save weekly audit');

  const audit: WeeklyAudit = {
    id: data.id,
    userId: data.user_id,
    weekStart: data.week_start,
    pillarScores: data.pillar_scores as UserProfile['pillarScores'],
    highlights: data.highlights,
    gaps: data.gaps,
    directiveCompletion: Number(data.directive_completion),
    aiSummary: data.ai_summary ?? undefined,
    completedAt: data.completed_at,
  };
  void trackEvent(profile.id, 'weekly_audit_generated', { directive_completion: directiveCompletion });
  return audit;
}
