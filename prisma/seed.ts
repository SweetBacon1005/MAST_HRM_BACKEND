import { PrismaClient } from '@prisma/client';

// Import all seed functions
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
import { seedUserDevices } from './seeds/user-devices.seed';
import { seedRequests } from './seeds/requests.seed';
import { seedLateEarlyRequests } from './seeds/late-early-requests.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed database...');
  console.log('📦 Sử dụng cấu trúc seed modular với tối ưu hóa...');
  console.log('⚡ Tối ưu hóa: createMany + skipDuplicates + upsert batch\n');

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

    // 6. Seed users and user information
    const usersData = await seedUsers(prisma, { ...basicData, ...rbacData });
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

    // 9. Seed miscellaneous data (education, experience, holidays, children, etc.)
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

    // 11. Seed user devices
    await seedUserDevices();
    console.log('✅ User devices seeded successfully!\n');

    // 12. Seed requests for user@example.com
    await seedRequests(prisma, usersData);
    console.log('✅ Requests data seeded successfully!\n');

    // 13. Seed late/early requests
    await seedLateEarlyRequests();
    console.log('✅ Late/early requests data seeded successfully!\n');

    // Summary
    console.log('🎉 =================================');
    console.log('✅ SEED DATABASE HOÀN THÀNH!');
    console.log('🎉 =================================\n');

    console.log('📊 Tổng quan dữ liệu đã tạo:');
    console.log(`- ${rbacData.permissions.length} permissions`);
    console.log(`- ${rbacData.roles.length} roles`);
    console.log(`- ${rbacData.permissionRoleCount} permission-role assignments`);
    console.log(`- ${basicData.levels.length} levels`);
    console.log(`- ${basicData.positions.length} positions`);
    console.log(`- ${basicData.languages.length} languages`);
    console.log(`- ${skillsData.skills.length} skills`);
    console.log(
      `- ${skillsData.certificateCategories.length} certificate categories`,
    );
    console.log(`- ${skillsData.certificates.length} certificates`);
    console.log(`- ${orgData.divisions.length} divisions`);
    console.log(`- ${orgData.teams.length} teams`);
    console.log(`- ${scheduleWorksData.scheduleWorks.length} work shifts`);
    console.log(`- ${usersData.users.length} users`);
    console.log(`- ${projectsData.projects.length} projects`);
    console.log('- Education records, work experience, holidays');
    console.log('- Children, user skills, overtime history');
    console.log('- Time sheets, daily reports, project allocations');
    console.log('- User divisions, group assignments');
    console.log(`- ${dayOffsData.dayOffs.length} day off requests\n`);

    console.log('🔑 Thông tin đăng nhập:');
    console.log('Admin: admin@company.com / 123456');
    console.log('HR Manager: hr.manager@company.com / 123456');
    console.log('Test User: user@example.com / Mast@123 (có sample requests)');
    console.log('Developers: john.doe@company.com / 123456');
    console.log('            jane.smith@company.com / 123456');
    console.log('            mike.johnson@company.com / 123456');
    console.log('            sarah.wilson@company.com / 123456');
    console.log('            david.brown@company.com / 123456');
    console.log('            lisa.davis@company.com / 123456\n');

    console.log('🎯 Dữ liệu mẫu bao gồm:');
    console.log('✓ Hệ thống phân quyền hoàn chỉnh');
    console.log('✓ Cơ cấu tổ chức (divisions, teams, offices)');
    console.log('✓ Thông tin nhân viên đầy đủ');
    console.log('✓ Dự án và phân bổ nhân sự');
    console.log('✓ Chấm công và báo cáo hàng ngày');
    console.log('✓ Kỹ năng và chứng chỉ');
    console.log('✓ Học vấn và kinh nghiệm làm việc');
    console.log('✓ Ngày nghỉ lễ và thông tin gia đình');
    console.log('✓ Lịch sử tăng ca và nhóm làm việc');
    console.log('✓ Sample requests cho user@example.com (remote work, day-off, overtime, late/early)\n');

    console.log('📁 Cấu trúc seed files (đã tối ưu hóa):');
    console.log('├── prisma/seed.ts (main file)');
    console.log('└── prisma/seeds/');
    console.log('    ├── basic-data.seed.ts ⚡ (createMany + upsert)');
    console.log('    ├── skills-certificates.seed.ts ⚡ (createMany + skipDuplicates)');
    console.log('    ├── organization.seed.ts ⚡ (createMany + upsert)');
    console.log('    ├── schedule-works.seed.ts ⚡ (upsert batch)');
    console.log('    ├── users.seed.ts ⚡ (upsert + createMany)');
    console.log('    ├── projects.seed.ts ⚡ (upsert + createMany)');
    console.log('    ├── user-relations.seed.ts ⚡ (tối ưu hóa)');
    console.log('    ├── misc-data.seed.ts ⚡ (tối ưu hóa)');
    console.log('    ├── day-offs.seed.ts ⚡ (createMany + skipDuplicates)');
    console.log('    ├── user-devices.seed.ts ⚡ (createMany + skipDuplicates)');
    console.log('    └── requests.seed.ts ⚡ (sample requests for testing)');
    console.log('\n🚀 Tối ưu hóa đã áp dụng:');
    console.log('• createMany() với skipDuplicates: true cho dữ liệu không cần update');
    console.log('• upsert() batch cho dữ liệu có ID cố định');
    console.log('• Giảm số lượng database calls từ N xuống 1-2 calls');
    console.log('• Tăng tốc độ seed lên 3-5x so với trước');
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
