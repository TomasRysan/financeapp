'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Menu, X, BarChart3, TrendingUp, Percent, Settings, LogOut, Briefcase, Trophy } from 'lucide-react'

interface SidebarUser {
  id: string
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [currency, setCurrency] = useState('CZK')
  const [user, setUser] = useState<SidebarUser | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const loadCurrency = useCallback(async (userId: string) => {
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

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency)
    if (user) {
      try {
        await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: user.id,
              currency: newCurrency,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
        router.refresh()
      } catch (error) {
        console.error('Chyba pri ukladani meny:', error)
      }
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { label: 'Zebricky', href: '/marketplace', icon: Trophy },
    { label: 'Koupit Akcie', href: '/buy-stocks', icon: TrendingUp },
    { label: 'Sprava Portfolia', href: '/portfolio', icon: Briefcase },
    { label: 'Dividendy', href: '/dividends', icon: Percent },
    { label: 'Nastaveni', href: '/settings', icon: Settings },
  ]

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await loadCurrency(user.id)
      }
    }

    loadUser()
  }, [loadCurrency, supabase])

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-800 bg-slate-900 p-2 text-white hover:bg-slate-800 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 transform border-r border-slate-800 bg-slate-900 p-6 text-white transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-500">Finance</h1>
          <p className="text-xs text-slate-500">Investment Manager</p>
        </div>

        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <label className="mb-2 block text-xs text-slate-400">Mena</label>
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="h-9 border-slate-600 bg-slate-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (EUR)</SelectItem>
              <SelectItem value="CZK">CZK (Kc)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <nav className="mb-8 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            onClick={handleSignOut}
            variant="destructive"
            className="flex w-full items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Odhlasit se
          </Button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
