# ExpoFin

ExpoFin is a bilingual personal finance tracker for recording income and expenses. It is built as a React + Vite single-page app with Supabase authentication and a Supabase-backed transaction store.

The app is especially tuned for day-to-day money tracking across Myanmar Kyat (MMK) and Thai Baht (THB). It keeps each currency separate, so balances and category totals are shown in the selected currency without applying exchange-rate conversion.

## Core functionality

- Email/password sign up and sign in through Supabase Auth.
- User-isolated transaction storage through Supabase Row Level Security.
- Add income and expense records with amount, currency, date, category, payment method, and an optional short remark.
- Edit and delete existing transactions.
- View monthly balance, total income, and total expenses.
- Switch balance and category summaries between MMK and THB.
- Review expenses grouped by category.
- Filter transaction history by income/expense type and payment method.
- Paginated transaction history with 10 records per page.
- English and Myanmar language UI, with the selected language saved in local storage.
- Mobile-friendly dashboard layout with a dark finance-focused interface.

## Transaction model

Each transaction contains:

- `type`: `income` or `expense`
- `currency`: `MMK` or `THB`
- `amount`
- `category`
- `payment_method`
- `date`
- optional `remark`

Expense categories include Meter Bills, Food, Groceries, Electronics, Transport, Entertainment, Health, and Other.

Income categories include Salary, Bonus, Freelance, Investment, Gift, and Other.

MMK payment methods include cash, KPay, Wave, and bank transfer. THB payment methods include cash, TrueMoney, and bank transfer.

## Tech stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- Supabase Auth and database
- React Router
- date-fns
- lucide-react icons

## Run locally

Prerequisites:

- Node.js
- A Supabase project

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Set the Supabase variables in `.env.local`:

   ```bash
   VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
   VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
   ```

4. In your Supabase SQL Editor, run the schema in `supabase-schema.sql`.

   This creates the `transactions` table, enables Row Level Security, and adds policies so users can only access their own records.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open the local Vite URL, usually:

   ```text
   http://localhost:3000
   ```

## Available scripts

- `npm run dev`: start the Vite development server on port 3000.
- `npm run build`: create a production build.
- `npm run preview`: preview the production build locally.
- `npm run lint`: run TypeScript checks without emitting files.
- `npm run clean`: remove generated build/server output.

## Notes

- The app requires Supabase configuration before authentication and transaction storage can work.
