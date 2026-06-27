/**
 * Glow Effect Component
 * Ambient glowing orbs that move slowly across the screen
 */

import { AbsoluteFill, interpolate, random, useCurrentFrame } from 'remotion';

interface Orb {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  direction: number;
}

const ORB_COUNT = 5;

// Generate deterministic orbs
const generateOrbs = (): Orb[] => {
  const colors = [
    'rgba(169, 214, 255, 0.15)', // Primary blue
    'rgba(120, 213, 232, 0.12)', // Cyan
    'rgba(165, 180, 252, 0.1)',  // Indigo
  ];

  const orbs: Orb[] = [];
  for (let i = 0; i < ORB_COUNT; i++) {
    orbs.push({
      x: random(`orb-x-${i}`) * 100,
      y: random(`orb-y-${i}`) * 100,
      size: random(`orb-size-${i}`) * 300 + 200,
      speed: random(`orb-speed-${i}`) * 0.1 + 0.05,
      color: colors[Math.floor(random(`orb-color-${i}`) * colors.length)],
      direction: random(`orb-dir-${i}`) * Math.PI * 2,
    });
  }
  return orbs;
};

const orbs = generateOrbs();

export const GlowEffect: React.FC = () => {
  const frame = useCurrentFrame();

  // Overall fade in
  const fadeIn = interpolate(
    frame,
    [0, 60],
    [0, 1],
    {
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn,
      }}
    >
      {orbs.map((orb, index) => {
        // Calculate position with circular movement
        const x = orb.x + Math.cos(frame * orb.speed + orb.direction) * 10;
        const y = orb.y + Math.sin(frame * orb.speed + orb.direction) * 10;

        // Pulsing effect
        const pulse = Math.sin(frame * 0.02 + index) * 0.3 + 0.7;
        const size = orb.size * pulse;

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle at center, ${orb.color}, transparent)`,
              filter: `blur(${size * 0.4}px)`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
