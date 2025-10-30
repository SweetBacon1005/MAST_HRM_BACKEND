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

  for (const user of allUsers) {
    // Lấy projects mà user tham gia
    const userProjects = await prisma.project_role_user.findMany({
      where: { user_id: user.id },
      include: { project: true },
    });

    if (userProjects.length === 0) continue;

    // Tạo daily reports cho 80% số ngày làm việc
    const reportDays = workDays.filter(() => Math.random() < 0.8);

    for (const workDay of reportDays) {
      // Mỗi ngày có 1-3 reports
      const reportsPerDay = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < reportsPerDay; i++) {
        const project =
          userProjects[Math.floor(Math.random() * userProjects.length)];
        const processType = PROCESS_TYPES[
          Math.floor(Math.random() * PROCESS_TYPES.length)
        ] as any;
        const toolType = TOOL_TYPES[
          Math.floor(Math.random() * TOOL_TYPES.length)
        ] as any;
        const status = ['PENDING', 'APPROVED', 'REJECTED'][
          Math.floor(Math.random() * 3)
        ] as any;

        const actualTime = Math.random() * 8 + 1; // 1-9 hours
        const coefficient = 1 + Math.random() * 1.5; // 1.0-2.5

        const issueKey =
          toolType === 'JIRA'
            ? `${project.project.code}-${Math.floor(Math.random() * 1000) + 100}`
            : toolType === 'REDMINE'
              ? `#${Math.floor(Math.random() * 10000) + 1000}`
              : `TASK-${Math.floor(Math.random() * 1000) + 100}`;

        const title =
          TASK_TITLES[Math.floor(Math.random() * TASK_TITLES.length)];

        dailyReportData.push({
          user_id: user.id,
          project_id: project.project.id,
          coefficient,
          tool_type: toolType,
          issue_key: issueKey,
          title,
          work_date: workDay,
          process_type: processType,
          actual_time: Math.round(actualTime * 100) / 100,
          status,
          link_backlog:
            toolType === 'JIRA'
              ? `https://company.atlassian.net/browse/${issueKey}`
              : toolType === 'REDMINE'
                ? `https://redmine.company.com/issues/${issueKey.replace('#', '')}`
                : toolType === 'GITHUB'
                  ? `https://github.com/company/project/issues/${Math.floor(Math.random() * 100) + 1}`
                  : null,
          issue_properties:
            toolType === 'JIRA'
              ? {
                  assignee: user.email,
                  priority: ['Low', 'Medium', 'High'][
                    Math.floor(Math.random() * 3)
                  ],
                  status: ['To Do', 'In Progress', 'Done'][
                    Math.floor(Math.random() * 3)
                  ],
                  story_points: Math.floor(Math.random() * 8) + 1,
                }
              : null,
          description: `Worked on ${title.toLowerCase()}. ${
            processType === 'DEVELOPMENT'
              ? 'Implemented core functionality and wrote tests.'
              : processType === 'TESTING'
                ? 'Performed testing and found several issues.'
                : processType === 'ANALYSIS'
                  ? 'Analyzed requirements and created technical specifications.'
                  : processType === 'DESIGN'
                    ? 'Created UI/UX designs and wireframes.'
                    : processType === 'DEPLOYMENT'
                      ? 'Deployed to staging environment and verified functionality.'
                      : 'Maintained existing code and fixed bugs.'
          }`,
          reject_reason:
            status === 'REJECTED'
              ? 'Thời gian báo cáo không hợp lý hoặc thiếu thông tin chi tiết'
              : null,
        });
      }
    }
  }

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
  const pms = await prisma.user_information.findMany({
    where: {
      OR: [
        { role: { name: { in: ['admin', 'manager'] } } },
        { position: { name: 'Project Manager' } },
      ],
    },
    include: { user: true },
  });

  for (const pm of pms) {
    // Lấy projects mà PM quản lý
    const pmProjects = await prisma.project_role_user.findMany({
      where: {
        user_id: pm.user_id,
        position_in_project: 1, // monitor/lead position
      },
      include: { project: true },
    });

    for (const projectRole of pmProjects) {
      // Tạo weekly reports cho 12 tuần gần đây
      for (let week = 0; week < 12; week++) {
        const reportDate = new Date();
        reportDate.setDate(reportDate.getDate() - week * 7);

        // Chỉ tạo report cho các tuần đã qua
        if (reportDate > new Date()) continue;

        const weekString = `W${Math.ceil(reportDate.getDate() / 7)}-${reportDate.getMonth() + 1}-${reportDate.getFullYear()}`;

        // Random status values (1: good, 2: warning, 3: serious)
        const customerFeedback = Math.floor(Math.random() * 3) + 1;
        const processStatus = Math.floor(Math.random() * 3) + 1;
        const timelinessStatus = Math.floor(Math.random() * 3) + 1;
        const qualityStatus = Math.floor(Math.random() * 3) + 1;
        const costStatus = Math.floor(Math.random() * 3) + 1;

        pmReportData.push({
          user_id: pm.user_id,
          project_id: projectRole.project.id,
          date: reportDate,
          week: weekString,
          customer_feedback: customerFeedback,
          process_status: processStatus,
          timeliness_status: timelinessStatus,
          quality_status: qualityStatus,
          cost_status: costStatus,
          cost_comment:
            costStatus === 3
              ? 'Budget overrun due to additional requirements'
              : costStatus === 2
                ? 'Budget tracking needs attention'
                : 'Budget on track',
          quality_comment:
            qualityStatus === 3
              ? 'Several critical bugs found in testing'
              : qualityStatus === 2
                ? 'Minor quality issues need addressing'
                : 'Quality meets standards',
          timeliness_comment:
            timelinessStatus === 3
              ? 'Significant delays due to technical challenges'
              : timelinessStatus === 2
                ? 'Minor delays but recoverable'
                : 'On schedule',
          process_comment:
            processStatus === 3
              ? 'Process issues affecting team productivity'
              : processStatus === 2
                ? 'Process improvements needed'
                : 'Process running smoothly',
          customer_feedback_comment:
            customerFeedback === 3
              ? 'Customer expressed serious concerns'
              : customerFeedback === 2
                ? 'Customer has some concerns'
                : 'Customer satisfied',
          note: `Weekly report for ${projectRole.project.name} - Week ${weekString}`,
        });
      }
    }
  }

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
