import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { PILLARS } from '../../lib/pillars';
import type { PillarId } from '../../types';

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 104;
const LEVELS = [25, 50, 75, 100];

const pointAt = (index: number, value = 100) => {
  const angle = (-90 + index * 60) * Math.PI / 180;
  const radius = RADIUS * Math.max(0, Math.min(100, value)) / 100;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
};

const pointsString = (values: number[]) => values
  .map((value, index) => {
    const point = pointAt(index, value);
    return `${point.x},${point.y}`;
  })
  .join(' ');

const safeScore = (scores: Partial<Record<PillarId, number>>, pillar: PillarId) => {
  const value = scores[pillar];
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : undefined;
};

export function SextetChart({ scores }: { scores: Partial<Record<PillarId, number>> }) {
  const values = PILLARS.map((pillar) => safeScore(scores, pillar.id));
  const rated = values.filter((value): value is number => value !== undefined);
  const average = rated.length ? Math.round(rated.reduce((sum, value) => sum + value, 0) / rated.length) : undefined;
  const accessibilitySummary = PILLARS
    .map((pillar, index) => `${pillar.label}: ${values[index] ?? 'not rated'}`)
    .join(', ');

  return (
    <View
      className="bg-surface-raised border border-surface-border rounded-3xl p-5"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Sextet profile. ${accessibilitySummary}`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 pr-4">
          <Text className="text-gold text-xs tracking-[3px] uppercase">Sextet</Text>
          <Text className="text-white text-xl font-bold mt-1">Six-pillar profile</Text>
          <Text className="text-white/35 text-xs mt-1">Current aggregate score · 0–100</Text>
        </View>
        <View className="bg-surface rounded-2xl px-4 py-3 items-center min-w-20">
          <Text className="text-white text-2xl font-bold">{average ?? '—'}</Text>
          <Text className="text-white/30 text-[10px] uppercase tracking-wider">Average</Text>
        </View>
      </View>

      <View className="items-center">
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {LEVELS.map((level) => (
            <Polygon
              key={level}
              points={pointsString(PILLARS.map(() => level))}
              fill={level === 100 ? '#0D0D0D' : 'none'}
              stroke={level === 100 ? '#3A3A3A' : '#282828'}
              strokeWidth={level === 100 ? 1.5 : 1}
            />
          ))}
          {PILLARS.map((pillar, index) => {
            const end = pointAt(index);
            return <Line key={pillar.id} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} stroke="#303030" strokeWidth={1} />;
          })}
          <Polygon
            points={pointsString(values.map((value) => value ?? 0))}
            fill="#C9A84C"
            fillOpacity={0.24}
            stroke="#C9A84C"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {PILLARS.map((pillar, index) => {
            const value = values[index];
            if (value === undefined) return null;
            const point = pointAt(index, value);
            return <Circle key={pillar.id} cx={point.x} cy={point.y} r={4} fill={pillar.color} stroke="#111" strokeWidth={2} />;
          })}
          {PILLARS.map((pillar, index) => {
            const label = pointAt(index, 119);
            return (
              <SvgText
                key={pillar.id}
                x={label.x}
                y={label.y + 4}
                fill={pillar.color}
                fontSize={10}
                fontWeight="700"
                textAnchor="middle"
              >
                {pillar.label.toUpperCase()}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {PILLARS.map((pillar, index) => {
          const value = values[index];
          return (
            <View key={pillar.id} className="w-[47%] bg-surface rounded-2xl px-3 py-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white/65 text-xs font-semibold">{pillar.label}</Text>
                <Text style={{ color: value === undefined ? '#555' : pillar.color, fontWeight: '700', fontSize: 13 }}>
                  {value ?? '—'}
                </Text>
              </View>
              <View className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                <View className="h-1.5 rounded-full" style={{ width: `${value ?? 0}%`, backgroundColor: pillar.color }} />
              </View>
              {value === undefined && <Text className="text-white/20 text-[9px] mt-1">Not rated</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}
