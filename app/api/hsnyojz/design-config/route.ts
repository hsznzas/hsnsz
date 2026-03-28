import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveDesignConfig,
  setActiveDesignConfig,
} from '@/lib/hsnyojz/active-config'

export async function GET() {
  const config = await getActiveDesignConfig()
  return NextResponse.json(config)
}

export async function PUT(request: NextRequest) {
  try {
    const config = await request.json()
    await setActiveDesignConfig(config)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save config' },
      { status: 500 },
    )
  }
}
