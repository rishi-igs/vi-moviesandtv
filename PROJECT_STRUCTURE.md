<<<<<<< HEAD
# Lighthouse Dashboard - Project Structure

```
lighthouse/
│
├── 📁 src/
│   ├── 📁 app/                              # Next.js App Router
│   │   ├── 📁 api/                          # API Routes
│   │   │   ├── 📁 audit/
│   │   │   │   └── route.ts                 # POST endpoint for running audits
│   │   │   └── 📁 websites/
│   │   │       ├── route.ts                 # GET all websites
│   │   │       └── 📁 [id]/
│   │   │           └── route.ts             # GET specific website by ID
│   │   │
│   │   ├── 📁 websites/
│   │   │   └── 📁 [id]/
│   │   │       └── page.tsx                 # Detail page for a website
│   │   │
│   │   ├── 📁 _lib/                         # 🔒 Private utilities (hidden from router)
│   │   │   ├── prisma.ts                    # Prisma client singleton
│   │   │   ├── lighthouse-runner.ts         # Lighthouse audit logic
│   │   │   └── ...
│   │   │
│   │   ├── 📁 _components/                  # 🔒 Private shared components
│   │   │   ├── UrlInput.tsx                 # URL input form
│   │   │   ├── WebsiteList.tsx              # Websites list display
│   │   │   ├── ScoreCard.tsx                # Score card component
│   │   │   └── ...
│   │   │
│   │   ├── 📁 _types/                       # 🔒 TypeScript types
│   │   │   └── index.ts                     # Type definitions
│   │   │
│   │   ├── 📁 _constants/                   # 🔒 Constants
│   │   │   └── ...
│   │   │
│   │   ├── layout.tsx                       # Root layout
│   │   ├── page.tsx                         # Home page (/)
│   │   └── globals.css                      # Global styles
│   │
│
├── 📁 prisma/
│   └── schema.prisma                        # Database schema
│
├── 📁 extension/                            # Browser extension files
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   └── popup.js
│
├── 📁 public/                               # Static assets
│
├── 📁 scripts/
│   └── generate-icons.mjs
│
├── 📁 .config/                              # Configuration files
│
├── 📁 docs/                                 # Documentation
│
├── 📄 Configuration Files
│   ├── next.config.js                       # Next.js configuration
│   ├── tsconfig.json                        # TypeScript configuration
│   ├── tailwind.config.ts                   # Tailwind CSS configuration
│   ├── postcss.config.js                    # PostCSS configuration
│   ├── package.json                         # Dependencies
│   ├── .env                                 # Environment variables
│   └── .gitignore
│
└── 📄 Other Files
    ├── next-env.d.ts                        # Next.js types
    └── requirements.txt
```

## 📁 Directory Organization

