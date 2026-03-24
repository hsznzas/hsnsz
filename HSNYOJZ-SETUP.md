# HsnYojz - Setup Guide
## حسن يوجز — أداة إنشاء بوسترات الأخبار

### Architecture
```
Telegram Message (link + optional image)
    → POST /api/hsnyojz/webhook
        → scraper.ts (fetch article content + OG image)
        → summarizer.ts (Claude API → Arabic headline + 2-3 bullets)
        → template.ts (generate 1080x1920 HTML poster)
        → POST /api/hsnyojz/render (Puppeteer → PNG screenshot)
    → Send PNG back to Telegram as document
```

### Files Created
```
lib/hsnyojz/
├── telegram.ts      # Telegram Bot API helpers
├── scraper.ts       # Article URL → title + content + OG image
├── summarizer.ts    # Claude API → Arabic bullet summary
└── template.ts      # HTML poster template (1080x1920)

app/api/hsnyojz/
├── webhook/route.ts   # Telegram webhook (main orchestrator)
├── render/route.ts    # HTML → PNG via Puppeteer
└── generate/route.ts  # Browser preview API

app/hsnyojz/
└── preview/page.tsx   # Browser testing UI at /hsnyojz/preview
```

---

### Step 1: Extract Files
```bash
# From your hsnsz.com repo root:
tar -xzf hsnyojz-module.tar.gz
```

### Step 2: Install Dependencies
```bash
npm install puppeteer                    # For local dev
npm install @sparticuz/chromium puppeteer-core  # For Vercel serverless
```

### Step 3: Create Telegram Bot
1. Open Telegram → search `@BotFather`
2. Send `/newbot`
3. Name: `حسن يوجز` (or any name)
4. Username: `HsnYojzBot` (or any available username)
5. Copy the bot token

### Step 4: Get Your Chat ID
1. Send any message to your new bot
2. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `"chat":{"id": XXXXXXXX}` — that's your admin chat ID

### Step 5: Environment Variables
Add to `.env.local` and Vercel dashboard:
```env
# HsnYojz
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ADMIN_CHAT_ID=your_chat_id_here
ANTHROPIC_API_KEY=your_claude_api_key_here

# Optional: explicit base URL (auto-detected from request headers if not set)
# NEXT_PUBLIC_BASE_URL=https://hsnsz.com
```

### Step 6: Set Telegram Webhook
After deploying to Vercel, run this once:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://hsnsz.com/api/hsnyojz/webhook"}'
```

### Step 7: Font Setup
Place your Manal font file at `public/fonts/Manal-Regular.woff2`.
Then update `lib/hsnyojz/template.ts` line 19:
```ts
const FONT_URL = '/fonts/Manal-Regular.woff2'
```
If the font has multiple weights, add additional @font-face rules.

### Step 8: Deploy
```bash
git add .
git commit -m "feat: add HsnYojz news poster generator"
vercel --prod
```

---

### Usage
**Via Telegram:**
1. Send a news link to your bot
2. (Optional) Send a photo with the link as caption
3. Bot returns a 1080x1920 PNG poster

**Via Browser:**
1. Go to `https://hsnsz.com/hsnyojz/preview`
2. Paste a news URL
3. Preview and download the poster

---

### Customization
- **Template design**: Edit `lib/hsnyojz/template.ts` — all CSS is inline
- **Bullet count**: Edit `lib/hsnyojz/summarizer.ts` line with `.slice(0, 3)`
- **Brand name**: Edit template.ts `brand-name` div
- **Colors/fonts**: All in the template's `<style>` block
- **AI model**: Change model in summarizer.ts (currently `claude-sonnet-4-20250514`)

### Future Enhancements
- [ ] Image filters (grayscale, blur, color overlay)
- [ ] Multiple template variants (tech, politics, sports)
- [ ] Supabase logging for generated posters
- [ ] Queue system for batch generation
