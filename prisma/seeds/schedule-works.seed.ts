import { PrismaClient, WorkShiftType } from '@prisma/client';

export async function seedScheduleWorks(prisma: PrismaClient) {
  console.log('⏰ Seeding schedule works...');

  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const endDate = new Date(currentYear, 11, 31);
  const scheduleWorkData = [
    {
      id: 1,
      name: 'Ca hành chính',
      type: WorkShiftType.NORMAL,
      start_date: startDate,
      end_date: endDate,
      hour_start_morning: '08:00',
      hour_end_morning: '12:00',
      hour_start_afternoon: '13:30',
      hour_end_afternoon: '17:30',
    },
    {
      id: 2,
      name: 'Ca linh hoạt',
      type: WorkShiftType.FLEXIBLE,
      start_date: startDate,
      end_date: endDate,
      hour_start_morning: '09:00',
      hour_end_morning: '12:00',
      hour_start_afternoon: '13:30',
      hour_end_afternoon: '18:30',
    },
    {
      id: 3,
      name: 'Ca đêm',
      type: WorkShiftType.NIGHT,
      start_date: startDate,
      end_date: endDate,
      hour_start_morning: '22:00',
      hour_end_morning: '02:00',
      hour_start_afternoon: '03:00',
      hour_end_afternoon: '06:00',
    },
    {
      id: 4,
      name: 'Ca bán thời gian',
      type: WorkShiftType.PART_TIME,
      start_date: startDate,
      end_date: endDate,
      hour_start_morning: '08:00',
      hour_end_morning: '12:00',
      hour_start_afternoon: '00:00',
      hour_end_afternoon: '00:00',
    },
    {
      id: 5,
      name: 'Ca tăng ca',
      type: WorkShiftType.OVERTIME,
      start_date: startDate,
      end_date: endDate,
      hour_start_morning: '18:00',
      hour_end_morning: '20:00',
      hour_start_afternoon: '20:30',
      hour_end_afternoon: '22:00',
    },
  ];

  const scheduleWorks = await Promise.all(
    scheduleWorkData.map(scheduleWork =>
      prisma.schedule_works.upsert({
        where: { id: scheduleWork.id },
        update: {},
        create: scheduleWork,
      })
    )
  );

  console.log(`✅ Created ${scheduleWorks.length} schedule works for year ${currentYear}`);
  
  return {
    scheduleWorks,
  };
}
