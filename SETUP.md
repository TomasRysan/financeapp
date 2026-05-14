# Finance App - Správce Portfolia

Moderní webová aplikace pro správu a sledování investičního portfolia akcií.

## ✨ Funkce

- **Dashboard** - Přehled vašeho portfolia s aktuálními cenami a zisky/ztrátami
- **Nákup Akcií** - Koupt akcie ze seznamu 100+ globálních akcií s automatickými cenami
- **Správa Portfolia** - Prodej akcií a správa pozic
- **Dividendy** - Sledování dividend (budoucí vylepšení)
- **Aktualizace Cen** - Automatické stahování nejnovějších cen akcií z Finnhub API

## 🚀 Instalace a Spuštění

### Požadavky
- Node.js 18+
- Supabase účet (pro databázi a autentifikaci)
- Finnhub API klíč (zdarma na https://finnhub.io)

### Nastavení

1. **Klonuj a instaluj** 
```bash
npm install
```

2. **环境 proměnné**
Vytvoř `.env.local` soubor:
```
NEXT_PUBLIC_SUPABASE_URL=tvůj_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvůj_supabase_anon_klíč
```

3. **Spusti aplikaci**
```bash
npm run dev
```

Aplikace bude dostupná na `http://localhost:3000`

## 🗄️ Supabase Setup

### Tabulky které potřebuješ:

1. **portfolio** - Vaše vlastněné akcie
   - `id` (SERIAL PRIMARY KEY)
   - `user_email` (TEXT) - Email uživatele
   - `ticker` (TEXT) - Akciový ticker (např. AAPL)
   - `quantity` (INTEGER) - Počet akcií
   - `price` (DECIMAL) - Cena nákupu za akcii
   - `purchase_date` (DATE) - Datum nákupu
   - `created_at` (TIMESTAMP DEFAULT NOW())

2. **globalni_akcie** - Globální seznam akcií
   - `ticker` (TEXT PRIMARY KEY) - Akciový ticker
   - `nazev` (TEXT) - Název společnosti
   - `cena` (DECIMAL) - Aktuální cena
   - `zmena_procenta` (DECIMAL) - Procentuální změna za den
   - `kapitalizace` (DECIMAL) - Tržní kapitalizace
   - `posledni_aktualizace` (TIMESTAMP) - Čas poslední aktualizace

### Row Level Security

Pro tabulku `portfolio` nastav RLS politiky:
- SELECT: `auth.email() = user_email`
- INSERT: `auth.email() = user_email`

## 📱 Použití

### Dashboard
1. Přihlásit se nebo zaregistrovat
2. Vidět přehled svého portfolia
3. Sledovat zisky/ztráty a aktuální hodnoty

### Koupit Akcie
1. Jít na "Koupit Akcie"
2. Vybrat akcii ze seznamu
3. Zadat počet akcií
4. Cena se automaticky načte
5. Kliknout "Nakoupit Akcie"

### Správa Portfolia
1. Jít na "Správa Portfolia"
2. Vybrat akcii k prodeji
3. Zadat počet akcií k prodeji
4. Kliknout "Prodat"

### Aktualizace Dat
1. Jít na "Nastavení"
2. Kliknout "📥 Importovat 100 akcií" - stáhne seznam akcií
3. Kliknout "♻️ Aktualizovat Ceny Akcií" - aktualizuje ceny

## 🔗 API Endpointy

- `GET /api/get-stock-price?ticker=AAPL` - Načti aktuální cenu
- `GET /api/import-stocks` - Importuj 100 akcií do databáze
- `GET /api/update-stock-prices` - Aktualizuj všechny ceny
- `POST /api/create-portfolio-table` - Vytvoř tabulku portfolio

## 🛠️ Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Pro type-safety
- **Supabase** - Backend a databáze
- **Tailwind CSS** - Styling
- **Lucide React** - Ikony
- **Finnhub API** - Ceny akcií

## 📝 Poznámky

- Akcie se stahují z amerického trhu (US Exchange)
- Ceny jsou v USD (doporučujeme přidat konverzi na CZK)
- Aplikace běží na bezpečných WebSocket připojeních
- Všechna data uživatele jsou chráněna RLS politikami

## 🐛 Tipy na Opravy

Pokud se akcie nezobrazují na dashboardu:
1. Jdi na Nastavení → "📥 Importovat 100 akcií"
2. Počkej až se import dokončí
3. Vrať se na Dashboard a obnovit stránku (F5)

Pokud ceny nejsou aktuální:
1. Jdi na Nastavení → "♻️ Aktualizovat Ceny Akcií"
2. Počkej až se aktualizace dokončí
3. Obnovit stránku

## 📧 Podpora

Pro problémy kontaktuj vývojáře nebo aktualizuj Finnhub klíč.

---

**Verze:** 1.0  
**Poslední aktualizace:** Březen 2026
