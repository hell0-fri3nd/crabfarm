# 02 — Web Coding Rules

How frontend code is written. Structure and data flow are in `01-architecture.md`, and UI is in `03-design-systems.md`.

---

## 1. Principles

- **The code explains itself.** Clean code reads without comments. If a block needs a comment to be understood, rename or extract it instead.
- **Idiomatic TypeScript.** Strict types, modern ES2015+ features, and the syntactic sugar the language gives you (§5).
- **The Next.js Way.** Use the built-in file-system router, `<Image />`, `<Link />`, `next/font`, `metadata`, `loading.tsx` / `error.tsx`, Server Components and Server Actions, instead of building these yourself.
- **One style everywhere:** arrow function expressions assigned to `const` (§2).

## 2. Function Style: Arrow Function Expressions Assigned to `const`

Every function is a `const` with an arrow function: components, handlers, hooks, actions, utilities.

```tsx
'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/actions/sign-out';

const CustomLogoutButton = () => {
  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Button variant="ghost" onClick={handleLogout}>
      <LogOut /> Log out
    </Button>
  );
};

export default CustomLogoutButton;
```

- **No** `function` declarations and **no** `React.FC`.
- Props use a `type` and are destructured in the parameter list:

```tsx
type CustomSensorCardProps = {
  label: string;
  value?: number;
  unit: string;
};

const CustomSensorCard = ({ label, value, unit }: CustomSensorCardProps) => (
  <Card>
    <CardTitle>{label}</CardTitle>
    <CardContent>{value?.toFixed(1) ?? '—'} {unit}</CardContent>
  </Card>
);

export default CustomSensorCard;
```

- **Exports:**
  - Components use `export default` (one component per file), as do Next.js files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`).
  - `lib/`, `actions/`, `events/`, `types/` and `stores/` use **named** exports (`export const ...`).
- Server Actions are arrow functions too:

```ts
'use server';

