import { PrismaClient } from '@prisma/client';

export async function seedDayOffs(prisma: PrismaClient, seedData: any) {
  console.log('🏖️ Seeding day offs...');

  const { users } = seedData;

  // Tạo một số day off requests mẫu - sử dụng createMany với skipDuplicates
  const dayOffData = [
    // John Doe - Nghỉ phép có lương
    {
      user_id: users[2].id,
      work_date: new Date('2024-03-15'),
      duration: 'FULL_DAY' as const,
      title: 'Xin nghỉ phép năm',
      status: 'APPROVED' as const,
      type: 'PAID' as const,
      reason: 'Nghỉ phép năm',
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-03-10T10:00:00Z'),
      rejected_reason: null,
      is_past: false,
    },
    // Jane Smith - Nghỉ ốm (ngày 1)
    {
      user_id: users[3].id,
      work_date: new Date('2024-02-20'),
      duration: 'FULL_DAY' as const,
      title: 'Xin nghỉ ốm',
      status: 'APPROVED' as const,
      type: 'SICK' as const,
      reason: 'Ốm cảm cúm',
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-02-19T14:30:00Z'),
      rejected_reason: null,
      is_past: false,
    },
    // Jane Smith - Nghỉ ốm (ngày 2)
    {
      user_id: users[3].id,
      work_date: new Date('2024-02-21'),
      duration: 'FULL_DAY' as const,
      title: 'Xin nghỉ ốm (tiếp tục)',
      status: 'APPROVED' as const,
      type: 'SICK' as const,
      reason: 'Ốm cảm cúm (tiếp tục)',
      approved_by: users[1].id, // HR Manager
      approved_at: new Date('2024-02-19T14:30:00Z'),
      rejected_reason: null,
      is_past: false,
    },
    // Mike Johnson - Nghỉ buổi sáng
    {
      user_id: users[4].id,
      work_date: new Date('2024-04-05'),
      duration: 'MORNING' as const,
      title: 'Xin nghỉ buổi sáng để khám sức khỏe',
      status: 'PENDING' as const,
      type: 'PERSONAL' as const,
      reason: 'Đi khám sức khỏe định kỳ',
      approved_by: null,
      approved_at: null,
      rejected_reason: null,
      is_past: false,
    },
    // Sarah Wilson - Nghỉ không lương
    {
      user_id: users[5].id,
      work_date: new Date('2024-05-10'),
      duration: 'FULL_DAY' as const,
      title: 'Xin nghỉ không lương để du lịch',
      status: 'REJECTED' as const,
      type: 'UNPAID' as const,
      reason: 'Du lịch cá nhân',
      approved_by: users[1].id, // HR Manager
      approved_at: null,
      rejected_reason: 'Không đủ thời gian nghỉ phép trong năm',
      is_past: false,
    },
    // David Brown - Nghỉ bù
    {
      user_id: users[6].id,
      work_date: new Date('2024-01-22'),
      duration: 'AFTERNOON' as const,
      title: 'Xin nghỉ bù buổi chiều',
      status: 'APPROVED' as const,
      type: 'COMPENSATORY' as const,
      reason: 'Nghỉ bù do làm overtime cuối tuần',
      approved_by: users[2].id, // Team Leader
      approved_at: new Date('2024-01-20T16:00:00Z'),
      rejected_reason: null,
      is_past: true,
    },
  ];

  await prisma.day_offs.createMany({
    data: dayOffData,
    skipDuplicates: true,
  });

  const dayOffs = await prisma.day_offs.findMany({
    where: { user_id: { in: users.map(u => u.id) } },
  });

  console.log(`✅ Created ${dayOffs.length} day off records`);
  return { dayOffs };
}
