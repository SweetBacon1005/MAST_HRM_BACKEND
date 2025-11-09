import { PrismaClient } from '@prisma/client';

// Import only essential seed functions
import { seedBasicData } from './seeds/basic-data.seed';
import { seedRBAC } from './seeds/rbac.seed';
import { seedSkillsAndCertificates } from './seeds/skills-certificates.seed';
import { seedOrganization } from './seeds/organization.seed';
import { seedUsers } from './seeds/users.seed';
import { seedProjects } from './seeds/projects.seed';
import { seedUserRelations } from './seeds/user-relations.seed';
import { seedMiscData } from './seeds/misc-data.seed';
import { seedDayOffs } from './seeds/day-offs.seed';
import { seedScheduleWorks } from './seeds/schedule-works.seed';
import { seedAssets } from './seeds/assets.seed';
import { seedRequests } from './seeds/requests.seed';
import { seedLateEarlyRequests } from './seeds/late-early-requests.seed';

// Sử dụng singleton pattern để tránh tạo nhiều connection
const prisma = globalThis.prisma || new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

async function main() {
  console.log('🌱 Bắt đầu seed BASIC data...');
  console.log('📦 Chỉ seed dữ liệu cần thiết cho hệ thống hoạt động\n');

  try {
    // 1. Seed basic data (levels, positions, languages)
    const basicData = await seedBasicData(prisma);
    console.log('✅ Basic data seeded successfully!\n');

    // 2. Seed RBAC (roles, permissions, role-permission assignments)
    const rbacData = await seedRBAC(prisma);
    console.log('✅ RBAC data seeded successfully!\n');

    // 3. Seed skills and certificates
    const skillsData = await seedSkillsAndCertificates(prisma);
    console.log('✅ Skills and certificates seeded successfully!\n');

    // 4. Seed organization structure (divisions, teams, groups)
    const orgData = await seedOrganization(prisma);
    console.log('✅ Organization data seeded successfully!\n');

    // 5. Seed schedule works (work shifts)
    const scheduleWorksData = await seedScheduleWorks(prisma);
    console.log('✅ Schedule works data seeded successfully!\n');

    // 6. Seed essential users (admin, test users)
    const usersData = await seedUsers(prisma);
    console.log('✅ Essential users seeded successfully!\n');

    // 7. Seed basic projects
    const projectsData = await seedProjects(prisma);
    console.log('✅ Basic projects seeded successfully!\n');

    // 8. Seed user relationships (divisions, allocations)
    await seedUserRelations(prisma, {
      ...usersData,
      ...basicData,
      ...rbacData,
      ...projectsData,
    });
    console.log('✅ User relationships seeded successfully!\n');

    // 9. Seed essential miscellaneous data
    await seedMiscData(prisma, {
      ...usersData,
      ...skillsData,
      ...basicData,
      ...rbacData,
      ...orgData,
    });
    console.log('✅ Essential misc data seeded successfully!\n');

    // 10. Seed basic day offs
    // const dayOffsData = await seedDayOffs(prisma, usersData);
    // console.log('✅ Basic day offs seeded successfully!\n');

    // 11. Seed basic assets
    // await seedAssets(prisma);
    // console.log('✅ Basic assets seeded successfully!\n');

    // 12. Seed basic requests
    // await seedRequests(prisma, usersData);
    // console.log('✅ Basic requests seeded successfully!\n');

    // 13. Seed basic late/early requests
    // await seedLateEarlyRequests(prisma);
    // console.log('✅ Basic late/early requests seeded successfully!\n');

    // === BASIC DATA SEEDING COMPLETED ===
    console.log('✅ =================================');
    console.log('✅ BASIC DATA SEEDING COMPLETED!');
    console.log('✅ =================================\n');
    
    console.log('📝 For test data, please use one of these options:');
    console.log('   1. Run: node generate-test-data.js');
    console.log('   2. Import: test-data.sql');
    console.log('   3. Use: npm run db:seed:with-test-data\n');

    // Summary
    console.log('📊 Tổng quan dữ liệu cơ bản đã tạo:');
    console.log(`- ${rbacData.permissions.length} permissions`);
    console.log(`- ${rbacData.roles.length} roles`);
    console.log(`- ${basicData.levels.length} levels`);
    console.log(`- ${basicData.positions.length} positions`);
    console.log(`- ${orgData.divisions.length} divisions`);
    console.log(`- ${orgData.teams.length} teams`);
    console.log(`- ${usersData.users.length} essential users`);
    console.log(`- ${projectsData.projects.length} basic projects`);
    console.log(`- Basic assets, requests, and relationships\n`);

    console.log('🎉 Hệ thống đã sẵn sàng hoạt động với dữ liệu cơ bản!');
    console.log('💡 Để có thêm data test, hãy chạy các script riêng biệt.\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
