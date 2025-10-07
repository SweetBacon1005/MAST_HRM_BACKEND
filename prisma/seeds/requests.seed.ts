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
      reason: 'Cần tập trung làm việc ở nhà để hoàn thành dự án',
      note: 'Sẽ online đầy đủ trong giờ làm việc',
      status: TimesheetStatus.PENDING,
    },
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-12'),
      remote_type: RemoteType.HYBRID,
      reason: 'Làm việc hybrid để cân bằng hiệu suất',
      note: 'Sáng làm ở nhà, chiều vào văn phòng',
      status: TimesheetStatus.APPROVED,
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-12-08T09:00:00Z'),
    },
    {
      user_id: exampleUser.id,
      work_date: new Date('2024-12-15'),
      remote_type: RemoteType.REMOTE,
      reason: 'Có việc cá nhân cần xử lý',
      note: 'Cam kết hoàn thành đầy đủ công việc',
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
      start_date: new Date('2024-12-20'),
      end_date: new Date('2024-12-20'),
      duration: DayOffDuration.FULL_DAY,
      total: 1,
      type: DayOffType.PAID,
      reason: 'Nghỉ phép năm',
      note: 'Đã lên kế hoạch từ trước',
      status: DayOffStatus.PENDING,
      is_past: false,
    },
    {
      user_id: exampleUser.id,
      start_date: new Date('2024-12-23'),
      end_date: new Date('2024-12-24'),
      duration: DayOffDuration.FULL_DAY,
      total: 2,
      type: DayOffType.PAID,
      reason: 'Nghỉ lễ Giáng sinh',
      note: 'Nghỉ lễ cùng gia đình',
      status: DayOffStatus.APPROVED,
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-12-08T14:00:00Z'),
      is_past: false,
    },
    {
      user_id: exampleUser.id,
      start_date: new Date('2024-11-15'),
      end_date: new Date('2024-11-15'),
      duration: DayOffDuration.MORNING,
      total: 0.5,
      type: DayOffType.UNPAID,
      reason: 'Khám sức khỏe định kỳ',
      note: 'Khám sức khỏe tại bệnh viện',
      status: DayOffStatus.APPROVED,
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-11-10T11:00:00Z'),
      is_past: true,
    },
  ];

  for (const request of dayOffRequests) {
    // Kiểm tra xem đã có day-off request cho khoảng thời gian này chưa
    const existing = await prisma.day_offs.findFirst({
      where: {
        user_id: request.user_id,
        start_date: request.start_date,
        end_date: request.end_date,
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
      date: new Date('2024-12-05'),
      start_time: new Date('2024-12-05T18:00:00Z'),
      end_time: new Date('2024-12-05T21:00:00Z'),
      total: 3,
      value: 150000, // 50k/hour * 3 hours
      reason: 'Hoàn thành tính năng mới cho dự án',
      project_id: firstProject?.id || null, // Nullable trong schema
    },
    {
      user_id: exampleUser.id,
      date: new Date('2024-12-07'),
      start_time: new Date('2024-12-07T19:00:00Z'),
      end_time: new Date('2024-12-07T22:00:00Z'),
      total: 3,
      value: 150000,
      reason: 'Fix bug khẩn cấp trước deadline',
      project_id: firstProject?.id || null,
    },
    {
      user_id: exampleUser.id,
      date: new Date('2024-11-30'),
      start_time: new Date('2024-11-30T17:30:00Z'),
      end_time: new Date('2024-11-30T20:30:00Z'),
      total: 3,
      value: 150000,
      reason: 'Deploy production cuối tháng',
      project_id: firstProject?.id || null,
    },
  ];

  for (const request of overtimeRequests) {
    // Kiểm tra xem đã có overtime request cho thời gian này chưa
    const existing = await prisma.over_times_history.findFirst({
      where: {
        user_id: request.user_id,
        date: request.date,
        start_time: request.start_time,
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
