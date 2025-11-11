import { PrismaClient, LateEarlyType, ApprovalStatus } from '@prisma/client';

export async function seedLateEarlyRequests(prisma: PrismaClient) {
  console.log('🌱 Seeding late/early requests...');

  // Tìm user có email user@example.com
  const user = await prisma.users.findUnique({
    where: { email: 'user@example.com' },
  });

  if (!user) {
    console.log('❌ User with email user@example.com not found');
    return;
  }

  // Tìm admin user để làm approver (sử dụng email admin)
  const admin = await prisma.users.findUnique({
    where: { email: 'admin@company.com' },
  });

  const lateEarlyRequestsData = [
    {
      user_id: user.id,
      work_date: new Date('2024-01-15'),
      request_type: LateEarlyType.LATE,
      title: 'Xin phép đi muộn do tắc đường',
      late_minutes: 30,
      early_minutes: null,
      reason: 'Tắc đường do mưa lớn',
      status: ApprovalStatus.PENDING,
    },
    {
      user_id: user.id,
      work_date: new Date('2024-01-16'),
      request_type: LateEarlyType.EARLY,
      title: 'Xin phép về sớm do việc gia đình',
      late_minutes: null,
      early_minutes: 45,
      reason: 'Có việc gia đình cần xử lý gấp',
      status: ApprovalStatus.APPROVED,
      approved_by: admin?.id,
      approved_at: new Date('2024-01-16T10:30:00Z'),
    },
    {
      user_id: user.id,
      work_date: new Date('2024-01-17'),
      request_type: LateEarlyType.BOTH,
      title: 'Xin phép đi muộn và về sớm để khám bệnh',
      late_minutes: 15,
      early_minutes: 30,
      reason: 'Đi khám bệnh định kỳ',
      status: ApprovalStatus.REJECTED,
      approved_by: admin?.id,
      approved_at: new Date('2024-01-17T14:20:00Z'),
      rejected_reason: 'Cần báo trước ít nhất 1 ngày',
    },
    {
      user_id: user.id,
      work_date: new Date('2024-01-18'),
      request_type: LateEarlyType.LATE,
      title: 'Xin phép đi muộn do xe hỏng',
      late_minutes: 60,
      early_minutes: null,
      reason: 'Xe hỏng trên đường đi làm',
      status: ApprovalStatus.APPROVED,
      approved_by: admin?.id,
      approved_at: new Date('2024-01-18T09:45:00Z'),
    },
    {
      user_id: user.id,
      work_date: new Date('2024-01-19'),
      request_type: LateEarlyType.EARLY,
      title: 'Xin phép về sớm để đón con',
      late_minutes: null,
      early_minutes: 20,
      reason: 'Đón con ở trường',
      status: ApprovalStatus.PENDING,
    },
  ];

  for (const requestData of lateEarlyRequestsData) {
    try {
      await prisma.late_early_requests.create({
        data: requestData,
      });
      console.log(`✅ Created late/early request: ${requestData.request_type} for ${requestData.work_date.toISOString().split('T')[0]}`);
    } catch (error) {
      console.log(`❌ Failed to create late/early request: ${error.message}`);
    }
  }

  console.log('✅ Late/early requests seeding completed');
}
