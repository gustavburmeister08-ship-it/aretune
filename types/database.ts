export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type EmptyRelationships = [];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; username: string | null; display_name: string | null; phase: 'dissonance' | 'uncertainty' | 'discovery'; level: '1.0' | '2.0' | '3.0'; active_pillars: string[]; onboarding_complete: boolean; subscription_tier: 'free' | 'pro'; pillar_scores: Json; legal_consent_complete: boolean; ai_processing_consent: boolean; terms_version: string | null; privacy_version: string | null; legal_accepted_at: string | null; created_at: string; updated_at: string };
        Insert: { id: string; email: string; username?: string | null; display_name?: string | null; phase?: 'dissonance' | 'uncertainty' | 'discovery'; level?: '1.0' | '2.0' | '3.0'; active_pillars?: string[]; onboarding_complete?: boolean; subscription_tier?: 'free' | 'pro'; pillar_scores?: Json; legal_consent_complete?: boolean; ai_processing_consent?: boolean; terms_version?: string | null; privacy_version?: string | null; legal_accepted_at?: string | null; created_at?: string; updated_at?: string };
        Update: { email?: string; username?: string | null; display_name?: string | null; phase?: 'dissonance' | 'uncertainty' | 'discovery'; level?: '1.0' | '2.0' | '3.0'; active_pillars?: string[]; onboarding_complete?: boolean; subscription_tier?: 'free' | 'pro'; pillar_scores?: Json; legal_consent_complete?: boolean; ai_processing_consent?: boolean; terms_version?: string | null; privacy_version?: string | null; legal_accepted_at?: string | null; updated_at?: string };
        Relationships: EmptyRelationships;
      };
      check_ins: {
        Row: { id: string; user_id: string; mood: number; energy_level: number; note: string | null; completed_at: string; created_at: string };
        Insert: { id?: string; user_id: string; mood: number; energy_level: number; note?: string | null; completed_at: string; created_at?: string };
        Update: { mood?: number; energy_level?: number; note?: string | null; completed_at?: string };
        Relationships: EmptyRelationships;
      };
      metric_entries: {
        Row: { id: string; check_in_id: string | null; user_id: string; metric_id: string; value: number; note: string | null; logged_at: string };
        Insert: { id?: string; check_in_id?: string | null; user_id: string; metric_id: string; value: number; note?: string | null; logged_at: string };
        Update: { value?: number; note?: string | null; logged_at?: string };
        Relationships: EmptyRelationships;
      };
      category_entries: {
        Row: { id: string; user_id: string; category_id: string; values: Json; note: string | null; logged_at: string; created_at: string };
        Insert: { id?: string; user_id: string; category_id: string; values: Json; note?: string | null; logged_at?: string; created_at?: string };
        Update: { values?: Json; note?: string | null; logged_at?: string };
        Relationships: EmptyRelationships;
      };
      integration_connections: {
        Row: { id: string; user_id: string; provider_id: string; connection_mode: 'oauth' | 'device' | 'file' | 'webhook' | 'fhir' | 'partner'; status: 'pending' | 'active' | 'needs_attention' | 'disconnected'; display_name: string; scopes: string[]; settings: Json; last_synced_at: string | null; last_error: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; provider_id: string; connection_mode: 'oauth' | 'device' | 'file' | 'webhook' | 'fhir' | 'partner'; status?: 'pending' | 'active' | 'needs_attention' | 'disconnected'; display_name: string; scopes?: string[]; settings?: Json; last_synced_at?: string | null; last_error?: string | null; created_at?: string; updated_at?: string };
        Update: { status?: 'pending' | 'active' | 'needs_attention' | 'disconnected'; display_name?: string; scopes?: string[]; settings?: Json; last_synced_at?: string | null; last_error?: string | null; updated_at?: string };
        Relationships: EmptyRelationships;
      };
      integration_credentials: {
        Row: { connection_id: string; encrypted_access_token: string; encrypted_refresh_token: string | null; expires_at: string | null; provider_user_id: string | null; updated_at: string };
        Insert: { connection_id: string; encrypted_access_token: string; encrypted_refresh_token?: string | null; expires_at?: string | null; provider_user_id?: string | null; updated_at?: string };
        Update: { encrypted_access_token?: string; encrypted_refresh_token?: string | null; expires_at?: string | null; provider_user_id?: string | null; updated_at?: string };
        Relationships: EmptyRelationships;
      };
      integration_oauth_states: {
        Row: { state_hash: string; user_id: string; provider_id: string; redirect_uri: string; expires_at: string; created_at: string };
        Insert: { state_hash: string; user_id: string; provider_id: string; redirect_uri: string; expires_at: string; created_at?: string };
        Update: never;
        Relationships: EmptyRelationships;
      };
      integration_sync_runs: {
        Row: { id: string; connection_id: string; user_id: string; status: 'running' | 'completed' | 'failed'; source_name: string | null; records_received: number; records_imported: number; error: string | null; started_at: string; completed_at: string | null };
        Insert: { id?: string; connection_id: string; user_id: string; status: 'running' | 'completed' | 'failed'; source_name?: string | null; records_received?: number; records_imported?: number; error?: string | null; started_at?: string; completed_at?: string | null };
        Update: { status?: 'running' | 'completed' | 'failed'; records_received?: number; records_imported?: number; error?: string | null; completed_at?: string | null };
        Relationships: EmptyRelationships;
      };
      integration_events: {
        Row: { id: string; connection_id: string; user_id: string; provider_event_id: string; event_type: string; value: number; unit: string | null; occurred_at: string; payload: Json; imported_at: string };
        Insert: { id?: string; connection_id: string; user_id: string; provider_event_id: string; event_type: string; value: number; unit?: string | null; occurred_at: string; payload?: Json; imported_at?: string };
        Update: never;
        Relationships: EmptyRelationships;
      };
      social_profiles: {
        Row: { user_id: string; username: string | null; display_name: string; bio: string; avatar_path: string | null; is_discoverable: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; username?: string | null; display_name?: string; bio?: string; avatar_path?: string | null; is_discoverable?: boolean; created_at?: string; updated_at?: string };
        Update: { username?: string | null; display_name?: string; bio?: string; avatar_path?: string | null; is_discoverable?: boolean; updated_at?: string };
        Relationships: EmptyRelationships;
      };
      social_links: {
        Row: { id: string; user_id: string; platform: 'x' | 'instagram' | 'facebook' | 'linkedin' | 'substack' | 'youtube' | 'tiktok' | 'github' | 'website'; url: string; handle: string | null; position: number; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; platform: 'x' | 'instagram' | 'facebook' | 'linkedin' | 'substack' | 'youtube' | 'tiktok' | 'github' | 'website'; url: string; handle?: string | null; position?: number; created_at?: string; updated_at?: string };
        Update: { url?: string; handle?: string | null; position?: number; updated_at?: string };
        Relationships: EmptyRelationships;
      };
      social_posts: {
        Row: { id: string; user_id: string; body: string; image_path: string | null; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; user_id: string; body?: string; image_path?: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { body?: string; image_path?: string | null; updated_at?: string; deleted_at?: string | null };
        Relationships: EmptyRelationships;
      };
      social_post_likes: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string; created_at?: string };
        Update: never;
        Relationships: EmptyRelationships;
      };
      social_comments: {
        Row: { id: string; post_id: string; user_id: string; parent_id: string | null; body: string; created_at: string; updated_at: string };
        Insert: { id?: string; post_id: string; user_id: string; parent_id?: string | null; body: string; created_at?: string; updated_at?: string };
        Update: { body?: string; updated_at?: string };
        Relationships: EmptyRelationships;
      };
      social_follows: {
        Row: { follower_id: string; following_id: string; created_at: string };
        Insert: { follower_id: string; following_id: string; created_at?: string };
        Update: never;
        Relationships: EmptyRelationships;
      };
      social_reports: {
        Row: { id: string; reporter_id: string; post_id: string | null; comment_id: string | null; reason: 'spam' | 'harassment' | 'hate' | 'nudity' | 'violence' | 'other'; details: string | null; status: 'open' | 'reviewing' | 'resolved' | 'dismissed'; created_at: string };
        Insert: { id?: string; reporter_id: string; post_id?: string | null; comment_id?: string | null; reason: 'spam' | 'harassment' | 'hate' | 'nudity' | 'violence' | 'other'; details?: string | null; status?: 'open' | 'reviewing' | 'resolved' | 'dismissed'; created_at?: string };
        Update: never;
        Relationships: EmptyRelationships;
      };
      social_conversations: {
        Row: { id: string; direct_key: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; direct_key?: string | null; created_at?: string; updated_at?: string };
        Update: { updated_at?: string };
        Relationships: EmptyRelationships;
      };
      social_conversation_members: {
        Row: { conversation_id: string; user_id: string; last_read_at: string; joined_at: string };
        Insert: { conversation_id: string; user_id: string; last_read_at?: string; joined_at?: string };
        Update: { last_read_at?: string };
        Relationships: EmptyRelationships;
      };
      social_messages: {
        Row: { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; edited_at: string | null; deleted_at: string | null };
        Insert: { id?: string; conversation_id: string; sender_id: string; body: string; created_at?: string; edited_at?: string | null; deleted_at?: string | null };
        Update: { body?: string; edited_at?: string | null; deleted_at?: string | null };
        Relationships: EmptyRelationships;
      };
      directives: {
        Row: { id: string; user_id: string; pillar: string; title: string; body: string; why: string; action: string; model: string; prompt_version: string; feedback: string | null; generated_at: string; completed_at: string | null; skipped_at: string | null };
        Insert: { id?: string; user_id: string; pillar: string; title: string; body: string; why: string; action: string; model: string; prompt_version?: string; feedback?: string | null; generated_at?: string; completed_at?: string | null; skipped_at?: string | null };
        Update: { completed_at?: string | null; skipped_at?: string | null; feedback?: string | null };
        Relationships: EmptyRelationships;
      };
      weekly_audits: {
        Row: { id: string; user_id: string; week_start: string; pillar_scores: Json; highlights: string[]; gaps: string[]; directive_completion: number; ai_summary: string | null; formula_version: string; completed_at: string };
        Insert: { id?: string; user_id: string; week_start: string; pillar_scores?: Json; highlights?: string[]; gaps?: string[]; directive_completion?: number; ai_summary?: string | null; formula_version?: string; completed_at?: string };
        Update: { pillar_scores?: Json; highlights?: string[]; gaps?: string[]; directive_completion?: number; ai_summary?: string | null; formula_version?: string; completed_at?: string };
        Relationships: EmptyRelationships;
      };
      onboarding_answers: {
        Row: { id: string; user_id: string; question_id: string; answer: string; created_at: string };
        Insert: { id?: string; user_id: string; question_id: string; answer: string; created_at?: string };
        Update: { answer?: string };
        Relationships: EmptyRelationships;
      };
      categories: {
        Row: { id: string; pillar: string; label: string; position: number; active: boolean; created_at: string };
        Insert: { id: string; pillar: string; label: string; position: number; active?: boolean; created_at?: string };
        Update: { label?: string; position?: number; active?: boolean };
        Relationships: EmptyRelationships;
      };
      metric_definitions: {
        Row: { id: string; pillar: string; category_id: string; label: string; description: string; metric_type: string; frequency: string; unit: string | null; target: number | null; active: boolean; created_at: string };
        Insert: { id: string; pillar: string; category_id: string; label: string; description?: string; metric_type: string; frequency: string; unit?: string | null; target?: number | null; active?: boolean; created_at?: string };
        Update: { label?: string; description?: string; metric_type?: string; frequency?: string; unit?: string | null; target?: number | null; active?: boolean };
        Relationships: EmptyRelationships;
      };
      score_snapshots: {
        Row: { id: string; user_id: string; snapshot_date: string; pillar: string; performance_score: number; lifestyle_score: number; pillar_score: number; consistency_score: number; progression_score: number; breadth_score: number; intensity_score: number; formula_version: string; inputs: Json; calculated_at: string };
        Insert: { id?: string; user_id: string; snapshot_date: string; pillar: string; performance_score?: number; lifestyle_score: number; pillar_score?: number; consistency_score: number; progression_score: number; breadth_score: number; intensity_score: number; formula_version: string; inputs?: Json; calculated_at?: string };
        Update: { performance_score?: number; lifestyle_score?: number; pillar_score?: number; consistency_score?: number; progression_score?: number; breadth_score?: number; intensity_score?: number; formula_version?: string; inputs?: Json; calculated_at?: string };
        Relationships: EmptyRelationships;
      };
      product_events: {
        Row: { id: string; user_id: string; event_name: string; properties: Json; occurred_at: string };
        Insert: { id?: string; user_id: string; event_name: string; properties?: Json; occurred_at?: string };
        Update: { event_name?: string; properties?: Json; occurred_at?: string };
        Relationships: EmptyRelationships;
      };
      user_consents: {
        Row: { id: string; user_id: string; consent_type: 'terms' | 'privacy' | 'ai_sensitive_data'; document_version: string; granted: boolean; occurred_at: string };
        Insert: { id?: string; user_id: string; consent_type: 'terms' | 'privacy' | 'ai_sensitive_data'; document_version: string; granted: boolean; occurred_at?: string };
        Update: never;
        Relationships: EmptyRelationships;
      };
      ai_usage_events: {
        Row: { id: string; user_id: string; route: 'directive' | 'audit' | 'chat'; provider: string; model: string; input_tokens: number; output_tokens: number; created_at: string };
        Insert: { id?: string; user_id: string; route: 'directive' | 'audit' | 'chat'; provider: string; model: string; input_tokens?: number; output_tokens?: number; created_at?: string };
        Update: never;
        Relationships: EmptyRelationships;
      };
      ai_conversations: {
        Row: { id: string; user_id: string; title: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title?: string | null; created_at?: string; updated_at?: string };
        Update: { title?: string | null; updated_at?: string };
        Relationships: EmptyRelationships;
      };
      ai_messages: {
        Row: { id: string; conversation_id: string; role: 'user' | 'assistant'; content: string; created_at: string };
        Insert: { id?: string; conversation_id: string; role: 'user' | 'assistant'; content: string; created_at?: string };
        Update: never;
        Relationships: EmptyRelationships;
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      submit_check_in: {
        Args: { p_user_id: string; p_mood: number; p_energy: number; p_note: string | null; p_completed_at: string; p_entries: Json };
        Returns: string;
      };
      save_social_profile: {
        Args: { p_bio: string; p_avatar_path: string | null; p_is_discoverable: boolean; p_links: Json };
        Returns: undefined;
      };
      get_or_create_direct_conversation: {
        Args: { p_other_user_id: string };
        Returns: string;
      };
      mark_social_conversation_read: {
        Args: { p_conversation_id: string };
        Returns: undefined;
      };
      is_social_conversation_member: {
        Args: { p_conversation_id: string };
        Returns: boolean;
      };
      get_public_social_profile: {
        Args: { p_user_id: string };
        Returns: Array<{
          user_id: string;
          username: string | null;
          display_name: string;
          bio: string;
          avatar_path: string | null;
          phase: 'dissonance' | 'uncertainty' | 'discovery';
          level: '1.0' | '2.0' | '3.0';
          active_pillars: string[];
          pillar_scores: Json;
          member_since: string;
        }>;
      };
      is_username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      set_username: {
        Args: { p_username: string };
        Returns: string;
      };
      ingest_integration_events: {
        Args: { p_provider_id: string; p_mode: 'oauth' | 'device' | 'file' | 'webhook' | 'fhir' | 'partner'; p_display_name: string; p_events: Json; p_source_name?: string | null };
        Returns: number;
      };
      disconnect_integration: {
        Args: { p_provider_id: string };
        Returns: undefined;
      };
      set_pillar_scores: {
        Args: { p_user_id: string; p_pillar_scores: Json };
        Returns: Json;
      };
      persist_score_snapshots: {
        Args: { p_user_id: string; p_snapshot_date: string; p_snapshots: Json };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
