'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Sidebar from '@/components/layout/Sidebar'
import { convertCurrencySync, formatCurrency } from '@/lib/currency'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

interface Stock {
  ticker: string
  nazev: string
  cena?: number
  zmena_procenta?: number
  sektor?: string
  kapitalizace?: number
}

interface AuthUser {
  id: string
  email?: string | null
}

const FEATURED_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'TSLA']
const FALLBACK_STOCKS: Stock[] = [
  { ticker: 'AAPL', nazev: 'Apple', sektor: 'Technology' },
  { ticker: 'MSFT', nazev: 'Microsoft', sektor: 'Technology' },
  { ticker: 'NVDA', nazev: 'NVIDIA', sektor: 'Technology' },
  { ticker: 'AMZN', nazev: 'Amazon', sektor: 'Consumer Cyclical' },
  { ticker: 'META', nazev: 'Meta Platforms', sektor: 'Technology' },
  { ticker: 'TSLA', nazev: 'Tesla', sektor: 'Consumer Cyclical' },
  { ticker: 'GOOGL', nazev: 'Alphabet', sektor: 'Communication Services' },
  { ticker: 'AMD', nazev: 'Advanced Micro Devices', sektor: 'Technology' },
  { ticker: 'JPM', nazev: 'JPMorgan Chase', sektor: 'Financial Services' },
  { ticker: 'V', nazev: 'Visa', sektor: 'Financial Services' },
  { ticker: 'WMT', nazev: 'Walmart', sektor: 'Consumer Defensive' },
  { ticker: 'NFLX', nazev: 'Netflix', sektor: 'Communication Services' },
]

