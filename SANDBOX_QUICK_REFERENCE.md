# JewGo Sandbox - Quick Reference

## 🚀 Quick Start Commands

```bash
# Start sandbox (Docker)
npm run sandbox:start

# Stop sandbox
npm run sandbox:stop

# View logs
npm run sandbox:logs

# Rebuild sandbox
npm run sandbox:rebuild
```

## 🌐 Access URLs

- **Main Sandbox**: http://localhost:3001
- **Storybook**: http://localhost:6006

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run sandbox:start` | Start the sandbox environment |
| `npm run sandbox:stop` | Stop the sandbox environment |
| `npm run sandbox:restart` | Restart the sandbox environment |
| `npm run sandbox:logs` | View sandbox logs |
| `npm run sandbox:rebuild` | Rebuild and restart the sandbox |
| `npm run sandbox:test` | Run sandbox tests |
| `npm run sandbox:visual-test` | Run visual regression tests |
| `npm run sandbox:install` | Install sandbox dependencies |
| `npm run sandbox:cleanup` | Clean up sandbox completely |
| `npm run sandbox:status` | Show sandbox status |

## 🎯 Sandbox Features

### 1. Component Library
- Browse components by category
- Search and filter components
- Live preview with code view
- Copy component code

### 2. Code Playground
- Live code editing
- Real-time preview
- Run/stop execution
- Component templates

### 3. Responsive Preview
- Mobile (375px)
- Tablet (768px)
- Desktop (1024px+)
- Custom width testing

### 4. Visual Regression
- Screenshot capture
- Before/after comparison
- Diff analysis
- Threshold configuration

## 🔧 Docker Commands

```bash
# Start with Docker Compose
docker-compose -f docker-compose.sandbox.yml up -d

# View logs
docker-compose -f docker-compose.sandbox.yml logs -f

# Stop containers
docker-compose -f docker-compose.sandbox.yml down

# Rebuild images
docker-compose -f docker-compose.sandbox.yml build --no-cache
```

## 🧪 Testing Commands

```bash
# Run unit tests
npm run test

# Run tests with UI
npm run test:ui

# Run visual regression tests
npm run visual-test

# Run Storybook tests
npm run storybook:test
```

## 📁 Key Files

```
frontend/sandbox/
├── src/
│   ├── components/          # Sandbox UI components
│   ├── data/               # Component examples
│   └── test/               # Test setup
├── .storybook/             # Storybook config
├── package.json            # Dependencies
├── vite.config.ts          # Vite config
├── tailwind.config.js      # Tailwind config
└── Dockerfile              # Docker config
```

## 🔍 Troubleshooting

### Port Issues
```bash
# Check port usage
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Docker Issues
```bash
# Clean Docker
docker system prune -a

# Rebuild
npm run sandbox:rebuild
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 📝 Adding Components

1. Add component to main project
2. Add example to `src/data/componentExamples.ts`
3. Include in scope object
4. Test in sandbox

## 🎨 Component Categories

- **buttons**: Button components and variants
- **forms**: Form inputs and controls
- **navigation**: Navigation components
- **cards**: Card layouts and content
- **modals**: Modal dialogs and overlays
- **layout**: Layout and grid components

## 🔗 Integration Points

- **Main Project**: Shares components and utilities
- **Storybook**: Component documentation
- **Visual Testing**: Percy/Chromatic integration
- **Docker**: Consistent environment
- **CI/CD**: Automated testing pipeline

## 📊 Performance Tips

- Use hot reload for development
- Optimize bundle size
- Leverage caching
- Monitor build times

---

**For detailed documentation, see `frontend/sandbox/README.md`**
