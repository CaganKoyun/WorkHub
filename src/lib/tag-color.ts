/**
 * Deterministic pastel color per tag string, tuned for the dark canvas.
 * Same tag → same color across every render; palette is bounded so a busy
 * board doesn't turn into a noise grid.
 */
const HUE_STEPS = 24; // 15° apart around the wheel

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface TagStyle {
  bg: string;
  fg: string;
  ring: string;
}

export function tagStyle(tag: string): TagStyle {
  const seed = hash(tag.toLowerCase().trim());
  const hue = (seed % HUE_STEPS) * (360 / HUE_STEPS);
  // Dark-canvas friendly: low-alpha translucent bg, bright fg text.
  return {
    bg:   `hsl(${hue} 65% 55% / 0.16)`,
    fg:   `hsl(${hue} 75% 78%)`,
    ring: `hsl(${hue} 65% 45% / 0.35)`,
  };
}
