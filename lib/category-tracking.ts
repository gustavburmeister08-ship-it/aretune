import { CATEGORY_MAP } from './category-catalog';
import { calculateCategoryScores } from './category-scoring';
import { persistScoreSnapshots } from './score-persistence';
import { supabase } from './supabase';
import type { CategoryTrackingEntry, PillarId } from '../types';
import type { Json } from '../types/database';

const mapEntry = (row: {
  id: string;
  user_id: string;
  category_id: string;
  values: Json;
  note: string | null;
  logged_at: string;
  created_at: string;
}): CategoryTrackingEntry => ({
  id: row.id,
  userId: row.user_id,
  categoryId: row.category_id,
  values: (row.values ?? {}) as Record<string, number>,
  note: row.note ?? undefined,
  loggedAt: row.logged_at,
  createdAt: row.created_at,
});

export async function loadCategoryEntries(userId: string, categoryId?: string) {
  let query = supabase
    .from('category_entries')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(2000);
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapEntry);
}

export async function saveCategoryEntry(
  userId: string,
  categoryId: string,
  values: Record<string, number>,
  note?: string
) {
  const category = CATEGORY_MAP[categoryId];
  if (!category) throw new Error('Unknown tracking category');
  const allowedMetrics = new Set(category.metrics.map((metric) => metric.id));
  const cleanValues = Object.fromEntries(
    Object.entries(values).filter(([metricId, value]) => allowedMetrics.has(metricId) && Number.isFinite(value))
  );
  if (!Object.keys(cleanValues).length && !note?.trim()) {
    throw new Error('Enter at least one value or a note');
  }

  const { data, error } = await supabase
    .from('category_entries')
    .insert({
      user_id: userId,
      category_id: categoryId,
      values: cleanValues,
      note: note?.trim() || null,
      logged_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapEntry(data);
}

export async function persistCategoryScores(
  userId: string,
  activePillars: PillarId[],
  entries?: CategoryTrackingEntry[]
) {
  const allEntries = entries ?? await loadCategoryEntries(userId);
  const calculatedAt = new Date().toISOString();
  const snapshots = calculateCategoryScores(activePillars, allEntries, calculatedAt);
  return persistScoreSnapshots(userId, snapshots, { category_entry_ids: allEntries.map((entry) => entry.id) });
}
