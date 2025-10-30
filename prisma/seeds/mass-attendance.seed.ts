import { PrismaClient } from '@prisma/client';

// Hàm tạo thời gian check-in/out ngẫu nhiên
function generateWorkTime(date: Date, isLate = false, isEarly = false) {
  const checkinBase = new Date(date);
  checkinBase.setHours(8, 0, 0, 0); // 8:00 AM base time
  
  const checkoutBase = new Date(date);
  checkoutBase.setHours(17, 30, 0, 0); // 5:30 PM base time

  // Add randomness
  let checkinTime = new Date(checkinBase.getTime());
  let checkoutTime = new Date(checkoutBase.getTime());

  if (isLate) {
    // Late 5-30 minutes
    checkinTime = new Date(checkinBase.getTime() + (Math.random() * 25 + 5) * 60 * 1000);
  } else {
    // Normal: -10 to +10 minutes
    checkinTime = new Date(checkinBase.getTime() + (Math.random() * 20 - 10) * 60 * 1000);
  }

  if (isEarly) {
    // Early 5-30 minutes
    checkoutTime = new Date(checkoutBase.getTime() - (Math.random() * 25 + 5) * 60 * 1000);
  } else {
    // Normal: -15 to +60 minutes (people often work overtime)
    checkoutTime = new Date(checkoutBase.getTime() + (Math.random() * 75 - 15) * 60 * 1000);
  }

  return { checkinTime, checkoutTime };
}

// Hàm tính toán work time
function calculateWorkTime(checkin: Date, checkout: Date) {
  const totalMinutes = Math.floor((checkout.getTime() - checkin.getTime()) / (1000 * 60));
  const breakTime = 90; // 1.5 hours lunch break
  const workMinutes = Math.max(0, totalMinutes - breakTime);
  
  // Split into morning and afternoon
  const morningEnd = new Date(checkin);
  morningEnd.setHours(12, 0, 0, 0);
  
  const afternoonStart = new Date(checkin);
  afternoonStart.setHours(13, 30, 0, 0);

  let morningMinutes = 0;
  let afternoonMinutes = 0;

  if (checkin < morningEnd) {
    morningMinutes = Math.min(240, Math.floor((morningEnd.getTime() - checkin.getTime()) / (1000 * 60))); // Max 4 hours
  }

  if (checkout > afternoonStart) {
    const effectiveCheckout = checkout;
    afternoonMinutes = Math.floor((effectiveCheckout.getTime() - Math.max(afternoonStart.getTime(), checkin.getTime())) / (1000 * 60));
  }

  return {
    workTimeMinutes: workMinutes,
    morningMinutes: Math.max(0, morningMinutes),
    afternoonMinutes: Math.max(0, afternoonMinutes),
    breakTime
  };
}

// Hàm tạo ngày làm việc (loại bỏ cuối tuần)
function getWorkDays(startDate: Date, endDate: Date): Date[] {
  const workDays: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      workDays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workDays;
}

