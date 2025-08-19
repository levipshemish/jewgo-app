# JewGo Frontend

A Next.js 13+ application for finding kosher restaurants and marketplace functionality.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Development

### Prerequisites
- Node.js 22.x
- pnpm package manager
- Environment variables configured

### Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server

# Testing
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Run tests with coverage

# Code Quality
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm type-check   # Run TypeScript type checking
pnpm format       # Format code with Prettier

# Analysis
pnpm analyze:dup  # Find code duplication
pnpm analyze:dead # Find unused code
pnpm analyze:deps # Find unused dependencies
pnpm analyze:cycles # Find circular dependencies
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

Required environment variables (see `.env.example`):
- `DATABASE_URL` - Database connection string
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

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

- Check the [docs/](./docs/) directory for detailed documentation
- Review [architecture/file-structure.md](./docs/architecture/file-structure.md) for project structure
- See [conventions.md](./docs/conventions.md) for coding standards

## Contributing

1. Follow the coding conventions in `docs/conventions.md`
2. Run tests before submitting: `pnpm test`
3. Ensure code quality: `pnpm lint && pnpm type-check`
4. Update documentation as needed
