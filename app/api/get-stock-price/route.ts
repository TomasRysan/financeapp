import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  const API_KEY = 'd6kj1gpr01qg51f44bg0d6kj1gpr01qg51f44bgg'

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`
    )

    const data = await response.json()

    if (data.c === 0) {
      return NextResponse.json({ error: 'Invalid ticker or no data available' }, { status: 404 })
    }

    return NextResponse.json({ price: data.c })
  } catch (error) {
    console.error('Error fetching stock price:', error)
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
  }
}