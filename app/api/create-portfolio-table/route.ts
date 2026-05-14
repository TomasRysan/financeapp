import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )

  try {
    // Vytvoření tabulky portfolio pomocí SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS portfolio (
          id SERIAL PRIMARY KEY,
          user_email TEXT NOT NULL,
          ticker TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          purchase_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own portfolio" ON portfolio;
        CREATE POLICY "Users can view own portfolio" ON portfolio 
          FOR SELECT USING (auth.email() = user_email);
        
        DROP POLICY IF EXISTS "Users can insert own portfolio" ON portfolio;
        CREATE POLICY "Users can insert own portfolio" ON portfolio 
          FOR INSERT WITH CHECK (auth.email() = user_email);
      `
    })

    if (error) {
      console.error('Error creating table:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Tabulka portfolio vytvořena úspěšně' })
  } catch (err: any) {
    console.error('Chyba při vytváření tabulky:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}