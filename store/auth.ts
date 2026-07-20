import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  signOut: () => Promise<void>;
  loadProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      profile: session ? get().profile : null,
      initialized: !session,
    });
    if (session?.user) {
      get().loadProfile(session.user.id);
    }
  },

  setProfile: (profile) => set({ profile }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  loadProfile: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data && !error) {
      const profile: UserProfile = {
        id: data.id,
        email: data.email,
        username: data.username ?? undefined,
        displayName: data.display_name ?? undefined,
        phase: data.phase,
        level: data.level,
        activePillars: data.active_pillars as any,
        onboardingComplete: data.onboarding_complete,
        subscriptionTier: data.subscription_tier,
        createdAt: data.created_at,
        pillarScores: (data.pillar_scores ?? {}) as UserProfile['pillarScores'],
        legalConsentComplete: data.legal_consent_complete,
        aiProcessingConsent: data.ai_processing_consent,
        termsVersion: data.terms_version ?? undefined,
        privacyVersion: data.privacy_version ?? undefined,
      };
      set({ profile, initialized: true });
    } else {
      set({ initialized: true });
    }
    set({ loading: false });
  },
}));
