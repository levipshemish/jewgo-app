# JewGo Sandbox - Visual Testing Environment

A comprehensive React Live sandbox for visual testing before production deployment. This environment provides component isolation, live code editing, responsive testing, and visual regression detection.

## 🚀 Features

- **Component Library**: Browse and test individual components in isolation
- **Code Playground**: Live code editing with real-time preview
- **Responsive Preview**: Test components across different screen sizes
- **Visual Regression**: Capture and compare screenshots to detect changes
- **Storybook Integration**: Component documentation and testing
- **Docker Support**: Consistent environment across different machines

## 📋 Prerequisites

- Node.js 22.x
- Docker and Docker Compose
- npm or yarn package manager

## 🛠️ Quick Start

### Using Docker (Recommended)

1. **Start the sandbox:**
   ```bash
   npm run sandbox:start
   ```

2. **Access the environments:**
   - Main Sandbox: http://localhost:3001
   - Storybook: http://localhost:6006

3. **Stop the sandbox:**
   ```bash
   npm run sandbox:stop
   ```

### Manual Setup

1. **Install dependencies:**
   ```bash
   cd frontend/sandbox
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Start Storybook:**
   ```bash
   npm run storybook
   ```

## 📚 Available Scripts

### Sandbox Management
```bash
npm run sandbox:start      # Start the sandbox environment
npm run sandbox:stop       # Stop the sandbox environment
npm run sandbox:restart    # Restart the sandbox environment
npm run sandbox:logs       # View sandbox logs
npm run sandbox:rebuild    # Rebuild and restart the sandbox
npm run sandbox:status     # Show sandbox status
npm run sandbox:cleanup    # Clean up sandbox (stop, remove containers, images)
```

### Development
```bash
npm run dev                # Start development server
npm run build              # Build for production
npm run preview            # Preview production build
npm run test               # Run tests
npm run test:ui            # Run tests with UI
npm run test:coverage      # Run tests with coverage
npm run lint               # Run ESLint
npm run type-check         # Run TypeScript type checking
```

### Storybook
```bash
npm run storybook          # Start Storybook development server
npm run build-storybook    # Build Storybook for production
npm run chromatic          # Run Chromatic visual testing
npm run percy              # Run Percy visual regression testing
npm run visual-test        # Run visual regression tests
```

## 🎯 Usage Guide

### Component Library

The Component Library provides a catalog of all available components with live previews:

1. **Browse Components**: Use the search and filter options to find specific components
2. **View Code**: Click on a component to see its source code
3. **Test Interactions**: Interact with components to test their behavior
4. **Copy Code**: Use the copy button to copy component code to clipboard

### Code Playground

The Code Playground allows live code editing and testing:

1. **Edit Code**: Modify the code in the editor panel
2. **Live Preview**: See changes reflected immediately in the preview panel
3. **Run/Stop**: Control the execution of the code
4. **Reset**: Reset to the original component code
5. **Component Templates**: Load pre-built component examples

### Responsive Preview

Test components across different screen sizes:

1. **Device Selection**: Choose from Mobile, Tablet, Desktop, or Custom sizes
2. **Custom Width**: Set custom viewport widths for testing
3. **Component Selection**: Load different components to test
4. **Guidelines**: Follow responsive testing best practices

### Visual Regression Testing

Capture and compare screenshots to detect visual changes:

1. **Capture Screenshots**: Take screenshots of components
2. **Compare Images**: Compare before and after screenshots
3. **Diff Analysis**: Automated detection of visual differences
4. **Threshold Settings**: Configure sensitivity for change detection

## 🏗️ Architecture

```
frontend/sandbox/
├── src/
│   ├── components/          # Sandbox UI components
│   │   ├── ComponentLibrary.tsx
│   │   ├── CodePlayground.tsx
│   │   ├── ResponsivePreview.tsx
│   │   └── VisualRegression.tsx
│   ├── data/               # Component examples and data
│   │   └── componentExamples.ts
│   ├── test/               # Test setup and utilities
│   │   └── setup.ts
│   ├── App.tsx             # Main application
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
├── .storybook/             # Storybook configuration
│   ├── main.ts
│   └── preview.ts
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── Dockerfile              # Docker configuration
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the sandbox directory:

```env
# Development
NODE_ENV=development
VITE_API_URL=http://localhost:3000

# Visual Testing
CHROMATIC_PROJECT_TOKEN=your_chromatic_token
PERCY_TOKEN=your_percy_token
```

### Tailwind Configuration

The sandbox uses a custom Tailwind configuration that extends the main project's theme:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../components/**/*.{js,ts,jsx,tsx}",
    "../app/**/*.{js,ts,jsx,tsx}",
    "../lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      // Custom theme extensions
    }
  }
}
```

### Path Aliases

The sandbox includes path aliases for easy imports:

```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@components': path.resolve(__dirname, '../components'),
    '@lib': path.resolve(__dirname, '../lib'),
    '@utils': path.resolve(__dirname, '../utils'),
    '@types': path.resolve(__dirname, '../types'),
    '@hooks': path.resolve(__dirname, '../hooks'),
    '@validators': path.resolve(__dirname, '../validators'),
    '@filters': path.resolve(__dirname, '../filters')
  }
}
```

## 🧪 Testing

### Unit Tests

Run unit tests with Vitest:

```bash
npm run test
```

### Visual Regression Tests

Run visual regression tests with Percy:

```bash
npm run visual-test
```

### Storybook Tests

Run Storybook tests:

```bash
npm run storybook:test
```

## 🐳 Docker

### Development

```bash
# Build and start development containers
docker-compose -f docker-compose.sandbox.yml up -d

# View logs
docker-compose -f docker-compose.sandbox.yml logs -f

# Stop containers
docker-compose -f docker-compose.sandbox.yml down
```

### Production

```bash
# Build production image
docker build -t jewgo-sandbox .

# Run production container
docker run -p 3001:3001 jewgo-sandbox
```

## 📝 Adding Components

To add new components to the sandbox:

1. **Create Component**: Add your component to the main project
2. **Add Example**: Add an example to `src/data/componentExamples.ts`
3. **Update Scope**: Include the component in the scope object
4. **Test**: Verify the component works in the sandbox

Example:

```typescript
// In componentExamples.ts
{
  name: 'My New Component',
  description: 'Description of the component',
  category: 'components',
  code: `<MyComponent prop="value" />`,
  scope: { MyComponent }
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3001
   
   # Kill the process
   kill -9 <PID>
   ```

2. **Docker Issues**
   ```bash
   # Clean up Docker
   docker system prune -a
   
   # Rebuild containers
   npm run sandbox:rebuild
   ```

3. **Dependencies Issues**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

### Performance Optimization

1. **Enable Hot Reload**: Ensure file watching is working properly
2. **Optimize Images**: Use appropriate image formats and sizes
3. **Bundle Analysis**: Monitor bundle size with build analysis
4. **Caching**: Leverage browser and build caching

## 🤝 Contributing

1. **Follow Standards**: Adhere to the project's coding standards
2. **Test Components**: Ensure all components work in the sandbox
3. **Update Documentation**: Keep this README up to date
4. **Add Examples**: Provide comprehensive component examples

## 📄 License

This sandbox is part of the JewGo project and follows the same license terms.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the main project documentation
3. Create an issue in the project repository
4. Contact the development team

---

**Happy Testing! 🎉**
