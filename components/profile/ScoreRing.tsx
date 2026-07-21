import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MAX_ARETUNE_SCORE, scoreLevel, totalAretuneScore } from '../../lib/aretune-score';
import type { PillarId } from '../../types';

/**
 * The Aretune Score as a radial ring — the hero number of the app.
 * Renders the 0–600 total, its level title, and animates in on mount / change.
 */
export function ScoreRing({
  scores,
  size = 220,
  strokeWidth = 12,
  animate = true,
}: {
  scores: Partial<Record<PillarId, number>>;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
}) {
  const total = totalAretuneScore(scores);
  const level = scoreLevel(total);
  const fraction = total / MAX_ARETUNE_SCORE;

  const center = size / 2;
  const radius = center - strokeWidth / 2 - 2;
  const circumference = 2 * Math.PI * radius;

  const [progress, setProgress] = useState(animate ? 0 : 1);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!animate) {
      setProgress(1);
      return;
    }
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        setProgress(1);
        return;
      }
      const duration = 1100;
      let start: number | null = null;
      const tick = (now: number) => {
        if (start === null) start = now;
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setProgress(eased);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      setProgress(0);
      rafRef.current = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // Re-run the count-up whenever the target score changes.
  }, [total, animate]);

  const displayedScore = Math.round(total * progress);
  const dashoffset = circumference * (1 - fraction * progress);

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Aretune score ${total} of ${MAX_ARETUNE_SCORE}. Level ${level.name}.`}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="scoreRingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#E8C96A" />
            <Stop offset="1" stopColor="#A07830" />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={radius} stroke="#ffffff12" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#scoreRingGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          rotation={-90}
          originX={center}
          originY={center}
        />
      </Svg>

      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ color: '#E8C96A', fontWeight: '800', fontSize: size * 0.26, letterSpacing: -1 }}>
            {displayedScore}
          </Text>
          <Text style={{ color: '#55555F', fontWeight: '700', fontSize: size * 0.09 }}> /{MAX_ARETUNE_SCORE}</Text>
        </View>
        <Text
          style={{
            color: '#C9A84C',
            fontSize: Math.max(10, size * 0.052),
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginTop: 4,
            fontWeight: '600',
          }}
        >
          {level.name}
        </Text>
      </View>
    </View>
  );
}
