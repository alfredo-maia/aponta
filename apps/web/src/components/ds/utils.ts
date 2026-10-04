import { twMerge } from 'tailwind-merge';

export const ezColors = {
  // Brand (Blue)
  brand: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    1000: '#172554',
  },
  // Base Gray (Neutrals)
  gray: {
    70: '#FFFFFF',
    80: '#F9F9F9',
    90: '#EAEAEA',
    100: '#E4E5E7',
    200: '#A4A5A7',
    300: '#8E9093',
    400: '#77777A',
    500: '#616164',
    600: '#48484B',
    700: '#343437',
    800: '#202022',
    900: '#131315',
    1000: '#060607',
  },
  // Green (Success)
  green: {
    100: '#EEF9EC',
    200: '#CCEFCA',
    300: '#99DF95',
    400: '#69D067',
    500: '#40BD42',
    600: '#239F28',
    700: '#0D7B13',
    800: '#075F0D',
    900: '#06490C',
    1000: '#041800',
  },
  // Yellow (Warning)
  yellow: {
    100: '#FAF7EE',
    200: '#FCEFC3',
    300: '#FDE492',
    400: '#FEDA5A',
    500: '#FED020',
    600: '#D5A702',
    700: '#AA8201',
    800: '#805F00',
    900: '#543D00',
    1000: '#302301',
  },
  // Red (Danger)
  red: {
    100: '#F9EBEE',
    200: '#F4C8D0',
    300: '#EEA2AF',
    400: '#E9798F',
    500: '#E14563',
    600: '#BC1E3F',
    700: '#961530',
    800: '#7B1027',
    900: '#54091A',
    1000: '#260007',
  },
  // Petroleum (Alternative Neutral / Contrast)
  petroleum: {
    70: '#F4F6F9',
    80: '#EDEFF2',
    90: '#E6E8ED',
    100: '#CFD4DD',
    200: '#A6B1C2',
    300: '#77859A',
    400: '#505E72',
    500: '#323E4F',
    600: '#212A37',
    700: '#181E29',
    800: '#151A22',
    900: '#11151B',
    1000: '#0D1119',
  },
} as const;

/**
 * Utility to merge Tailwind classes safely (avoids conflicting styles)
 */
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(inputs.filter(Boolean).join(' '));
}
