// Konverzní tabulka (USD = 1)
const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1,
  'CZK': 24.5,
  'EUR': 0.92
}

// Synchronní funkce pro konverzi měn
export function convertCurrencySync(amount: number, from: string = 'USD', to: string = 'CZK'): number {
  if (from === to) return amount
  if (!EXCHANGE_RATES[from] || !EXCHANGE_RATES[to]) return amount

  // Nejdřív na USD, pak na cílovou měnu
  const usdAmount = amount / EXCHANGE_RATES[from]
  const convertedAmount = usdAmount * EXCHANGE_RATES[to]

  return Math.round(convertedAmount * 100) / 100
}

// Async verze (nepoužívat v render)
export async function convertCurrency(amount: number, from: string = 'USD', to: string = 'CZK'): Promise<number> {
  if (from === to) return amount

  try {
    const response = await fetch(`/api/exchange-rates?from=${from}&to=${to}&amount=${amount}`)
    const data = await response.json()
    return data.converted || amount
  } catch (error) {
    console.error('Chyba při konverzi měny:', error)
    return amount
  }
}

// Formátování ceny s měnou
export function formatCurrency(value: number, currency: string = 'CZK'): string {
  const symbols: Record<string, string> = {
    'CZK': 'Kč',
    'USD': '$',
    'EUR': '€'
  }

  return `${formatPrice(value)} ${symbols[currency] || currency}`
}

// Zkrácená formátace (jen číslo)
export function formatPrice(value: number, decimals: number = 2): string {
  return (Math.round(value * 100) / 100).toFixed(decimals)
}
