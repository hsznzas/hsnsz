import { NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { exitAdhkar, morningEveningAdhkar, type Dhikr } from '@/lib/adhkar-data'

export interface AdhkarContent {
  exit: Dhikr[]
  morningEvening: Dhikr[]
}

const CONTENT_PATH = join(process.cwd(), 'data', 'adhkar-content.json')

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data')
  try {
    await mkdir(dataDir, { recursive: true })
  } catch {
    // Directory might already exist
  }
}

// Get default content from adhkar-data.ts
function getDefaultContent(): AdhkarContent {
  return {
    exit: exitAdhkar,
    morningEvening: morningEveningAdhkar
  }
}

export async function GET() {
  try {
    await ensureDataDir()
    const data = await readFile(CONTENT_PATH, 'utf-8')
    const content = JSON.parse(data) as AdhkarContent
    return NextResponse.json(content)
  } catch {
    // Return default content if file doesn't exist
    return NextResponse.json(getDefaultContent())
  }
}

export async function POST(request: Request) {
  try {
    await ensureDataDir()
    const content = await request.json() as AdhkarContent
    
    await writeFile(CONTENT_PATH, JSON.stringify(content, null, 2), 'utf-8')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save content' },
      { status: 500 }
    )
  }
}
