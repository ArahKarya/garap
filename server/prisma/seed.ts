import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ROLES, PERMISSIONS, MEMBER_PERMISSIONS } from '@garap/shared';

const prisma = new PrismaClient();

async function seedPermissions() {
  const keys = Object.values(PERMISSIONS);
  await Promise.all(
    keys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      }),
    ),
  );
  return prisma.permission.findMany();
}

async function seedRoles() {
  const allPermissions = await seedPermissions();

  const superAdmin = await prisma.role.upsert({
    where: { name: ROLES.SUPER_ADMIN },
    update: {},
    create: {
      name: ROLES.SUPER_ADMIN,
      description: 'Akses penuh ke semua fitur',
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: superAdmin.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: superAdmin.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  for (const name of [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.VIEWER]) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: name, isSystem: true },
    });
  }

  // MEMBER — role default pelanggan SaaS B2C: CRUD penuh atas data sendiri,
  // tanpa permission admin. Permission di-scope ownerId di service layer.
  const member = await prisma.role.upsert({
    where: { name: ROLES.MEMBER },
    update: {},
    create: {
      name: ROLES.MEMBER,
      description: 'Pelanggan: akses penuh atas datanya sendiri',
      isSystem: true,
    },
  });
  const memberPerms = allPermissions.filter((p) =>
    (MEMBER_PERMISSIONS as string[]).includes(p.key),
  );
  await prisma.rolePermission.deleteMany({ where: { roleId: member.id } });
  await prisma.rolePermission.createMany({
    data: memberPerms.map((p) => ({ roleId: member.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  return superAdmin;
}

async function seedAdminUser(superAdminRoleId: string) {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@garap.local';
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    console.log('[seed] SEED_ADMIN_PASSWORD not set — skipping local admin user');
    return;
  }
  if (password.length < 12) {
    console.error('[seed] SEED_ADMIN_PASSWORD must be at least 12 chars; aborting admin seed');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: 'Super Admin',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdminRoleId } },
    update: {},
    create: { userId: user.id, roleId: superAdminRoleId },
  });

  console.log(`[seed] admin user ready: ${email}`);
}

async function seedSettings() {
  const defaults: Array<{ key: string; value: unknown }> = [
    { key: 'app.name', value: 'Garap' },
    { key: 'app.tagline', value: 'Tempat menggarap task, project, dan file kerja' },
    { key: 'app.timezone', value: 'Asia/Jakarta' },
    { key: 'app.locale', value: 'id-ID' },
    { key: 'owner.name', value: 'Yayang Setya Nugroho' },
    { key: 'owner.email', value: 'yayang.nugroho.s@gmail.com' },
  ];

  for (const { key, value } of defaults) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as any },
    });
  }
}

// Backfill: pastikan setiap user punya langganan (FREE) — idempotent.
async function backfillSubscriptions() {
  const users = await prisma.user.findMany({ select: { id: true } });
  let created = 0;
  for (const u of users) {
    const existing = await prisma.subscription.findUnique({ where: { userId: u.id } });
    if (!existing) {
      await prisma.subscription.create({ data: { userId: u.id } });
      created++;
    }
  }
  console.log(`[seed] subscriptions backfilled: ${created} baru`);
}

async function main() {
  console.log('[seed] start');
  const superAdmin = await seedRoles();
  await seedAdminUser(superAdmin.id);
  await seedSettings();
  await backfillSubscriptions();
  console.log('[seed] done');
}

main()
  .catch((err) => {
    console.error('[seed] error', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
