// Centralised design tokens so the casino look stays consistent and is easy
// to retheme later.
export const theme = {
  colors: {
    feltDark: '#0a3527',
    felt: '#0f5132',
    feltLight: '#157347',
    gold: '#d4af37',
    cardWhite: '#fbfbfb',
    cardRed: '#c1121f',
    cardBlack: '#1d1d1f',
    cardBack: '#1d3557',
    cardBackAccent: '#457b9d',
    text: '#f6f7f5',
    textMuted: '#b9c7bf',
    chip5: '#c1121f',
    chip25: '#2a9d8f',
    chip100: '#1d3557',
    chipClear: '#495057',
    danger: '#e63946',
    success: '#52b788',
    push: '#d4af37',
    overlay: 'rgba(0, 0, 0, 0.25)',
  },
  spacing: (n: number) => n * 8,
  radius: { sm: 6, md: 12, lg: 20, pill: 999 },
} as const;
