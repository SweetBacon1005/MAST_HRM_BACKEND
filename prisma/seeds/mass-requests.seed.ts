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
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      workDays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workDays;
}

// Danh sách lý do nghỉ phép
const DAY_OFF_REASONS = [
  'Nghỉ phép năm', 'Về quê thăm gia đình', 'Đi du lịch cùng gia đình', 'Tham gia đám cưới',
  'Khám sức khỏe định kỳ', 'Giải quyết việc cá nhân', 'Nghỉ ngơi sau dự án', 'Tham gia khóa học',
  'Đưa con đi khám bệnh', 'Sửa chữa nhà cửa', 'Tham gia lễ hội gia đình', 'Nghỉ phép bù',
  'Đi công tác cá nhân', 'Tham gia hội thảo', 'Nghỉ phép Tết', 'Nghỉ phép lễ'
];

// Danh sách lý do làm từ xa
const REMOTE_WORK_REASONS = [
  'Tránh kẹt xe giờ cao điểm', 'Chăm sóc người thân ốm', 'Sửa chữa nhà cửa',
  'Đợi thợ sửa điện nước', 'Tập trung làm việc không bị gián đoạn', 'Tiết kiệm thời gian di chuyển',
  'Làm việc hiệu quả hơn tại nhà', 'Chăm sóc con nhỏ', 'Tránh thời tiết xấu',
  'Họp online với client', 'Làm việc với team offshore', 'Tập trung phát triển tính năng mới'
];

// Danh sách lý do tăng ca
const OVERTIME_REASONS = [
  'Hoàn thành deadline dự án', 'Fix bug critical trước release', 'Deploy sản phẩm lên production',
  'Hỗ trợ team khác hoàn thành task', 'Chuẩn bị demo cho client', 'Viết tài liệu kỹ thuật',
  'Code review và merge code', 'Tối ưu hóa performance', 'Backup và bảo trì hệ thống',
  'Training team member mới', 'Phân tích và fix lỗi hệ thống', 'Chuẩn bị presentation'
];

// Danh sách lý do đi muộn/về sớm
const LATE_EARLY_REASONS = [
  'Kẹt xe do mưa lớn', 'Xe hỏng trên đường', 'Đưa con đi học', 'Khám bệnh đột xuất',
  'Giải quyết việc ngân hàng', 'Tham gia họp phụ huynh', 'Đón khách từ sân bay',
  'Sửa chữa xe máy', 'Đi làm thủ tục hành chính', 'Tham gia lễ cưới người thân',
  'Chăm sóc người thân ốm', 'Đi khám răng', 'Làm thủ tục visa', 'Đi nộp hồ sơ'
];

