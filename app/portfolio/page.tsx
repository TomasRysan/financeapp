'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Sidebar from '@/components/layout/Sidebar'
import { convertCurrencySync, formatCurrency } from '@/lib/currency'

interface PortfolioItem {
  id: number
  ticker: string
  quantity: number
  price: number
  purchase_date: string
  current_price?: number
}

export default function PortfolioManagement() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null)
  const [sellQuantity, setSellQuantity] = useState<string>('')
  const [selling, setSelling] = useState(false)
  const [currency, setCurrency] = useState('CZK')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
      } else {
        setUser(user)
        await loadUserCurrency(user.id)
        loadPortfolio(user.email)
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  const loadUserCurrency = async (userId: string) => {
    try {
      const { data, error } = await supabase
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
      const { data: portfolioData, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_email', userEmail)

      if (error) {
        console.error('Chyba při načítání portfolia:', error)
        return
      }

      if (!portfolioData || portfolioData.length === 0) {
        setPortfolio([])
        return
      }

      // Načtení aktuálních cen
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
    } catch (error) {
      console.error('Chyba při načítání portfolia:', error)
    }
  }

  const handleSellStock = async () => {
    if (!selectedItem || !sellQuantity) {
      alert('Vyberte akcii a zadejte počet')
      return
    }

    const sellQty = parseInt(sellQuantity)
    if (sellQty <= 0 || sellQty > selectedItem.quantity) {
      alert('Neplatný počet akcií')
      return
    }

    setSelling(true)
    try {
      if (sellQty === selectedItem.quantity) {
        // Smazat celou pozici
        const { error } = await supabase
          .from('portfolio')
          .delete()
          .eq('id', selectedItem.id)

        if (error) throw error
      } else {
        // Snížit počet
        const { error } = await supabase
          .from('portfolio')
          .update({ quantity: selectedItem.quantity - sellQty })
          .eq('id', selectedItem.id)

        if (error) throw error
      }

      alert('Akcie úspěšně prodány!')
      setSelectedItem(null)
      setSellQuantity('')
      loadPortfolio(user.email)
    } catch (error) {
      console.error('Chyba při prodeji:', error)
      alert(`Chyba při prodeji: ${error}`)
    } finally {
      setSelling(false)
    }
  }

  if (loading) return <div className="p-10 text-white">Načítám...</div>

  return (
    <div className="flex">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 min-h-screen bg-slate-950 text-white p-8">
        <div className="mt-12 md:mt-0 mb-8">
          <h1 className="text-4xl font-bold text-blue-500 mb-2">Správa Portfolia</h1>
          <p className="text-slate-400">Spravujte a prodávejte vaše akcie</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Portfolio List */}
          <div className="md:col-span-2">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <CardTitle>Moje Pozice</CardTitle>
              </CardHeader>
              <CardContent>
                {portfolio.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    Zatím nemáte žádné akcie
                  </div>
                ) : (
                  <div className="space-y-3">
                    {portfolio.map((item) => {
                      const currentValue = (item.current_price || item.price) * item.quantity
                      const purchaseValue = item.price * item.quantity
                      const gain = currentValue - purchaseValue
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                            selectedItem?.id === item.id
                              ? 'border-blue-500 bg-slate-800/50'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-lg text-blue-400">{item.ticker}</div>
                              <div className="text-sm text-slate-400">Nákup: {item.purchase_date}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold">{item.quantity} ks</div>
                              <div className={`font-semibold ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {gain >= 0 ? '+' : ''}{formatCurrency(convertCurrencySync(gain, 'USD', currency), currency)}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-slate-400">
                            <div>Nákup: {formatCurrency(convertCurrencySync(item.price, 'USD', currency), currency)}</div>
                            <div>Aktuálně: {formatCurrency(convertCurrencySync(item.current_price || item.price, 'USD', currency), currency)}</div>
                            <div className="text-right font-semibold text-white">Celkem: {formatCurrency(convertCurrencySync(currentValue, 'USD', currency), currency)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sell Panel */}
          <div>
            <Card className="bg-slate-900 border-slate-800 text-white sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Prodej Akcií</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedItem ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-400 block mb-1">Ticker</Label>
                      <div className="p-2 bg-slate-800 rounded text-blue-400 font-bold">
                        {selectedItem.ticker}
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-400 block mb-1">Dostupné: {selectedItem.quantity} ks</Label>
                      <Input
                        type="number"
                        min="1"
                        max={selectedItem.quantity}
                        placeholder="Počet k prodeji"
                        className="bg-slate-800 border-slate-700"
                        value={sellQuantity}
                        onChange={(e) => setSellQuantity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 block mb-1">Aktuální cena</Label>
                      <div className="p-2 bg-slate-800 rounded">
                        {formatCurrency(convertCurrencySync((selectedItem.current_price || selectedItem.price) * (parseInt(sellQuantity) || 1), 'USD', currency), currency)}
                      </div>
                    </div>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={handleSellStock}
                      disabled={selling || !sellQuantity}
                    >
                      {selling ? 'Prodávám...' : '🔴 Prodat'}
                    </Button>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    Vyberte akcii k prodeji
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
