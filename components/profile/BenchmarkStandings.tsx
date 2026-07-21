import { Text, View } from 'react-native';
import type { BenchmarkStanding } from '../../lib/benchmark-summary';

function formatValue(standing: BenchmarkStanding): string {
  const { value, unit } = standing;
  const number = value >= 1000 ? Math.round(value).toLocaleString('en-US') : Math.round(value * 10) / 10;
  return unit ? `${number} ${unit}` : `${number}`;
}

function sourceTag(source: string): string {
  const match = source.match(/CDC|Destatis|WHO|OECD|NSCA|Whoop|Oura/i);
  return match ? match[0] : source.split(/[\s(]/)[0];
}

/**
 * "Where you stand" — the user's population percentile on benchmarked metrics.
 * Renders nothing until at least one benchmarked metric has been logged.
 */
export function BenchmarkStandings({ standings }: { standings: BenchmarkStanding[] }) {
  if (!standings.length) return null;

  return (
    <View className="bg-surface-raised border border-surface-border rounded-3xl p-5">
      <Text className="text-gold text-xs tracking-[3px] uppercase mb-1">Where you stand</Text>
      <Text className="text-white/35 text-xs mb-4">Population percentile · cited sources</Text>
      <View className="gap-4">
        {standings.map((standing) => (
          <View key={standing.metricId} className="flex-row items-center">
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: standing.pillarColor }} />
            <View className="flex-1 ml-3">
              <Text className="text-white/80 text-sm font-medium">{standing.metricLabel}</Text>
              <Text className="text-white/30 text-[11px] mt-0.5">{formatValue(standing)}</Text>
            </View>
            <View className="items-end">
              <Text style={{ color: '#E8C96A', fontWeight: '700', fontSize: 14 }}>{standing.result.label}</Text>
              <Text className="text-white/25 text-[10px] mt-0.5">{sourceTag(standing.result.source)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
