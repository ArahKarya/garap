# Coding Style Rules

## TypeScript Strict

- `strict: true` wajib di semua tsconfig
- JANGAN pakai `any` — gunakan `unknown` lalu narrow
- Explicit types pada exported functions dan props
- Prefer `interface` untuk object shapes, `type` untuk unions/intersections

## Immutability

JANGAN mutate existing data, SELALU return object baru:
```ts
// SALAH
user.name = 'new name';
return user;

// BENAR
return { ...user, name: 'new name' };
```

## Import Conventions

```ts
// Shared package
import { schema, type, CONSTANT } from '@arahkarya/shared';

// Server internal (pakai .js extension untuk ESM)
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

// Client internal (pakai @ alias)
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
```

## Error Handling

- Server: throw error dari `server/src/lib/errors.ts` (NotFoundError, ForbiddenError, dll)
- Error middleware di `server/src/middleware/error.ts` handle semua
- Client: catch di TanStack Query `onError` atau try/catch, tampilkan via `toast.error()`
- JANGAN swallow error tanpa log atau feedback

## Naming

- Files: `kebab-case` (e.g., `user.service.ts`, `page-header.tsx`)
- Components: `PascalCase` (e.g., `UserCard`, `PageHeader`)
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns: `snake_case` via Prisma `@map()`
- API routes: `kebab-case` (e.g., `/audit-logs`)

## React Patterns

- Functional components only, no class components
- Props via named interface/type, JANGAN pakai `React.FC`
- State management: Zustand untuk global, useState untuk local
- Data fetching: TanStack Query (useQuery/useMutation)
- Forms: React Hook Form + zodResolver
- Toasts: Sonner (`toast.success()`, `toast.error()`)

## CSS / Styling

- Tailwind CSS 4 utility classes
- shadcn/ui components sebagai primitives
- JANGAN inline style, JANGAN CSS modules
- Dark mode: pakai Tailwind `dark:` variant
- Responsive: mobile-first (`md:`, `lg:` breakpoints)
