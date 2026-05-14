'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Sidebar from '@/components/layout/Sidebar'

interface SettingsUser {
  id: string
  email?: string | null
}

export default function Settings() {
  const [user, setUser] = useState<SettingsUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('CZK')
  const [language, setLanguage] = useState('cs')
  const [importing, setImporting] = useState(false)
  const [importingPopular, setImportingPopular] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [importLimit, setImportLimit] = useState('500')
  const [importMessage, setImportMessage] = useState('')
  const [importPopularMessage, setImportPopularMessage] = useState('')
  const [updateMessage, setUpdateMessage] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  if (typeof window !== 'undefined' && !supabaseRef.current) {
    supabaseRef.current = createClient()
  }

  const router = useRouter()

  const loadUserSettings = useCallback(async (userId: string) => {
    try {
      if (!supabaseRef.current) return
      const { data, error } = await supabaseRef.current
        .from('user_settings')
        .select('currency, language')
        .eq('user_id', userId)
        .single()

      if (!error && data) {
        setCurrency(data.currency || 'CZK')
        setLanguage(data.language || 'cs')
      }
    } catch {
      console.log('Nastaveni nenalezena, pouzivam vychozi')
    }
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      if (!supabaseRef.current) return
      const {
        data: { user },
      } = await supabaseRef.current.auth.getUser()

      if (!user) {
        router.push('/')
      } else {
        setUser(user)
        await loadUserSettings(user.id)
      }

      setLoading(false)
    }

    checkUser()
  }, [loadUserSettings, router])

  const handleSaveSettings = async () => {
    if (!user || !supabaseRef.current) return

    setSavingSettings(true)
    setSettingsMessage('Ukladam nastaveni...')

    try {
      const { error } = await supabaseRef.current
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            currency,
            language,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) throw error

      setSettingsMessage('Nastaveni uspesne ulozeno.')
      setTimeout(() => setSettingsMessage(''), 3000)
    } catch (error) {
      console.error('Chyba pri ukladani nastaveni:', error)
      setSettingsMessage('Chyba pri ukladani nastaveni.')
      setTimeout(() => setSettingsMessage(''), 3000)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleImportStocks = async () => {
    setImporting(true)
    setImportMessage('Importuji akcie...')
    try {
      const response = await fetch(`/api/import-stocks?limit=${importLimit}`)
      const data = await response.json()
      if (response.ok) {
        setImportMessage(
          `${data.zprava} (${data.pocet} akcii, naceneno ${data.naceneno}${data.enrichPrices ? '' : ', ceny se budou nacitat hlavne az pri vyberu'})`
        )
      } else {
        setImportMessage(`Chyba: ${data.chyba}`)
      }
    } catch (error) {
      setImportMessage(`Chyba pri importu: ${error}`)
    } finally {
      setImporting(false)
    }
  }

  const handleUpdatePrices = async () => {
    setUpdating(true)
    setUpdateMessage('Aktualizuji ceny...')
    try {
      const response = await fetch('/api/update-stock-prices')
      const data = await response.json()
      if (response.ok) {
        setUpdateMessage(`${data.zprava} (${data.pocet} akcii)`)
      } else {
        setUpdateMessage(`Chyba: ${data.chyba}`)
      }
    } catch (error) {
      setUpdateMessage(`Chyba pri aktualizaci: ${error}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleImportPopularStocks = async () => {
    setImportingPopular(true)
    setImportPopularMessage('Importuji popularni akcie...')
    try {
      const response = await fetch('/api/import-popular-stocks')
      const data = await response.json()
      if (response.ok) {
        setImportPopularMessage(`${data.zprava} (${data.pocet} akcii)`)
      } else {
        setImportPopularMessage(`Chyba: ${data.chyba}`)
      }
    } catch (error) {
      setImportPopularMessage(`Chyba pri importu: ${error}`)
    } finally {
      setImportingPopular(false)
    }
  }

  if (loading) return <div className="p-10 text-white">Nacitam...</div>

  return (
    <div className="flex">
      <Sidebar />

      <main className="min-h-screen flex-1 bg-slate-950 p-8 text-white md:ml-64">
        <div className="mb-8 mt-12 md:mt-0">
          <h1 className="mb-2 text-4xl font-bold text-blue-500">Nastaveni</h1>
          <p className="text-slate-400">Spravuj sve udaje a akcie</p>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card className="border-2 border-blue-600 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-blue-400">Sprava Databaze</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                    onClick={handleImportPopularStocks}
                    disabled={importingPopular}
                  >
                    {importingPopular ? 'Importuji...' : 'Importovat Popularni Akcie (32)'}
                  </Button>
                  {importPopularMessage && (
                    <p className={importPopularMessage.startsWith('Chyba') ? 'text-red-400 text-sm' : 'text-green-400 text-sm'}>
                      {importPopularMessage}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="importLimit">Kolik akcii importovat</Label>
                  <Select value={importLimit} onValueChange={setImportLimit}>
                    <SelectTrigger id="importLimit" className="border-slate-700 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 akcii</SelectItem>
                      <SelectItem value="500">500 akcii</SelectItem>
                      <SelectItem value="1000">1000 akcii</SelectItem>
                      <SelectItem value="2500">2500 akcii</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">
                    Vetsi import trva dele. Ceny se stahuji po davkach z Finnhub API.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleImportStocks}
                    disabled={importing}
                  >
                    {importing ? 'Importuji...' : `Importovat ${importLimit} akcii`}
                  </Button>
                  {importMessage && (
                    <p className={importMessage.startsWith('Chyba') ? 'text-red-400 text-sm' : 'text-green-400 text-sm'}>
                      {importMessage}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={handleUpdatePrices}
                    disabled={updating}
                  >
                    {updating ? 'Aktualizuji...' : 'Aktualizovat Ceny Akcii'}
                  </Button>
                  {updateMessage && (
                    <p className={updateMessage.startsWith('Chyba') ? 'text-red-400 text-sm' : 'text-green-400 text-sm'}>
                      {updateMessage}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle>Informace o Uctu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-slate-400">Email</Label>
                  <div className="rounded-lg bg-slate-800 p-3 text-slate-300">{user?.email}</div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-400">ID Uzivatele</Label>
                  <div className="break-all rounded-lg bg-slate-800 p-3 font-mono text-sm text-slate-400">{user?.id}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle>Predvolby</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="currency">Mena</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - Americky dolar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="CZK">CZK - Ceska koruna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="language">Jazyk</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cs">Cestina</SelectItem>
                      <SelectItem value="en">Anglictina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Ukladam...' : 'Ulozit Nastaveni'}
                </Button>
                {settingsMessage && (
                  <p className={settingsMessage.startsWith('Chyba') ? 'mt-2 text-red-400 text-sm' : 'mt-2 text-green-400 text-sm'}>
                    {settingsMessage}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