export const createBatch = async (input: CreateBatchInput): Promise<ActionResult<Batch>> => {
  const parsed = createBatchSchema.safeParse(input);
  if (!parsed.success) return toFieldErrors(parsed.error);

  return bff.post('/batches', parsed.data, batchSchema);
};
```

## 3. Naming Conventions

### Quick reference

| Function type | Casing | Example |
|---|---|---|
| React component | PascalCase | `const SidebarMenu = () => {}` |
| Custom hook | camelCase, starts with `use` | `const useProfileData = () => {}` |
| SSE hook (`events/`) | camelCase, `use<Resource>Stream` | `const useSensorStream = () => {}` |
| Event handler | camelCase, `handle<Event>` (props: `on<Event>`) | `const handleLogout = () => {}`, `onSubmit` |
| Zustand action | camelCase verb | `const setUserData = (data) => {}` |
| BFF / API fetcher | camelCase verb | `const getSessionToken = () => {}` |
| Server Action | camelCase verb | `const signIn = async () => {}` |

### Everything else

| Thing | Casing | Example |
|---|---|---|
| Files and folders | kebab-case | `use-sensor-stream.ts`, `crab-queries.ts` |
| **Custom component file** (anything we write, not shadcn-generated) | `custom-<name>.tsx`, exporting `Custom<Name>` | `custom-severity-badge.tsx` → `CustomSeverityBadge` |
| shadcn-generated primitive | as generated, in `components/ui/` | `button.tsx`, `data-table.tsx` |
| Types | PascalCase, no `I` prefix | `type CrabLog`, `type SensorCardProps` |
| Component props type | `<Component>Props` | `DataTableProps` |
| zod schema | camelCase + `Schema` | `crabLogSchema`, `signInSchema` |
| Type from a schema | PascalCase of the schema | `type CrabLog = z.infer<typeof crabLogSchema>` |
| zustand store hook | `use<Name>Store` | `useAuthStore`, `useUiStore` |
| Query options / keys | camelCase object | `crabQueries.list(filters)`, `crabKeys.all` |
| Constants | UPPER_SNAKE_CASE | `MAX_UPLOAD_MB`, `LIVE_WINDOW_SIZE` |
| Booleans | `is` / `has` / `can` / `should` prefix | `isLoading`, `hasMolted`, `canEdit` |
| API fields | keep FastAPI's **snake_case** in schemas and types (no mapping layer) | `crab.batch_id`, `reading.measured_at` |

## 4. Lint (ESLint flat config)

`eslint.config.mjs` uses `eslint-config-next` plus `@typescript-eslint` and `eslint-plugin-react`:

```js
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Function style: arrow functions assigned to const
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'react/function-component-definition': [
        'error',
        { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' },
      ],

      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'variable', format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
        { selector: 'variable', types: ['function'], format: ['camelCase', 'PascalCase'] },
        { selector: 'variable', modifiers: ['destructured'], format: null },
        { selector: 'parameter', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'variable', types: ['boolean'], format: ['PascalCase'], prefix: ['is', 'has', 'can', 'should'] },
        { selector: ['objectLiteralProperty', 'typeProperty'], format: null },
        { selector: 'import', format: null },
      ],

      // Idiomatic TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      'prefer-const': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'no-nested-ternary': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Stack guardrails (01 §2)
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'Use the BFF client (fetch).' },
            { name: '@reduxjs/toolkit', message: 'Use zustand.' },
            { name: 'react-redux', message: 'Use zustand.' },
            { name: 'redux-persist', message: 'Use zustand persist for preferences only.' },
          ],
          patterns: [
            { group: ['react-icons/*', '@heroicons/*'], message: 'Use lucide-react.' },
            { group: ['chart.js', 'apexcharts', '@nivo/*'], message: 'Use Recharts via shadcn Chart.' },
          ],
        },
      ],
    },
  },
  {
    files: ['components/ui/**'],
    rules: { '@typescript-eslint/naming-convention': 'off' },
  },
];

