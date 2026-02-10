'use client'

import React from 'react'

/**
 * Simple markup format for Adhkar text:
 * - **text** = bold
 * - *text* = italic  
 * - {#ff0000}text{/} = colored text (hex color)
 * - Line breaks are preserved
 */

interface FormattedTextProps {
  text: string
  baseStyle?: React.CSSProperties
}

export function FormattedText({ text, baseStyle }: FormattedTextProps) {
  const parseText = (input: string): React.ReactNode[] => {
    const result: React.ReactNode[] = []
    let remaining = input
    let key = 0

    while (remaining.length > 0) {
      // Check for color: {#rrggbb}text{/}
      const colorMatch = remaining.match(/^\{(#[0-9a-fA-F]{6})\}([\s\S]*?)\{\/\}/)
      if (colorMatch) {
        const [full, color, content] = colorMatch
        result.push(
          <span key={key++} style={{ color }}>
            {parseText(content)}
          </span>
        )
        remaining = remaining.slice(full.length)
        continue
      }

      // Check for bold: **text**
      const boldMatch = remaining.match(/^\*\*([\s\S]*?)\*\*/)
      if (boldMatch) {
        const [full, content] = boldMatch
        result.push(
          <strong key={key++} style={{ fontWeight: 700 }}>
            {parseText(content)}
          </strong>
        )
        remaining = remaining.slice(full.length)
        continue
      }

      // Check for italic: *text*
      const italicMatch = remaining.match(/^\*([\s\S]*?)\*/)
      if (italicMatch) {
        const [full, content] = italicMatch
        result.push(
          <em key={key++} style={{ fontStyle: 'italic' }}>
            {parseText(content)}
          </em>
        )
        remaining = remaining.slice(full.length)
        continue
      }

      // Check for line break
      if (remaining.startsWith('\n')) {
        result.push(<br key={key++} />)
        remaining = remaining.slice(1)
        continue
      }

      // Find next special character
      const nextSpecial = remaining.search(/\{#|\*|\n/)
      if (nextSpecial === -1) {
        // No more special characters, add rest as text
        result.push(remaining)
        break
      } else if (nextSpecial === 0) {
        // Special char at start but didn't match pattern, treat as literal
        result.push(remaining[0])
        remaining = remaining.slice(1)
      } else {
        // Add text up to special character
        result.push(remaining.slice(0, nextSpecial))
        remaining = remaining.slice(nextSpecial)
      }
    }

    return result
  }

  return <span style={baseStyle}>{parseText(text)}</span>
}

// Formatting toolbar helper functions
export const formatHelpers = {
  bold: (text: string, start: number, end: number): { text: string; cursor: number } => {
    const before = text.slice(0, start)
    const selected = text.slice(start, end)
    const after = text.slice(end)
    
    if (selected) {
      return {
        text: `${before}**${selected}**${after}`,
        cursor: end + 4
      }
    }
    return {
      text: `${before}****${after}`,
      cursor: start + 2
    }
  },

  italic: (text: string, start: number, end: number): { text: string; cursor: number } => {
    const before = text.slice(0, start)
    const selected = text.slice(start, end)
    const after = text.slice(end)
    
    if (selected) {
      return {
        text: `${before}*${selected}*${after}`,
        cursor: end + 2
      }
    }
    return {
      text: `${before}**${after}`,
      cursor: start + 1
    }
  },

  color: (text: string, start: number, end: number, color: string): { text: string; cursor: number } => {
    const before = text.slice(0, start)
    const selected = text.slice(start, end)
    const after = text.slice(end)
    
    if (selected) {
      return {
        text: `${before}{${color}}${selected}{/}${after}`,
        cursor: end + color.length + 5
      }
    }
    return {
      text: `${before}{${color}}{/}${after}`,
      cursor: start + color.length + 2
    }
  },

  lineBreak: (text: string, cursor: number): { text: string; cursor: number } => {
    const before = text.slice(0, cursor)
    const after = text.slice(cursor)
    return {
      text: `${before}\n\n${after}`,
      cursor: cursor + 2
    }
  }
}
