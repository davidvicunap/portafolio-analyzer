# Portfolio Analyzer

A personal portfolio **tracker, analyzer, and SEC filings hub** built with
Next.js 16 (App Router) and deployed on Vercel. Track live value and returns,
run risk/correlation/drawdown analytics, and read the key sections of your
companies' 10-K / 10-Q filings — all in one place.

Market data comes from Yahoo Finance (via `yahoo-finance2`); filings come from
the free [SEC EDGAR API](https://www.sec.gov/edgar/sec-api-documentation).

## Features

- **Portfolio** — add / edit / remove holdings (ticker, shares, cost basis,
  purchase date, notes). Stored in the browser via `localStorage`; CSV import
  with validation and preview.
- **Dashboard** — total value, day change, total return, allocation by
  holding / sector / type, best & worst movers, sortable holdings table. Live
  quotes refresh on demand and when the tab regains focus.
- **Stock detail** (`/stock/[ticker]`) — price chart with 1D–MAX ranges, an
  S&P 500 overlay, key metrics (P/E, P/B, EPS, dividend yield, beta, 52-week
  range, volume), and company profile.
- **Analytics** (`/analytics`) — time-weighted & annualized return, volatility,
  beta and Sharpe ratio (configurable risk-free rate), a correlation heatmap,
  a drawdown chart, and sector-concentration warnings.
- **SEC filings** (`/filings/[ticker]`) — recent 10-K, 10-Q, 8-K, DEF 14A, S-1,
  and 13F-HR filings with direct links to SEC.gov, plus a reader that extracts
  Risk Factors, MD&A, and market-risk disclosures from 10-Ks and 10-Qs.

## Architecture

All external calls run **server-side** in Next.js Route Handlers (`/app/api/*`),
never from the browser. The client calls our own API; the server fetches from
Yahoo / SEC and returns clean, normalized JSON. This keeps the request pattern
consistent and keeps any future API keys off the client.

```
app/
  dashboard, stock/[ticker], analytics,
  filings/[ticker], filings/[ticker]/[accession], portfolio/import
  api/
    quote, quote/[ticker], historical/[ticker], summary/[ticker], profiles
    portfolio/analytics
    sec/cik/[ticker], sec/filings/[ticker], sec/filing/[accession]
lib/
  yahoo/      yahoo-finance2 wrapper (retries + in-memory TTL cache)
  sec/        EDGAR client (User-Agent enforced) + 10-K/10-Q section parser
  analytics/  returns, risk, correlation, drawdown, concentration math
  storage/    portfolio persistence seam (localStorage today)
components/   charts, tables, portfolio, ui primitives
```

The storage layer (`lib/storage/portfolio.ts`) is an interface, so swapping
`localStorage` for Vercel KV / Postgres / Supabase later is a one-file change.

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit SEC_USER_AGENT
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable          | Required | Description                                                                 |
| ----------------- | -------- | --------------------------------------------------------------------------- |
| `SEC_USER_AGENT`  | Yes\*    | Descriptive UA SEC requires, e.g. `"Jane Doe jane@example.com"`. Without it, all SEC filings features return an error. |

\* Required only for the SEC filings features; market data works without it.

## Deploying on Vercel

1. Push to a Git repo and import it at [vercel.com/new](https://vercel.com/new).
2. In **Project → Settings → Environment Variables**, add `SEC_USER_AGENT`
   for Production (and Preview).
3. Deploy. Yahoo and SEC requests run in Node serverless functions.

## Notes & limitations

- Yahoo Finance is an **unofficial** data source (`yahoo-finance2`). It's
  reliable but can break when Yahoo changes things. The backend-for-frontend
  design means swapping in a paid provider (Polygon, Finnhub, Alpha Vantage)
  later only touches `lib/yahoo`.
- The SEC reader extracts narrative sections (Risk Factors, MD&A, market risk)
  as readable text. Financial-statement tables are intentionally left to the
  original filing, which is always linked prominently.
- This is a single-user app; holdings live in your browser, not a database.

Not investment advice. Data may be delayed or inaccurate — verify against
primary sources before making decisions.
