import { twMerge } from 'tailwind-merge';

export const ezColors = {
  // Brand (Ocean Green — paleta oficial Sankhya DS)
  brand: {
    50: '#e6f3ef',
    100: '#bddfd6',
    200: '#94ccbd',
    300: '#6bb8a3',
    400: '#42a58a',
    500: '#1a9171',
    600: '#008561',
    700: '#00684c',
    800: '#00523c',
    900: '#003d2d',
    1000: '#00281d',
  },
  // Base Gray (Neutrals — Sankhya DS)
  gray: {
    70: '#ffffff',
    80: '#f9f9f9',
    90: '#eaeaea',
    100: '#dedede',
    200: '#d2d2d3',
    300: '#a4a5a7',
    400: '#77777a',
    500: '#494a4e',
    600: '#1c1d22',
    700: '#16171b',
    800: '#111114',
    900: '#0b0c0e',
    1000: '#060607',
  },
  // Green (Success — Sankhya DS)
  green: {
    100: '#eef9ec',
    200: '#d0e4cc',
    300: '#a1ca99',
    400: '#73af66',
    500: '#449533',
    600: '#157a00',
    700: '#116200',
    800: '#0d4900',
    900: '#083100',
    1000: '#041800',
  },
  // Yellow (Warning — Sankhya DS)
  yellow: {
    100: '#faf7ee',
    200: '#fcefcd',
    300: '#f9e09a',
    400: '#f5d068',
    500: '#f2c135',
    600: '#efb103',
    700: '#bf8e02',
    800: '#8f6a02',
    900: '#604701',
    1000: '#302301',
  },
  // Red (Danger — Sankhya DS)
  red: {
    100: '#f9ebee',
    200: '#f2ccd3',
    300: '#e599a8',
    400: '#d7667c',
    500: '#ca3351',
    600: '#bd0025',
    700: '#97001e',
    800: '#710016',
    900: '#4c000f',
    1000: '#260007',
  },
  // Petroleum (Alternative Neutral / Contrast — Sankhya DS)
  petroleum: {
    70: '#f4f6f9',
    80: '#f4f6f9',
    90: '#eaebee',
    100: '#c8ccd3',
    200: '#a6acb7',
    300: '#848d9c',
    400: '#626d80',
    500: '#404e65',
    600: '#2b3a54',
    700: '#222d42',
    800: '#1b2434',
    900: '#141b27',
    1000: '#0d1119',
  },
} as const;

/**
 * Utility to merge Tailwind classes safely (avoids conflicting styles)
 */
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(inputs.filter(Boolean).join(' '));
}
