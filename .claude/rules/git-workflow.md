# Git Workflow Rules

## Commit Message Format

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Contoh:
- `feat: add production module with batch tracking`
- `fix: refresh token rotation not revoking old token`
- `refactor: extract pagination logic to shared util`

## Branching

- `main` — production-ready, selalu bisa deploy
- `feat/<name>` — fitur baru
- `fix/<name>` — bug fix
- `chore/<name>` — maintenance

## Before Commit Checklist

- [ ] Build passes (`pnpm build`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test`)
- [ ] No hardcoded secrets
- [ ] Mutation endpoints punya audit middleware
- [ ] Protected endpoints punya RBAC middleware
- [ ] Zod schema di shared (bukan duplikat)

## Module Generator

Saat tambah modul baru, SELALU pakai generator:
```bash
pnpm new:module <name>           # Simple
pnpm new:module <name> --layered # Layered
```

JANGAN buat file modul manual — generator memastikan konsistensi struktur.
