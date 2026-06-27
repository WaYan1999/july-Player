/**
 * July-Player Cinematic Startup Animation
 * Inspired by Unreal Engine 5 - Epic intro with particles, logo reveal, and smooth transitions
 */

import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { LogoReveal } from './LogoReveal';
import { ParticleField } from './ParticleField';
import { TitleSequence } from './TitleSequence';
import { GlowEffect } from './GlowEffect';

export const StartupAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Camera movement - slow zoom in
  const cameraZoom = interpolate(
    frame,
    [0, durationInFrames],
    [1.2, 1],
    {
      extrapolateRight: 'clamp',
    }
  );

  // Overall opacity fade in
  const fadeIn = interpolate(
    frame,
    [0, 30],
    [0, 1],
    {
      extrapolateRight: 'clamp',
    }
  );

  // Background gradient animation
  const gradientShift = interpolate(
    frame,
    [0, durationInFrames],
    [0, 360],
    {
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientShift}deg, #0B121C 0%, #172438 50%, #1B2A3E 100%)`,
        opacity: fadeIn,
      }}
    >
      {/* Camera zoom container */}
      <AbsoluteFill
        style={{
          transform: `scale(${cameraZoom})`,
        }}
      >
        {/* Particle field background - starts immediately */}
        <Sequence from={0} durationInFrames={durationInFrames}>
          <ParticleField />
        </Sequence>

        {/* Glow effect layer */}
        <Sequence
          from={0}
          durationInFrames={durationInFrames}
          style={{
            translate: "-2.2px -8.8px"
          }}>
          <GlowEffect />
        </Sequence>

        {/* Logo reveal - starts at frame 30 (0.5s at 60fps) */}
        <Sequence from={30} durationInFrames={120}>
          <LogoReveal />
        </Sequence>

        {/* Title sequence - starts at frame 90 (1.5s) */}
        <Sequence from={90} durationInFrames={90}>
          <TitleSequence />
        </Sequence>
      </AbsoluteFill>
      {/* Vignette effect */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.6) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
