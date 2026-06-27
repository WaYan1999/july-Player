/**
 * Particle Field Component
 * Animated particle field with depth and movement (UE5 style)
 */

import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  depth: number;
}

const PARTICLE_COUNT = 150;

// Generate deterministic particles
const generateParticles = (): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: random(`x-${i}`) * 100,
      y: random(`y-${i}`) * 100,
      size: random(`size-${i}`) * 3 + 1,
      speed: random(`speed-${i}`) * 0.5 + 0.2,
      depth: random(`depth-${i}`) * 0.8 + 0.2,
    });
  }
  return particles;
};

const particles = generateParticles();

export const ParticleField: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Overall fade in
  const fadeIn = interpolate(
    frame,
    [0, 30],
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
      {particles.map((particle, index) => {
        // Calculate particle position with parallax movement
        const x = particle.x + (frame * particle.speed * particle.depth * 0.1);
        const y = particle.y + (frame * particle.speed * particle.depth * 0.05);

        // Wrap particles around
        const wrappedX = (x % 100);
        const wrappedY = (y % 100);

        // Opacity based on depth (closer = brighter)
        const baseOpacity = 0.2 + particle.depth * 0.6;

        // Twinkle effect
        const twinkle = Math.sin((frame + index * 10) * 0.05) * 0.3 + 0.7;
        const opacity = baseOpacity * twinkle;

        // Color variation based on depth
        const color = particle.depth > 0.6
          ? '#A9D6FF' // Bright blue for closer particles
          : particle.depth > 0.4
          ? '#78D5E8' // Cyan for mid-depth
          : '#6B7A93'; // Muted for far particles

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${wrappedX}%`,
              top: `${wrappedY}%`,
              width: `${particle.size * particle.depth}px`,
              height: `${particle.size * particle.depth}px`,
              borderRadius: '50%',
              backgroundColor: color,
              opacity,
              boxShadow: particle.depth > 0.6
                ? `0 0 ${particle.size * 3}px ${color}`
                : 'none',
              filter: particle.depth < 0.4 ? 'blur(0.5px)' : 'none',
            }}
          />
        );
      })}

      {/* Connection lines between nearby particles */}
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.15,
        }}
      >
        {particles.slice(0, 50).map((particle, i) => {
          const nextParticle = particles[(i + 1) % 50];
          const x1 = (particle.x + frame * particle.speed * particle.depth * 0.1) % 100;
          const y1 = (particle.y + frame * particle.speed * particle.depth * 0.05) % 100;
          const x2 = (nextParticle.x + frame * nextParticle.speed * nextParticle.depth * 0.1) % 100;
          const y2 = (nextParticle.y + frame * nextParticle.speed * nextParticle.depth * 0.05) % 100;

          // Only draw line if particles are close
          const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          if (distance > 15) return null;

          return (
            <line
              key={i}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="#A9D6FF"
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
