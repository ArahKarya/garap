#!/usr/bin/env node
/**
 * ArahKarya Module Generator
 *
 * Usage:
 *   pnpm new:module <name>                  # Simple module (routes + service)
 *   pnpm new:module <name> --layered        # Layered module (routes + service + repository + types)
 *   pnpm new:module <name> --entity=Name    # Custom entity name
 *
 * Simple (default) generates:
 *   - server/src/modules/<name>/<name>.service.ts
 *   - server/src/modules/<name>/<name>.routes.ts
 *   - client/src/pages/<Name>Page.tsx
 *   - packages/shared/src/schemas/<name>.ts
 *
 * Layered (--layered) generates all of the above plus:
 *   - server/src/modules/<name>/<name>.repository.ts
 *   - server/src/modules/<name>/<name>.types.ts
 *
 * IMPORTANT: after generate, add the Prisma model manually, then:
 *   1. pnpm db:migrate:dev --name add-<name>
 *   2. Register router in server/src/routes/index.ts
 *   3. Add route in client/src/App.tsx
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const positional = args.filter((a) => !a.startsWith('--'));

const rawName = positional[0];
if (!rawName) {
  console.error('Usage: pnpm new:module <name> [--layered]');
  process.exit(1);
}

const isLayered = flags.includes('--layered');
const name = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
const Name = name.charAt(0).toUpperCase() + name.slice(1);

// ─── Shared schema (same for both tiers) ───

const schemaFile = `import { z } from 'zod';

export const create${Name}Schema = z.object({
  name: z.string().trim().min(1).max(200),
  // TODO: add fields
});

export const update${Name}Schema = create${Name}Schema.partial();

export type Create${Name}Input = z.infer<typeof create${Name}Schema>;
export type Update${Name}Input = z.infer<typeof update${Name}Schema>;
`;

// ─── Client page (same for both tiers) ───

const pageTsx = `import { useQuery } from '@tanstack/react-query';
import { BRANDING } from '@garap/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function ${Name}Page() {
  const { data, isLoading } = useQuery({
    queryKey: ['${name}'],
    queryFn: async () => {
      const res = await api.get('/${name}', { params: { page: 1, limit: 50 } });
      return res.data.data as Array<{ id: string; name: string }>;
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="${Name}"
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))}
            {!isLoading && (!data || data.length === 0) && (
              <TableRow>
                <TableCell colSpan={2}>
                  <EmptyState message="Belum ada data ${name}" />
                </TableCell>
              </TableRow>
            )}
            {data?.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
`;

// ─── Simple tier: service directly uses Prisma ───

const simpleService = `import type { PaginationQuery, Create${Name}Input, Update${Name}Input } from '@garap/shared';
import { buildPagination, toSkipTake } from '@garap/shared';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

export async function list(q: PaginationQuery) {
  const { skip, take } = toSkipTake(q.page, q.limit);
  const where: Record<string, unknown> = q.search
    ? { name: { contains: q.search, mode: 'insensitive' } }
    : {};
  const [items, total] = await Promise.all([
    (prisma as any).${name}.findMany({ where, skip, take, orderBy: { createdAt: q.sortOrder } }),
    (prisma as any).${name}.count({ where }),
  ]);
  return buildPagination(items, total, q.page, q.limit);
}

export async function get(id: string) {
  const item = await (prisma as any).${name}.findUnique({ where: { id } });
  if (!item) throw NotFoundError('${Name}', id);
  return item;
}

export async function create(input: Create${Name}Input) {
  return (prisma as any).${name}.create({ data: input });
}

export async function update(id: string, input: Update${Name}Input) {
  await get(id);
  return (prisma as any).${name}.update({ where: { id }, data: input });
}

export async function remove(id: string) {
  await get(id);
  await (prisma as any).${name}.delete({ where: { id } });
}
`;

// ─── Layered tier: types ───

const layeredTypes = `export interface ${Name}Entity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
`;

// ─── Layered tier: repository extends BaseRepository ───

const layeredRepository = `import { BaseRepository } from '../../lib/base-repository.js';
import type { ${Name}Entity } from './${name}.types.js';

class ${Name}RepositoryImpl extends BaseRepository<${Name}Entity> {
  constructor() {
    super('${name}');
  }

  buildSearchWhere(search?: string): Record<string, unknown> {
    if (!search) return {};
    return { name: { contains: search, mode: 'insensitive' } };
  }
}

export const ${name}Repository = new ${Name}RepositoryImpl();
`;

// ─── Layered tier: service uses repository ───

const layeredService = `import type { PaginationQuery, Create${Name}Input, Update${Name}Input } from '@garap/shared';
import { ${name}Repository } from './${name}.repository.js';

export async function list(q: PaginationQuery) {
  const where = ${name}Repository.buildSearchWhere(q.search);
  return ${name}Repository.findMany(q, where);
}

export async function get(id: string) {
  return ${name}Repository.findById(id);
}

export async function create(input: Create${Name}Input) {
  return ${name}Repository.create(input as unknown as Record<string, unknown>);
}

export async function update(id: string, input: Update${Name}Input) {
  return ${name}Repository.update(id, input as unknown as Record<string, unknown>);
}

export async function remove(id: string) {
  return ${name}Repository.delete(id);
}
`;

// ─── Routes (same structure for both tiers, service API is identical) ───

const routesFile = `import { Router } from 'express';
import { ok, paginationQuerySchema } from '@garap/shared';
import { authenticate } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import { create${Name}Schema, update${Name}Schema } from '@garap/shared/schemas/${name}';
import type { Create${Name}Input, Update${Name}Input, PaginationQuery } from '@garap/shared';
import * as svc from './${name}.service.js';

export const ${name}Router = Router();

${name}Router.use(authenticate);

${name}Router.get('/', validate(paginationQuerySchema, 'query'), async (req, res, next) => {
  try {
    const q = getValidated<PaginationQuery>(req, 'query');
    const result = await svc.list(q);
    res.json(ok(result.items, result.meta));
  } catch (err) {
    next(err);
  }
});

${name}Router.get('/:id', async (req, res, next) => {
  try {
    res.json(ok(await svc.get(req.params.id)));
  } catch (err) {
    next(err);
  }
});

${name}Router.post('/', validate(create${Name}Schema), audit('CREATE', '${name}'), async (req, res, next) => {
  try {
    const input = getValidated<Create${Name}Input>(req);
    res.status(201).json(ok(await svc.create(input)));
  } catch (err) {
    next(err);
  }
});

${name}Router.patch('/:id', validate(update${Name}Schema), audit('UPDATE', '${name}'), async (req, res, next) => {
  try {
    const input = getValidated<Update${Name}Input>(req);
    res.json(ok(await svc.update(req.params.id, input)));
  } catch (err) {
    next(err);
  }
});

${name}Router.delete('/:id', audit('DELETE', '${name}'), async (req, res, next) => {
  try {
    await svc.remove(req.params.id);
    res.json(ok({ deleted: true }));
  } catch (err) {
    next(err);
  }
});
`;

// ─── Build file map ───

const files = {
  [`packages/shared/src/schemas/${name}.ts`]: schemaFile,
  [`server/src/modules/${name}/${name}.routes.ts`]: routesFile,
  [`client/src/pages/${Name}Page.tsx`]: pageTsx,
};

if (isLayered) {
  files[`server/src/modules/${name}/${name}.types.ts`] = layeredTypes;
  files[`server/src/modules/${name}/${name}.repository.ts`] = layeredRepository;
  files[`server/src/modules/${name}/${name}.service.ts`] = layeredService;
} else {
  files[`server/src/modules/${name}/${name}.service.ts`] = simpleService;
}

// ─── File writer ───

async function writeFile(rel, content) {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  try {
    await fs.access(full);
    console.log(`  [skip] ${rel} (already exists)`);
    return;
  } catch {
    // not exists, continue
  }
  await fs.writeFile(full, content, 'utf8');
  console.log(`  [write] ${rel}`);
}

async function patchSharedIndex() {
  const indexPath = path.join(root, 'packages/shared/src/schemas/index.ts');
  const content = await fs.readFile(indexPath, 'utf8');
  const line = `export * from './${name}.js';`;
  if (content.includes(line)) {
    console.log(`  [skip] packages/shared/src/schemas/index.ts (already exports)`);
    return;
  }
  await fs.writeFile(indexPath, content.trimEnd() + '\n' + line + '\n', 'utf8');
  console.log(`  [patch] packages/shared/src/schemas/index.ts (+ export ${name})`);
}

async function main() {
  const tier = isLayered ? 'LAYERED' : 'SIMPLE';
  console.log(`[generator] creating ${tier} module: ${name} (${Name})`);
  console.log();

  for (const [rel, content] of Object.entries(files)) {
    await writeFile(rel, content);
  }
  await patchSharedIndex();

  const layeredFiles = isLayered
    ? `
     - ${name}.types.ts      (domain entity interface)
     - ${name}.repository.ts  (data access via BaseRepository)
     - ${name}.service.ts     (business logic, uses repository)`
    : `
     - ${name}.service.ts     (logic + Prisma direct)`;

  console.log(`
[generator] done (${tier}). Files created:

  server/src/modules/${name}/
${layeredFiles}
     - ${name}.routes.ts      (HTTP endpoints)

  packages/shared/src/schemas/${name}.ts   (Zod schemas)
  client/src/pages/${Name}Page.tsx          (list view)

  Next steps:

  1. Add Prisma model to server/prisma/schema.prisma:

     model ${Name} {
       id        String   @id @default(cuid())
       name      String
       createdAt DateTime @default(now()) @map("created_at")
       updatedAt DateTime @updatedAt       @map("updated_at")
       @@map("${name}s")
     }

  2. Run migration:
     pnpm --filter @garap/server db:migrate:dev --name add-${name}

  3. Register router in server/src/routes/index.ts:
     import { ${name}Router } from '../modules/${name}/${name}.routes.js';
     apiRouter.use('/${name}', ${name}Router);

  4. Add route in client/src/App.tsx:
     import { ${Name}Page } from './pages/${Name}Page';
     <Route path="${name}" element={<${Name}Page />} />

  5. Add nav item in client/src/layouts/AppLayout.tsx.
${isLayered ? `
  Tip: This is a LAYERED module. Business logic goes in service,
  data access in repository. Add custom queries to the repository class.
` : `
  Tip: This is a SIMPLE module. To upgrade to layered later:
     pnpm new:module ${name} --layered
  Then migrate logic from service to repository.
`}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
