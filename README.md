# Noteflow — Meeting Intelligence

A meeting notes app that combines written and audio notes, generates AI-powered summaries with action items, and drafts follow-up emails.

## Features

- **Audio recording** with live waveform visualization
- **AI transcription** of recorded audio
- **Written notes** editor
- **AI meeting summaries** with key points, decisions, and action items
- **Auto-drafted follow-up emails** from your summary
- **Multi-meeting** management via sidebar

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Vercel Serverless Functions (API proxy)
- **Database**: Supabase (Postgres + Auth)
- **AI**: Anthropic Claude API (Sonnet)
- **Hosting**: Vercel (free tier)

---

## Deploy to Vercel (Recommended)

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (pick a region close to you)
3. Once the project is ready, go to **SQL Editor** in the dashboard
4. Paste the contents of `supabase-schema.sql` and click **Run**
5. Go to **Settings → API** and copy your **Project URL** and **anon/public key**
6. Go to **Authentication → URL Configuration** and add your Vercel URL to the **Redirect URLs** list (you can add it after the first deploy)

### 2. Push to GitHub

```bash
cd noteflow
git init
git add .
git commit -m "Initial commit"
gh repo create noteflow --public --push
```

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"** and import your `noteflow` repository
3. **Add your environment variables**:
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
4. Click **Deploy**

### 4. Update Supabase Redirect URL

After deploying, go back to **Supabase → Authentication → URL Configuration** and add your Vercel URL (e.g., `https://noteflow-xxx.vercel.app`) to the **Redirect URLs** list. This allows the magic link login to redirect back to your app.

---

## Run Locally

```bash
# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Edit .env and add your Anthropic API key + Supabase credentials

# Start dev server (frontend on :5173, API auto-proxied)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> For full local API support with the serverless function, install the Vercel CLI:
>
> ```bash
> npm i -g vercel
> vercel dev
> ```

---

## Project Structure

```
noteflow/
├── api/
│   └── chat.js              # Serverless API proxy (keeps Anthropic key secure)
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx              # Main app with auth-aware UI
│   ├── auth.jsx             # Auth context, magic link login, sign out
│   ├── db.js                # Supabase CRUD operations for meetings
│   ├── main.jsx             # React entry with AuthProvider
│   └── supabaseClient.js    # Supabase client init
├── supabase-schema.sql      # Database schema — run in Supabase SQL Editor
├── .env.example             # Environment variable template
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

## Future Ideas

- Real audio transcription via Whisper API
- Team sharing and collaboration
- Calendar integration for auto-creating meetings
- Export summaries as PDF
- Real-time collaborative editing via Supabase Realtime
