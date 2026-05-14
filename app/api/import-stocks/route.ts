import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const API_KEY = 'd6kj1gpr01qg51f44bg0d6kj1gpr01qg51f44bgg'
const DEFAULT_LIMIT = 500
const MAX_LIMIT = 2500
const QUOTE_BATCH_SIZE = 20
const PRICE_ENRICH_LIMIT = 100

type FinnhubSymbol = {
  description?: string
  displaySymbol?: string
  symbol: string
  type?: string
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

async function fetchQuoteForSymbol(symbol: FinnhubSymbol) {
  try {
    const priceResponse = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol.symbol}&token=${API_KEY}`,
      { cache: 'no-store' }
    )
    const priceData = await priceResponse.json()

    return {
      ticker: symbol.symbol,
      nazev: symbol.description || symbol.displaySymbol || symbol.symbol,
      cena: priceData.c || 0,
      zmena_procenta: priceData.dp || 0,
      kapitalizace: 0,
      posledni_aktualizace: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Chyba pri fetchovani ceny ${symbol.symbol}:`, error)
    return {
      ticker: symbol.symbol,
      nazev: symbol.description || symbol.displaySymbol || symbol.symbol,
      cena: 0,
      zmena_procenta: 0,
      kapitalizace: 0,
      posledni_aktualizace: new Date().toISOString(),
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedLimit = parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT

  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  try {
    console.log(`Stahuji seznam akcii z Finnhub (US Market), limit ${limit}...`)

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${API_KEY}`,
      { cache: 'no-store' }
    )

    const allSymbols = await response.json()

    if (!Array.isArray(allSymbols)) {
      console.error('Finnhub Error:', allSymbols)
      return NextResponse.json(
        { chyba: 'Finnhub API zamitlo pristup.', detaily: allSymbols },
        { status: 500 }
      )
    }

    const selectedStocks = (allSymbols as FinnhubSymbol[])
      .filter((symbol) => symbol.type === 'Common Stock')
      .slice(0, limit)

    const enrichPrices = limit <= PRICE_ENRICH_LIMIT
    console.log(`Pripravuji ${selectedStocks.length} akcii. Rezim cen: ${enrichPrices ? 'live quote' : 'symbol-only'}.`)

    let stocksToInsert: Array<Awaited<ReturnType<typeof fetchQuoteForSymbol>>> = []

    if (enrichPrices) {
      const batches = chunkArray(selectedStocks, QUOTE_BATCH_SIZE)
      for (const batch of batches) {
        const batchResults = await Promise.all(batch.map((symbol) => fetchQuoteForSymbol(symbol)))
        stocksToInsert.push(...batchResults)
      }
    } else {
      stocksToInsert = selectedStocks.map((symbol) => ({
        ticker: symbol.symbol,
        nazev: symbol.description || symbol.displaySymbol || symbol.symbol,
        cena: 0,
        zmena_procenta: 0,
        kapitalizace: 0,
        posledni_aktualizace: new Date().toISOString(),
      }))
    }

    console.log(`Ukladam ${stocksToInsert.length} akcii do Supabase...`)

    const { error } = await supabase
      .from('globalni_akcie')
      .upsert(stocksToInsert, { onConflict: 'ticker' })

    if (error) {
      throw error
    }

    const pricedCount = stocksToInsert.filter((stock) => stock.cena > 0).length

    return NextResponse.json({
      zprava: enrichPrices ? 'Akcie uspesne importovany s cenami!' : 'Akcie uspesne importovany pro vyber a live nacitani ceny!',
      pocet: stocksToInsert.length,
      naceneno: pricedCount,
      limit,
      enrichPrices,
      prvni: stocksToInsert[0],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('Chyba:', message)
    return NextResponse.json({ chyba: message }, { status: 500 })
  }
}
