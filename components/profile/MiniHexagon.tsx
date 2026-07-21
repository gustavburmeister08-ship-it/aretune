import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { PILLARS } from '../../lib/pillars';
import type { PillarId } from '../../types';

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function vertex(index: number, center: number, radius: number, value: number) {
  const angle = (-90 + index * 60) * Math.PI / 180;
  const r = radius * value / 100;
  return { x: center + Math.cos(angle) * r, y: center + Math.sin(angle) * r };
}

function pointsString(scores: Partial<Record<PillarId, number>>, center: number, radius: number) {
  return PILLARS.map((pillar, index) => {
    const raw = scores[pillar.id];
    const value = typeof raw === 'number' && Number.isFinite(raw) ? clamp(raw) : 0;
    const point = vertex(index, center, radius, value);
    return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }).join(' ');
}

/**
 * The six-pillar sextet silhouette at any size — the recurring identity mark.
 * Compact by default (no grid); pass `showGrid`, `dots`, or `labels` for the
 * fuller instrument look.
 */
export function MiniHexagon({
  scores,
  size = 26,
  color = '#C9A84C',
  strokeWidth = 1.6,
  showGrid = false,
  dots = false,
  labels = false,
}: {
  scores: Partial<Record<PillarId, number>>;
  size?: number;
  color?: string;
  strokeWidth?: number;
  showGrid?: boolean;
  dots?: boolean;
  labels?: boolean;
}) {
  const center = size / 2;
  const radius = center - (labels ? 22 : strokeWidth);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {showGrid && (
        <>
          <Polygon
            points={pointsString(Object.fromEntries(PILLARS.map((p) => [p.id, 100])), center, radius)}
            fill="none"
            stroke="#ffffff1f"
            strokeWidth={0.8}
          />
          {PILLARS.map((pillar, index) => {
            const end = vertex(index, center, radius, 100);
            return <Line key={pillar.id} x1={center} y1={center} x2={end.x} y2={end.y} stroke="#ffffff12" strokeWidth={0.8} />;
          })}
        </>
      )}
      <Polygon
        points={pointsString(scores, center, radius)}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {dots && PILLARS.map((pillar, index) => {
        const raw = scores[pillar.id];
        const value = typeof raw === 'number' && Number.isFinite(raw) ? clamp(raw) : 0;
        const point = vertex(index, center, radius, value);
        return <Circle key={pillar.id} cx={point.x} cy={point.y} r={size > 120 ? 3.5 : 2.5} fill={pillar.color} stroke="#111" strokeWidth={1.5} />;
      })}
      {labels && PILLARS.map((pillar, index) => {
        const point = vertex(index, center, radius + 14, 100);
        return (
          <SvgText
            key={pillar.id}
            x={point.x}
            y={point.y + 3}
            fill={pillar.color}
            fontSize={9}
            fontWeight="700"
            textAnchor="middle"
          >
            {pillar.label.toUpperCase()}
          </SvgText>
        );
      })}
    </Svg>
  );
}
