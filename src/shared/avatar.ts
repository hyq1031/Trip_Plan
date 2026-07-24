export const MEMBER_COLORS = [
  "#c65d3b", // terracotta
  "#3b6e5c", // deep teal
  "#8a5aa8", // muted violet
  "#b8862f", // amber
  "#4a6fa5", // slate blue
  "#a34a6f", // dusty rose
];

export const MEMBER_EMOJIS = ["🦊", "🐨", "🦔", "🐢", "🦜", "🐙", "🐝", "🦦"];

export function pickAvatar(index: number): { color: string; emoji: string } {
  return {
    color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    emoji: MEMBER_EMOJIS[index % MEMBER_EMOJIS.length],
  };
}
