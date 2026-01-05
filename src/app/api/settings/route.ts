import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function GET() {
  try {
    const settings = await prisma.apiSettings.findFirst({
      where: { id: 'default' }
    })

    return NextResponse.json({
      hasApiKey: !!settings?.geminiApiKey
    })
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { geminiApiKey } = body

    const settings = await prisma.apiSettings.upsert({
      where: { id: 'default' },
      update: { geminiApiKey },
      create: { id: 'default', geminiApiKey }
    })

    return NextResponse.json({
      success: true,
      hasApiKey: !!settings.geminiApiKey
    })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
