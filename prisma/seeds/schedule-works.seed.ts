import { PrismaClient, WorkShiftType } from '@prisma/client';

export async function seedScheduleWorks(prisma: PrismaClient) {
  console.log('⏰ Seeding schedule works...');

  // Tạo các ca làm việc mặc định
  const scheduleWorks = await Promise.all([
    // Ca hành chính (8:00 - 17:30)
    prisma.schedule_works.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Ca hành chính',
        type: WorkShiftType.NORMAL,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        hour_start_morning: new Date('2024-01-01T08:00:00Z'),
        hour_end_morning: new Date('2024-01-01T12:00:00Z'),
        hour_start_afternoon: new Date('2024-01-01T13:30:00Z'),
        hour_end_afternoon: new Date('2024-01-01T17:30:00Z'),
      },
    }),
    
    // Ca linh hoạt (9:00 - 18:30)
    prisma.schedule_works.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Ca linh hoạt',
        type: WorkShiftType.FLEXIBLE,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        hour_start_morning: new Date('2024-01-01T09:00:00Z'),
        hour_end_morning: new Date('2024-01-01T12:00:00Z'),
        hour_start_afternoon: new Date('2024-01-01T13:30:00Z'),
        hour_end_afternoon: new Date('2024-01-01T18:30:00Z'),
      },
    }),

    // Ca đêm (22:00 - 06:00)
    prisma.schedule_works.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Ca đêm',
        type: WorkShiftType.NIGHT,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        hour_start_morning: new Date('2024-01-01T22:00:00Z'),
        hour_end_morning: new Date('2024-01-01T02:00:00Z'),
        hour_start_afternoon: new Date('2024-01-01T03:00:00Z'),
        hour_end_afternoon: new Date('2024-01-01T06:00:00Z'),
      },
    }),

    // Ca bán thời gian (8:00 - 12:00)
    prisma.schedule_works.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: 'Ca bán thời gian',
        type: WorkShiftType.PART_TIME,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        hour_start_morning: new Date('2024-01-01T08:00:00Z'),
        hour_end_morning: new Date('2024-01-01T12:00:00Z'),
        hour_start_afternoon: new Date('2024-01-01T08:00:00Z'), // Không có buổi chiều
        hour_end_afternoon: new Date('2024-01-01T08:00:00Z'),   // Không có buổi chiều
      },
    }),

    // Ca tăng ca (18:00 - 22:00)
    prisma.schedule_works.upsert({
      where: { id: 5 },
      update: {},
      create: {
        name: 'Ca tăng ca',
        type: WorkShiftType.OVERTIME,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        hour_start_morning: new Date('2024-01-01T18:00:00Z'),
        hour_end_morning: new Date('2024-01-01T20:00:00Z'),
        hour_start_afternoon: new Date('2024-01-01T20:30:00Z'),
        hour_end_afternoon: new Date('2024-01-01T22:00:00Z'),
      },
    }),
  ]);

  console.log(`✅ Created ${scheduleWorks.length} schedule works`);
  
  return {
    scheduleWorks,
  };
}
