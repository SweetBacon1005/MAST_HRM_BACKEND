import { PrismaClient } from '@prisma/client';

// Hàm tạo ngày ngẫu nhiên trong khoảng
function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

// Hàm tạo ngày làm việc (loại bỏ cuối tuần)
function getWorkDays(startDate: Date, endDate: Date): Date[] {
  const workDays: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday or Saturday
      workDays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return workDays;
}

// Danh sách task titles thực tế
const TASK_TITLES = [
  'Implement user authentication API',
  'Design database schema for orders',
  'Create responsive dashboard UI',
  'Fix payment gateway integration bug',
  'Optimize database query performance',
  'Write unit tests for user service',
  'Setup CI/CD pipeline',
  'Implement real-time notifications',
  'Create admin panel for user management',
  'Integrate third-party analytics',
  'Develop mobile app login screen',
  'Fix cross-browser compatibility issues',
  'Implement data export functionality',
  'Create API documentation',
  'Setup monitoring and logging',
  'Implement search functionality',
  'Design email templates',
  'Create backup and recovery system',
  'Implement role-based access control',
  'Optimize frontend bundle size',
  'Create automated testing suite',
  'Implement file upload feature',
  'Design system architecture',
  'Create deployment scripts',
  'Implement caching mechanism',
  'Fix security vulnerabilities',
  'Create user onboarding flow',
  'Implement data validation',
  'Setup load balancing',
  'Create error handling system',
];

// Danh sách process types và tool types
const PROCESS_TYPES = [
  'ANALYSIS',
  'DESIGN',
  'DEVELOPMENT',
  'TESTING',
  'DEPLOYMENT',
  'MAINTENANCE',
];
const TOOL_TYPES = ['JIRA', 'REDMINE', 'GITHUB', 'GITLAB', 'OTHER'];

