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

  try {
    // Načteme všechny akcie z databáze
    const { data: stocks, error: fetchError } = await supabase
      .from('globalni_akcie')
      .select('ticker, cena')
      .limit(100);

    if (fetchError) throw fetchError;
    if (!stocks || stocks.length === 0) {
      return NextResponse.json({ zprava: "Žádné akcie k aktualizaci" });
    }

    console.log(`Aktualizuji ceny pro ${stocks.length} akcií...`);

    // Aktualizujeme ceny
    const updatedStocks = await Promise.all(
      stocks.map(async (stock) => {
        try {
          const priceResponse = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${stock.ticker}&token=${API_KEY}`
          );
          const priceData = await priceResponse.json();
          
          return {
            ticker: stock.ticker,
            cena: priceData.c || stock.cena,
            zmena_procenta: priceData.dp || 0,
            posledni_aktualizace: new Date().toISOString()
          };
        } catch (err) {
          console.error(`Chyba při aktualizaci ${stock.ticker}:`, err);
          return {
            ticker: stock.ticker,
            cena: stock.cena,
            zmena_procenta: 0,
            posledni_aktualizace: new Date().toISOString()
          };
        }
      })
    );

    // Uložíme aktualizované ceny
    const { error: updateError } = await supabase
      .from('globalni_akcie')
      .upsert(updatedStocks, { onConflict: 'ticker' });

    if (updateError) throw updateError;

    return NextResponse.json({ 
      zprava: "Ceny akcií úspěšně aktualizovány!", 
      pocet: updatedStocks.length
    });

  } catch (err: any) {
    console.error("Chyba při aktualizaci cen:", err.message);
    return NextResponse.json({ chyba: err.message }, { status: 500 });
  }
}
