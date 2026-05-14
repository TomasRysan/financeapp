'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  // Pokud už je uživatel přihlášen, pošli ho rovnou na dashboard
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) router.push('/dashboard')
    }
    checkUser()
  }, [router, supabase.auth])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) alert(error.message)
      else router.push('/dashboard') // Díky vypnutému potvrzení e-mailu jdeme hned dál
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{isLogin ? 'Přihlášení' : 'Registrace'}</CardTitle>
          <CardDescription className="text-slate-400">Vítejte ve své investiční aplikaci</CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="vas@email.cz" className="bg-slate-800 border-slate-700" onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Heslo</Label>
              <Input id="password" type="password" className="bg-slate-800 border-slate-700" onChange={e => setPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-5" disabled={loading}>
              {loading ? "Pracuji..." : (isLogin ? "Vstoupit" : "Vytvořit účet")}
            </Button>
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-slate-400 hover:text-white">
              {isLogin ? "Nemáte účet? Zaregistrujte se" : "Už máte účet? Přihlaste se"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )}