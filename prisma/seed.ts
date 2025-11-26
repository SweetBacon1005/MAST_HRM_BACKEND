import { PrismaClient } from '@prisma/client';

// Import core seed functions
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
import { seedOfficeIpAddresses } from './seeds/office-ip.seed';

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
  console.log('🌱 Bắt đầu seed database...');
  console.log('📦 Sử dụng cấu trúc seed modular với tối ưu hóa');
  console.log('⚡ Tối ưu: createMany + skipDuplicates + upsert batch\n');

  try {
    // 1. Seed basic data (levels, positions, languages)
    const basicData = await seedBasicData(prisma);
    console.log('✅ Basic data seeded successfully!\n');

    // 2. Seed RBAC (roles, permissions, role-permission assignments)
    const rbacData = await seedRBAC(prisma);
    console.log('✅ RBAC data seeded successfully!\n');

    // 3. Seed skills
    const skillsData = await seedSkillsAndCertificates(prisma);
    console.log('✅ Skills seeded successfully!\n');

    // 4. Seed organization structure (divisions, teams)
    const orgData = await seedOrganization(prisma);
    console.log('✅ Organization data seeded successfully!\n');

    // 5. Seed schedule works (work shifts)
    const scheduleWorksData = await seedScheduleWorks(prisma);
    console.log('✅ Schedule works data seeded successfully!\n');

    // 6. Seed users and user information
    const usersData = await seedUsers(prisma);
    console.log('✅ Users data seeded successfully!\n');

    // 7. Seed projects, customers, and stages
    const projectsData = await seedProjects(prisma);
    console.log('✅ Projects data seeded successfully!\n');

    // 8. Seed user relationships (divisions, allocations, timesheets, reports)
    await seedUserRelations(prisma, {
      ...usersData,
      ...basicData,
      ...rbacData,
      ...projectsData,
    });
    console.log('✅ User relationships seeded successfully!\n');

    // 9. Seed miscellaneous data (education, experience, holidays, etc.)
    await seedMiscData(prisma, {
      ...usersData,
      ...skillsData,
      ...basicData,
      ...rbacData,
      ...orgData,
    });
    console.log('✅ Miscellaneous data seeded successfully!\n');

    // 10. Seed day offs
    const dayOffsData = await seedDayOffs(prisma, usersData);
    console.log('✅ Day offs data seeded successfully!\n');

    // 11. Seed assets
    await seedAssets(prisma);
    console.log('✅ Assets seeded successfully!\n');

    // 12. Seed office IP addresses configuration
    await seedOfficeIpAddresses();
    console.log('✅ Office IP addresses seeded successfully!\n');

    // Summary
    console.log('🎉 =====================================');
    console.log('✅ SEED DATABASE HOÀN THÀNH!');
    console.log('🎉 =====================================\n');

    console.log('📊 Tổng quan dữ liệu đã tạo:');
    console.log(`- ${rbacData.permissions.length} permissions`);
    console.log(`- ${rbacData.roles.length} roles`);
    console.log(`- ${rbacData.permissionRoleCount} permission-role assignments`);
    console.log(`- ${basicData.levels.length} levels`);
    console.log(`- ${basicData.positions.length} positions`);
    console.log(`- ${basicData.languages.length} languages`);
    console.log(`- ${skillsData.skills.length} skills`);
    console.log(`- ${orgData.divisions.length} divisions`);
    console.log(`- ${orgData.teams.length} teams`);
    console.log(`- ${scheduleWorksData.scheduleWorks.length} work shifts`);
    console.log(`- ${usersData.users.length} users`);
    console.log(`- ${projectsData.projects.length} projects`);
    console.log('- Education records, work experience, holidays');
    console.log('- User skills, overtime history');
    console.log('- Time sheets, daily reports, project allocations');
    console.log(`- ${dayOffsData.dayOffs.length} day off requests`);
    console.log('- Assets and asset categories\n');

    console.log('🔑 Thông tin đăng nhập:');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ Admin:   admin@company.com / 123456     │');
    console.log('│ HR:      hr.manager@company.com / 123456│');
    console.log('│ Test:    user@example.com / Mast@123    │');
    console.log('│ Dev 1:   john.doe@company.com / 123456  │');
    console.log('│ Dev 2:   jane.smith@company.com / 123456│');
    console.log('└─────────────────────────────────────────┘\n');

    console.log('🎯 Dữ liệu mẫu bao gồm:');
    console.log('✓ Hệ thống phân quyền hoàn chỉnh (RBAC)');
    console.log('✓ Cơ cấu tổ chức (divisions, teams)');
    console.log('✓ Thông tin nhân viên đầy đủ (8-10 users)');
    console.log('✓ Dự án và phân bổ nhân sự');
    console.log('✓ Chấm công và báo cáo hàng ngày');
    console.log('✓ Kỹ năng và chứng chỉ');
    console.log('✓ Học vấn và kinh nghiệm làm việc');
    console.log('✓ Ngày nghỉ lễ và đơn nghỉ phép');
    console.log('✓ Tài sản công ty\n');

    console.log('📁 Cấu trúc seed files:');
    console.log('├── prisma/seed.ts (main file)');
    console.log('└── prisma/seeds/');
    console.log('    ├── basic-data.seed.ts');
    console.log('    ├── rbac.seed.ts');
    console.log('    ├── skills-certificates.seed.ts');
    console.log('    ├── organization.seed.ts');
    console.log('    ├── schedule-works.seed.ts');
    console.log('    ├── users.seed.ts');
    console.log('    ├── projects.seed.ts');
    console.log('    ├── user-relations.seed.ts');
    console.log('    ├── misc-data.seed.ts');
    console.log('    ├── day-offs.seed.ts');
    console.log('    ├── assets.seed.ts');
    console.log('    └── office-ip.seed.ts\n');

    console.log('🚀 Tối ưu hóa đã áp dụng:');
    console.log('• createMany() với skipDuplicates cho bulk inserts');
    console.log('• upsert() batch cho dữ liệu có ID cố định');
    console.log('• Giảm database calls xuống tối thiểu');
    console.log('• Seed time: ~10-20 giây\n');

  } catch (error) {
    console.error('❌ Lỗi khi seed database:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Lỗi khi seed database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