### Root Level
- **Configuration files** are at the root for easy access
- **public/** - Static assets served directly

### src/app/ (Next.js App Router)
- **api/** - API routes for backend endpoints
- **websites/[id]/** - Dynamic detail page route
- **_lib/** - Private utilities (underscore prefix = hidden from routing)
- **_components/** - Reusable UI components
- **_types/** - TypeScript type definitions
- **_constants/** - Application constants

### Naming Convention
- 🔒 **Underscore prefix (_)** = Private files (hidden from Next.js router)
  - `_lib/`, `_components/`, `_types/`, `_constants/`
  - These won't create routes, just organize shared code

## 🎯 Key Benefits
✅ **Clean separation of concerns**
✅ **Scalable folder structure**
✅ **Private files with underscore prefix don't create routes**
✅ **Grouped related functionality together**
✅ **Easy to navigate and find code**

## 🔄 Import Paths
All imports use absolute paths with `@/`:
```typescript
// Components
import UrlInput from '@/app/_components/UrlInput'

// Utilities  
import { prisma } from '@/app/_lib/prisma'

// Types
import type { LighthouseResult } from '@/app/_types'
```
=======
# Lighthouse Dashboard - Project Structure

```
lighthouse/
│
├── 📁 src/
│   ├── 📁 app/                              # Next.js App Router
│   │   ├── 📁 api/                          # API Routes
│   │   │   ├── 📁 audit/
│   │   │   │   └── route.ts                 # POST endpoint for running audits
│   │   │   └── 📁 websites/
│   │   │       ├── route.ts                 # GET all websites
│   │   │       └── 📁 [id]/
│   │   │           └── route.ts             # GET specific website by ID
│   │   │
│   │   ├── 📁 websites/
│   │   │   └── 📁 [id]/
│   │   │       └── page.tsx                 # Detail page for a website
│   │   │
│   │   ├── 📁 _lib/                         # 🔒 Private utilities (hidden from router)
│   │   │   ├── prisma.ts                    # Prisma client singleton
│   │   │   ├── lighthouse-runner.ts         # Lighthouse audit logic
│   │   │   └── ...
│   │   │
│   │   ├── 📁 _components/                  # 🔒 Private shared components
│   │   │   ├── UrlInput.tsx                 # URL input form
│   │   │   ├── WebsiteList.tsx              # Websites list display
│   │   │   ├── ScoreCard.tsx                # Score card component
│   │   │   └── ...
│   │   │
│   │   ├── 📁 _types/                       # 🔒 TypeScript types
│   │   │   └── index.ts                     # Type definitions
│   │   │
│   │   ├── 📁 _constants/                   # 🔒 Constants
│   │   │   └── ...
│   │   │
│   │   ├── layout.tsx                       # Root layout
│   │   ├── page.tsx                         # Home page (/)
│   │   └── globals.css                      # Global styles
│   │
│
├── 📁 prisma/
│   └── schema.prisma                        # Database schema
│
├── 📁 extension/                            # Browser extension files
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   └── popup.js
│
├── 📁 public/                               # Static assets
│
├── 📁 scripts/
│   └── generate-icons.mjs
│
├── 📁 .config/                              # Configuration files
│
├── 📁 docs/                                 # Documentation
│
├── 📄 Configuration Files
│   ├── next.config.js                       # Next.js configuration
│   ├── tsconfig.json                        # TypeScript configuration
│   ├── tailwind.config.ts                   # Tailwind CSS configuration
│   ├── postcss.config.js                    # PostCSS configuration
│   ├── package.json                         # Dependencies
│   ├── .env                                 # Environment variables
│   └── .gitignore
│
└── 📄 Other Files
    ├── next-env.d.ts                        # Next.js types
    └── requirements.txt
```

## 📁 Directory Organization

### Root Level
- **Configuration files** are at the root for easy access
- **public/** - Static assets served directly

### src/app/ (Next.js App Router)
- **api/** - API routes for backend endpoints
- **websites/[id]/** - Dynamic detail page route
- **_lib/** - Private utilities (underscore prefix = hidden from routing)
- **_components/** - Reusable UI components
- **_types/** - TypeScript type definitions
- **_constants/** - Application constants

### Naming Convention
- 🔒 **Underscore prefix (_)** = Private files (hidden from Next.js router)
  - `_lib/`, `_components/`, `_types/`, `_constants/`
  - These won't create routes, just organize shared code

## 🎯 Key Benefits
✅ **Clean separation of concerns**
✅ **Scalable folder structure**
✅ **Private files with underscore prefix don't create routes**
✅ **Grouped related functionality together**
✅ **Easy to navigate and find code**

## 🔄 Import Paths
All imports use absolute paths with `@/`:
```typescript
// Components
import UrlInput from '@/app/_components/UrlInput'

// Utilities  
import { prisma } from '@/app/_lib/prisma'

// Types
import type { LighthouseResult } from '@/app/_types'
```
>>>>>>> 7eb55d6a7a8c7ea0f65727a603648df4e4fca5b9
