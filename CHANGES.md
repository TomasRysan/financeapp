# Oprava Výpočtu Zisku - Implementace Měn

## Problém
- Zisk/ztráta se zobrazoval jako 0
- Všechny ceny akcií jsou v USD, ale aplikace je zobrazovala jako Kč
- Nebyla možnost vybrat měnu

## Řešení Implementováno

### 1. **Systém Měn s Konverzí**
- Přidán API endpoint: `/api/exchange-rates`
- Vytvořena helper knihovna: `lib/currency.ts` s funkcemi:
  - `convertCurrencySync()` - synchronní konverze
  - `formatCurrency()` - formátování s měnou
  - `formatPrice()` - formátování jen čísla

### 2. **Ukládání Nastavení Měny**
- Vytvořena tabulka v Supabase: `user_settings`
- Uživatel si vybere měnu v **Sidebar**
- Měna se automaticky uloží do Supabase
- Aplikace ji načte při přihlášení

### 3. **Konverzní Kurzy**
```
USD = 1
EUR = 0.92
CZK = 24.5
```
*(Kurzy jsou pevně nastaveny - lze je upravit v lib/currency.ts)*

### 4. **Aktualizované Stránky**

#### Dashboard
- Celková hodnota portfolia se zobrazuje v zvolené měně
- Zisk/Ztráta se zobrazuje v zvolené měně
- Tabulka ukazuje ceny v zvolené měně

#### Portfolio
- Cena nákupu - zobrazí se v zvolené měně
- Aktuální cena - zobrazí se v zvolené měně
- Celková hodnota - v zvolené měně
- Zisk/Ztráta - v zvolené měně

#### Koupit Akcie
- Aktuální cena se zobrazuje v zvolené měně

#### Nastavení
- Přidáno tlačítko "Uložit Nastavení"
- Měna se uloží do Supabase
- Jazyk se také uloží (pro budoucí rozšíření)

#### Sidebar (Navigace)
- Nový selektor měny umístěný nahoře
- Změna měny se okamžitě uloží
- Stránka se automaticky osvěží

## Jak to Funguje

### Tok Dat
1. Uživatel si vybere měnu v Sidebar
2. Měna se uloží do `user_settings` tabulky v Supabase
3. Všechny stránky načtou měnu z Supabase
4. Ceny akcií se stahují v USD (z API)
5. Aplikace je konvertuje do zvolené měny pomocí `convertCurrencySync()`
6. Uživatel vidí hodnoty v své měně

### Výpočet Zisku
**Byla chyba:** Zisk byl počítán v USD, ale zobrazován jako Kč

**Teď:** 
```javascript
const currentValue = current_price * quantity // v USD
const purchaseValue = purchase_price * quantity // v USD
const gain = currentValue - purchaseValue // v USD
const displayGain = convertCurrencySync(gain, 'USD', currency) // konvertuj na měnu
```

## Instalace v Supabase

Spusťte SQL skript z `SUPABASE_MIGRATION.sql` nebo `CURRENCY_SETUP.md`:

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  currency VARCHAR(3) DEFAULT 'CZK',
  language VARCHAR(5) DEFAULT 'cs',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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

## Změnené Soubory

### Nové Soubory
- `lib/currency.ts` - Helper funkce pro konverzi
- `app/api/exchange-rates/route.ts` - API endpoint
- `SUPABASE_MIGRATION.sql` - SQL migrační skript
- `CURRENCY_SETUP.md` - Podrobný průvodce instalací

### Upravené Soubory
- `components/layout/Sidebar.tsx` - Přidán selektor měny
- `app/dashboard/page.tsx` - Konverze a zobrazení měny
- `app/portfolio/page.tsx` - Konverze a zobrazení měny
- `app/buy-stocks/page.tsx` - Zobrazení ceny v měně
- `app/settings/page.tsx` - Ukládání nastavení měny
- `app/dividends/page.tsx` - Opraven TypeScript problém

## Testování

1. Přihlaste se do aplikace
2. V **Sidebar** vyberte měnu (CZK, USD, EUR)
3. Měna se uloží do Supabase
4. Přejděte na **Dashboard**
5. Měly by se zobrazit ceny v zvolené měně
6. Zisk/Ztráta by měl být korektní

## Budoucí Vylepšení

- [ ] Dynamické konverzní kurzy z externího API
- [ ] Více měn
- [ ] Historické konverzní kurzy pro nákupy v minulosti
- [ ] Výběr měny pro každou pozici zvlášť
