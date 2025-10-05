import { PrismaClient } from '@prisma/client';

export async function seedUserRelations(prisma: PrismaClient, seedData: any) {
  console.log('🔗 Seeding user relationships...');

  const { users, roles, stages, projects } = seedData;

  // 1. Tạo user_division - sử dụng createMany với skipDuplicates
  console.log('🏢 Tạo user division assignments...');
  const userDivisionData = [
    {
      userId: users[0].id,
      role_id: roles[0].id, // admin
      divisionId: 1, // Technology Division
      teamId: null,
      description: 'System Administrator',
      teamLeader: null,
    },
    {
      userId: users[1].id,
      role_id: roles[1].id, // manager
      divisionId: 2, // Human Resources
      teamId: null,
      description: 'HR Manager',
      teamLeader: null,
    },
    {
      userId: users[2].id,
      role_id: roles[2].id, // team_leader
      divisionId: 4, // Development Team A
      teamId: 1, // Backend Team
      description: 'Backend Team Leader',
      teamLeader: 1,
    },
    {
      userId: users[3].id,
      role_id: roles[2].id, // team_leader
      divisionId: 4, // Development Team A
      teamId: 2, // Frontend Team
      description: 'Frontend Team Leader',
      teamLeader: 1,
    },
    {
      userId: users[4].id,
      role_id: roles[3].id, // developer
      divisionId: 5, // Development Team B
      teamId: 3, // Mobile Team
      description: 'Mobile Developer',
      teamLeader: 0,
    },
    {
      userId: users[5].id,
      role_id: roles[4].id, // tester
      divisionId: 3, // Quality Assurance
      teamId: 4, // QA Team
      description: 'Senior QA Tester',
      teamLeader: 0,
    },
    {
      userId: users[6].id,
      role_id: roles[3].id, // developer
      divisionId: 1, // Technology Division
      teamId: 5, // DevOps Team
      description: 'DevOps Engineer',
      teamLeader: 0,
    },
    {
      userId: users[7].id,
      role_id: roles[5].id, // employee
      divisionId: 1, // Technology Division
      teamId: 6, // UI/UX Team
      description: 'UI/UX Designer',
      teamLeader: 0,
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
      stage_id: stages[1].id, // ABC CRM v1.1.0
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
      stage_id: stages[3].id, // E-Commerce Discovery
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
      stage_id: stages[2].id, // XYZ Banking Phase 1
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
      stage_id: stages[1].id, // ABC CRM v1.1.0
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

  // 5. Tạo sample over_times_history - sử dụng createMany
  console.log('⏰ Tạo overtime history...');
  const overtimeHistoryData = [
    {
      user_id: users[2].id, // John Doe
      total: 2.5,
      value: 200000, // 200k VND
      date: new Date('2024-01-15'),
      project_id: projects[0].id,
      start_time: new Date('2024-01-15T18:00:00.000Z'),
      end_time: new Date('2024-01-15T20:30:00.000Z'),
      reason: 'Fix critical bug before client demo',
    },
    {
      user_id: users[3].id, // Jane Smith
      total: 3.0,
      value: 240000, // 240k VND
      date: new Date('2024-01-20'),
      project_id: projects[2].id,
      start_time: new Date('2024-01-20T18:00:00.000Z'),
      end_time: new Date('2024-01-20T21:00:00.000Z'),
      reason: 'Complete UI design for client review',
    },
  ];

  await prisma.over_times_history.createMany({
    data: overtimeHistoryData,
    skipDuplicates: true,
  });

  console.log('✅ User relationships seeded successfully!');
}
