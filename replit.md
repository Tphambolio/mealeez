# Overview

MealBuilder is a progressive web application for smart meal planning that combines AI-powered voice interactions, family collaboration features, and automated shopping list generation. The application helps users plan weekly meals, manage recipes, and streamline their cooking workflow with modern web technologies.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **PWA Support**: Service worker integration with offline capabilities and installable app features
- **Voice Integration**: Web Speech API for voice recognition and text-to-speech functionality

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Authentication**: OpenID Connect integration with Replit Auth using Passport.js
- **Session Management**: Express sessions with PostgreSQL storage
- **Development**: Hot module replacement via Vite middleware in development mode

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Relational structure supporting users, recipes, ingredients, meal plans, shopping lists, and collaboration groups
- **Migrations**: Drizzle Kit for schema migrations and database management
- **Connection**: Neon serverless PostgreSQL with connection pooling

## Authentication and Authorization
- **Provider**: Replit OpenID Connect with automatic user provisioning
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Security**: HTTP-only secure cookies with CSRF protection
- **User Management**: Automatic user creation and profile synchronization

## External Dependencies

### Core Services
- **Database Provider**: Neon PostgreSQL serverless database
- **Authentication**: Replit OpenID Connect service
- **AI Services**: OpenAI GPT models for recipe analysis and cooking assistance

### File Storage and Media
- **Object Storage**: Google Cloud Storage with ACL-based access control
- **Image Processing**: Tesseract.js for OCR functionality on recipe images
- **File Uploads**: Uppy file upload library with direct-to-S3 capabilities

### UI and Interaction Libraries
- **Component Library**: Radix UI primitives with Shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Web Scraping**: Cheerio for recipe extraction from external websites
- **Voice Processing**: Browser Web Speech API for voice recognition and synthesis

### Development and Build Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Hot Reload**: Vite HMR with error overlay integration
- **Package Manager**: npm with lock file for dependency consistency

### Progressive Web App Features
- **Service Worker**: Offline caching and app installation prompts
- **Manifest**: Web app manifest for native app-like experience
- **Icons**: SVG icons with fallback support for various platforms