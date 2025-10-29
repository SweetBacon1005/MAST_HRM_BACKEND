import { PrismaClient } from '@prisma/client';

export async function seedUserRelations(prisma: PrismaClient, seedData: any) {
  console.log('🔗 Seeding user relationships...');

  const { users, roles, projects } = seedData;

  // 1. Tạo user_division - sử dụng createMany với skipDuplicates
  console.log('🏢 Tạo user division assignments...');
  const userDivisionData = [
    {
      userId: users[0].id,
      role_id: roles[0].id, // admin
      divisionId: 1, // Technology Division
      teamId: null,
      description: 'System Administrator',
    },
    {
      userId: users[1].id,
      role_id: roles[1].id, // manager
      divisionId: 2, // Human Resources
      teamId: null,
      description: 'HR Manager',
    },
    {
      userId: users[2].id,
      role_id: roles[2].id, // team_leader
      divisionId: 4, // Development Team A
      teamId: 1, // Backend Team
      description: 'Backend Team Leader',
    },
    {
      userId: users[3].id,
      role_id: roles[2].id, // team_leader
      divisionId: 4, // Development Team A
      teamId: 2, // Frontend Team
      description: 'Frontend Team Leader',
    },
    {
      userId: users[4].id,
      role_id: roles[3].id, // developer
      divisionId: 5, // Development Team B
      teamId: 3, // Mobile Team
      description: 'Mobile Developer',
    },
    {
      userId: users[5].id,
      role_id: roles[4].id, // tester
      divisionId: 3, // Quality Assurance
      teamId: 4, // QA Team
      description: 'Senior QA Tester',
    },
    {
      userId: users[6].id,
      role_id: roles[3].id, // developer
      divisionId: 1, // Technology Division
      teamId: 5, // DevOps Team
      description: 'DevOps Engineer',
    },
    {
      userId: users[7].id,
      role_id: roles[5].id, // employee
      divisionId: 1, // Technology Division
      teamId: 6, // UI/UX Team
      description: 'UI/UX Designer',
    },
  ];

  await prisma.user_division.createMany({
    data: userDivisionData,
    skipDuplicates: true,
  });

  // 2. Tạo allocations (phân bổ nhân sự cho dự án) - sử dụng createMany
  console.log('👥 Tạo project allocations...');
  const allocationsData = [
    // John Doe (Backend Developer) - ABC CRM System
    {
      user_id: users[2].id, // John Doe
      start_date: new Date('2024-02-16'),
      end_date: new Date('2024-04-20'),
      man_day: 45,
      allocation: 80, // 80% allocation
      skill_id: 1, // Node.js skill
      coefficient: 2.0, // Senior level
      role_id: roles[2].id, // team_leader
    },
    // Jane Smith (Frontend Developer) - E-Commerce Platform
    {
      user_id: users[3].id, // Jane Smith
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-04-01'),
      man_day: 22,
      allocation: 70, // 70% allocation
      skill_id: 10, // React.js skill
      coefficient: 2.0, // Senior level
      role_id: roles[2].id, // team_leader
    },
    // Mike Johnson (Mobile Developer) - XYZ Banking Mobile App
    {
      user_id: users[4].id, // Mike Johnson
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-08-01'),
      man_day: 120,
      allocation: 100, // 100% allocation
      skill_id: 17, // React Native skill
      coefficient: 1.5, // Middle level
      role_id: roles[3].id, // developer
    },
    // Sarah Wilson (QA Tester) - ABC CRM System
    {
      user_id: users[5].id, // Sarah Wilson
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-04-20'),
      man_day: 35,
      allocation: 60, // 60% allocation
      skill_id: 21, // Manual Testing skill
      coefficient: 2.0, // Senior level
      role_id: roles[4].id, // tester
    },
  ];

  await prisma.allocations.createMany({
    data: allocationsData,
    skipDuplicates: true,
  });

  // 3. Tạo basic timesheet data - sử dụng createMany
  console.log('⏰ Tạo basic timesheet data...');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const timesheetData = [
    // John Doe timesheet
    {
      work_date: yesterday as Date,
      user_id: users[2].id,
      checkin: new Date(
        `${yesterday.toISOString().split('T')[0]}T08:00:00.000Z`,
      ),
      checkout: new Date(
        `${yesterday.toISOString().split('T')[0]}T17:30:00.000Z`,
      ),
      checkin_checkout: '08:00-17:30',
      late_time: 0,
      early_time: 0,
      is_complete: true,
      fines: 0,
      work_time_morning: 240, // 4 hours in minutes
      work_time_afternoon: 270, // 4.5 hours in minutes
      status: 'APPROVED' as const, // approved
      type: 'NORMAL' as const, // normal working day
    },
    // Jane Smith timesheet
    {
      user_id: users[3].id,
      work_date: yesterday as Date,
      checkin: new Date(
        `${yesterday.toISOString().split('T')[0]}T08:15:00.000Z`,
      ),
      checkout: new Date(
        `${yesterday.toISOString().split('T')[0]}T17:45:00.000Z`,
      ),
      checkin_checkout: '08:15-17:45',
      late_time: 15, // 15 minutes late
      early_time: 0,
      is_complete: true,
      fines: 0,
      work_time_morning: 225, // 3h45m in minutes
      work_time_afternoon: 285, // 4h45m in minutes
      status: 'APPROVED' as const, // approved
      type: 'NORMAL' as const,
    },
    // Mike Johnson timesheet
    {
      work_date: yesterday as Date,
      user_id: users[4].id,
      checkin: new Date(
        `${yesterday.toISOString().split('T')[0]}T08:00:00.000Z`,
      ),
      checkout: new Date(
        `${yesterday.toISOString().split('T')[0]}T17:00:00.000Z`,
      ),
      checkin_checkout: '08:00-17:00',
      late_time: 0,
      early_time: 30, // left 30 minutes early
      is_complete: true,
      fines: 0,
      work_time_morning: 240,
      work_time_afternoon: 240, // 4 hours
      status: 'APPROVED' as const,
      type: 'NORMAL' as const,
    },
  ];

  await prisma.time_sheets.createMany({
    data: timesheetData,
    skipDuplicates: true,
  });

  // 4. Tạo sample daily reports - sử dụng createMany
  console.log('📊 Tạo daily reports...');
  const dailyReportsData = [
    // John Doe daily report
    {
      user_id: users[2].id,
      project_id: projects[0].id, // ABC CRM System
      coefficient: 2.0,
      tool_type: 'JIRA' as const,
      issue_key: 'ABC-123',
      title: 'Implement user authentication API',
      work_date: yesterday as Date,
      process_type: 'DEVELOPMENT' as const,
      actual_time: 8.0,
      status: 'APPROVED' as const, // approved
      link_backlog: 'https://jira.company.com/browse/ABC-123',
      description:
        'Completed user authentication endpoints with JWT token implementation',
      reject_reason: null,
    },
    // Jane Smith daily report
    {
      user_id: users[3].id,
      project_id: projects[2].id, // E-Commerce Platform
      coefficient: 2.0,
      tool_type: 'JIRA' as const,
      issue_key: 'ECS-456',
      title: 'Design product listing page UI',
      work_date: yesterday as Date,
      process_type: 'DESIGN' as const,
      actual_time: 7.5,
      status: 'APPROVED' as const, // approved
      link_backlog: 'https://jira.company.com/browse/ECS-456',
      description:
        'Created responsive product listing page with filtering options',
      reject_reason: null,
    },
    // Mike Johnson daily report
    {
      user_id: users[4].id,
      project_id: projects[1].id, // XYZ Banking Mobile App
      coefficient: 1.5,
      tool_type: 'JIRA' as const,
      issue_key: 'XYZ-789',
      title: 'Implement biometric authentication',
      work_date: yesterday as Date,
      process_type: 'DEVELOPMENT' as const,
      actual_time: 8.0,
      status: 'PENDING' as const, // pending
      link_backlog: 'https://jira.company.com/browse/XYZ-789',
      description:
        'Working on fingerprint and face ID authentication for mobile app',
      reject_reason: null,
    },
  ];

  await prisma.daily_reports.createMany({
    data: dailyReportsData,
    skipDuplicates: true,
  });

  // === OVERTIME HISTORY ===
  console.log('🕐 Seeding overtime history...');

  const overtimeHistoryData = [
    // John Doe overtime
    {
      user_id: users[2].id, // John Doe
      work_date: new Date('2024-01-15'),
      title: 'Tăng ca sửa lỗi khẩn cấp',
      start_time: new Date('2024-01-15T18:00:00.000Z'),
      end_time: new Date('2024-01-15T20:30:00.000Z'),
      total_hours: 2.5,
      hourly_rate: 80000,
      total_amount: 200000, // 200k VND
      project_id: projects[0].id, // ABC CRM System
      reason: 'Fix critical bug before client demo',
      status: 'APPROVED' as const,
    },
    // Jane Smith overtime
    {
      user_id: users[3].id, // Jane Smith
      work_date: new Date('2024-01-20'),
      title: 'Tăng ca kiểm tra bảo mật',
      start_time: new Date('2024-01-20T18:30:00.000Z'),
      end_time: new Date('2024-01-20T21:30:00.000Z'),
      total_hours: 3.0,
      hourly_rate: 80000,
      total_amount: 240000, // 240k VND
      project_id: projects[1].id, // XYZ Banking Mobile App
      reason: 'Complete security testing before release',
      status: 'APPROVED' as const,
    },
    // Bob Wilson overtime
    {
      user_id: users[4].id, // Bob Wilson
      work_date: new Date('2024-01-25'),
      title: 'Tăng ca deploy hotfix',
      start_time: new Date('2024-01-25T17:30:00.000Z'),
      end_time: new Date('2024-01-25T19:00:00.000Z'),
      total_hours: 1.5,
      hourly_rate: 80000,
      total_amount: 120000, // 120k VND
      project_id: projects[0].id, // ABC CRM System
      reason: 'Deploy hotfix to production',
      status: 'APPROVED' as const,
    },
    // Mike Johnson overtime
    {
      user_id: users[5].id, // Mike Johnson
      work_date: new Date('2024-02-01'),
      title: 'Tăng ca bảo trì khẩn cấp',
      start_time: new Date('2024-02-01T18:00:00.000Z'),
      end_time: new Date('2024-02-01T22:00:00.000Z'),
      total_hours: 4.0,
      hourly_rate: 80000,
      total_amount: 320000, // 320k VND
      project_id: projects[1].id, // XYZ Banking Mobile App
      reason: 'Emergency maintenance and data migration',
      status: 'APPROVED' as const,
    },
    // John Doe weekend overtime
    {
      user_id: users[2].id, // John Doe
      work_date: new Date('2024-02-03'), // Saturday
      title: 'Tăng ca cuối tuần deploy hệ thống',
      start_time: new Date('2024-02-03T09:00:00.000Z'),
      end_time: new Date('2024-02-03T15:00:00.000Z'),
      total_hours: 6.0,
      hourly_rate: 80000,
      total_amount: 480000, // 480k VND
      project_id: projects[2].id, // DEF E-commerce Platform
      reason: 'Weekend deployment and system monitoring',
      status: 'APPROVED' as const,
    },
    // Jane Smith recent overtime
    {
      user_id: users[3].id, // Jane Smith
      work_date: new Date('2024-02-10'),
      title: 'Tăng ca tối ưu hiệu suất',
      start_time: new Date('2024-02-10T18:00:00.000Z'),
      end_time: new Date('2024-02-10T20:00:00.000Z'),
      total_hours: 2.0,
      hourly_rate: 80000,
      total_amount: 160000, // 160k VND
      project_id: projects[2].id, // DEF E-commerce Platform
      reason: 'Performance optimization and bug fixes',
      status: 'APPROVED' as const,
    },
  ];

  await prisma.over_times_history.createMany({
    data: overtimeHistoryData,
    skipDuplicates: true,
  });

  console.log('✅ User relationships seeded successfully!');
}
