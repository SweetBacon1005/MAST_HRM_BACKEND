import {
  DayOffDuration,
  DayOffStatus,
  DayOffType,
  PrismaClient,
  RemoteType,
  TimesheetStatus,
} from '@prisma/client';

export async function seedRequests(prisma: PrismaClient, seedData: any) {
  console.log('📝 Seeding requests...');

  const { users } = seedData;

  // Tìm user có email user@example.com
  const exampleUser = await prisma.users.findUnique({
    where: { email: 'user@example.com' },
  });

  if (!exampleUser) {
    console.log('❌ Không tìm thấy user user@example.com');
    return;
  }

  console.log(
    `📝 Tạo requests cho user: ${exampleUser.name} (${exampleUser.email})`,
  );

  // 1. Tạo Remote Work Requests
  console.log('🏠 Tạo remote work requests...');
  const remoteWorkRequests = [
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-10'),
      remote_type: RemoteType.REMOTE,
      title: 'Xin làm việc từ xa để tập trung hoàn thành dự án',
      reason: 'Cần tập trung làm việc ở nhà để hoàn thành dự án',
      status: TimesheetStatus.PENDING,
    },
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-12'),
      remote_type: RemoteType.HYBRID,
      title: 'Xin làm việc hybrid để cân bằng hiệu suất',
      reason: 'Làm việc hybrid để cân bằng hiệu suất',
      status: TimesheetStatus.APPROVED,
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-12-08T09:00:00Z'),
    },
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-15'),
      remote_type: RemoteType.REMOTE,
      title: 'Xin làm việc từ xa do có việc cá nhân',
      reason: 'Có việc cá nhân cần xử lý',
      status: TimesheetStatus.REJECTED,
      rejected_reason: 'Tuần này đã có quá nhiều người remote work',
      updated_at: new Date('2024-12-09T10:30:00Z'),
    },
  ];

  for (const request of remoteWorkRequests) {
    // Kiểm tra xem đã có request cho ngày này chưa
    const existing = await prisma.remote_work_requests.findFirst({
      where: {
        user_id: request.user_id,
        work_date: request.work_date,
        deleted_at: null,
      },
    });

    if (!existing) {
      await prisma.remote_work_requests.create({
        data: request,
      });
    }
  }

  // 2. Tạo Day Off Requests
  console.log('🏖️ Tạo day off requests...');
  const dayOffRequests = [
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-20'),
      duration: DayOffDuration.FULL_DAY,
      title: 'Xin nghỉ phép năm',
      type: DayOffType.PAID,
      reason: 'Nghỉ phép năm',
      status: DayOffStatus.PENDING,
      is_past: false,
    },
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-23'),
      duration: DayOffDuration.FULL_DAY,
      title: 'Xin nghỉ lễ Giáng sinh (ngày 1)',
      type: DayOffType.PAID,
      reason: 'Nghỉ lễ Giáng sinh',
      status: DayOffStatus.APPROVED,
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-12-08T14:00:00Z'),
      is_past: false,
    },
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-24'),
      duration: DayOffDuration.FULL_DAY,
      title: 'Xin nghỉ lễ Giáng sinh (ngày 2)',
      type: DayOffType.PAID,
      reason: 'Nghỉ lễ Giáng sinh',
      status: DayOffStatus.APPROVED,
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-12-08T14:00:00Z'),
      is_past: false,
    },
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-11-15'),
      duration: DayOffDuration.MORNING,
      title: 'Xin nghỉ buổi sáng để khám sức khỏe',
      type: DayOffType.UNPAID,
      reason: 'Khám sức khỏe định kỳ',
      status: DayOffStatus.APPROVED,
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-11-10T11:00:00Z'),
      is_past: true,
    },
  ];

  for (const request of dayOffRequests) {
    // Kiểm tra xem đã có day-off request cho ngày này chưa
    const existing = await prisma.day_offs.findFirst({
      where: {
        user_id: request.user_id,
        work_date: request.work_date,
        deleted_at: null,
      },
    });

    if (!existing) {
      await prisma.day_offs.create({
        data: request,
      });
    }
  }

  // 3. Tạo Overtime Requests
  console.log('⏰ Tạo overtime requests...');

  // Tìm project đầu tiên để gán vào overtime
  const firstProject = await prisma.projects.findFirst({
    where: { deleted_at: null },
  });

  const overtimeRequests = [
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-05'),
      title: 'Xin tăng ca để hoàn thành tính năng mới',
      start_time: new Date('2024-12-05T18:00:00.000Z'),
      end_time: new Date('2024-12-05T21:00:00.000Z'),
      total_hours: 3,
      hourly_rate: 50000,
      total_amount: 150000, // 50k/hour * 3 hours 
      reason: 'Hoàn thành tính năng mới cho dự án',
      project_id: firstProject?.id || null, // Nullable trong schema
      status: TimesheetStatus.PENDING,
    },
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-07'),
      title: 'Xin tăng ca để fix bug khẩn cấp',
      start_time: new Date('2024-12-07T19:00:00.000Z'),
      end_time: new Date('2024-12-07T22:00:00.000Z'),
      total_hours: 3,
      hourly_rate: 50000,
      total_amount: 150000,
      reason: 'Fix bug khẩn cấp trước deadline',
      project_id: firstProject?.id || null,
      status: TimesheetStatus.APPROVED,
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-12-06T16:00:00Z'),
    },
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-11-30'),
      title: 'Xin tăng ca để deploy production',
      start_time: new Date('2024-11-30T17:30:00.000Z'),
      end_time: new Date('2024-11-30T20:30:00.000Z'),
      total_hours: 3,
      hourly_rate: 50000,
      total_amount: 150000,
      reason: 'Deploy production cuối tháng',
      project_id: firstProject?.id || null,
      status: TimesheetStatus.REJECTED,
      rejected_reason: 'Không cần thiết deploy vào cuối tháng',
    },
  ];

  for (const request of overtimeRequests) {
    // Kiểm tra xem đã có overtime request cho ngày này chưa
    const existing = await prisma.over_times_history.findFirst({
      where: {
        user_id: request.user_id,
        work_date: request.work_date,
        deleted_at: null,
      },
    });

    if (!existing) {
      await prisma.over_times_history.create({
        data: request,
      });
    }
  }

  console.log('✅ Requests seed completed!');
  console.log(`   - Remote work requests: ${remoteWorkRequests.length}`);
  console.log(`   - Day off requests: ${dayOffRequests.length}`);
  console.log(`   - Overtime requests: ${overtimeRequests.length}`);
}
