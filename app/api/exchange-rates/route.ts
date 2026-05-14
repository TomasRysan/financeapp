import { NextResponse } from 'next/server'

// Cacherované Exchange rates (aktualizovat denně)
let exchangeRates = {
  'USD': 1,
  'CZK': 24.5,
  'EUR': 0.92
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = (searchParams.get('from') || 'USD').toUpperCase()
  const to = (searchParams.get('to') || 'USD').toUpperCase()
  const amount = parseFloat(searchParams.get('amount') || '1')

  if (!exchangeRates[from as keyof typeof exchangeRates] || !exchangeRates[to as keyof typeof exchangeRates]) {
    return NextResponse.json({ error: 'Nepodporovaná měna' }, { status: 400 })
  }

  try {
    // Konverze: nejdřív na USD, pak na cílovou měnu
    const usdAmount = amount / exchangeRates[from as keyof typeof exchangeRates]
    const convertedAmount = usdAmount * exchangeRates[to as keyof typeof exchangeRates]

    return NextResponse.json({
      from,
      to,
      amount,
      converted: Math.round(convertedAmount * 100) / 100,
      rate: Math.round((exchangeRates[to as keyof typeof exchangeRates] / exchangeRates[from as keyof typeof exchangeRates]) * 10000) / 10000
    })
  } catch (error) {
    console.error('Chyba při konverzi:', error)
    return NextResponse.json({ error: 'Chyba při konverzi měny' }, { status: 500 })
  }
}
