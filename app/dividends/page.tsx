'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Sidebar from '@/components/layout/Sidebar'

interface PortfolioItem {
  ticker: string
  quantity: number
  price: number
}

export default function Dividends() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
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
        if (user.email) loadPortfolio(user.email)
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  const loadPortfolio = async (userEmail: string) => {
    try {
      if (!supabaseRef.current) return
      const { data: portfolioData, error } = await supabaseRef.current
        .from('portfolio')
        .select('ticker, quantity, price')
        .eq('user_email', userEmail)

      if (error) {
        console.error('Chyba při načítání portfolia:', error)
        return
      }

      setPortfolio(portfolioData || [])
    } catch (error) {
      console.error('Chyba při načítání portfolia:', error)
    }
  }

  if (loading) return <div className="p-10 text-white">Načítám...</div>

  return (
    <div className="flex">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 min-h-screen bg-slate-950 text-white p-8">
        <div className="mt-12 md:mt-0 mb-8">
          <h1 className="text-4xl font-bold text-blue-500 mb-2">Dividendy</h1>
          <p className="text-slate-400">Přehled vašich přijatých dividend a potenciálních výnosů</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Akcie s Dividendami</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{portfolio.length}</div>
              <p className="text-xs text-slate-500 mt-1">V portfoliu</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Rok Dividend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">-</div>
              <p className="text-xs text-slate-500 mt-1">Čekající na data</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Výnos (div. %)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">-</div>
              <p className="text-xs text-slate-500 mt-1">Neznámo</p>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Stocks with Dividends Info */}
        <Card className="bg-slate-900 border-slate-800 text-white mb-6">
          <CardHeader>
            <CardTitle>Vaše Akcie</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 mb-4">Zatím nemáte žádné akcie v portfoliu</p>
                <p className="text-sm text-slate-500">Přejděte na "Koupit Akcie" a začněte investovat</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-4 font-semibold text-slate-400">Ticker</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-400">Počet</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-400">Cena Nákupu</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-400">Div. Výnos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((item) => (
                      <tr key={item.ticker} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-medium text-blue-400">{item.ticker}</td>
                        <td className="py-3 px-4 text-right">{item.quantity}</td>
                        <td className="py-3 px-4 text-right">{item.price.toFixed(2)} Kč</td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          <span className="bg-slate-800 px-2 py-1 rounded text-xs">Zatím neurčeno</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-900/20 border-blue-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-blue-400">ℹ️ O Dividendách</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-2">
            <p>
              Dividendy jsou pravidelné výplaty zisků akciové společnosti pro její akcionáře. 
              Částka dividend je určena počtem vlastněných akcií.
            </p>
            <p>
              Tato aplikace Soon bude zobrazovat dividend data z externích zdrojů. 
              Zatím můžete manuálně zaznamenávat obdržené dividendy v "Nastavení" → "Správa Dividend".
            </p>
            <p className="text-xs text-slate-400">
              Tip: Akcie technologických společností často nevyplácují dividendy, 
              ale stabilní společnosti (utility, banky, energie) je obvykle vyplácejí pravidelně.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
