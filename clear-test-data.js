const { PrismaClient } = require('@prisma/client');

async function clearTestData() {
  console.log('🧹 Clearing TEST DATA...');
  console.log('⚠️  This will remove all test data but keep essential data!\n');

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    console.log('🔍 Identifying test data...');

    // Get essential users (admin, test users with specific emails)
    const essentialEmails = [
      'admin@example.com',
      'user@example.com',
      'manager@example.com',
      'hr@example.com',
      'division_head@example.com',
    ];

    const essentialUsers = await prisma.users.findMany({
      where: {
        email: { in: essentialEmails }
      },
      select: { id: true }
    });

    const essentialUserIds = essentialUsers.map(u => u.id);
    console.log(`✓ Found ${essentialUserIds.length} essential users to keep`);

    // Clear test data in correct order (respecting foreign key constraints)
    console.log('\n🗑️  Clearing test data...');

    // 1. Clear activity logs
    await prisma.activity_log.deleteMany({
      where: {
        causer_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test activity logs');

    // 2. Clear attendance data
    await prisma.attendance_logs.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test attendance logs');

    await prisma.attendance_sessions.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test attendance sessions');

    await prisma.time_sheets.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test timesheets');

    // 3. Clear requests
    await prisma.day_offs.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test day offs');

    await prisma.remote_work_requests.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test remote work requests');

    await prisma.over_times_history.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test overtime requests');

    await prisma.late_early_requests.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test late/early requests');

    await prisma.forgot_checkin_requests.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test forgot checkin requests');

    // 4. Clear reports
    await prisma.daily_reports.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test daily reports');

    await prisma.pm_reports.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test PM reports');

    await prisma.evaluation_history.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test evaluations');

    // 5. Clear assets
    await prisma.asset_requests.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test asset requests');

    // Clear assets not assigned to essential users
    await prisma.assets.deleteMany({
      where: {
        AND: [
          { assigned_to: { not: null } },
          { assigned_to: { notIn: essentialUserIds } }
        ]
      }
    });
    console.log('✓ Cleared test assets');

    // 6. Clear project-related data
    await prisma.tasks.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test tasks');

    await prisma.project_role_user.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test project roles');

    // Clear projects with no essential users
    const projectsToKeep = await prisma.project_role_user.findMany({
      where: {
        user_id: { in: essentialUserIds }
      },
      select: { project_id: true }
    });
    const projectIdsToKeep = [...new Set(projectsToKeep.map(p => p.project_id))];

    await prisma.projects.deleteMany({
      where: {
        id: { notIn: projectIdsToKeep }
      }
    });
    console.log('✓ Cleared test projects');

    // 7. Clear user-related data
    await prisma.user_skills.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test user skills');

    await prisma.user_certificates.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test user certificates');

    await prisma.user_education.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test user education');

    await prisma.user_experience.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test user experience');

    await prisma.user_division.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test user divisions');

    await prisma.leave_balance.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test leave balances');

    await prisma.leave_transaction.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test leave transactions');

    // 8. Finally, clear test users
    await prisma.user_information.deleteMany({
      where: {
        user_id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test user information');

    await prisma.users.deleteMany({
      where: {
        id: { notIn: essentialUserIds }
      }
    });
    console.log('✓ Cleared test users');

    console.log('\n✅ =================================');
    console.log('✅ TEST DATA CLEARED SUCCESSFULLY!');
    console.log('✅ =================================\n');

    console.log('📊 Essential data preserved:');
    console.log(`- ${essentialUserIds.length} essential users`);
    console.log('- All basic data (roles, permissions, levels, positions)');
    console.log('- Organization structure (divisions, teams)');
    console.log('- Skills and certificates definitions');
    console.log('- Essential projects and relationships\n');

    console.log('🎯 Database is now clean with only essential data!');

  } catch (error) {
    console.error('❌ Clear test data failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('👋 Database connection closed');
  }
}

// Check if this is being run directly
if (require.main === module) {
  clearTestData().catch(console.error);
}

module.exports = { clearTestData };
