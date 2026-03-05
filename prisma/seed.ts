import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@gmail.com' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
    return;
  }

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      name: 'Admin',
      role: 'ADMIN',
      verified: true,
      isActive: true,
      details: 'System Administrator',
    },
  });

  console.log('✅ Admin user created successfully:');
  console.log('   Email: admin@gmail.com');
  console.log('   ID:', adminUser.id);
  console.log('   Role: ADMIN');

  // Create some sample badges
  const badges = [
    {
      name: 'مثالي',
      slug: 'perfect',
      icon: '⭐',
      description: '100% accuracy',
      condition: 'Get 100% accuracy on a challenge',
    },
    {
      name: 'خبير',
      slug: 'expert',
      icon: '🏆',
      description: 'High score',
      condition: 'Score above 90% on 5 challenges',
    },
    {
      name: 'متعلم',
      slug: 'learner',
      icon: '📚',
      description: 'Complete 10 challenges',
      condition: 'Complete 10 challenges',
    },
    {
      name: 'برق',
      slug: 'lightning',
      icon: '⚡',
      description: 'Speed demon',
      condition: 'Answer 5 questions in under 30 seconds',
    },
    {
      name: 'متسلسل',
      slug: 'streak',
      icon: '🔥',
      description: 'Long streak',
      condition: 'Get 5 consecutive correct answers',
    },
  ];

  for (const badge of badges) {
    const existingBadge = await prisma.badge.findUnique({
      where: { slug: badge.slug },
    });

    if (!existingBadge) {
      await prisma.badge.create({
        data: badge,
      });
      console.log(`✅ Created badge: ${badge.name}`);
    } else {
      console.log(`⏭️  Badge already exists: ${badge.name}`);
    }
  }

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
