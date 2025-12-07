// Minimalist grey theme with turquoise accents
export const COLORS = {
  // Background colors - True neutral greys (no blue/purple tint)
  background: {
    primary: '#121212',     // Material Design dark grey
    secondary: '#1E1E1E',   // Card background
    tertiary: '#2A2A2A',    // Input/section background
    black: '#000000',       // Pure black for depth
  },

  // Accent colors - Keeping the turquoise you like!
  accent: {
    primary: '#0dd3d3',     // Main turquoise
    secondary: '#1de9b6',   // Mint teal
    tertiary: '#0fa3a3',    // Darker teal
    light: '#5ef3f3',       // Light teal for highlights
  },

  // Semantic colors
  success: '#1de9b6',       // Mint green-teal
  warning: '#ffc107',       // Amber
  error: '#ff5252',         // Red
  info: '#0dd3d3',          // Teal

  // Text colors - Clean neutral greys
  text: {
    primary: '#FFFFFF',     // Pure white
    secondary: '#B0B0B0',   // Light grey (neutral, no blue tint)
    tertiary: '#808080',    // Medium grey (neutral)
    disabled: '#606060',    // Darker grey
  },

  // UI element colors - Minimalist
  border: '#3A3A3A',        // Subtle grey border
  divider: '#2A2A2A',       // Minimal divider
  overlay: 'rgba(18, 18, 18, 0.95)', // True grey overlay
  shadow: 'rgba(0, 0, 0, 0.4)', // Deeper shadows for depth
};

// Legacy color mappings for easy migration
export const LEGACY_COLORS = {
  meals: COLORS.accent.primary,      // Was #FF6B35 orange
  ingredients: COLORS.accent.secondary, // Was #4CAF50 green
  planner: COLORS.accent.tertiary,   // Was #4A90E2 blue
};
