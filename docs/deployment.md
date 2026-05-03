# Deployment Guide

If you want to deploy this beyond a Claude artifact, here's a minimal Next.js setup that keeps your API key server-side.

## Next.js setup

```bash
npx create-next-app@latest eval-playground --js --no-tailwind --no-eslint --app
cd eval-playground
npm install @anthropic-ai/sdk
```

### 1. Create the API route

`app/api/anthropic/route.js`:

```js
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  const { system, messages, max_tokens = 512 } = await req.json();
  const params = { model: "claude-sonnet-4-20250514", max_tokens, messages };
  if (system) params.system = system;
  const response = await client.messages.create(params);
  return NextResponse.json(response);
}
```

### 2. Update the API call in EvalPlatform.jsx

Find the two fetch calls in `callAgent` and `callJudge` and change the URL from:

```js
"https://api.anthropic.com/v1/messages"
```

to:

```js
"/api/anthropic"
```

Remove the `"Content-Type"` header — it's already set by Next.js.

### 3. Add your env variable

`.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add `ANTHROPIC_API_KEY` as an environment variable in the Vercel dashboard under **Settings → Environment Variables**.

---

## Environment variables

| Variable | Where to get it |
|----------|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |

Never commit your API key. It should only ever live in `.env.local` (gitignored) or in Vercel's environment variable settings.
