export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

let activeBrand: string | null = null

export async function GET() {
  return NextResponse.json({ brand: activeBrand })
}

export async function POST(request: NextRequest) {
  const { brand } = await request.json()
  if (brand && brand !== 'vi' && brand !== 'redbull' && brand !== 'all') {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  activeBrand = brand === 'all' ? null : brand
  return NextResponse.json({ brand: activeBrand })
}
