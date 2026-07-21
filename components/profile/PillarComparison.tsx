import { Text, View } from 'react-native';
import { PILLARS } from '../../lib/pillars';
import { totalAretuneScore } from '../../lib/aretune-score';
import type { PillarId } from '../../types';

const round = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : undefined;

function DiffChip({ diff }: { diff: number | undefined }) {
  if (diff === undefined) {
    return <Text className="text-white/25 text-xs w-11 text-right">—</Text>;
  }
  const up = diff > 0;
  const flat = diff === 0;
  const color = flat ? '#8B8B97' : up ? '#43D9AD' : '#FF6B6B';
  return (
    <Text style={{ color, fontSize: 12, fontWeight: '700', width: 44, textAlign: 'right' }}>
      {up ? '+' : ''}{diff}
    </Text>
  );
}

/**
 * Head-to-head comparison of the two totals and each pillar. Colors match the
 * SextetChart overlay: the viewer ("you") in {youColor}, the other profile in gold.
 */
export function PillarComparison({
  you,
  them,
  youLabel = 'You',
  themLabel,
  youColor = '#6C8CFF',
}: {
  you: Partial<Record<PillarId, number>>;
  them: Partial<Record<PillarId, number>>;
  youLabel?: string;
  themLabel: string;
  youColor?: string;
}) {
  const youTotal = totalAretuneScore(you);
  const themTotal = totalAretuneScore(them);
  const totalDiff = youTotal - themTotal;

  return (
    <View className="bg-surface-raised border border-surface-border rounded-3xl p-5">
      <Text className="text-gold text-xs tracking-[3px] uppercase mb-4">Head to head</Text>

      {/* Totals */}
      <View className="flex-row items-end justify-between mb-1">
        <View>
          <Text className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{youLabel}</Text>
          <Text style={{ color: youColor, fontWeight: '800', fontSize: 26 }}>{youTotal}</Text>
        </View>
        <View className="items-center pb-1">
          <Text className="text-white/30 text-[10px] uppercase tracking-wider">Aretune Score</Text>
          <Text
            style={{
              color: totalDiff > 0 ? '#43D9AD' : totalDiff < 0 ? '#FF6B6B' : '#8B8B97',
              fontWeight: '700',
              fontSize: 13,
            }}
          >
            {totalDiff > 0 ? '+' : ''}{totalDiff}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{themLabel}</Text>
          <Text style={{ color: '#C9A84C', fontWeight: '800', fontSize: 26 }}>{themTotal}</Text>
        </View>
      </View>

      <View className="h-px bg-surface-border my-4" />

      {/* Per-pillar rows */}
      <View className="gap-3">
        {PILLARS.map((pillar) => {
          const youVal = round(you[pillar.id]);
          const themVal = round(them[pillar.id]);
          const diff = youVal !== undefined && themVal !== undefined ? youVal - themVal : undefined;
          return (
            <View key={pillar.id} className="flex-row items-center">
              <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: pillar.color }} />
              <Text className="text-white/70 text-sm font-medium ml-3 flex-1">{pillar.label}</Text>
              <Text style={{ color: youColor, fontWeight: '700', fontSize: 14, width: 34, textAlign: 'right' }}>
                {youVal ?? '—'}
              </Text>
              <Text className="text-white/25 text-sm mx-2">·</Text>
              <Text style={{ color: '#C9A84C', fontWeight: '700', fontSize: 14, width: 34, textAlign: 'right' }}>
                {themVal ?? '—'}
              </Text>
              <View className="ml-3">
                <DiffChip diff={diff} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
