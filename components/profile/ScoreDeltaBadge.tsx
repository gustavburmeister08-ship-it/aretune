import { Text, View } from 'react-native';

/**
 * Compact "change since last time" pill for the total Aretune score.
 * Green when up, red when down, muted when flat.
 */
export function ScoreDeltaBadge({ delta, sinceDate }: { delta: number; sinceDate?: string }) {
  const up = delta > 0;
  const flat = delta === 0;
  const color = flat ? '#8B8B97' : up ? '#43D9AD' : '#FF6B6B';
  const arrow = flat ? '›' : up ? '▲' : '▼';
  const sign = up ? '+' : '';

  const since = sinceDate
    ? new Date(sinceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <View className="flex-row items-center gap-1.5">
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>
        {arrow} {sign}{delta}
      </Text>
      {since && <Text className="text-white/30 text-[11px]">since {since}</Text>}
    </View>
  );
}
