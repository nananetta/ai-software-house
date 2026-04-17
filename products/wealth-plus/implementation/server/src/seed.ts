import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from './prisma/client';

async function main() {
  const password1 = bcrypt.hashSync(
    process.env['SEED_USER1_PASSWORD'] ?? 'changeme1',
    12
  );
  const password2 = bcrypt.hashSync(
    process.env['SEED_USER2_PASSWORD'] ?? 'changeme2',
    12
  );

  const user1 = await prisma.user.upsert({
    where: { email: 'net@family.local' },
    update: { name: 'Net', password: password1 },
    create: {
      email: 'net@family.local',
      name: 'Net',
      password: password1,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'ann@family.local' },
    update: { name: 'Ann', password: password2 },
    create: {
      email: 'ann@family.local',
      name: 'Ann',
      password: password2,
    },
  });

  console.log('[Seed] Users upserted successfully:');
  console.log(`  - ${user1.name} <${user1.email}> (id: ${user1.id})`);
  console.log(`  - ${user2.name} <${user2.email}> (id: ${user2.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[Seed] Error:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
