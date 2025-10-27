# Project Structure Documentation

This document outlines the folder organization and architecture of the Pixology.ai frontend application.

## Overview

The project follows a **feature-based architecture** with clear separation between shared components and feature-specific code. This structure promotes scalability, maintainability, and code reusability.

## Directory Structure

```
src/
├── app/                          # Application initialization & core setup
│   ├── providers/                # React context providers
│   │   ├── QueryProvider.tsx     # TanStack Query provider
│   │   ├── UIProvider.tsx        # UI-related providers (Toaster, Tooltip)
│   │   └── index.tsx             # Combined providers export
│   ├── router/                   # Routing configuration
│   │   └── AppRouter.tsx         # Route definitions
│   └── App.tsx                   # Root application component
│
├── features/                     # Feature modules (domain-driven)
│   └── landing/                  # Landing page feature
│       ├── components/           # Feature-specific components
│       │   ├── HeroSection.tsx
│       │   ├── VisionSection.tsx
│       │   ├── HowItWorksSection.tsx
│       │   ├── BenefitsSection.tsx
│       │   ├── CTASection.tsx
│       │   └── index.ts          # Component exports
│       └── index.tsx             # Feature entry point (LandingPage)
│
├── shared/                       # Shared resources across features
│   ├── components/               # Reusable components
│   │   ├── ui/                   # shadcn/ui component library (56 components)
│   │   └── layout/               # Layout components
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       ├── Layout.tsx
│   │       └── index.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-mobile.tsx        # Mobile breakpoint detection
│   │   └── use-toast.ts          # Toast notifications
│   ├── lib/                      # Utility functions
│   │   └── utils.ts              # Common utilities (cn, etc.)
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts              # Shared interfaces
│   └── constants/                # Application constants
│       └── index.ts              # App-wide constants
│
├── pages/                        # Route-level page components
│   └── NotFoundPage.tsx          # 404 error page
│
├── assets/                       # Static assets
│   └── images/                   # Image files
│       ├── hero-athlete.jpg
│       └── digital-avatar.jpg
│
├── styles/                       # Global styles
│   ├── index.css                 # Main stylesheet with Tailwind
│   └── App.css                   # App-level styles
│
├── main.tsx                      # Application entry point
└── vite-env.d.ts                 # Vite environment types
```

## Architecture Patterns

### 1. Feature-Based Organization

Each feature is self-contained with its own components, hooks, and logic:

```typescript
features/
└── [feature-name]/
    ├── components/      # Feature-specific UI components
    ├── hooks/          # Feature-specific custom hooks (optional)
    ├── api/            # Feature-specific API calls (optional)
    └── index.tsx       # Feature entry point
```

**Benefits:**
- Clear feature boundaries
- Easy to locate code
- Scalable as application grows
- Enables code splitting by feature

### 2. Shared Resources

Common code is centralized in the `shared/` directory:

- **components/ui**: Reusable UI primitives from shadcn/ui
- **components/layout**: Layout components used across pages
- **hooks**: Custom hooks shared across features
- **lib**: Utility functions and helpers
- **types**: Shared TypeScript interfaces
- **constants**: Application-wide constants

### 3. Provider Pattern

All React context providers are consolidated in `app/providers/`:

```typescript
<AppProviders>
  <QueryProvider>     // TanStack Query
    <UIProvider>       // Toast, Tooltip providers
      <AppRouter />    // Application routes
    </UIProvider>
  </QueryProvider>
</AppProviders>
```

### 4. Layout Composition

Pages use the Layout component for consistent structure:

```typescript
<Layout>              // Header + Footer wrapper
  <HeroSection />
  <VisionSection />
  <CTASection />
</Layout>
```

## Import Aliases

The project uses TypeScript path aliases for clean imports:

| Alias | Path | Usage |
|-------|------|-------|
| `@/*` | `src/*` | Any source file |
| `@/shared/components/ui/*` | `src/shared/components/ui/*` | UI components |
| `@/shared/lib/*` | `src/shared/lib/*` | Utilities |
| `@/shared/hooks/*` | `src/shared/hooks/*` | Custom hooks |
| `@/shared/types/*` | `src/shared/types/*` | Type definitions |
| `@/shared/constants/*` | `src/shared/constants/*` | Constants |
| `@/features/*` | `src/features/*` | Feature modules |

