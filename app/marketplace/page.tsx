'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/layout/Sidebar'
import { convertCurrencySync, formatCurrency } from '@/lib/currency'
import { ArrowRight, Flame, Search, Trophy, TrendingDown, TrendingUp, Wallet } from 'lucide-react'

interface Stock {
  id?: number
  ticker: string
  nazev: string
  cena: number
  zmena_procenta: number
  sektor: string
  kapitalizace?: number
}

export default function Marketplace() {
  const [loading, setLoading] = useState(true)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [currency, setCurrency] = useState('CZK')
  const [searchQuery, setSearchQuery] = useState('')
  const [stocksError, setStocksError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const loadUserCurrency = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('currency')
        .eq('user_id', userId)
        .single()

      if (!error && data) {
        setCurrency(data.currency)
      }
    } catch {
      console.log('Currency settings not found')
    }
  }, [supabase])

  const loadStocks = useCallback(async () => {
    setStocksError('')

    try {
      const response = await fetch('/api/stocks?ensure=1', { cache: 'no-store' })
      const payload = await response.json()

      if (!response.ok) {
        console.error('Error fetching marketplace stocks:', payload)
        setStocks([])
        setStocksError('Nepodarilo se nacist trzni zebricky.')
        return
      }

      setStocks(payload.stocks || [])
    } catch (error) {
      console.error('Chyba pri nacitani akcii:', error)
      setStocksError('Nepodarilo se nacist trzni zebricky.')
    }
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
      } else {
        await loadUserCurrency(user.id)
        await loadStocks()
      }

      setLoading(false)
    }

    checkUser()
  }, [loadStocks, loadUserCurrency, router, supabase])

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks
    return stocks.filter((stock) => {
      const query = searchQuery.toLowerCase()
      return stock.ticker.toLowerCase().includes(query) || stock.nazev.toLowerCase().includes(query)
    })
  }, [searchQuery, stocks])

  const topGainers = useMemo(
    () => [...filteredStocks].sort((a, b) => b.zmena_procenta - a.zmena_procenta).slice(0, 5),
    [filteredStocks]
  )

  const topLosers = useMemo(
    () => [...filteredStocks].sort((a, b) => a.zmena_procenta - b.zmena_procenta).slice(0, 5),
    [filteredStocks]
  )

  const mostPopular = useMemo(
    () => [...filteredStocks].sort((a, b) => (b.kapitalizace || 0) - (a.kapitalizace || 0)).slice(0, 6),
    [filteredStocks]
  )

  const sectorLeaders = useMemo(() => {
    const leaders = new Map<string, Stock>()

    filteredStocks.forEach((stock) => {
      const sector = stock.sektor || 'Bez sektoru'
      const current = leaders.get(sector)
      if (!current || stock.zmena_procenta > current.zmena_procenta) {
        leaders.set(sector, stock)
      }
    })

    return Array.from(leaders.entries())
      .map(([sector, stock]) => ({ sector, stock }))
      .sort((a, b) => b.stock.zmena_procenta - a.stock.zmena_procenta)
      .slice(0, 6)
  }, [filteredStocks])

  if (loading) return <div className="p-10 text-white">Nacitam...</div>

  const renderRow = (stock: Stock, index: number, variant: 'up' | 'down' | 'neutral') => {
    const tone =
      variant === 'up'
        ? 'bg-emerald-500/10 text-emerald-300'
        : variant === 'down'
          ? 'bg-rose-500/10 text-rose-300'
          : 'bg-amber-500/10 text-amber-200'

    return (
      <div key={`${variant}-${stock.ticker}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-lg font-semibold text-white">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{stock.ticker}</p>
          <p className="truncate text-sm text-slate-400">{stock.nazev}</p>
        </div>
        <div className="text-right">
          <div className={`rounded-full px-3 py-1 text-sm ${tone}`}>
            {stock.zmena_procenta >= 0 ? '+' : ''}
            {stock.zmena_procenta.toFixed(2)}%
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {formatCurrency(convertCurrencySync(stock.cena, 'USD', currency), currency)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar />

      <main className="min-h-screen flex-1 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_100%)] p-6 text-white md:ml-64 md:p-8">
        <div className="mt-12 space-y-8 md:mt-0">
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
            {stocksError ? (
              <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {stocksError}
              </div>
            ) : null}

            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
                  <Trophy className="h-4 w-4" />
                  Prehled trhu misto druheho nakupu
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Zebricky, popularni akcie a nejvetsi pohyby.</h1>
                <p className="mt-3 text-base text-slate-300 md:text-lg">
                  Tohle je ted inspiracni obrazovka. Vyber favorita podle vykonnosti a jednim klikem prejdi do nakupu.
                </p>
              </div>

              <div className="w-full xl:max-w-md">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Hledat akcii v zebricku..."
                    className="h-12 rounded-2xl border-white/10 bg-slate-950/70 pl-11 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Card className="border-white/10 bg-slate-950/50 text-white">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-400">Akcii v prehledu</p>
                  <p className="mt-2 text-3xl font-semibold">{filteredStocks.length}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-slate-950/50 text-white">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-400">Top rust dnes</p>
                  <p className="mt-2 text-3xl font-semibold">{topGainers[0] ? topGainers[0].ticker : '-'}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-slate-950/50 text-white">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-400">Nejvetsi kapitalizace</p>
                  <p className="mt-2 text-3xl font-semibold">{mostPopular[0] ? mostPopular[0].ticker : '-'}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                  Nejvetsi vzestupy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topGainers.map((stock, index) => renderRow(stock, index, 'up'))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingDown className="h-5 w-5 text-rose-300" />
                  Nejvetsi poklesy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topLosers.map((stock, index) => renderRow(stock, index, 'down'))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Flame className="h-5 w-5 text-amber-200" />
                  Popularni akcie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mostPopular.map((stock, index) => (
                  <div key={stock.ticker} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {index + 1}. {stock.ticker}
                        </p>
                        <p className="text-sm text-slate-400">{stock.nazev}</p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-xl bg-blue-600 hover:bg-blue-500"
                        onClick={() => router.push(`/buy-stocks?ticker=${stock.ticker}`)}
                      >
                        Koupit
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <span>{stock.sektor || 'Bez sektoru'}</span>
                      <span>{formatCurrency(convertCurrencySync(stock.cena, 'USD', currency), currency)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Wallet className="h-5 w-5 text-sky-300" />
                  Lidr sektoru
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sectorLeaders.map(({ sector, stock }) => (
                  <div key={`${sector}-${stock.ticker}`} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{sector}</p>
                        <p className="mt-1 text-lg font-semibold text-white">{stock.ticker}</p>
                        <p className="text-sm text-slate-400">{stock.nazev}</p>
                      </div>
                      <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                        +{stock.zmena_procenta.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Vybrane akcie k dalsimu kroku</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {filteredStocks.slice(0, 8).map((stock) => (
                  <button
                    key={stock.ticker}
                    type="button"
                    onClick={() => router.push(`/buy-stocks?ticker=${stock.ticker}`)}
                    className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-400/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-semibold text-white">{stock.ticker}</p>
                        <p className="mt-1 text-sm text-slate-400">{stock.nazev}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="mt-5 flex items-center justify-between text-sm">
                      <span className="text-slate-400">{stock.sektor || 'Bez sektoru'}</span>
                      <span className={stock.zmena_procenta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                        {stock.zmena_procenta >= 0 ? '+' : ''}
                        {stock.zmena_procenta.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
