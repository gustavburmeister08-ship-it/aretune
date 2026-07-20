import { create } from 'zustand';
import { generateDirective } from '../lib/ai';
import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';
import type { CheckIn, Directive, DirectiveFeedback, DirectiveGenerationInput, UserProfile } from '../types';

interface DirectiveState {
  todayDirective: Directive | null;
  loading: boolean;
  error: string | null;
  loadToday: (userId: string) => Promise<void>;
  generateForCheckIn: (profile: UserProfile, checkIns: CheckIn[]) => Promise<Directive>;
  complete: (directiveId: string) => Promise<void>;
  skip: (directiveId: string) => Promise<void>;
  setFeedback: (directiveId: string, feedback: DirectiveFeedback) => Promise<void>;
}

const mapDirective = (row: any): Directive => ({
  id: row.id,
  userId: row.user_id,
  pillar: row.pillar,
  title: row.title,
  body: row.body,
  why: row.why,
  action: row.action,
  model: row.model,
  generatedAt: row.generated_at,
  completedAt: row.completed_at ?? undefined,
  skippedAt: row.skipped_at ?? undefined,
  feedback: row.feedback ?? undefined,
});

const startOfLocalDayIso = (): string => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
};

export const useDirectiveStore = create<DirectiveState>((set, get) => ({
  todayDirective: null,
  loading: false,
  error: null,

  loadToday: async (userId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('directives')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', startOfLocalDayIso())
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    set({
      todayDirective: data ? mapDirective(data) : null,
      loading: false,
      error: error?.message ?? null,
    });
  },

  generateForCheckIn: async (profile, checkIns) => {
    if (!profile.aiProcessingConsent) {
      throw new Error('AI processing consent is required to generate a directive.');
    }
    if (get().todayDirective) return get().todayDirective!;
    set({ loading: true, error: null });

    const recentMetrics: Record<string, number[]> = {};
    checkIns.slice(0, 7).forEach((checkIn) => {
      checkIn.entries.forEach((entry) => {
        (recentMetrics[entry.metricId] ??= []).push(entry.value);
      });
    });
    const input: DirectiveGenerationInput = {
      userId: profile.id,
      phase: profile.phase,
      activePillars: profile.activePillars,
      pillarScores: profile.pillarScores,
      recentMoods: checkIns.slice(0, 7).map((checkIn) => checkIn.mood),
      recentEnergy: checkIns.slice(0, 7).map((checkIn) => checkIn.energyLevel),
      recentMetrics,
    };

    try {
      const generated = await generateDirective(input);
      const { data, error } = await supabase
        .from('directives')
        .insert({
          user_id: profile.id,
          pillar: generated.pillar,
          title: generated.title,
          body: generated.body,
          why: generated.why,
          action: generated.action,
          model: generated.model,
          prompt_version: 'directive-v2',
        })
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Could not save directive');
      const directive = mapDirective(data);
      set({ todayDirective: directive, loading: false });
      void trackEvent(profile.id, 'directive_generated', { pillar: directive.pillar, model: directive.model });
      return directive;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate directive';
      set({ loading: false, error: message });
      throw error;
    }
  },

  complete: async (directiveId) => {
    const completedAt = new Date().toISOString();
    const { error } = await supabase.from('directives').update({ completed_at: completedAt, skipped_at: null }).eq('id', directiveId);
    if (error) throw error;
    set((state) => ({ todayDirective: state.todayDirective ? { ...state.todayDirective, completedAt, skippedAt: undefined } : null }));
    const directive = get().todayDirective;
    if (directive) void trackEvent(directive.userId, 'directive_completed', { pillar: directive.pillar });
  },

  skip: async (directiveId) => {
    const skippedAt = new Date().toISOString();
    const { error } = await supabase.from('directives').update({ skipped_at: skippedAt, completed_at: null }).eq('id', directiveId);
    if (error) throw error;
    set((state) => ({ todayDirective: state.todayDirective ? { ...state.todayDirective, skippedAt, completedAt: undefined } : null }));
    const directive = get().todayDirective;
    if (directive) void trackEvent(directive.userId, 'directive_skipped', { pillar: directive.pillar });
  },

  setFeedback: async (directiveId, feedback) => {
    const { error } = await supabase.from('directives').update({ feedback }).eq('id', directiveId);
    if (error) throw error;
    set((state) => ({ todayDirective: state.todayDirective ? { ...state.todayDirective, feedback } : null }));
  },
}));