function BuyStocksContent() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [stocksSource, setStocksSource] = useState('unknown')
  const [selectedTicker, setSelectedTicker] = useState('')
  const [currentPrice, setCurrentPrice] = useState(0)
  const [manualPrice, setManualPrice] = useState('')
  const [priceLoading, setPriceLoading] = useState(false)
  const [importingStocks, setImportingStocks] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [investmentAmount, setInvestmentAmount] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [useInvestmentMode, setUseInvestmentMode] = useState(false)
  const [currency, setCurrency] = useState('CZK')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSector, setActiveSector] = useState('Vse')
  const [visibleCount, setVisibleCount] = useState(48)
  const [stocksError, setStocksError] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

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
        console.warn('Stocks API warning:', payload)
        setStocks(FALLBACK_STOCKS)
        setStocksSource('fallback')
        setStocksError('Databazovy seznam akcii neni dostupny. Pouzivam zakladni popularni akcie a rucni ticker.')
        return
      }

      const nextStocks = Array.isArray(payload.stocks) && payload.stocks.length > 0 ? payload.stocks : FALLBACK_STOCKS
      setStocks(nextStocks)
      setStocksSource(payload.source || 'database')
      if (!Array.isArray(payload.stocks) || payload.stocks.length === 0) {
        setStocksSource('fallback')
        setStocksError('Server vratil prazdny seznam, pouzivam zakladni popularni akcie.')
      }
      if (payload.warning) {
        console.warn('Stocks API warning:', payload.warning)
        setStocksError('Akcie byly nacteny z nahradniho zdroje. Databaze zrejme neni plne dostupna.')
      }
    } catch (error) {
      console.error('Error fetching stocks:', error)
      setStocks(FALLBACK_STOCKS)
      setStocksSource('fallback')
      setStocksError('Nepodarilo se nacist akcie ze serveru. Pouzivam zakladni popularni akcie.')
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
        setUser(user)
        await loadUserCurrency(user.id)
      }

      setLoading(false)
    }

    checkUser()
  }, [loadUserCurrency, router, supabase])

  useEffect(() => {
    loadStocks()
  }, [loadStocks])

  useEffect(() => {
    const tickerFromQuery = searchParams.get('ticker')
    if (tickerFromQuery) {
      setSelectedTicker(tickerFromQuery.toUpperCase())
    }
  }, [searchParams])

  useEffect(() => {
    const fetchPrice = async () => {
      if (!selectedTicker) {
        setCurrentPrice(0)
        setManualPrice('')
        return
      }

      setPriceLoading(true)
      try {
        const response = await fetch(`/api/get-stock-price?ticker=${selectedTicker}`)
        const data = await response.json()

        if (response.ok) {
          setCurrentPrice(data.price)
        } else {
          console.error('Error fetching price:', data.error)
          setCurrentPrice(0)
        }
      } catch (error) {
        console.error('Error fetching price:', error)
        setCurrentPrice(0)
      } finally {
        setPriceLoading(false)
      }
    }

    fetchPrice()
  }, [selectedTicker])

  useEffect(() => {
    const effectivePrice = currentPrice > 0 ? currentPrice : parseFloat(manualPrice || '0')

    if (useInvestmentMode && investmentAmount && effectivePrice > 0) {
      const amount = parseFloat(investmentAmount)
      const calculatedQty = Math.floor(amount / effectivePrice)
      setQuantity(calculatedQty > 0 ? calculatedQty.toString() : '0')
    }
  }, [investmentAmount, currentPrice, manualPrice, useInvestmentMode])

  useEffect(() => {
    setVisibleCount(48)
  }, [activeSector, searchQuery])

  const sectors = useMemo(() => {
    const values = Array.from(new Set(stocks.map((stock) => stock.sektor).filter(Boolean))) as string[]
    return ['Vse', ...values.slice(0, 8)]
  }, [stocks])

  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.ticker === selectedTicker) ?? null,
    [selectedTicker, stocks]
  )

  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      const matchesQuery =
        searchQuery.length === 0 ||
        stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.nazev.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesSector = activeSector === 'Vse' || (stock.sektor ?? 'Bez sektoru') === activeSector

      return matchesQuery && matchesSector
    })
  }, [activeSector, searchQuery, stocks])

  const visibleStocks = useMemo(() => filteredStocks.slice(0, visibleCount), [filteredStocks, visibleCount])

  const featuredStocks = useMemo(() => {
    return FEATURED_TICKERS.map((ticker) => stocks.find((stock) => stock.ticker === ticker)).filter(Boolean) as Stock[]
  }, [stocks])

  const tickerSuggestions = useMemo(() => {
    const query = selectedTicker.trim().toLowerCase()

    if (query.length === 0) {
      return featuredStocks.slice(0, 6)
    }

    return stocks
      .filter((stock) =>
        stock.ticker.toLowerCase().includes(query) ||
        stock.nazev.toLowerCase().includes(query)
      )
      .slice(0, 6)
  }, [featuredStocks, selectedTicker, stocks])

  const topMovers = useMemo(() => {
    return [...stocks]
      .filter((stock) => typeof stock.zmena_procenta === 'number')
      .sort((a, b) => Math.abs(b.zmena_procenta || 0) - Math.abs(a.zmena_procenta || 0))
      .slice(0, 4)
  }, [stocks])

  const effectivePrice = currentPrice > 0 ? currentPrice : parseFloat(manualPrice || '0')
  const estimatedTotal = effectivePrice > 0 && quantity ? effectivePrice * parseInt(quantity || '0', 10) : 0

  const handleImportPopularStocks = async () => {
    setImportingStocks(true)
    setStocksError('')

    try {
      const response = await fetch('/api/import-popular-stocks', { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        console.error('Import popular stocks failed:', data)
        setStocksError('Nepodarilo se nahrat popularni akcie.')
        return
      }

      await loadStocks()
    } catch (error) {
      console.error('Import popular stocks failed:', error)
      setStocksError('Nepodarilo se nahrat popularni akcie.')
    } finally {
      setImportingStocks(false)
    }
  }

  const handleBuyStock = async () => {
    if (!selectedTicker || !quantity || effectivePrice === 0) {
      alert('Vypln vsechna pole a over, ze mame cenu akcie nebo ji zadej rucne.')
      return
    }

    const quantityNum = parseInt(quantity, 10)
    if (quantityNum <= 0) {
      alert('Pocet akcii musi byt vetsi nez 0.')
      return
    }

    if (effectivePrice < 0.01) {
      alert('Cena akcie musi byt vetsi nez 0.')
      return
    }

    if (!user?.email) {
      alert('Chybi prihlaseny uzivatel.')
      return
    }

    try {
      const { error } = await supabase.from('portfolio').insert({
        user_email: user.email,
        ticker: selectedTicker,
        quantity: quantityNum,
        price: effectivePrice,
        purchase_date: purchaseDate,
      })

      if (error) {
        console.error('Error saving purchase:', error)
        alert(`Chyba pri ukladani nakupu: ${error.message}`)
      } else {
        alert('Akcie byla uspesne nakoupena.')
        setQuantity('')
        setInvestmentAmount('')
        setManualPrice('')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Necekavana chyba')
    }
  }

  if (loading) return <div className="p-10 text-white">Nacitam...</div>

  return (
    <div className="flex">
      <Sidebar />

      <main className="min-h-screen flex-1 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] p-6 text-white md:ml-64 md:p-8">
        <div className="mt-12 space-y-8 md:mt-0">
          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/40 backdrop-blur">
            <div className="grid gap-8 p-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
                  <Sparkles className="h-4 w-4" />
                  Chytrejsi nakup akcii
                </div>
                <div>
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                    Vyber akcii jako z vykladu, ne z obycejneho selectu.
                  </h1>
                  <p className="mt-3 max-w-2xl text-base text-slate-300 md:text-lg">
                    Prohledej trh, porovnej favority a nakup z jedne stranky s vetsim kontextem.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-white/10 bg-slate-950/50 text-white">
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-400">Sledovanych akcii</p>
                      <p className="mt-2 text-3xl font-semibold">{stocks.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-white/10 bg-slate-950/50 text-white">
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-400">Sektoru</p>
                      <p className="mt-2 text-3xl font-semibold">{Math.max(sectors.length - 1, 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-white/10 bg-slate-950/50 text-white">
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-400">Favoritu</p>
                      <p className="mt-2 text-3xl font-semibold">{featuredStocks.length}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  Nacteno {stocks.length} akcii.
                  {stocksSource !== 'unknown' ? ` Zdroj: ${stocksSource}.` : ''}
                  {filteredStocks.length !== stocks.length ? ` Po filtru zbyva ${filteredStocks.length}.` : ''}
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <Label htmlFor="manualTicker" className="text-sm text-slate-300">
                    Rucni vyber tickeru
                  </Label>
                  <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start">
                    <div className="flex-1">
                      <Input
                        id="manualTicker"
                        value={selectedTicker}
                        onChange={(event) => setSelectedTicker(event.target.value.toUpperCase())}
                        placeholder="Napriklad AAPL nebo MSFT"
                        className="h-12 rounded-2xl border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500"
                      />

                      {tickerSuggestions.length > 0 ? (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
                          {tickerSuggestions.map((stock) => (
                            <button
                              key={stock.ticker}
                              type="button"
                              onClick={() => setSelectedTicker(stock.ticker)}
                              className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 last:border-b-0"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-white">{stock.ticker}</p>
                                <p className="truncate text-sm text-slate-400">{stock.nazev}</p>
                              </div>
                              <span className="shrink-0 text-xs text-slate-500">
                                {stock.sektor || 'Akcie'}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : selectedTicker.trim() ? (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
                          Nenalezen zadny navrh. Muzeš ticker dopsat rucne a zkusit cenu nacist i tak.
                        </div>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => setSelectedTicker(selectedTicker.trim().toUpperCase())}
                      disabled={!selectedTicker.trim()}
                    >
                      Vybrat ticker
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Kdyz se seznam nenacte nebo chces jit rychle, napis ticker rucne a cena se dohleda automaticky.
                  </p>
                </div>
              </div>

              <Card className="border-emerald-400/20 bg-emerald-500/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BriefcaseBusiness className="h-5 w-5 text-emerald-300" />
                    Rychly nahled objednavky
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-slate-300">Vybrana akcie</p>
                    <p className="mt-1 text-2xl font-semibold">{selectedStock ? selectedStock.ticker : 'Zatim nic'}</p>
                    <p className="text-sm text-slate-400">{selectedStock?.nazev ?? 'Klikni na kartu niz nebo pouzij vyhledavani.'}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-slate-300">Aktualni cena</p>
                      <p className="mt-1 text-xl font-semibold">
                        {priceLoading
                          ? 'Nacitam...'
                          : currentPrice > 0
                            ? formatCurrency(convertCurrencySync(currentPrice, 'USD', currency), currency)
                            : 'Nedostupna'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-slate-300">Odhad celkem</p>
                      <p className="mt-1 text-xl font-semibold">
                        {estimatedTotal > 0
                          ? formatCurrency(convertCurrencySync(estimatedTotal, 'USD', currency), currency)
                          : '0'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-emerald-100/80">
                    Mas vse na jednom miste: vyber, cenu, orientacni castku i finalni nakup.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Nejzajimavejsi akcie dnes</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {topMovers.map((stock) => {
                  const change = stock.zmena_procenta || 0
                  const positive = change >= 0
                  return (
                    <button
                      key={stock.ticker}
                      type="button"
                      onClick={() => setSelectedTicker(stock.ticker)}
                      className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400/50 ${
                        selectedTicker === stock.ticker ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 bg-slate-950/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">{stock.ticker}</p>
                          <p className="text-sm text-slate-400">{stock.nazev}</p>
                        </div>
                        <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${positive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                          {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {positive ? '+' : ''}
                          {change.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Rychly vyber favoritu</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {featuredStocks.map((stock) => (
                  <button
                    key={stock.ticker}
                    type="button"
                    onClick={() => setSelectedTicker(stock.ticker)}
                    className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400/50 ${
                      selectedTicker === stock.ticker ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{stock.ticker}</p>
                        <p className="text-sm text-slate-400">{stock.nazev}</p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-400">{stock.sektor || 'Bez sektoru'}</span>
                      <span className="font-medium text-slate-200">
                        {typeof stock.cena === 'number'
                          ? formatCurrency(convertCurrencySync(stock.cena, 'USD', currency), currency)
                          : 'Cena neni'}
                      </span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <CardTitle className="text-2xl">Vyber akcii</CardTitle>
                  <div className="relative w-full lg:max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Hledat ticker nebo nazev..."
                      className="h-12 rounded-2xl border-white/10 bg-slate-950/60 pl-11 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sectors.map((sector) => (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => setActiveSector(sector)}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        activeSector === sector ? 'bg-blue-500 text-white' : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {stocksError ? (
                  <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {stocksError}
                  </div>
                ) : null}

                {filteredStocks.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-8 text-center">
                    <p className="text-lg font-medium text-white">Zatim tu neni zadna akcie k vyberu.</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Muze byt prazdna databaze, filtr nic nenasel, nebo si rovnou napis ticker rucne nahore.
                    </p>
                    <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <Button
                        type="button"
                        onClick={handleImportPopularStocks}
                        disabled={importingStocks}
                        className="rounded-2xl bg-blue-600 hover:bg-blue-500"
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${importingStocks ? 'animate-spin' : ''}`} />
                        {importingStocks ? 'Nahravam akcie...' : 'Nahrat popularni akcie'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSearchQuery('')
                          setActiveSector('Vse')
                          setVisibleCount(48)
                        }}
                        className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
                      >
                        Reset filtru
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visibleStocks.map((stock) => {
                      const change = stock.zmena_procenta || 0
                      return (
                        <button
                          key={stock.ticker}
                          type="button"
                          onClick={() => setSelectedTicker(stock.ticker)}
                          className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 ${
                            selectedTicker === stock.ticker
                              ? 'border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-950/40'
                              : 'border-white/10 bg-slate-950/50 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xl font-semibold">{stock.ticker}</p>
                              <p className="mt-1 text-sm text-slate-400">{stock.nazev}</p>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-xs font-medium ${change >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                              {change >= 0 ? '+' : ''}
                              {change.toFixed(2)}%
                            </div>
                          </div>
                          <div className="mt-5 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sektor</p>
                              <p className="mt-1 text-sm text-slate-300">{stock.sektor || 'Bez sektoru'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cena</p>
                              <p className="mt-1 text-lg font-semibold">
                                {typeof stock.cena === 'number' && stock.cena > 0
                                  ? formatCurrency(convertCurrencySync(stock.cena, 'USD', currency), currency)
                                  : 'Live po vyberu'}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {filteredStocks.length > visibleCount && (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-400">
                      Zobrazeno {visibleStocks.length} z {filteredStocks.length} akcii.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => setVisibleCount((count) => count + 48)}
                    >
                      Zobrazit dalsi akcie
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-950/70 text-white">
              <CardHeader>
                <CardTitle className="text-2xl">Dokoncit nakup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Vybrana akcie</p>
                  <p className="mt-2 text-2xl font-semibold">{selectedStock?.ticker || 'Vyber akcii'}</p>
                  <p className="text-sm text-slate-400">{selectedStock?.nazev || 'Klikni na jednu z karet vlevo.'}</p>
                </div>

                <div className="grid gap-2">
                  <Label>Zpusob zadani</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-900/70 p-1">
                    <button
                      type="button"
                      onClick={() => setUseInvestmentMode(false)}
                      className={`rounded-xl px-4 py-3 text-sm transition ${!useInvestmentMode ? 'bg-blue-500 text-white' : 'text-slate-300'}`}
                    >
                      Podle kusu
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseInvestmentMode(true)}
                      className={`rounded-xl px-4 py-3 text-sm transition ${useInvestmentMode ? 'bg-blue-500 text-white' : 'text-slate-300'}`}
                    >
                      Podle castky
                    </button>
                  </div>
                </div>

                {useInvestmentMode ? (
                  <div className="grid gap-2">
                    <Label htmlFor="investmentAmount" className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-slate-400" />
                      Kolik chces investovat
                    </Label>
                    <Input
                      id="investmentAmount"
                      type="number"
                      placeholder="25000"
                      value={investmentAmount}
                      onChange={(event) => setInvestmentAmount(event.target.value)}
                      className="h-12 rounded-2xl border-white/10 bg-slate-900/70 text-white"
                    />
                    <p className="text-sm text-slate-400">Pocet akcii se prepocita automaticky podle aktualni ceny.</p>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="quantity">Pocet akcii</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="10"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="h-12 rounded-2xl border-white/10 bg-slate-900/70 text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="price">Aktualni cena za akcii</Label>
                  <Input
                    id="price"
                    type="text"
                    value={
                      priceLoading
                        ? 'Nacitam...'
                        : currentPrice > 0
                          ? formatCurrency(convertCurrencySync(currentPrice, 'USD', currency), currency)
                          : 'Nedostupna, zadej rucne niz'
                    }
                    readOnly
                    className="h-12 rounded-2xl border-white/10 bg-slate-900/70 text-white"
                  />
                </div>

                {currentPrice === 0 ? (
                  <div className="grid gap-2">
                    <Label htmlFor="manualPrice">Rucni cena za akcii</Label>
                    <Input
                      id="manualPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Napriklad 182.45"
                      value={manualPrice}
                      onChange={(event) => setManualPrice(event.target.value)}
                      className="h-12 rounded-2xl border-white/10 bg-slate-900/70 text-white"
                    />
                    <p className="text-sm text-slate-400">
                      Kdyz live API cenu nevrati, muzes ji zadat rucne a nakup ulozit.
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    Datum nakupu
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={purchaseDate}
                    onChange={(event) => setPurchaseDate(event.target.value)}
                    className="h-12 rounded-2xl border-white/10 bg-slate-900/70 text-white"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Odhad transakce</span>
                    <span>{quantity || '0'} ks</span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {estimatedTotal > 0
                      ? formatCurrency(convertCurrencySync(estimatedTotal, 'USD', currency), currency)
                      : '0'}
                  </p>
                </div>

                <Button
                  className="h-12 w-full rounded-2xl bg-blue-600 text-base hover:bg-blue-500"
                  onClick={handleBuyStock}
                  disabled={priceLoading || !selectedTicker || !quantity || effectivePrice <= 0}
                >
                  {priceLoading ? 'Nacitam cenu...' : 'Nakoupit akcii'}
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}

export default function BuyStocks() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Načítám...</div>}>
      <BuyStocksContent />
    </Suspense>
  )
}
