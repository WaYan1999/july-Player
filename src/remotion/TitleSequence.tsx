/**
 * Title Sequence Component
 * Animated tagline with typing effect
 */

import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

const TAGLINE = 'Learn. Grow. Achieve.';

export const TitleSequence: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in
  const opacity = interpolate(
    frame,
    [0, 20],
    [0, 1],
    {
      extrapolateRight: 'clamp',
    }
  );

  // Slide up animation
  const translateY = interpolate(
    frame,
    [0, 30],
    [20, 0],
    {
      extrapolateRight: 'clamp',
    }
  );

  // Typing effect - reveal characters over time
  const charsToShow = Math.floor(interpolate(
    frame,
    [10, 50],
    [0, TAGLINE.length],
    {
      extrapolateRight: 'clamp',
    }
  ));

  const visibleText = TAGLINE.slice(0, charsToShow);

  // Cursor blink
  const cursorOpacity = frame < 50 && Math.floor(frame / 15) % 2 === 0 ? 1 : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          marginTop: '200px',
          fontSize: '32px',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600,
          color: '#9CAABE',
          textAlign: 'center',
          letterSpacing: '0.05em',
        }}
      >
        {visibleText}
        <span
          style={{
            opacity: cursorOpacity,
            marginLeft: '2px',
            animation: 'blink 1s infinite',
          }}
        >
          |
        </span>
      </div>
    </AbsoluteFill>
  );
};
