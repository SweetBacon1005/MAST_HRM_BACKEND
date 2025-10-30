const { PrismaClient } = require('@prisma/client');

// Import mass seed functions
const { seedMassUsers } = require('./dist/prisma/seeds/mass-users.seed');
const { seedMassProjects } = require('./dist/prisma/seeds/mass-projects.seed');
const { seedMassAttendance } = require('./dist/prisma/seeds/mass-attendance.seed');
const { seedMassRequests } = require('./dist/prisma/seeds/mass-requests.seed');
const { seedMassAssets } = require('./dist/prisma/seeds/mass-assets.seed');
const { seedMassReports } = require('./dist/prisma/seeds/mass-reports.seed');
const { seedAdditionalTestData } = require('./dist/prisma/seeds/additional-test-data.seed');

async function generateTestData() {
  console.log('🚀 Generating MASS TEST DATA...');
  console.log('⚠️  This will add thousands of records to your database!\n');

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    // Get existing basic data
    console.log('📊 Fetching existing basic data...');
    
    const [levels, positions, roles, users, divisions, teams] = await Promise.all([
      prisma.levels.findMany(),
      prisma.positions.findMany(),
      prisma.roles.findMany(),
      prisma.users.findMany({ include: { user_information: true } }),
      prisma.divisions.findMany(),
      prisma.teams.findMany(),
    ]);

    const basicData = { levels, positions };
    const rbacData = { roles };
    const usersData = { users };
    const orgData = { divisions, teams };

    console.log(`✓ Found ${users.length} existing users`);
    console.log(`✓ Found ${divisions.length} divisions`);
    console.log(`✓ Found ${roles.length} roles\n`);

    // 1. Generate mass users (150+ employees)
    console.log('👥 Generating mass users...');
    const massUsersData = await seedMassUsers(prisma, {
      ...basicData,
      ...rbacData,
    });
    console.log('✅ Mass users generated successfully!\n');

    // 2. Generate mass projects and tasks
    console.log('📋 Generating mass projects...');
    const massProjectsData = await seedMassProjects(prisma, {
      ...usersData,
      ...massUsersData,
    });
    console.log('✅ Mass projects generated successfully!\n');

    // 3. Generate mass attendance data
    console.log('⏰ Generating mass attendance...');
    const massAttendanceData = await seedMassAttendance(prisma, {
      ...usersData,
      ...massUsersData,
    });
    console.log('✅ Mass attendance generated successfully!\n');

    // 4. Generate mass requests
    console.log('📝 Generating mass requests...');
    const massRequestsData = await seedMassRequests(prisma, {
      ...usersData,
      ...massUsersData,
    });
    console.log('✅ Mass requests generated successfully!\n');

    // 5. Generate mass assets
    console.log('💻 Generating mass assets...');
    const massAssetsData = await seedMassAssets(prisma, {
      ...usersData,
      ...massUsersData,
    });
    console.log('✅ Mass assets generated successfully!\n');

    // 6. Generate mass reports
    console.log('📊 Generating mass reports...');
    const massReportsData = await seedMassReports(prisma, {
      ...usersData,
      ...massUsersData,
      ...massProjectsData,
    });
    console.log('✅ Mass reports generated successfully!\n');

    // 7. Generate additional test data
    console.log('🎯 Generating additional test data...');
    await seedAdditionalTestData(prisma, {
      ...usersData,
      ...massUsersData,
    });
    console.log('✅ Additional test data generated successfully!\n');

    // Final summary
    console.log('🎉 =================================');
    console.log('✅ MASS TEST DATA GENERATED!');
    console.log('🎉 =================================\n');

    console.log('📊 Test data summary:');
    console.log(`- ${massUsersData.totalUsers} additional users`);
    console.log(`- ${massProjectsData.totalProjects} projects`);
    console.log(`- ${massProjectsData.totalTasks} tasks`);
    console.log(`- ${massAttendanceData.totalTimesheets} timesheets`);
    console.log(`- ${massRequestsData.totalRequests} requests`);
    console.log(`- ${massAssetsData.totalAssets} assets`);
    console.log(`- ${massReportsData.totalReports} reports`);
    console.log(`- Thousands of related records\n`);

    console.log('🚀 Your database is now loaded with comprehensive test data!');

  } catch (error) {
    console.error('❌ Test data generation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('👋 Database connection closed');
  }
}

// Check if this is being run directly
if (require.main === module) {
  generateTestData().catch(console.error);
}

module.exports = { generateTestData };
