# MealBuilder Deployment Guide

This guide covers deploying MealBuilder to various hosting platforms.

## Table of Contents

- [Quick Deploy](#quick-deploy)
- [Railway](#railway)
- [Render](#render)
- [Vercel](#vercel)
- [Docker](#docker)
- [Environment Variables](#environment-variables)

---

## Quick Deploy

### Prerequisites

1. **PostgreSQL Database** (choose one):
   - [Neon](https://neon.tech) - Free serverless PostgreSQL
   - [Supabase](https://supabase.com) - Free PostgreSQL with extras
   - Railway/Render built-in database

2. **OpenAI API Key** (optional, for AI features):
   - Get from [OpenAI Platform](https://platform.openai.com/api-keys)

---

## Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Manual Deployment

1. **Create New Project**
   ```bash
   railway login
   railway init
   ```

2. **Add PostgreSQL**
   ```bash
   railway add -d postgres
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set OPENAI_API_KEY=sk-your-key-here
   railway variables set SESSION_SECRET=$(openssl rand -hex 32)
   ```

4. **Deploy**
   ```bash
   git push railway main
   ```

5. **Run Migrations**
   ```bash
   railway run npm run db:migrate
   ```

### Railway Configuration

Railway auto-detects Node.js and uses these commands:
- **Build**: `npm run build`
- **Start**: `npm run start`
- **Port**: Auto-detected from `PORT` env var

---

## Render

### Web Service Deployment

1. **Create New Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repo

2. **Configure Build**
   - **Name**: `mealeez`
   - **Region**: Choose closest to users
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

3. **Add PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name it and create
   - Copy the "Internal Database URL"

4. **Set Environment Variables**
   Go to Environment tab and add:
   ```
   DATABASE_URL=<your-postgres-internal-url>
   OPENAI_API_KEY=sk-your-key-here
   SESSION_SECRET=<generate-random-string>
   NODE_ENV=production
   ```

5. **Run Migrations**
   After first deploy, go to Shell tab:
   ```bash
   npm run db:migrate
   ```

### Render.yaml (Infrastructure as Code)

Create `render.yaml` in your repo:
```yaml
services:
  - type: web
    name: mealeez
    env: node
    region: oregon
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: mealeez-db
          property: connectionString
      - key: SESSION_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
      - key: OPENAI_API_KEY
        sync: false  # Add manually in dashboard

databases:
  - name: mealeez-db
    databaseName: mealeez
    user: mealeez
    region: oregon
    plan: starter
```

---

## Vercel

Vercel works best with serverless functions. This app uses Express, so Railway/Render are recommended. However, you can use Vercel with some modifications.

### Option 1: Use Vercel with Express (Not Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Create `vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       { "src": "dist/index.js", "use": "@vercel/node" }
     ],
     "routes": [
       { "src": "/(.*)", "dest": "dist/index.js" }
     ]
   }
   ```

3. Deploy:
   ```bash
   npm run build
   vercel --prod
   ```

**Note**: This approach has limitations. Consider Railway or Render for Express apps.

---

## Docker

### Using Docker Compose (Recommended for Local/VPS)

1. **Create `docker-compose.yml`**:
   ```yaml
   version: '3.8'

   services:
     app:
       build: .
       ports:
         - "5000:5000"
       environment:
         DATABASE_URL: postgresql://postgres:password@db:5432/mealeez
         OPENAI_API_KEY: ${OPENAI_API_KEY}
         SESSION_SECRET: ${SESSION_SECRET}
         NODE_ENV: production
       depends_on:
         - db
       command: sh -c "npm run db:migrate && npm start"

     db:
       image: postgres:16-alpine
       environment:
         POSTGRES_DB: mealeez
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: password
       volumes:
         - postgres_data:/var/lib/postgresql/data
       ports:
         - "5432:5432"

   volumes:
     postgres_data:
   ```

2. **Create `Dockerfile`**:
   ```dockerfile
   FROM node:20-alpine

   WORKDIR /app

   # Copy package files
   COPY package*.json ./

   # Install dependencies
   RUN npm ci --only=production

   # Copy source code
   COPY . .

   # Build application
   RUN npm run build

   # Expose port
   EXPOSE 5000

   # Start application
   CMD ["npm", "start"]
   ```

3. **Create `.dockerignore`**:
   ```
   node_modules
   npm-debug.log
   .env
   .env.local
   dist
   .git
   .gitignore
   README.md
   ```

4. **Run**:
   ```bash
   # Build and start
   docker-compose up -d

   # View logs
   docker-compose logs -f app

   # Stop
   docker-compose down
   ```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | None (AI disabled) |
| `SESSION_SECRET` | Session encryption key | None (insecure) |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `REPL_ID` | Replit ID (only for Replit Auth) | None |
| `REPLIT_DOMAINS` | Replit domains (only for Replit Auth) | None |

### Generate Secure Secrets

```bash
# Generate SESSION_SECRET
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Providers

### Neon (Recommended)

**Pros**: Serverless, auto-scaling, generous free tier
**Setup**:
1. Go to [neon.tech](https://neon.tech)
2. Create project
3. Copy connection string
4. Set as `DATABASE_URL`

**Free Tier**: 0.5GB storage, autoscaling

### Supabase

**Pros**: PostgreSQL + extras (auth, storage, realtime)
**Setup**:
1. Go to [supabase.com](https://supabase.com)
2. Create project
3. Go to Settings → Database
4. Copy "Connection string" (Transaction or Session mode)
5. Set as `DATABASE_URL`

**Free Tier**: 500MB database, 2GB bandwidth

### Railway PostgreSQL

**Pros**: Integrated with app deployment
**Setup**: Automatically provisioned with Railway app
**Free Tier**: $5 credit/month (usage-based)

### Render PostgreSQL

**Pros**: Integrated with app deployment
**Setup**: Create from Render dashboard
**Free Tier**: Expires after 90 days (use Neon instead)

---

## Post-Deployment

### 1. Run Database Migrations

```bash
# Railway
railway run npm run db:migrate

# Render (Shell tab in dashboard)
npm run db:migrate

# Docker
docker-compose exec app npm run db:migrate

# Heroku
heroku run npm run db:migrate -a your-app-name
```

### 2. Verify Deployment

Visit your app URL:
- Health check: `https://your-app.com/api/health`
- Should return JSON with `ok: true`

### 3. Test Features

- Create a recipe manually
- Try meal planning
- Generate shopping list
- (If OpenAI configured) Import recipe from URL

---

## Troubleshooting

### Database Connection Errors

```
Error: DATABASE_URL must be set
```

**Solution**: Add DATABASE_URL to environment variables

### OpenAI Errors

```
Error: OpenAI API key not configured
```

**Solution**: Add OPENAI_API_KEY or continue without AI features

### Build Failures

```
TypeScript errors during build
```

**Solution**: Run `npm run check` locally to verify TypeScript

### Migration Errors

```
Error: relation "recipes" already exists
```

**Solution**: Migrations already ran, safe to ignore

---

## Scaling

### Horizontal Scaling

- **Railway**: Auto-scales based on traffic
- **Render**: Upgrade to Standard plan for multiple instances
- **Docker**: Use Kubernetes or Docker Swarm

### Database Scaling

- **Neon**: Auto-scales compute, upgrade for more storage
- **Supabase**: Upgrade plan for more resources
- **Railway**: Scales automatically

### Caching

Consider adding Redis for session storage:
```bash
npm install connect-redis redis
```

---

## Monitoring

### Railway
- Built-in metrics dashboard
- View logs: `railway logs`

### Render
- Metrics tab in dashboard
- Logs available in dashboard

### Custom Monitoring

Add monitoring services:
- [Sentry](https://sentry.io) - Error tracking
- [LogRocket](https://logrocket.com) - Session replay
- [New Relic](https://newrelic.com) - APM

---

## Security

### Production Checklist

- [ ] Set strong `SESSION_SECRET`
- [ ] Use HTTPS (automatic on Railway/Render)
- [ ] Keep dependencies updated: `npm audit fix`
- [ ] Set `NODE_ENV=production`
- [ ] Enable database SSL (most providers do this by default)
- [ ] Don't commit `.env` files
- [ ] Use environment variables for all secrets
- [ ] Set up CORS if needed

---

## Support

Having issues? Check:
1. [GitHub Issues](https://github.com/your-repo/issues)
2. Platform-specific docs (Railway, Render, etc.)
3. Database provider docs (Neon, Supabase, etc.)