**Example:**
```typescript
import { Button } from "@/shared/components/ui/button";
import { Layout } from "@/shared/components/layout";
import { APP_NAME } from "@/shared/constants";
```

## Component Guidelines

### Feature Components
- Located in `features/[feature-name]/components/`
- Should be specific to that feature
- Export through feature's `index.tsx`

### Shared Components
- Located in `shared/components/`
- Must be reusable across multiple features
- Well-documented and generic

### Layout Components
- Located in `shared/components/layout/`
- Provide consistent page structure
- Header, Footer, and Layout wrapper

## Adding New Features

To add a new feature:

1. Create feature directory:
```bash
mkdir -p src/features/[feature-name]/components
```

2. Create feature components:
```typescript
// src/features/[feature-name]/components/MyComponent.tsx
export const MyComponent = () => {
  return <div>Feature content</div>;
};
```

3. Create feature entry point:
```typescript
// src/features/[feature-name]/index.tsx
import { Layout } from "@/shared/components/layout";
import { MyComponent } from "./components";

export const MyFeaturePage = () => {
  return (
    <Layout>
      <MyComponent />
    </Layout>
  );
};
```

4. Add route in router:
```typescript
// src/app/router/AppRouter.tsx
<Route path="/my-feature" element={<MyFeaturePage />} />
```

## Styling

### Global Styles
- Located in `src/styles/index.css`
- Includes Tailwind CSS imports and custom CSS variables
- Design tokens defined using HSL values

### Component Styles
- Use Tailwind utility classes
- Custom variants defined in `tailwind.config.ts`
- shadcn/ui components use the `cn()` utility for class merging

## State Management

### Server State
- **TanStack React Query** for server state
- Provider configured in `app/providers/QueryProvider.tsx`

### UI State
- React hooks (`useState`, `useReducer`)
- Custom hooks in `shared/hooks/`

### Global State (Future)
- Consider Zustand or React Context for global client state
- Create store in `shared/store/` when needed

## Best Practices

1. **Keep features isolated** - Feature code should not depend on other features
2. **Use shared resources** - Don't duplicate code across features
3. **Type everything** - Leverage TypeScript for type safety
4. **Export through index files** - Simplify imports with barrel exports
5. **Consistent naming** - Use PascalCase for components, camelCase for utilities
6. **Component size** - Keep components small and focused (< 200 lines)
7. **Extract constants** - Avoid hardcoding strings, use constants

## Testing Strategy (Future)

When adding tests:

```
src/
├── features/
│   └── landing/
│       ├── components/
│       │   ├── HeroSection.tsx
│       │   └── HeroSection.test.tsx    # Component tests
│       └── __tests__/                  # Feature integration tests
└── shared/
    └── lib/
        ├── utils.ts
        └── utils.test.ts               # Utility tests
```

## Performance Optimization

### Code Splitting
- Features can be lazy-loaded using React.lazy()
- Route-based code splitting via React Router

### Asset Optimization
- Images in `assets/images/` are optimized during build
- Consider using modern formats (WebP, AVIF)

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build configuration, path aliases |
| `tsconfig.json` | TypeScript base configuration |
| `tsconfig.app.json` | App-specific TypeScript settings |
| `tailwind.config.ts` | Tailwind theme customization |
| `components.json` | shadcn/ui configuration |
| `eslint.config.js` | ESLint rules |

## Migration Notes

### Changes from Previous Structure:
- ✅ Split monolithic `Index.tsx` into feature components
- ✅ Extracted Header/Footer into layout components
- ✅ Moved UI components to `shared/components/ui/`
- ✅ Centralized hooks in `shared/hooks/`
- ✅ Created provider structure in `app/providers/`
- ✅ Organized assets in subdirectories
- ✅ Added types and constants directories
- ✅ Updated all import paths

### Breaking Changes:
- Import paths changed from `@/components/ui/` to `@/shared/components/ui/`
- Styles moved from `src/index.css` to `src/styles/index.css`
- Pages now use Layout component wrapper

## Future Enhancements

Consider adding:
- `src/shared/api/` - API client and endpoint definitions
- `src/shared/config/` - Environment configuration
- `src/shared/store/` - Global state management
- `src/features/auth/` - Authentication feature
- `src/features/dashboard/` - User dashboard feature
- `__tests__/` - Test directories at each level

## Resources

- [React Best Practices](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)
