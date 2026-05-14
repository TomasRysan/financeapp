import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const API_KEY = 'd6kj1gpr01qg51f44bg0d6kj1gpr01qg51f44bgg'

const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM',
  'V', 'WMT', 'JNJ', 'PG', 'PYPL', 'IBM', 'INTC', 'AMD',
  'BA', 'GE', 'F', 'T', 'VZ', 'KO', 'PEP', 'MCD',
  'DIS', 'NKE', 'CSCO', 'ADBE', 'CRM', 'ORCL', 'NFLX', 'UBER',
]

function buildStaticFallbackStocks() {
  return POPULAR_STOCKS.map((ticker) => ({
    ticker,
    nazev: ticker,
    sektor: '',
    cena: 0,
    zmena_procenta: 0,
    kapitalizace: 0,
    posledni_aktualizace: new Date().toISOString(),
  }))
}

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

async function fetchPopularStocks() {
  return Promise.all(
    POPULAR_STOCKS.map(async (ticker) => {
      const priceResponse = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`,
        { cache: 'no-store' }
      )
      const priceData = await priceResponse.json()

      const companyResponse = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${API_KEY}`,
        { cache: 'no-store' }
      )
      const companyData = await companyResponse.json()

      return {
        ticker,
        nazev: companyData.name || ticker,
        sektor: companyData.finnhubIndustry || '',
        cena: priceData.c || 0,
        zmena_procenta: priceData.dp || 0,
        kapitalizace: companyData.marketCapitalization || 0,
        posledni_aktualizace: new Date().toISOString(),
      }
    })
  )
}

function fallbackResponse(stocks: Awaited<ReturnType<typeof fetchPopularStocks>>, warning: string) {
  return NextResponse.json({
    stocks,
    source: 'finnhub-fallback',
    warning,
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ensure = searchParams.get('ensure') === '1'
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const selectColumns = 'ticker, nazev, cena, zmena_procenta, sektor, kapitalizace'

  try {
    const { data, error } = await supabase
      .from('globalni_akcie')
      .select(selectColumns)
      .order('kapitalizace', { ascending: false })
      .order('ticker', { ascending: true })

    if (error) {
      if (!ensure) {
        return NextResponse.json({ stocks: [], source: 'database', warning: error.message })
      }

      const fallbackStocks = await fetchPopularStocks()
      const safeFallbackStocks = fallbackStocks.length > 0 ? fallbackStocks : buildStaticFallbackStocks()
      return fallbackResponse(
        safeFallbackStocks,
        `Database read failed: ${error.message}`
      )
    }

    if (data && data.length > 0) {
      return NextResponse.json({ stocks: data, source: 'database' })
    }

    if (!ensure) {
      return NextResponse.json({ stocks: [], source: 'database' })
    }

    const stocksToInsert = await fetchPopularStocks()
    const safeStocksToInsert = stocksToInsert.length > 0 ? stocksToInsert : buildStaticFallbackStocks()
    const { error: upsertError } = await supabase
      .from('globalni_akcie')
      .upsert(safeStocksToInsert, { onConflict: 'ticker' })

    if (upsertError) {
      return fallbackResponse(
        safeStocksToInsert,
        `Database save failed: ${upsertError.message}`
      )
    }

    const { data: insertedData, error: reloadError } = await supabase
      .from('globalni_akcie')
      .select(selectColumns)
      .order('kapitalizace', { ascending: false })
      .order('ticker', { ascending: true })

    if (reloadError) {
      return NextResponse.json(
        {
          stocks: safeStocksToInsert,
          source: 'imported-memory',
          warning: reloadError.message,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ stocks: insertedData || safeStocksToInsert, source: 'imported' })
  } catch (error) {
    console.error('Stocks API failed:', error)
    const fallbackStocks = await fetchPopularStocks().catch(() => [])
    const safeFallbackStocks = fallbackStocks.length > 0 ? fallbackStocks : buildStaticFallbackStocks()
    return NextResponse.json({
      stocks: safeFallbackStocks,
      source: 'emergency-fallback',
      warning: error instanceof Error ? error.message : 'unknown error',
    })
  }
}
