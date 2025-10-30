const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSeedStatus() {
  console.log('📊 KIỂM TRA TRẠNG THÁI SEED DATA');
  console.log('=================================\n');
  
  try {
    await prisma.$connect();
    
    // Kiểm tra các bảng chính
    const stats = {
      users: await prisma.users.count(),
      user_information: await prisma.user_information.count(),
      projects: await prisma.projects.count(),
      tasks: await prisma.tasks.count(),
      time_sheets: await prisma.time_sheets.count(),
      attendance_logs: await prisma.attendance_logs.count(),
      attendance_sessions: await prisma.attendance_sessions.count(),
      day_offs: await prisma.day_offs.count(),
      remote_work_requests: await prisma.remote_work_requests.count(),
      over_times_history: await prisma.over_times_history.count(),
      late_early_requests: await prisma.late_early_requests.count(),
      forgot_checkin_requests: await prisma.forgot_checkin_requests.count(),
      assets: await prisma.assets.count(),
      asset_requests: await prisma.asset_requests.count(),
      daily_reports: await prisma.daily_reports.count(),
      pm_reports: await prisma.pm_reports.count(),
      evaluation_histories: await prisma.evaluation_histories.count(),
      user_leave_balances: await prisma.user_leave_balances.count(),
      leave_transactions: await prisma.leave_transactions.count(),
      user_skills: await prisma.user_skills.count(),
      user_certificates: await prisma.user_certificates.count(),
      education: await prisma.education.count(),
      experience: await prisma.experience.count(),
      user_division: await prisma.user_division.count(),
      holidays: await prisma.holidays.count(),
      project_role_user: await prisma.project_role_user.count(),
    };
    
    console.log('👥 USER DATA:');
    console.log(`- Users: ${stats.users}`);
    console.log(`- User Information: ${stats.user_information}`);
    console.log(`- User Skills: ${stats.user_skills}`);
    console.log(`- User Certificates: ${stats.user_certificates}`);
    console.log(`- Education: ${stats.education}`);
    console.log(`- Experience: ${stats.experience}`);
    console.log(`- User Divisions: ${stats.user_division}`);
    
    console.log('\n🚀 PROJECT DATA:');
    console.log(`- Projects: ${stats.projects}`);
    console.log(`- Tasks: ${stats.tasks}`);
    console.log(`- Project Role Users: ${stats.project_role_user}`);
    
    console.log('\n⏰ ATTENDANCE DATA:');
    console.log(`- Timesheets: ${stats.time_sheets}`);
    console.log(`- Attendance Sessions: ${stats.attendance_sessions}`);
    console.log(`- Attendance Logs: ${stats.attendance_logs}`);
    
    console.log('\n📝 REQUEST DATA:');
    console.log(`- Day Offs: ${stats.day_offs}`);
    console.log(`- Remote Work: ${stats.remote_work_requests}`);
    console.log(`- Overtime: ${stats.over_times_history}`);
    console.log(`- Late/Early: ${stats.late_early_requests}`);
    console.log(`- Forgot Checkin: ${stats.forgot_checkin_requests}`);
    
    console.log('\n💻 ASSET DATA:');
    console.log(`- Assets: ${stats.assets}`);
    console.log(`- Asset Requests: ${stats.asset_requests}`);
    
    console.log('\n📊 REPORT DATA:');
    console.log(`- Daily Reports: ${stats.daily_reports}`);
    console.log(`- PM Reports: ${stats.pm_reports}`);
    console.log(`- Evaluations: ${stats.evaluation_histories}`);
    
    console.log('\n🏖️ LEAVE DATA:');
    console.log(`- Leave Balances: ${stats.user_leave_balances}`);
    console.log(`- Leave Transactions: ${stats.leave_transactions}`);
    
    console.log('\n🎉 OTHER DATA:');
    console.log(`- Holidays: ${stats.holidays}`);
    
    // Tính tổng records
    const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);
    console.log(`\n📈 TỔNG RECORDS: ${totalRecords.toLocaleString()}`);
    
    // Kiểm tra xem seed đã hoàn thành chưa
    const expectedMinimum = {
      users: 150,
      projects: 50,
      time_sheets: 5000,
      day_offs: 1000,
      assets: 200
    };
    
    console.log('\n🎯 TRẠNG THÁI SEED:');
    let allComplete = true;
    
    for (const [table, expected] of Object.entries(expectedMinimum)) {
      const actual = stats[table];
      const status = actual >= expected ? '✅' : '❌';
      const percentage = Math.round((actual / expected) * 100);
      console.log(`${status} ${table}: ${actual}/${expected} (${percentage}%)`);
      
      if (actual < expected) {
        allComplete = false;
      }
    }
    
    if (allComplete) {
      console.log('\n🎉 SEED HOÀN THÀNH! Database đã có đủ dữ liệu test.');
    } else {
      console.log('\n⚠️  SEED CHƯA HOÀN THÀNH. Cần chạy thêm seed data.');
    }
    
    // Hiển thị một số sample data
    console.log('\n📋 SAMPLE DATA:');
    
    const sampleUsers = await prisma.users.findMany({
      take: 3,
      include: {
        user_information: true
      }
    });
    
    console.log('👤 Sample Users:');
    sampleUsers.forEach(user => {
      console.log(`- ${user.email} (${user.user_information?.name || 'No name'})`);
    });
    
    const sampleProjects = await prisma.projects.findMany({
      take: 3
    });
    
    console.log('\n🚀 Sample Projects:');
    sampleProjects.forEach(project => {
      console.log(`- ${project.name} (${project.code})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeedStatus();
