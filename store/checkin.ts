import { create } from 'zustand';
import type { CheckIn, MetricEntry } from '../types';
import { supabase } from '../lib/supabase';

interface CheckInState {
  // Today's check-in state (in progress)
  currentEntries: Partial<Record<string, number>>;
  currentMood: number;
  currentEnergy: number;
  currentNote: string;
  step: number;

  // Historical
  recentCheckIns: CheckIn[];
  todaysCheckIn: CheckIn | null;
  loading: boolean;

  // Actions
  setMetricValue: (metricId: string, value: number) => void;
  setMood: (value: number) => void;
  setEnergy: (value: number) => void;
  setNote: (note: string) => void;
  setStep: (step: number) => void;
  reset: () => void;

  submitCheckIn: (userId: string) => Promise<CheckIn>;
  loadRecentCheckIns: (userId: string) => Promise<void>;
  loadTodaysCheckIn: (userId: string) => Promise<void>;
}

const defaultState = {
  currentEntries: {},
  currentMood: 5,
  currentEnergy: 5,
  currentNote: '',
  step: 0,
};

export const useCheckInStore = create<CheckInState>((set, get) => ({
  ...defaultState,
  recentCheckIns: [],
  todaysCheckIn: null,
  loading: false,

  setMetricValue: (metricId, value) =>
    set((s) => ({ currentEntries: { ...s.currentEntries, [metricId]: value } })),

  setMood: (value) => set({ currentMood: value }),
  setEnergy: (value) => set({ currentEnergy: value }),
  setNote: (note) => set({ currentNote: note }),
  setStep: (step) => set({ step }),
  reset: () => set(defaultState),

  submitCheckIn: async (userId: string) => {
    const { currentEntries, currentMood, currentEnergy, currentNote } = get();
    set({ loading: true });

    const now = new Date().toISOString();

    const { data: checkInId, error: checkInError } = await supabase.rpc('submit_check_in', {
      p_user_id: userId,
      p_mood: currentMood,
      p_energy: currentEnergy,
      p_note: currentNote || null,
      p_completed_at: now,
      p_entries: currentEntries,
    });

    if (checkInError || !checkInId) {
      set({ loading: false });
      throw new Error(checkInError?.message ?? 'Failed to save check-in');
    }

    const completed: CheckIn = {
      id: checkInId,
      userId,
      mood: currentMood,
      energyLevel: currentEnergy,
      note: currentNote || undefined,
      completedAt: now,
      entries: Object.entries(currentEntries).map(([metricId, value]) => ({
        id: `${checkInId}:${metricId}`,
        metricId,
        userId,
        value: value as number,
        loggedAt: now,
      })),
    };

    set({ loading: false, todaysCheckIn: completed });
    get().reset();
    await get().loadRecentCheckIns(userId);
    return completed;
  },

  loadRecentCheckIns: async (userId: string) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('check_ins')
      .select('*, metric_entries(*)')
      .eq('user_id', userId)
      .gte('completed_at', sevenDaysAgo.toISOString())
      .order('completed_at', { ascending: false });

    if (data) {
      const checkIns: CheckIn[] = data.map((ci: any) => ({
        id: ci.id,
        userId: ci.user_id,
        mood: ci.mood,
        energyLevel: ci.energy_level,
        note: ci.note,
        completedAt: ci.completed_at,
        entries: (ci.metric_entries ?? []).map((me: any) => ({
          id: me.id,
          metricId: me.metric_id,
          userId: me.user_id,
          value: me.value,
          loggedAt: me.logged_at,
          note: me.note,
        })),
      }));
      set({ recentCheckIns: checkIns });
    }
  },

  loadTodaysCheckIn: async (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('check_ins')
      .select('*, metric_entries(*)')
      .eq('user_id', userId)
      .gte('completed_at', today.toISOString())
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const row = data as any;
      const checkIn: CheckIn = {
        id: row.id,
        userId: row.user_id,
        mood: row.mood,
        energyLevel: row.energy_level,
        note: row.note ?? undefined,
        completedAt: row.completed_at,
        entries: (row.metric_entries ?? []).map((me: any) => ({
          id: me.id,
          metricId: me.metric_id,
          userId: me.user_id,
          value: me.value,
          loggedAt: me.logged_at,
          note: me.note,
        })),
      };
      set({ todaysCheckIn: checkIn });
    } else {
      set({ todaysCheckIn: null });
    }
  },
}));
