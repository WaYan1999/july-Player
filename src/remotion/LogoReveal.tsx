/**
 * Logo Reveal Component
 * Epic logo entrance with light rays, scale animation, and glow
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring animation for logo scale
  const scale = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5,
    },
  });

  // Opacity fade in
  const opacity = interpolate(
    frame,
    [0, 20],
    [0, 1],
    {
      extrapolateRight: 'clamp',
    }
  );

  // Rotation animation (subtle)
  const rotation = interpolate(
    frame,
    [0, 60],
    [-5, 0],
    {
      extrapolateRight: 'clamp',
    }
  );

  // Glow intensity
  const glowIntensity = interpolate(
    frame,
    [10, 40, 60],
    [0, 1, 0.3],
    {
      extrapolateRight: 'clamp',
    }
  );

  // Light rays animation
  const raysOpacity = interpolate(
    frame,
    [0, 30, 60],
    [0, 0.8, 0.2],
    {
      extrapolateRight: 'clamp',
    }
  );

  const raysRotation = interpolate(
    frame,
    [0, 120],
    [0, 360],
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      {/* Light rays background */}
      <div
        style={{
          position: 'absolute',
          width: '200%',
          height: '200%',
          background: `repeating-conic-gradient(
            from 0deg at 50% 50%,
            transparent 0deg,
            rgba(169, 214, 255, ${raysOpacity * 0.1}) 2deg,
            transparent 4deg,
            transparent 8deg
          )`,
          transform: `rotate(${raysRotation}deg)`,
          filter: 'blur(2px)',
        }}
      />

      {/* Logo container with glow */}
      <div
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          filter: `drop-shadow(0 0 ${glowIntensity * 80}px rgba(169, 214, 255, ${glowIntensity}))`,
        }}
      >
        {/* Main logo */}
        <div
          style={{
            fontSize: '120px',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            color: '#A9D6FF',
            textAlign: 'center',
            letterSpacing: '0.05em',
            textShadow: `
              0 0 10px rgba(169, 214, 255, 0.8),
              0 0 20px rgba(169, 214, 255, 0.6),
              0 0 30px rgba(169, 214, 255, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.5)
            `,
            background: 'linear-gradient(180deg, #FFFFFF 0%, #A9D6FF 50%, #78D5E8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          July
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: '20px',
            fontSize: '24px',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            color: '#9CAABE',
            textAlign: 'center',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          Player
        </div>
      </div>

      {/* Bottom glow accent */}
      <div
        style={{
          position: 'absolute',
          bottom: '30%',
          width: '600px',
          height: '200px',
          background: `radial-gradient(ellipse at center, rgba(169, 214, 255, ${glowIntensity * 0.3}), transparent)`,
          filter: 'blur(60px)',
        }}
      />
    </AbsoluteFill>
  );
};
