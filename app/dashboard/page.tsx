'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Sidebar from '@/components/layout/Sidebar'
import { convertCurrencySync, formatCurrency, formatPrice } from '@/lib/currency'
import { PortfolioAllocationChart, PerformanceBarChart, SectorDistributionChart } from '@/components/charts/Charts'

interface PortfolioItem {
  ticker: string
  quantity: number
  price: number
  purchase_date: string
  current_price?: number
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [gainLoss, setGainLoss] = useState(0)
  const [currency, setCurrency] = useState('CZK')
  const [allStocks, setAllStocks] = useState<any[]>([])
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  if (typeof window !== 'undefined' && !supabaseRef.current) {
    supabaseRef.current = createClient()
  }

  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      if (!supabaseRef.current) return
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) {
        router.push('/')
      } else {
        setUser(user)
        await loadUserCurrency(user.id)
        if (user.email) loadPortfolio(user.email)
        loadAllStocks()
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  const loadUserCurrency = async (userId: string) => {
    try {
      if (!supabaseRef.current) return
      const { data, error } = await supabaseRef.current
        .from('user_settings')
        .select('currency')
        .eq('user_id', userId)
        .single()

      if (!error && data) {
        setCurrency(data.currency)
      }
    } catch (error) {
      console.log('Nastavení měny nenalezeno')
    }
  }

  const loadPortfolio = async (userEmail: string) => {
    try {
      // Načtení portfolia z databáze
      if (!supabaseRef.current) return
      const { data: portfolioData, error } = await supabaseRef.current
        .from('portfolio')
        .select('*')
        .eq('user_email', userEmail)

      if (error) {
        console.error('Chyba při načítání portfolia:', error)
        return
      }

      if (!portfolioData || portfolioData.length === 0) {
        setPortfolio([])
        setTotalValue(0)
        setGainLoss(0)
        return
      }

      // Načtení aktuálních cen akcií
      const portfolioWithPrices = await Promise.all(
        portfolioData.map(async (item) => {
          try {
            const response = await fetch(`/api/get-stock-price?ticker=${item.ticker}`)
            const data = await response.json()
            return {
              ...item,
              current_price: data.price || item.price
            }
          } catch (error) {
            console.error(`Chyba při načítání ceny ${item.ticker}:`, error)
            return {
              ...item,
              current_price: item.price
            }
          }
        })
      )

      setPortfolio(portfolioWithPrices)

      // Výpočet celkové hodnoty a zisku/ztráty
      let total = 0
      let gain = 0

      portfolioWithPrices.forEach((item) => {
        const currentValue = (item.current_price || item.price) * item.quantity
        const purchaseValue = item.price * item.quantity
        total += currentValue
        gain += currentValue - purchaseValue
      })

      setTotalValue(total)
      setGainLoss(gain)
    } catch (error) {
      console.error('Chyba při načítání portfolia:', error)
    }
  }

  const loadAllStocks = async () => {
    try {
      if (!supabaseRef.current) return
      const { data, error } = await supabaseRef.current
        .from('globalni_akcie')
        .select('ticker, nazev, cena, zmena_procenta, sektor')
        .order('cena', { ascending: false })
        .limit(50)

      if (!error && data) {
        setAllStocks(data)
      }
    } catch (error) {
      console.error('Chyba při načítání akcií:', error)
    }
  }

  // Získat data pro grafy
  const getPortfolioAllocationData = () => {
    return portfolio.map((item) => ({
      name: item.ticker,
      value: (item.current_price || item.price) * item.quantity
    }))
  }

  const getTopStocksData = () => {
    return allStocks.slice(0, 10).map((stock) => ({
      name: stock.ticker,
      value: parseFloat(stock.cena) || 0
    }))
  }

  const getSectorData = () => {
    const sectorMap: Record<string, number> = {}
    allStocks.forEach((stock) => {
      const sektor = stock.sektor || 'Neznámo'
      sectorMap[sektor] = (sectorMap[sektor] || 0) + 1
    })
    return Object.entries(sectorMap).map(([sektor, count]) => ({
      sektor,
      count
    }))
  }

  if (loading) return <div className="p-10 text-white">Načítám...</div>

  return (
    <div className="flex">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 min-h-screen bg-slate-950 text-white p-8">
        {/* Header */}
        <div className="mt-12 md:mt-0 mb-8">
          <h1 className="text-4xl font-bold text-blue-500 mb-2">Dashboard</h1>
          <p className="text-slate-400">Vítej zpět, {user?.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Celková hodnota portfolia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(convertCurrencySync(totalValue, 'USD', currency), currency)}</div>
              <p className="text-xs text-slate-500 mt-1">{portfolio.length} akcií v portfoliu</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Zisk/Ztráta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {gainLoss >= 0 ? '+' : ''}{formatCurrency(convertCurrencySync(gainLoss, 'USD', currency), currency)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Od nákupu</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Počet pozic</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{portfolio.length}</div>
              <p className="text-xs text-slate-500 mt-1">Akcie v portfoliu</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        {portfolio.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <CardTitle>Alokace Portfolia</CardTitle>
              </CardHeader>
              <CardContent>
                <PortfolioAllocationChart data={getPortfolioAllocationData()} />
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <CardTitle>Top 10 Akcií (Cena)</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceBarChart data={getTopStocksData()} />
              </CardContent>
            </Card>
          </div>
        )}

        {allStocks.length > 0 && getSectorData().length > 0 && (
          <Card className="bg-slate-900 border-slate-800 text-white mb-8">
            <CardHeader>
              <CardTitle>Distribuce po Sektorech</CardTitle>
            </CardHeader>
            <CardContent>
              <SectorDistributionChart data={getSectorData()} />
            </CardContent>
          </Card>
        )}

        {/* Portfolio Table */}
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader>
            <CardTitle>Moje Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 mb-4">Zatím nemáte žádné akcie</p>
                <p className="text-sm text-slate-500">Přejděte na "Koupit Akcie" a začněte investovat</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-4 font-semibold text-slate-400">Ticker</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-400">Počet</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-400">Cena nákupu</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-400">Aktuální cena</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-400">Celkem</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-400">Zisk/Ztráta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((item) => {
                      const currentValue = (item.current_price || item.price) * item.quantity
                      const purchaseValue = item.price * item.quantity
                      const itemGainLoss = currentValue - purchaseValue
                      return (
                        <tr key={item.ticker} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-medium text-blue-400">{item.ticker}</td>
                          <td className="py-3 px-4 text-right">{item.quantity}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(convertCurrencySync(item.price, 'USD', currency), currency)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(convertCurrencySync(item.current_price || item.price, 'USD', currency), currency)}</td>
                          <td className="py-3 px-4 text-right font-semibold">{formatCurrency(convertCurrencySync(currentValue, 'USD', currency), currency)}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${itemGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {itemGainLoss >= 0 ? '+' : ''}{formatCurrency(convertCurrencySync(itemGainLoss, 'USD', currency), currency)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
