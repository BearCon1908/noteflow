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
- **AI**: Anthropic Claude API (Sonnet)
- **Hosting**: Vercel (free tier)

---

## Deploy to Vercel (Recommended)

### 1. Push to GitHub

```bash
cd noteflow
git init
git add .
git commit -m "Initial commit"
gh repo create noteflow --public --push
```

Or create a repo on github.com and push manually:

```bash
git remote add origin https://github.com/YOUR_USERNAME/noteflow.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `noteflow` repository
4. Vercel auto-detects Vite — no config changes needed
5. **Add your environment variable**:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your API key from [console.anthropic.com](https://console.anthropic.com/)
6. Click **Deploy**

Your app will be live at `https://noteflow-xxxxx.vercel.app` within ~60 seconds.

### 3. Access from any device

Open your Vercel URL on any phone, tablet, or computer. Done!

---

## Run Locally

```bash
# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Edit .env and add your Anthropic API key

# Start dev server (frontend on :5173, API auto-proxied)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> **Note**: The Vite dev server proxies `/api/*` requests to Vercel's local dev.
> For full local API support, install `vercel` CLI:
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
│   └── chat.js          # Serverless API proxy (keeps API key secure)
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx          # Main app component
│   └── main.jsx         # React entry point
├── .env.example         # Environment variable template
├── .gitignore
├── index.html
├── package.json
├── vercel.json          # Vercel deployment config
└── vite.config.js
```

## Future Ideas

- Real audio transcription via Whisper API
- Persistent storage (database or localStorage)
- Team sharing and collaboration
- Calendar integration for auto-creating meetings
- Export summaries as PDF
