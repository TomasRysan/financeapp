# Implementace Měny - Průvodce Instalací

Tato aplikace nyní podporuje práci s více měnami (CZK, USD, EUR). Postupujte podle kroků níže.

## Krok 1: Vytvoření tabulky v Supabase

1. Přejděte do vaší Supabase administračního panelu
2. Klikněte na "SQL Editor" 
3. Spusťte následující SQL skript:

```sql
-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  currency VARCHAR(3) DEFAULT 'CZK',
  language VARCHAR(5) DEFAULT 'cs',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS Policy
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## Krok 2: Jak to funguje

### Volba Měny
- V **Sidebar** (levém panelu) nyní vidíte selektor měny
- Vyberte si CZK, USD nebo EUR
- Nastavení se automaticky uloží do databáze

### Konverze Cen
- Všechny ceny akcií z API se stahují v USD
- Aplikace automaticky konvertuje ceny na vaši vybranou měnu
- Konverzní kurzy:
  - USD: 1
  - EUR: 0.92
  - CZK: 24.5

### Zobrazení Zisku/Ztráty
- Na **Dashboardu** se nyní zobrazuje zisk/ztráta v zvolené měně
- V tabulce jsou všechny ceny a kalkulace v zvolené měně
- V **Portfóliu** se také aplikuje konverze měny

## Krok 3: Aktualizace Cen

Při kliknutí na "Aktualizovat Ceny Akcií" v **Nastavení**:
- Ceny se stahují v USD z API
- Jsou uloženy v databázi v USD
- Aplikace je konvertuje na vašu měnu v reálném čase

## Krok 4: Údaje o Nákupech

Při koupi akcií:
- Zadáte počet akcií
- Cena se automaticky načte z API (v USD)
- Nákupní cena se uloží v USD
- Při prohlížení se zobrazuje v zvolené měně

## Soubory, které byly změněny/přidány

- **`lib/currency.ts`** - Funkce pro konverzi měn a formátování
- **`app/api/exchange-rates/route.ts`** - API endpoint pro konverzi
- **`components/layout/Sidebar.tsx`** - Přidán selektor měny
- **`app/dashboard/page.tsx`** - Aktualizováno pro zobrazení měny
- **`app/portfolio/page.tsx`** - Aktualizováno pro zobrazení měny
- **`app/buy-stocks/page.tsx`** - Aktualizováno pro zobrazení měny
- **`app/settings/page.tsx`** - Přidáno ukládání nastavení měny

## Řešení Problémů

### Zisk/Ztráta se zobrazuje jako 0
- Ujistěte se, že jste nakoupili akcie
- Klikněte na "Aktualizovat Ceny Akcií" v Nastavení
- Měny musí být správně konvertovány

### Měna se neukládá
- Ujistěte se, že tabulka `user_settings` existuje v Supabase
- Zkontrolujte RLS politiky
- Zkontrolujte, zda je `user_id` správně nastavena

### Chybné konverzní kurzy
- Kurzy jsou pevně nastaveny v souboru `lib/currency.ts`
- Chcete-li je aktualizovat, editujte konstantu `EXCHANGE_RATES` v tomto souboru
- Pro dynamické kurzy by bylo potřeba API (např. Alpha Vantage)