export async function seedMassAttendance(prisma: PrismaClient, seedData: any) {
  console.log('⏰ Seeding mass attendance data...');

  const { massUsers, users: originalUsers } = seedData;
  const allUsers = [...(originalUsers || []), ...(massUsers || [])];

  // Tạo dữ liệu attendance cho 3 tháng gần đây
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  const workDays = getWorkDays(startDate, endDate);
  console.log(`📅 Tạo attendance data cho ${workDays.length} ngày làm việc`);

  const timesheetData: any[] = [];
  const attendanceSessionData: any[] = [];
  const attendanceLogData: any[] = [];

  for (const user of allUsers) {
    console.log(`👤 Tạo attendance cho user ${user.email}...`);
    
    for (const workDay of workDays) {
      // 95% chance user có attendance trong ngày
      if (Math.random() < 0.95) {
        const isLate = Math.random() < 0.15; // 15% chance late
        const isEarly = Math.random() < 0.10; // 10% chance early leave
        const isRemote = Math.random() < 0.20; // 20% chance remote work
        
        const { checkinTime, checkoutTime } = generateWorkTime(workDay, isLate, isEarly);
        const workTimeCalc = calculateWorkTime(checkinTime, checkoutTime);
        
        // Calculate late/early time
        const standardCheckin = new Date(workDay);
        standardCheckin.setHours(8, 0, 0, 0);
        const standardCheckout = new Date(workDay);
        standardCheckout.setHours(17, 30, 0, 0);
        
        const lateMinutes = checkinTime > standardCheckin ? 
          Math.floor((checkinTime.getTime() - standardCheckin.getTime()) / (1000 * 60)) : 0;
        const earlyMinutes = checkoutTime < standardCheckout ? 
          Math.floor((standardCheckout.getTime() - checkoutTime.getTime()) / (1000 * 60)) : 0;

        // Timesheet data
        timesheetData.push({
          user_id: user.id,
          work_date: workDay,
          type: 'NORMAL' as const,
          status: 'APPROVED' as const,
          checkin: checkinTime,
          checkout: checkoutTime,
          checkin_checkout: `${checkinTime.toTimeString().slice(0, 5)} - ${checkoutTime.toTimeString().slice(0, 5)}`,
          work_time_morning: workTimeCalc.morningMinutes,
          work_time_afternoon: workTimeCalc.afternoonMinutes,
          total_work_time: workTimeCalc.workTimeMinutes,
          break_time: workTimeCalc.breakTime,
          late_time: lateMinutes,
          late_time_approved: isLate ? Math.floor(lateMinutes * 0.7) : 0, // 70% approved
          early_time: earlyMinutes,
          early_time_approved: isEarly ? Math.floor(earlyMinutes * 0.6) : 0, // 60% approved
          remote: isRemote ? 'REMOTE' : 'OFFICE' as const,
          has_forgot_checkin_request: false,
          has_late_early_request: (isLate || isEarly) && Math.random() < 0.8,
          has_remote_work_request: isRemote,
          forgot_checkin_approved: false,
          late_early_approved: (isLate || isEarly) && Math.random() < 0.7,
          remote_work_approved: isRemote,
          is_complete: workTimeCalc.workTimeMinutes >= 480, // 8 hours
          fines: (lateMinutes > 15 || earlyMinutes > 15) ? Math.random() * 50000 + 10000 : 0,
        });

        // Attendance session data
        attendanceSessionData.push({
          user_id: user.id,
          work_date: workDay,
          session_type: 'WORK' as const,
          checkin_time: checkinTime,
          checkout_time: checkoutTime,
          duration: workTimeCalc.workTimeMinutes,
          is_open: false,
          location_type: isRemote ? 'REMOTE' : 'OFFICE' as const,
          checkin_photo: isRemote ? null : `/photos/checkin_${user.id}_${workDay.getTime()}.jpg`,
          checkout_photo: isRemote ? null : `/photos/checkout_${user.id}_${workDay.getTime()}.jpg`,
          note: isRemote ? 'Working from home' : null,
          status: 'APPROVED' as const,
        });

        // Attendance logs (checkin and checkout)
        attendanceLogData.push(
          {
            user_id: user.id,
            action_type: 'checkin',
            timestamp: checkinTime,
            work_date: workDay,
            location_type: isRemote ? 'remote' : 'office',
            photo_url: isRemote ? null : `/photos/checkin_${user.id}_${workDay.getTime()}.jpg`,
            note: isRemote ? 'Remote work checkin' : 'Office checkin',
            itempodency_key: `checkin_${user.id}_${workDay.getTime()}`,
            is_manual: false,
            status: 'APPROVED' as const,
          },
          {
            user_id: user.id,
            action_type: 'checkout',
            timestamp: checkoutTime,
            work_date: workDay,
            location_type: isRemote ? 'remote' : 'office',
            photo_url: isRemote ? null : `/photos/checkout_${user.id}_${workDay.getTime()}.jpg`,
            note: isRemote ? 'Remote work checkout' : 'Office checkout',
            itempodency_key: `checkout_${user.id}_${workDay.getTime()}`,
            is_manual: false,
            status: 'APPROVED' as const,
          }
        );
      }
    }
  }

  console.log(`⏰ Tạo ${timesheetData.length} timesheet records...`);
  
  // Batch create timesheets
  const batchSize = 100;
  for (let i = 0; i < timesheetData.length; i += batchSize) {
    const batch = timesheetData.slice(i, i + batchSize);
    await prisma.time_sheets.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created timesheets batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(timesheetData.length / batchSize)}`);
  }

  console.log(`📊 Tạo ${attendanceSessionData.length} attendance sessions...`);
  
  // Batch create attendance sessions
  for (let i = 0; i < attendanceSessionData.length; i += batchSize) {
    const batch = attendanceSessionData.slice(i, i + batchSize);
    await prisma.attendance_sessions.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created sessions batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(attendanceSessionData.length / batchSize)}`);
  }

  console.log(`📝 Tạo ${attendanceLogData.length} attendance logs...`);
  
  // Batch create attendance logs
  for (let i = 0; i < attendanceLogData.length; i += batchSize) {
    const batch = attendanceLogData.slice(i, i + batchSize);
    await prisma.attendance_logs.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created logs batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(attendanceLogData.length / batchSize)}`);
  }

  return {
    totalTimesheets: timesheetData.length,
    totalSessions: attendanceSessionData.length,
    totalLogs: attendanceLogData.length,
    workDaysCount: workDays.length,
    usersCount: allUsers.length
  };
}
