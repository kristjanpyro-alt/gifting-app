import { useState } from 'react';

export type MascotPose =
  | 'idle'
  | 'carrying'
  | 'sparkle'
  | 'sleep'
  | 'thinking'
  | 'alert'
  | 'peek'
  | 'celebration';

const FALLBACK_EMOJI: Record<MascotPose, string> = {
  idle:        '☁️',
  carrying:    '🎁',
  sparkle:     '✨',
  sleep:       '😴',
  thinking:    '💭',
  alert:       '⚠️',
  peek:        '👀',
  celebration: '🎉',
};

interface MascotProps {
  pose: MascotPose;
  /** Render size in px. Matches available PNG variants: 96, 256, 512, 1024. */
  size?: 96 | 128 | 160 | 200 | 240 | 256 | 320 | 400 | 512;
  className?: string;
}

/** Pick the smallest PNG variant >= rendered size. */
function pickVariant(size: number): number {
  if (size <= 96)  return 96;
  if (size <= 256) return 256;
  if (size <= 512) return 512;
  return 1024;
}

/**
 * Mascot renders a PNG from /public/mascot/{pose}-{variant}.png.
 * If the image is missing (404), falls back to an emoji at the same size.
 * Lets us ship the layout NOW and drop PNGs in later without code changes.
 */
export default function Mascot({ pose, size = 240, className = '' }: MascotProps) {
  const [errored, setErrored] = useState(false);
  const variant = pickVariant(size);

  if (errored) {
    return (
      <div
        className={`select-none flex items-center justify-center ${className}`}
        style={{ width: size, height: size, fontSize: Math.floor(size * 0.55), lineHeight: 1 }}
        aria-hidden
      >
        {FALLBACK_EMOJI[pose]}
      </div>
    );
  }

  return (
    <img
      src={`/mascot/${pose}-${variant}.png`}
      alt=""
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className={`select-none ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
