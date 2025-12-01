# PixelPerfect Deployment Guide

## Prerequisites

1. **Cloudflare Account** with Workers, D1, R2, and KV enabled
2. **GitHub Account** for repository hosting
3. **Wrangler CLI** installed: `npm install -g wrangler`
4. **Node.js** 18+ installed

## Quick Setup

### 1. Login to Cloudflare

```bash
wrangler login
```

### 2. Create Cloudflare Resources

Run the setup script:

```bash
cd workers
npm install
npm run setup
```

Or create resources manually:

```bash
# Create D1 Database
wrangler d1 create pixelperfect-db

# Create R2 Bucket
wrangler r2 bucket create pixelperfect-media

# Create KV Namespaces
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CACHE
```

### 3. Update wrangler.toml

After creating resources, update `workers/wrangler.toml` with the IDs:

```toml
[[d1_databases]]
binding = "DB"
database_name = "pixelperfect-db"
database_id = "YOUR_D1_DATABASE_ID"  # From wrangler d1 create output

[[kv_namespaces]]
binding = "SESSIONS"
id = "YOUR_SESSIONS_KV_ID"  # From wrangler kv:namespace create output

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_CACHE_KV_ID"  # From wrangler kv:namespace create output
```

### 4. Run Database Migrations

```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Set Secrets

```bash
wrangler secret put JWT_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put REPLICATE_API_KEY
wrangler secret put STRIPE_SECRET_KEY
```

### 6. Deploy Workers API

```bash
npm run deploy
```

### 7. Deploy Frontend to Cloudflare Pages

```bash
cd ../frontend
npm install
npm run build

# Deploy to Pages
npx wrangler pages deploy dist --project-name=pixelperfect
```

## GitHub Setup

### Create Repository

```bash
# From project root
cd /Users/houman/CascadeProjects/tile-sr-app

# Add all files
git add .

# Commit
git commit -m "Initial commit: PixelPerfect AI Creative Suite"

# Create GitHub repo and push
gh repo create pixelperfect --public --source=. --push
```

Or manually:

```bash
git remote add origin https://github.com/YOUR_USERNAME/pixelperfect.git
git branch -M main
git push -u origin main
```

## Environment Variables

### Workers (set as secrets)
- `JWT_SECRET` - Secret key for JWT tokens
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic/Claude API key
- `REPLICATE_API_KEY` - Replicate API key
- `STABILITY_API_KEY` - Stability AI key
- `SUNO_API_KEY` - Suno API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

### Frontend (in `.env`)
```env
VITE_API_URL=https://pixelperfect-api.YOUR_SUBDOMAIN.workers.dev
VITE_MEDIA_URL=https://media.pixelperfect.ai
```

## Domain Setup

### Custom Domain for API
1. Go to Cloudflare Dashboard > Workers & Pages
2. Select your worker
3. Go to Triggers > Custom Domains
4. Add `api.pixelperfect.ai`

### Custom Domain for Frontend
1. Go to Cloudflare Pages project
2. Go to Custom domains
3. Add `pixelperfect.ai` and `www.pixelperfect.ai`

### R2 Public Access
1. Go to R2 > Your bucket
2. Settings > Public access
3. Add custom domain: `media.pixelperfect.ai`

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd workers && npm ci
      - name: Deploy Worker
        run: cd workers && npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Build
        run: cd frontend && npm run build
      - name: Deploy to Pages
        run: npx wrangler pages deploy frontend/dist --project-name=pixelperfect
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Monitoring

- **Workers Analytics**: Cloudflare Dashboard > Workers & Pages > Analytics
- **D1 Metrics**: Cloudflare Dashboard > D1 > Your database
- **R2 Metrics**: Cloudflare Dashboard > R2 > Your bucket

## Troubleshooting

### CORS Issues
Ensure `CORS_ORIGIN` in wrangler.toml matches your frontend domain.

### Database Connection
Run `wrangler d1 execute pixelperfect-db --command="SELECT 1"` to test.

### R2 Access
Check bucket permissions and CORS settings in R2 dashboard.
