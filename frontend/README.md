# JewGo Frontend

A Next.js 13+ application for finding kosher restaurants and marketplace functionality.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Development

### Prerequisites
- Node.js 22.x
- npm (project uses package-lock.json)
- Environment variables configured

### Available Scripts

```bash
# Development
npm run dev            # Start development server
npm run build          # Build for production
npm run start          # Start production server

# Testing
npm test               # Run tests
npm run test:watch     # Run tests in watch mode

# Code Quality
npm run lint           # Run ESLint
npm run type-check     # Run TypeScript type checking

# CI helpers
npm run ci:build       # Build in CI
npm run ci:test        # Test in CI
npm run ci:lint        # Lint in CI
npm run ci:type-check  # Type-check in CI
```

### Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   ├── search/            # Search components
│   ├── restaurant/        # Restaurant components
│   └── [features]/        # Feature-specific components
├── lib/                   # Utility libraries
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   └── [features]/        # Feature-specific utilities
├── public/                # Static assets
└── prisma/                # Database schema
```

### Import Conventions

- Use `@/` alias for absolute imports: `@/components/ui/Button`
- Prefer absolute imports over relative imports
- Group imports: built-in → external → internal → relative

### Adding New Features

1. **Add a new page**: Create file in `app/[feature]/page.tsx`
2. **Add a new component**: Create file in `components/[feature]/ComponentName.tsx`
3. **Add a new API route**: Create file in `app/api/[route]/route.ts`
4. **Add a new hook**: Create file in `lib/hooks/useHookName.ts`

### Environment Variables

Required variables (see `.env.example`):
- `NEXT_PUBLIC_URL`
- `NEXT_PUBLIC_APP_HOSTNAME`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Optional: `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `SENTRY_DSN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

### Analytics

- The route `POST /api/analytics` is a lightweight sink that returns `204` and discards payloads. It exists to prevent 405s from client-side analytics until a provider is integrated.
- Configure `NEXT_PUBLIC_ANALYTICS_PROVIDER` and `NEXT_PUBLIC_ANALYTICS_API_ENDPOINT` when connecting a real analytics service.

## Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Manual Deployment
```bash
pnpm build
pnpm start
```

## Troubleshooting

### Common Issues

1. **Build fails**: Check environment variables and dependencies
2. **Type errors**: Run `pnpm type-check` to identify issues
3. **Import errors**: Ensure using `@/` alias for absolute imports
4. **Database issues**: Run `pnpm prisma generate` to regenerate client

### Getting Help

- Check the `docs/` directory for detailed documentation
- Review `docs/architecture/file-structure.md` for project structure
- See `docs/conventions.md` for coding standards

## Contributing

1. Follow the coding conventions in `docs/conventions.md`
2. Run tests before submitting: `pnpm test`
3. Ensure code quality: `pnpm lint && pnpm type-check`
4. Update documentation as needed