export default eslintConfig;
```

- `prefer-nullish-coalescing` and `prefer-optional-chain` need type-aware linting (`parserOptions.projectService: true`).
- shadcn-generated `components/ui/**` is excluded from naming rules so `npx shadcn add` output stays as generated.
- Scripts: `"lint": "eslint ."` and `"typecheck": "tsc --noEmit"`. Both must pass before a commit.

## 5. Idiomatic TypeScript & Syntactic Sugar

Prefer the right-hand column.

| Instead of | Write |
|---|---|
| `user && user.profile && user.profile.name` | optional chaining: `user?.profile?.name` |
| `value !== null && value !== undefined ? value : 0` | nullish coalescing: `value ?? 0` |
| `if (!x) x = y` | logical assignment: `x ??= y` |
| `props.label`, `props.value` | destructuring: `({ label, value })` |
| `Object.assign({}, a, { b })` | spread: `{ ...a, b }` |
| `'Batch ' + code` | template literal: `` `Batch ${code}` `` |
| `{ name: name }` | shorthand: `{ name }` |
| `for` loops that build arrays | `map` / `filter` / `reduce` / `flatMap`, `Object.groupBy` |
| `.then().catch()` chains | `async` / `await` with `try` / `catch` at the boundary |
| `enum Status {}` | `as const` objects or `z.enum([...])` |
| `interface X {}` | `type X = {}` |
| `any`, `as SomeType` casts | `unknown` + zod `parse`, `satisfies` for config objects |
| hand-written validators (`isValid(x)`, regex checks in a component) | a zod schema in `types/`; live checklists (password rules) call each rule's `schema.safeParse(value).success` |
| `x!` non-null assertion | narrow with a guard / early return |
| nested `if`s / nested ternaries | guard clauses with early `return`, or a lookup object |
| `switch` over a status → label/variant | a typed map: `const STATUS_VARIANT = { ... } as const satisfies Record<Status, Variant>` |
| boolean flags for result states | discriminated unions: `ActionResult<T> = { ok: true; data: T } \| { ok: false; errors: FieldError[] }` |
| `className={'a ' + (on ? 'b' : '')}` | `cn('a', on && 'b')` |

Don't be clever for its own sake. If a one-liner needs a second read, split it.

## 6. The Next.js Way

| Need | Use | Not |
|---|---|---|
| Routing | file-system router, route groups, `<Link>`, `redirect()`, `notFound()` | a custom router, `window.location` for navigation |
| Navigation hooks | `useRouter`, `usePathname`, `useSearchParams` from `next/navigation` | `next/router` |
| Images | `<Image />` from `next/image` | `<img>` |
| Fonts | `next/font` | a `<link>` to Google Fonts |
| SEO / title | `export const metadata` / `generateMetadata` | `<title>` in JSX |
| Loading / errors | `loading.tsx`, `error.tsx`, `not-found.tsx`, `<Suspense>` | hand-rolled spinners at page level |
| Server reads | Server Components + BFF client, prefetch + `HydrationBoundary` | `useEffect` + `fetch` |
| Writes | Server Actions (`'use server'`) | client `fetch` to a custom POST route |
| Cookies / headers | `cookies()` / `headers()` from `next/headers` in server-only code | `document.cookie` |
| Env | server-only `process.env` parsed by `lib/env.ts`; `NEXT_PUBLIC_*` only for non-secret UI config | exposing `API_URL` |
| Client boundary | `'use client'` only on interactive leaves | marking whole pages as client |

## 7. Components

- One component per file.
- **Every custom component file is named `custom-<name>.tsx`** and exports `Custom<Name>`: `custom-severity-badge.tsx` → `const CustomSeverityBadge = () => {}`, used as `<CustomSeverityBadge level="high" />` (per `docs/components`).
- Location: a domain's own custom components live in `<domain>/components/custom-<name>.tsx`. Shared ones (used by 2+ domains) live in **`components/custom/custom-<name>.tsx`**. shadcn primitives stay untouched in `components/ui/`.
- A `custom-` component exists only where shadcn has nothing that fits, and it's built from shadcn parts (03 §2).
- Next.js special files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`) keep their required names.
- Keep components small. Extract when a component grows past ~150 lines or does two things.
- Props are typed with `type`. Use optional props with defaults in destructuring (`({ size = 'md' })`).
- Derive values during render; don't mirror props into state. Use `useMemo` / `useCallback` only for measured needs.
- Lists use stable keys (`id`), never the array index.
- Icons come from `lucide-react` only. UI primitives come from `@/components/ui` only (see 03).

## 8. Comments

- **No comment blocks.** No banners, no narration of what the next line does, and no commented-out code.
- Comment only a non-obvious **why**, in one line (e.g. `// FastAPI has no refresh endpoint; PIN re-issues tokens`).
- No JSDoc that repeats the types.

## 9. Imports

- Use the `@/` alias for global folders. Use relative imports (`./components/...`) inside the same domain.
- Order: React/Next → third-party → `@/` globals → relative, with one blank line between groups. Use `import type` for types.
- Never import from another domain's folders (01 §3). Promote the code to global first.

## 10. Quick Checklist

- [ ] Every function is a `const` arrow function. Components use `export default`; everything else uses named exports.
- [ ] Names follow §3, files are kebab-case, and custom component files are `custom-<name>.tsx`.
- [ ] `eslint .` and `tsc --noEmit` pass.
- [ ] No `any`, no `!`, no `interface`, no `enum`. zod parses every input and every API read.
- [ ] zod is the only validator: no hand-written checks. A UI that shows rule-by-rule status reuses the same zod rule schemas as the form.
- [ ] Next.js primitives are used (§6). `'use client'` only where needed.
- [ ] The code reads without comments.
