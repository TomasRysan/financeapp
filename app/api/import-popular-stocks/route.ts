import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const API_KEY = 'd6kj1gpr01qg51f44bg0d6kj1gpr01qg51f44bgg';
  const cookieStore = await cookies();
  
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

  // Populární akcie pro import
  const popularStocks = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM',
    'V', 'WMT', 'JNJ', 'PG', 'PYPL', 'IBM', 'INTC', 'AMD',
    'BA', 'GE', 'F', 'T', 'VZ', 'KO', 'PEP', 'MCD',
    'DIS', 'NKE', 'CSCO', 'ADBE', 'CRM', 'ORCL', 'NFLX', 'UBER'
  ];

  try {
    console.log(`Stahuji ${popularStocks.length} populárních akcií...`);

    const stocksToInsert = await Promise.all(
      popularStocks.map(async (ticker) => {
        try {
          const priceResponse = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`
          );
          const priceData = await priceResponse.json();
          
          const companyResponse = await fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${API_KEY}`
          );
          const companyData = await companyResponse.json();
          
          return {
            ticker,
            nazev: companyData.name || ticker,
            sektor: companyData.finnhubIndustry || '',
            cena: priceData.c || 0,
            zmena_procenta: priceData.dp || 0,
            kapitalizace: companyData.marketCapitalization || 0,
            posledni_aktualizace: new Date().toISOString()
          };
        } catch (err) {
          console.error(`Chyba při fetchování ${ticker}:`, err);
          return {
            ticker,
            nazev: ticker,
            sektor: '',
            cena: 0,
            zmena_procenta: 0,
            kapitalizace: 0,
            posledni_aktualizace: new Date().toISOString()
          };
        }
      })
    );

    const { error } = await supabase
      .from('globalni_akcie')
      .upsert(stocksToInsert, { onConflict: 'ticker' });

    if (error) throw error;

    return NextResponse.json({ 
      zprava: "Populární akcie úspěšně importovány!", 
      pocet: stocksToInsert.length
    });

  } catch (err: any) {
    console.error("Chyba:", err.message);
    return NextResponse.json({ chyba: err.message }, { status: 500 });
  }
}
