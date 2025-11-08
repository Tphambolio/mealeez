# MealBuilder

An AI-powered meal planning and recipe management application with voice assistance, shopping list generation, and collaborative features.

## Features

- **AI-Powered Meal Planning**: Use voice or text to create weekly meal plans with AI assistance
- **Recipe Management**: Import recipes from URLs or photos, or create them manually
- **Smart Shopping Lists**: Auto-generate shopping lists from your meal plans, organized by aisle
- **Voice Assistant**: Hands-free cooking guidance with voice recognition
- **Cooking Mode**: Step-by-step cooking instructions with voice support
- **Collaboration**: Share meal plans and recipes with family or groups
- **Recipe Import**: Extract recipes from web pages or images using AI

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Radix UI components
- TanStack Query for data fetching
- Wouter for routing
- Framer Motion for animations

### Backend
- Express.js + TypeScript
- PostgreSQL (Neon serverless)
- Drizzle ORM
- OpenAI API for AI features
- Replit Auth (OpenID Connect)
- Passport.js for authentication

## Prerequisites

- Node.js 20+
- PostgreSQL database (or Neon serverless)
- OpenAI API key

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key-here

# Session Secret (generate a random string)
SESSION_SECRET=your-secure-random-session-secret

# Replit Auth (for Replit deployments)
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-domain.repl.co

# Server
PORT=5000
NODE_ENV=development
```

### 3. Run Database Migrations

```bash
npm run db:migrate
```

This will create all necessary database tables.

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database (drizzle-kit)

## Project Structure

```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities and hooks
├── server/              # Backend Express application
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database operations
│   ├── openai.ts        # OpenAI integration
│   ├── replitAuth.ts    # Authentication setup
│   └── migrate.ts       # Migration runner
├── shared/              # Shared code between client/server
│   └── schema.ts        # Database schema (Drizzle)
└── migrations/          # SQL migration files
```

## API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user
- `GET /api/login` - Login with Replit Auth
- `GET /api/logout` - Logout

### Recipes
- `GET /api/recipes` - List all recipes
- `POST /api/recipes` - Create recipe
- `GET /api/recipes/:id` - Get recipe by ID
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `POST /api/recipes/import/url` - Import from URL
- `POST /api/recipes/import/photo` - Import from photo

### Meal Plans
- `GET /api/meal-plans?startDate=&endDate=` - Get meal plans for date range
- `POST /api/meal-plans` - Create meal plan
- `PUT /api/meal-plans/:id` - Update meal plan
- `DELETE /api/meal-plans/:id` - Delete meal plan

### Shopping Lists
- `GET /api/shopping-lists/week?weekStart=` - Get weekly shopping list
- `POST /api/shopping-lists` - Create shopping list
- `POST /api/shopping-lists/generate` - Generate from meal plans
- `POST /api/shopping-lists/items` - Add item
- `PUT /api/shopping-lists/:listId/items/:itemId` - Update item
- `DELETE /api/shopping-lists/items/:itemId` - Delete item

### Settings
- `GET /api/settings` - Get user preferences
- `PUT /api/settings` - Update user preferences

### Voice Features
- `POST /api/voice/plan-meal` - Voice meal planning
- `POST /api/voice/cooking-assistance` - Voice cooking help

## Database Schema

The application uses the following main tables:

- `users` - User accounts
- `recipes` - Recipe storage
- `ingredients` - Recipe ingredients
- `steps` - Recipe cooking steps
- `meal_plans` - Weekly meal schedules
- `shopping_lists` - Shopping lists
- `shopping_list_items` - Shopping list items
- `user_preferences` - User settings
- `collaboration_groups` - Shared groups
- `group_members` - Group membership
- `sessions` - Session storage

## Development Notes

### Authentication

The app uses Replit Auth by default. For development without Replit:
- Authentication setup will be skipped with a warning
- The app will use 'anonymous' as the user ID
- Set `REPLIT_DOMAINS` and `REPL_ID` to enable full auth

### OpenAI Integration

The app requires an OpenAI API key for:
- Recipe extraction from URLs and images
- Voice-based meal planning
- Cooking assistance

Without an API key, these features will return errors but the app will still run.

## Deployment

### Build for Production

```bash
npm run build
```

This creates:
- `dist/` - Built frontend assets
- `dist/index.js` - Bundled server

### Run Production Build

```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run check` to verify types
5. Submit a pull request

## License

MIT