export async function seedMassReports(prisma: PrismaClient, seedData: any) {
  console.log('📊 Seeding mass reports and evaluations...');

  const { massUsers, users: originalUsers, massProjects } = seedData;
  const allUsers = [...(originalUsers || []), ...(massUsers || [])];
  const allProjects = massProjects || [];

  // Tạo dữ liệu cho 3 tháng gần đây
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  const workDays = getWorkDays(startDate, endDate);

  // 1. DAILY REPORTS
  console.log('📝 Tạo daily reports...');
  const dailyReportData: any[] = [];


  console.log(`📝 Tạo ${dailyReportData.length} daily reports...`);

  // Batch create daily reports
  const batchSize = 100;
  for (let i = 0; i < dailyReportData.length; i += batchSize) {
    const batch = dailyReportData.slice(i, i + batchSize);
    await prisma.daily_reports.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(
      `✓ Created daily reports batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dailyReportData.length / batchSize)}`,
    );
  }

  // 2. PM REPORTS
  console.log('👨‍💼 Tạo PM reports...');
  const pmReportData: any[] = [];

  // Lấy PMs (users có role manager hoặc có position Project Manager)
  // Lấy danh sách user có role admin hoặc manager từ user_role_assignment
  const adminManagerRoleAssignments = await prisma.user_role_assignment.findMany({
    where: {
      role: { name: { in: ['admin', 'manager'] } },
      deleted_at: null,
    },
    select: { user_id: true },
  });

  const pms = await prisma.user_information.findMany({
    where: {
      OR: [
        { user_id: { in: adminManagerRoleAssignments.map(ra => ra.user_id) } },
        { position: { name: 'Project Manager' } },
      ],
    },
    include: { user: true },
  });

  console.log(`👨‍💼 Tạo ${pmReportData.length} PM reports...`);

  // Batch create PM reports
  for (let i = 0; i < pmReportData.length; i += batchSize) {
    const batch = pmReportData.slice(i, i + batchSize);
    await prisma.pm_reports.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(
      `✓ Created PM reports batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pmReportData.length / batchSize)}`,
    );
  }

  // 3. EVALUATION HISTORIES
  console.log('⭐ Tạo evaluation histories...');
  const evaluationData: any[] = [];

  // Lấy tất cả levels
  const levels = await prisma.levels.findMany();

  for (const user of allUsers) {
    // Mỗi user có 2-4 evaluations trong năm qua
    const evaluationCount = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < evaluationCount; i++) {
      const evaluationDate = randomDateBetween(
        new Date(new Date().getFullYear() - 1, 0, 1), // Start of last year
        new Date(), // Now
      );

      // Random level (có thể thăng cấp theo thời gian)
      const currentLevel =
        levels[
          Math.min(levels.length - 1, Math.floor(Math.random() * levels.length))
        ];

      // Point từ 6.0 đến 10.0
      const point = Math.random() * 4 + 6;

      const notes = [
        'Nhân viên có tinh thần trách nhiệm cao, hoàn thành tốt công việc được giao.',
        'Cần cải thiện kỹ năng giao tiếp và làm việc nhóm.',
        'Xuất sắc trong việc giải quyết vấn đề kỹ thuật phức tạp.',
        'Thường xuyên đóng góp ý tưởng sáng tạo cho dự án.',
        'Cần nâng cao kỹ năng quản lý thời gian và ưu tiên công việc.',
        'Có khả năng lãnh đạo tốt và hỗ trợ đồng nghiệp hiệu quả.',
        'Kỹ năng chuyên môn vững vàng, cần phát triển thêm soft skills.',
        'Nhân viên tiềm năng, có thể thăng tiến trong tương lai gần.',
      ];

      evaluationData.push({
        user_id: user.id,
        date: evaluationDate,
        point: Math.round(point * 10) / 10, // Round to 1 decimal place
        level_id: currentLevel.id,
        note: notes[Math.floor(Math.random() * notes.length)],
      });
    }
  }

  console.log(`⭐ Tạo ${evaluationData.length} evaluation histories...`);

  // Batch create evaluations
  for (let i = 0; i < evaluationData.length; i += batchSize) {
    const batch = evaluationData.slice(i, i + batchSize);
    await prisma.evaluation_histories.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(
      `✓ Created evaluations batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(evaluationData.length / batchSize)}`,
    );
  }

  // 4. USER LEAVE BALANCES
  console.log('🏖️ Tạo user leave balances...');
  const leaveBalanceData: any[] = [];
  const leaveTransactionData: any[] = [];

  for (const user of allUsers) {
    const paidLeaveBalance = Math.random() * 20 + 10; // 10-30 days
    const unpaidLeaveBalance = Math.random() * 10; // 0-10 days
    const carryOverDays = Math.random() * 5; // 0-5 days from previous year

    const lastResetDate = new Date(new Date().getFullYear(), 0, 1); // Start of current year

    leaveBalanceData.push({
      user_id: user.id,
      paid_leave_balance: Math.round(paidLeaveBalance * 10) / 10,
      unpaid_leave_balance: Math.round(unpaidLeaveBalance * 10) / 10,
      annual_paid_leave_quota: 36, // 3 days per month
      carry_over_days: Math.round(carryOverDays * 10) / 10,
      last_reset_date: lastResetDate,
    });

    // Tạo leave transactions cho user này
    // Monthly accrual transactions
    for (let month = 0; month < 12; month++) {
      const transactionDate = new Date(new Date().getFullYear(), month, 1);
      if (transactionDate <= new Date()) {
        leaveTransactionData.push({
          user_id: user.id,
          transaction_type: 'EARNED' as const,
          leave_type: 'PAID' as const,
          amount: 3, // 3 days per month
          balance_after: paidLeaveBalance + (month + 1) * 3,
          reference_type: 'monthly_accrual',
          description: `Monthly leave accrual for ${transactionDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`,
        });
      }
    }

    // Some usage transactions
    const usageCount = Math.floor(Math.random() * 5) + 2; // 2-6 usage transactions
    for (let i = 0; i < usageCount; i++) {
      const usageDate = randomDateBetween(lastResetDate, new Date());
      const usageAmount = Math.random() * 3 + 0.5; // 0.5-3.5 days

      leaveTransactionData.push({
        user_id: user.id,
        transaction_type: 'USED' as const,
        leave_type: 'PAID' as const,
        amount: -Math.round(usageAmount * 10) / 10,
        balance_after: paidLeaveBalance - usageAmount,
        reference_type: 'day_off',
        description: `Leave usage on ${usageDate.toLocaleDateString('vi-VN')}`,
      });
    }
  }

  console.log(`🏖️ Tạo ${leaveBalanceData.length} user leave balances...`);

  // Batch create leave balances
  for (let i = 0; i < leaveBalanceData.length; i += batchSize) {
    const batch = leaveBalanceData.slice(i, i + batchSize);
    await Promise.all(
      batch.map((balance) =>
        prisma.user_leave_balances.upsert({
          where: { user_id: balance.user_id },
          update: {},
          create: balance,
        }),
      ),
    );
    console.log(
      `✓ Created leave balances batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(leaveBalanceData.length / batchSize)}`,
    );
  }

  console.log(`💰 Tạo ${leaveTransactionData.length} leave transactions...`);

  // Batch create leave transactions
  for (let i = 0; i < leaveTransactionData.length; i += batchSize) {
    const batch = leaveTransactionData.slice(i, i + batchSize);
    await prisma.leave_transactions.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(
      `✓ Created leave transactions batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(leaveTransactionData.length / batchSize)}`,
    );
  }

  return {
    totalDailyReports: dailyReportData.length,
    totalPmReports: pmReportData.length,
    totalEvaluations: evaluationData.length,
    totalLeaveBalances: leaveBalanceData.length,
    totalLeaveTransactions: leaveTransactionData.length,
    workDaysCount: workDays.length,
    usersCount: allUsers.length,
  };
}
