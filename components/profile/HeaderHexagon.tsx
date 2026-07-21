import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { scoreLevel, totalAretuneScore } from '../../lib/aretune-score';
import type { PillarId } from '../../types';
import { MiniHexagon } from './MiniHexagon';

/**
 * Persistent header signature: the mini sextet plus the compact Aretune score.
 * A tap opens the full profile / large hexagon — the hero is never far away.
 */
export function HeaderHexagon({
  scores,
  onPress,
}: {
  scores: Partial<Record<PillarId, number>>;
  onPress?: () => void;
}) {
  const router = useRouter();
  const total = totalAretuneScore(scores);
  const level = scoreLevel(total);

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.push('/(app)/profile'))}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Aretune score ${total} of 600, level ${level.name}. Open profile.`}
      className="flex-row items-center gap-2 bg-surface-raised border border-surface-border rounded-full pl-2 pr-3 py-1.5"
    >
      <MiniHexagon scores={scores} size={26} showGrid />
      <View>
        <Text className="text-gold-light font-bold text-sm leading-4">{total}</Text>
        <Text className="text-white/30 text-[8px] tracking-[1.5px] uppercase leading-3">{level.name}</Text>
      </View>
    </TouchableOpacity>
  );
}