export async function seedMassRequests(prisma: PrismaClient, seedData: any) {
  console.log('📝 Seeding mass requests (day-off, remote work, overtime, late/early)...');

  const { massUsers, users: originalUsers } = seedData;
  const allUsers = [...(originalUsers || []), ...(massUsers || [])];

  // Lấy managers để làm approver từ user_role_assignment
  const managerRoleAssignments = await prisma.user_role_assignment.findMany({
    where: {
      role: { name: { in: ['admin', 'manager'] } },
      deleted_at: null,
    },
    select: { user_id: true },
  });

  const managers = await prisma.user_information.findMany({
    where: {
      user_id: { in: managerRoleAssignments.map(ra => ra.user_id) },
    },
    include: { user: true }
  });

  // Tạo dữ liệu cho 6 tháng (3 tháng trước + 3 tháng tới)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);

  const workDays = getWorkDays(startDate, endDate);

  // 1. DAY OFF REQUESTS
  console.log('🏖️ Tạo day-off requests...');
  const dayOffData: any[] = [];
  
  for (const user of allUsers) {
    // Mỗi user có 8-15 đơn nghỉ phép trong 6 tháng
    const requestCount = Math.floor(Math.random() * 8) + 8;
    
    for (let i = 0; i < requestCount; i++) {
      const workDate = workDays[Math.floor(Math.random() * workDays.length)];
      const approver = managers[Math.floor(Math.random() * managers.length)];
      const status = ['PENDING', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any;
      const duration = ['FULL_DAY', 'MORNING', 'AFTERNOON'][Math.floor(Math.random() * 3)] as any;
      const type = ['PAID', 'UNPAID', 'SICK', 'PERSONAL'][Math.floor(Math.random() * 4)] as any;
      
      dayOffData.push({
        user_id: user.id,
        work_date: workDate,
        duration,
        status,
        type,
        title: `Đơn xin nghỉ ${duration === 'FULL_DAY' ? 'cả ngày' : duration === 'MORNING' ? 'buổi sáng' : 'buổi chiều'}`,
        reason: DAY_OFF_REASONS[Math.floor(Math.random() * DAY_OFF_REASONS.length)],
        approved_by: status !== 'PENDING' ? approver.user_id : null,
        approved_at: status !== 'PENDING' ? randomDateBetween(workDate, new Date()) : null,
        rejected_reason: status === 'REJECTED' ? 'Không đủ ngày phép hoặc trùng lịch quan trọng' : null,
        is_past: workDate < new Date(),
        balance_deducted: status === 'APPROVED' && type === 'PAID',
      });
    }
  }

  // 2. REMOTE WORK REQUESTS
  console.log('🏠 Tạo remote work requests...');
  const remoteWorkData: any[] = [];
  
  for (const user of allUsers) {
    // Mỗi user có 10-20 đơn làm từ xa trong 6 tháng
    const requestCount = Math.floor(Math.random() * 11) + 10;
    
    for (let i = 0; i < requestCount; i++) {
      const workDate = workDays[Math.floor(Math.random() * workDays.length)];
      const approver = managers[Math.floor(Math.random() * managers.length)];
      const status = ['PENDING', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any;
      const duration = ['FULL_DAY', 'MORNING', 'AFTERNOON'][Math.floor(Math.random() * 3)] as any;
      
      remoteWorkData.push({
        user_id: user.id,
        work_date: workDate,
        remote_type: 'REMOTE' as const,
        duration,
        title: `Đơn xin làm việc từ xa ${duration === 'FULL_DAY' ? 'cả ngày' : duration === 'MORNING' ? 'buổi sáng' : 'buổi chiều'}`,
        reason: REMOTE_WORK_REASONS[Math.floor(Math.random() * REMOTE_WORK_REASONS.length)],
        status,
        approved_by: status !== 'PENDING' ? approver.user_id : null,
        approved_at: status !== 'PENDING' ? randomDateBetween(workDate, new Date()) : null,
        rejected_reason: status === 'REJECTED' ? 'Cần có mặt tại văn phòng để họp với client' : null,
      });
    }
  }

  // 3. OVERTIME REQUESTS
  console.log('⏰ Tạo overtime requests...');
  const overtimeData: any[] = [];
  
  for (const user of allUsers) {
    // Mỗi user có 5-12 đơn tăng ca trong 6 tháng
    const requestCount = Math.floor(Math.random() * 8) + 5;
    
    for (let i = 0; i < requestCount; i++) {
      const workDate = workDays[Math.floor(Math.random() * workDays.length)];
      const approver = managers[Math.floor(Math.random() * managers.length)];
      const status = ['PENDING', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any;
      
      const startHour = 18 + Math.floor(Math.random() * 2); // 18:00 - 19:59
      const endHour = startHour + Math.floor(Math.random() * 4) + 1; // 1-4 hours overtime
      
      const startTime = new Date();
      startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);
      
      const endTime = new Date();
      endTime.setHours(endHour, Math.floor(Math.random() * 60), 0, 0);
      
      const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const hourlyRate = 50000 + Math.random() * 100000; // 50k-150k VND/hour
      
      overtimeData.push({
        user_id: user.id,
        work_date: workDate,
        title: `Đơn xin tăng ca ${totalHours.toFixed(1)} giờ`,
        start_time: startTime,
        end_time: endTime,
        total_hours: totalHours,
        hourly_rate: Math.round(hourlyRate),
        total_amount: Math.round(totalHours * hourlyRate),
        reason: OVERTIME_REASONS[Math.floor(Math.random() * OVERTIME_REASONS.length)],
        status,
        approved_by: status !== 'PENDING' ? approver.user_id : null,
        approved_at: status !== 'PENDING' ? randomDateBetween(workDate, new Date()) : null,
        rejected_reason: status === 'REJECTED' ? 'Không cần thiết hoặc không có budget tăng ca' : null,
      });
    }
  }

  // 4. LATE/EARLY REQUESTS
  console.log('🕐 Tạo late/early requests...');
  const lateEarlyData: any[] = [];
  
  for (const user of allUsers) {
    // Mỗi user có 3-8 đơn xin đi muộn/về sớm trong 6 tháng
    const requestCount = Math.floor(Math.random() * 6) + 3;
    
    for (let i = 0; i < requestCount; i++) {
      const workDate = workDays[Math.floor(Math.random() * workDays.length)];
      const approver = managers[Math.floor(Math.random() * managers.length)];
      const status = ['PENDING', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any;
      const requestType = ['LATE', 'EARLY', 'BOTH'][Math.floor(Math.random() * 3)] as any;
      
      const lateMinutes = (requestType === 'LATE' || requestType === 'BOTH') ? 
        Math.floor(Math.random() * 60) + 15 : null; // 15-75 minutes
      const earlyMinutes = (requestType === 'EARLY' || requestType === 'BOTH') ? 
        Math.floor(Math.random() * 60) + 15 : null; // 15-75 minutes
      
      lateEarlyData.push({
        user_id: user.id,
        work_date: workDate,
        request_type: requestType,
        title: `Đơn xin ${requestType === 'LATE' ? 'đi muộn' : requestType === 'EARLY' ? 'về sớm' : 'đi muộn và về sớm'}`,
        late_minutes: lateMinutes,
        early_minutes: earlyMinutes,
        reason: LATE_EARLY_REASONS[Math.floor(Math.random() * LATE_EARLY_REASONS.length)],
        status,
        approved_by: status !== 'PENDING' ? approver.user_id : null,
        approved_at: status !== 'PENDING' ? randomDateBetween(workDate, new Date()) : null,
        rejected_reason: status === 'REJECTED' ? 'Lý do không hợp lệ hoặc ảnh hưởng đến công việc' : null,
      });
    }
  }

  // 5. FORGOT CHECKIN REQUESTS
  console.log('📱 Tạo forgot checkin requests...');
  const forgotCheckinData: any[] = [];
  
  for (const user of allUsers) {
    // Mỗi user có 2-5 đơn xin bổ sung chấm công trong 6 tháng
    const requestCount = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < requestCount; i++) {
      const workDate = workDays[Math.floor(Math.random() * workDays.length)];
      const approver = managers[Math.floor(Math.random() * managers.length)];
      const status = ['PENDING', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any;
      
      const checkinTime = new Date(workDate);
      checkinTime.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      
      const checkoutTime = new Date(workDate);
      checkoutTime.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);
      
      forgotCheckinData.push({
        user_id: user.id,
        work_date: workDate,
        checkin_time: checkinTime,
        checkout_time: checkoutTime,
        title: 'Đơn xin bổ sung chấm công',
        reason: 'Quên chấm công do vội vã hoặc lỗi hệ thống',
        status,
        approved_by: status !== 'PENDING' ? approver.user_id : null,
        approved_at: status !== 'PENDING' ? randomDateBetween(workDate, new Date()) : null,
        rejected_reason: status === 'REJECTED' ? 'Không có bằng chứng làm việc hoặc thời gian không hợp lý' : null,
      });
    }
  }

  // Batch create all requests
  const batchSize = 100;

  console.log(`🏖️ Tạo ${dayOffData.length} day-off requests...`);
  for (let i = 0; i < dayOffData.length; i += batchSize) {
    const batch = dayOffData.slice(i, i + batchSize);
    await prisma.day_offs.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created day-off batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dayOffData.length / batchSize)}`);
  }

  console.log(`🏠 Tạo ${remoteWorkData.length} remote work requests...`);
  for (let i = 0; i < remoteWorkData.length; i += batchSize) {
    const batch = remoteWorkData.slice(i, i + batchSize);
    await prisma.remote_work_requests.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created remote work batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(remoteWorkData.length / batchSize)}`);
  }

  console.log(`⏰ Tạo ${overtimeData.length} overtime requests...`);
  for (let i = 0; i < overtimeData.length; i += batchSize) {
    const batch = overtimeData.slice(i, i + batchSize);
    await prisma.over_times_history.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created overtime batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(overtimeData.length / batchSize)}`);
  }

  console.log(`🕐 Tạo ${lateEarlyData.length} late/early requests...`);
  for (let i = 0; i < lateEarlyData.length; i += batchSize) {
    const batch = lateEarlyData.slice(i, i + batchSize);
    await prisma.late_early_requests.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created late/early batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lateEarlyData.length / batchSize)}`);
  }

  console.log(`📱 Tạo ${forgotCheckinData.length} forgot checkin requests...`);
  for (let i = 0; i < forgotCheckinData.length; i += batchSize) {
    const batch = forgotCheckinData.slice(i, i + batchSize);
    await prisma.forgot_checkin_requests.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created forgot checkin batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(forgotCheckinData.length / batchSize)}`);
  }

  return {
    totalDayOffs: dayOffData.length,
    totalRemoteWork: remoteWorkData.length,
    totalOvertime: overtimeData.length,
    totalLateEarly: lateEarlyData.length,
    totalForgotCheckin: forgotCheckinData.length,
    totalRequests: dayOffData.length + remoteWorkData.length + overtimeData.length + lateEarlyData.length + forgotCheckinData.length
  };
}
