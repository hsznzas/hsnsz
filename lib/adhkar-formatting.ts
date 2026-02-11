// Adhkar Text Formatting Configuration

export interface AdhkarFormatting {
  // Font sizes (in px)
  titleSize: number
  dhikrTextSize: number
  noteSize: number
  repetitionSize: number
  
  // Line heights
  dhikrLineHeight: number
  noteLineHeight: number
  
  // Letter spacing (in em)
  letterSpacing: number
  
  // Colors - Light mode
  lightBackground: string
  lightCardBackground: string
  lightTextColor: string
  lightNoteColor: string
  
  // Colors - Dark mode
  darkBackground: string
  darkCardBackground: string
  darkTextColor: string
  darkNoteColor: string
  
  // Accent colors
  accentColor: string
  accentColorDark: string
  
  // Spacing
  cardPadding: number
  cardGap: number
  cardBorderRadius: number
}

export const defaultFormatting: AdhkarFormatting = {
  // Font sizes
  titleSize: 32,
  dhikrTextSize: 27,
  noteSize: 16,
  repetitionSize: 14,
  
  // Line heights
  dhikrLineHeight: 3.0,
  noteLineHeight: 1.2,
  
  // Letter spacing
  letterSpacing: 0,
  
  // Colors - Light mode
  lightBackground: '#faf8f5',
  lightCardBackground: '#ffffff',
  lightTextColor: '#1a1a1a',
  lightNoteColor: '#525252',
  
  // Colors - Dark mode
  darkBackground: '#1a1a1a',
  darkCardBackground: '#242424',
  darkTextColor: '#e5e5e5',
  darkNoteColor: '#a3a3a3',
  
  // Accent colors
  accentColor: '#059669',
  accentColorDark: '#34d399',
  
  // Spacing
  cardPadding: 16,
  cardGap: 47,
  cardBorderRadius: 14,
}

// Path to settings file
export const SETTINGS_FILE_PATH = 'adhkar-settings.json'
