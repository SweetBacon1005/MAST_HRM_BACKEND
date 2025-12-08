import { PrismaClient } from '@prisma/client';

export async function seedRBAC(prisma: PrismaClient) {
  console.log('🔐 Seeding RBAC (Roles, Permissions & Assignments)...');

  // 1. Tạo permissions chi tiết theo modules
  console.log('📝 Tạo permissions...');
  const permissionData = [
    // User Management
    { name: 'user.read', description: 'Xem thông tin người dùng' },
    { name: 'user.create', description: 'Tạo người dùng mới' },
    { name: 'user.update', description: 'Cập nhật thông tin người dùng' },
    { name: 'user.delete', description: 'Xóa người dùng' },
    { name: 'user.profile.update', description: 'Cập nhật profile cá nhân' },
    
    // Project Management
    { name: 'project.read', description: 'Xem dự án' },
    { name: 'project.create', description: 'Tạo dự án mới' },
    { name: 'project.update', description: 'Cập nhật dự án' },
    { name: 'project.delete', description: 'Xóa dự án' },
    { name: 'project.assign', description: 'Phân công nhân viên vào dự án' },
    
    // Timesheet Management
    { name: 'timesheet.read', description: 'Xem timesheet' },
    { name: 'timesheet.create', description: 'Tạo timesheet' },
    { name: 'timesheet.update', description: 'Cập nhật timesheet' },
    { name: 'timesheet.delete', description: 'Xóa timesheet' },
    { name: 'timesheet.approve', description: 'Duyệt timesheet' },
    { name: 'timesheet.statistics', description: 'Xem thống kê timesheet' },
    
    // Attendance Management
    { name: 'attendance.read', description: 'Xem chấm công' },
    { name: 'attendance.manage', description: 'Quản lý chấm công' },
    { name: 'attendance.checkin', description: 'Check in/out' },
    { name: 'attendance.statistics', description: 'Xem thống kê chấm công' },
    
    // Holiday Management
    { name: 'holiday.read', description: 'Xem ngày lễ' },
    { name: 'holiday.create', description: 'Tạo ngày lễ mới' },
    { name: 'holiday.update', description: 'Cập nhật ngày lễ' },
    { name: 'holiday.delete', description: 'Xóa ngày lễ' },
    
    // Leave Management
    { name: 'leave.read', description: 'Xem đơn nghỉ phép' },
    { name: 'leave.create', description: 'Tạo đơn nghỉ phép' },
    { name: 'leave.approve', description: 'Duyệt đơn nghỉ phép' },
    { name: 'leave.balance.manage', description: 'Quản lý số dư nghỉ phép' },
    
    // Request Management (Remote, Overtime, Late/Early, Forgot Checkin)
    { name: 'request.read', description: 'Xem các đơn yêu cầu' },
    { name: 'request.create', description: 'Tạo đơn yêu cầu' },
    { name: 'request.approve', description: 'Duyệt đơn yêu cầu' },
    { name: 'request.reject', description: 'Từ chối đơn yêu cầu' },
    
    // Division Management
    { name: 'division.read', description: 'Xem thông tin phòng ban' },
    { name: 'division.create', description: 'Tạo phòng ban mới' },
    { name: 'division.update', description: 'Cập nhật thông tin phòng ban' },
    { name: 'division.delete', description: 'Xóa phòng ban' },
    { name: 'division.assignment.read', description: 'Xem phân công phòng ban' },
    { name: 'division.assignment.create', description: 'Tạo phân công phòng ban' },
    { name: 'division.assignment.update', description: 'Cập nhật phân công phòng ban' },
    { name: 'division.assignment.delete', description: 'Xóa phân công phòng ban' },
    { name: 'division.manage', description: 'Quản lý phòng ban' },
    
    // Report & Analytics
    { name: 'report.read', description: 'Xem báo cáo' },
    { name: 'report.export', description: 'Xuất báo cáo' },
    
    // Timesheet Reports
    { name: 'report.timesheet.view', description: 'Xem báo cáo timesheet' },
    { name: 'report.timesheet.export', description: 'Xuất báo cáo timesheet' },
    
    // Attendance Reports
    { name: 'report.attendance.view', description: 'Xem báo cáo chấm công' },
    { name: 'report.attendance.dashboard', description: 'Xem dashboard chấm công' },
    { name: 'report.attendance.statistics', description: 'Xem thống kê chấm công' },
    { name: 'report.attendance.export', description: 'Xuất báo cáo chấm công' },
    
    // Leave Reports
    { name: 'report.leave.view', description: 'Xem báo cáo nghỉ phép' },
    { name: 'report.leave.summary', description: 'Xem tổng hợp nghỉ phép' },
    { name: 'report.leave.export', description: 'Xuất báo cáo nghỉ phép' },
    
    // Overtime Reports
    { name: 'report.overtime.view', description: 'Xem báo cáo tăng ca' },
    { name: 'report.overtime.summary', description: 'Xem tổng hợp tăng ca' },
    { name: 'report.overtime.export', description: 'Xuất báo cáo tăng ca' },
    
    // Personnel Transfer Reports
    { name: 'report.transfer.view', description: 'Xem báo cáo điều chuyển' },
    { name: 'report.transfer.summary', description: 'Xem tổng hợp điều chuyển' },
    
    // Comprehensive Dashboard
    { name: 'report.dashboard.comprehensive', description: 'Xem dashboard tổng hợp' },
    
    // Monthly Work Summary
    { name: 'reports.monthly-work-summary.view-all', description: 'Xem báo cáo công tháng tất cả nhân viên' },
    { name: 'reports.monthly-work-summary.view-team', description: 'Xem báo cáo công tháng team' },
    { name: 'reports.monthly-work-summary.view-own', description: 'Xem báo cáo công tháng của bản thân' },
    { name: 'reports.monthly-work-summary.export', description: 'Xuất báo cáo công tháng' },
    
    // System Administration
    { name: 'system.admin', description: 'Quản trị hệ thống' },
    { name: 'system.config.read', description: 'Xem cấu hình hệ thống' },
    
    // Organization Management
    { name: 'organization.read', description: 'Xem cơ cấu tổ chức' },
    
    // Team Management
    { name: 'team.read', description: 'Xem thông tin team' },
    { name: 'team.create', description: 'Tạo team mới' },
    { name: 'team.update', description: 'Cập nhật thông tin team' },
    { name: 'team.delete', description: 'Xóa team' },
    { name: 'team.manage', description: 'Quản lý team (tất cả quyền)' },
    { name: 'team.member.add', description: 'Thêm thành viên vào team' },
    { name: 'team.member.remove', description: 'Xóa thành viên khỏi team' },
    
    // News Management
    { name: 'news.read', description: 'Xem tin tức' },
    { name: 'news.create', description: 'Tạo tin tức mới' },
    { name: 'news.update', description: 'Cập nhật tin tức' },
    { name: 'news.delete', description: 'Xóa tin tức' },
    { name: 'news.submit', description: 'Gửi tin tức để duyệt' },
    { name: 'news.approve', description: 'Duyệt tin tức' },
    
    // Notification Management
    { name: 'notification.read', description: 'Xem thông báo của mình' },
    { name: 'notification.create', description: 'Tạo thông báo mới' },
    { name: 'notification.update', description: 'Cập nhật thông báo' },
    { name: 'notification.delete', description: 'Xóa thông báo' },
    { name: 'notification.manage', description: 'Quản lý tất cả thông báo' },
    
    // Asset Management
    { name: 'asset.create', description: 'Tạo tài sản mới' },
    { name: 'asset.read', description: 'Xem thông tin tài sản' },
    { name: 'asset.update', description: 'Cập nhật thông tin tài sản' },
    { name: 'asset.delete', description: 'Xóa tài sản' },
    { name: 'asset.assign', description: 'Gán tài sản cho người dùng' },
    { name: 'asset.unassign', description: 'Thu hồi tài sản từ người dùng' },
    { name: 'asset.statistics', description: 'Xem thống kê tài sản' },
    
    // Asset Request Management
    { name: 'asset.request.create', description: 'Tạo yêu cầu tài sản' },
    { name: 'asset.request.read', description: 'Xem yêu cầu tài sản' },
    { name: 'asset.request.update', description: 'Cập nhật yêu cầu tài sản' },
    { name: 'asset.request.delete', description: 'Xóa yêu cầu tài sản' },
    { name: 'asset.request.approve', description: 'Duyệt/từ chối yêu cầu tài sản' },
    { name: 'asset.request.reject', description: 'Từ chối yêu cầu tài sản' },
    
    // Personnel Transfer Management
    { name: 'personnel.transfer.read', description: 'Xem đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.create', description: 'Tạo đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.update', description: 'Cập nhật đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.approve', description: 'Phê duyệt đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.reject', description: 'Từ chối đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.delete', description: 'Xóa đơn điều chuyển nhân sự' },
    
    // Role Management
    { name: 'role.view', description: 'Xem thông tin vai trò' },
    { name: 'role.assign', description: 'Gán vai trò cho người dùng' },
    { name: 'role.revoke', description: 'Thu hồi vai trò từ người dùng' },
    
    // Meeting Room Management
    { name: 'meeting_room.create', description: 'Tạo phòng họp' },
    { name: 'meeting_room.read', description: 'Xem phòng họp' },
    { name: 'meeting_room.update', description: 'Cập nhật phòng họp' },
    { name: 'meeting_room.delete', description: 'Xóa phòng họp' },
    { name: 'meeting_room.booking.create', description: 'Đặt phòng họp' },
    { name: 'meeting_room.booking.read', description: 'Xem lịch đặt phòng' },
    { name: 'meeting_room.booking.update', description: 'Cập nhật lịch đặt phòng' },
    { name: 'meeting_room.booking.delete', description: 'Xóa lịch đặt phòng' },
    
    // Daily Report Management
    { name: 'daily.read', description: 'Xem daily report' },
    { name: 'daily.create', description: 'Tạo daily report' },
    { name: 'daily.update', description: 'Cập nhật daily report' },
    { name: 'daily.remove', description: 'Xóa daily report' },
    { name: 'daily.submit', description: 'Gửi daily report' },
    { name: 'daily.approve', description: 'Duyệt daily report' },
    { name: 'daily.reject', description: 'Từ chối daily report' },
    
    // Milestone Management
    { name: 'milestone.create', description: 'Tạo mốc dự án' },
    { name: 'milestone.read', description: 'Xem mốc dự án' },
    { name: 'milestone.update', description: 'Cập nhật mốc dự án' },
    { name: 'milestone.delete', description: 'Xóa mốc dự án' },
  ];

  await prisma.permissions.createMany({
    data: permissionData.map(p => ({ name: p.name })),
    skipDuplicates: true,
  });

  const permissions = await prisma.permissions.findMany({
    where: { name: { in: permissionData.map(p => p.name) } },
  });

  // 2. Tạo roles với mô tả chi tiết
  console.log('👥 Tạo roles...');
  const roleData = [
    { name: 'admin', description: 'Quản trị hệ thống - toàn quyền' },
    { name: 'hr_manager', description: 'Quản lý nhân sự - quản lý nhân viên và chấm công' },
    { name: 'project_manager', description: 'Quản lý dự án - quản lý dự án và phân công' },
    { name: 'division_head', description: 'Trưởng phòng ban - quản lý phòng ban và nhân viên' },
    { name: 'team_leader', description: 'Trưởng nhóm - quản lý team và duyệt đơn' },
    { name: 'employee', description: 'Nhân viên - quyền cơ bản' },
  ];

  await prisma.roles.createMany({
    data: roleData.map(r => ({ name: r.name })),
    skipDuplicates: true,
  });

  const roles = await prisma.roles.findMany({
    where: { name: { in: roleData.map(r => r.name) } },
  });

  // 3. Gán permissions cho roles
  console.log('🔗 Gán permissions cho roles...');

  // Helper function để tìm permission và role ID
  const getPermissionId = (name: string) => permissions.find(p => p.name === name)?.id;
  const getRoleId = (name: string) => roles.find(r => r.name === name)?.id;

  // Permission assignments cho từng role
  const rolePermissions = [
    // ADMIN - Toàn quyền
    {
      role: 'admin',
      permissions: [
        'user.read', 'user.create', 'user.update', 'user.delete', 'user.profile.update',
        'project.read', 'project.create', 'project.update', 'project.delete', 'project.assign',
        'timesheet.read', 'timesheet.create', 'timesheet.update', 'timesheet.delete', 'timesheet.approve', 'timesheet.statistics',
        'attendance.read', 'attendance.manage', 'attendance.statistics',
        'holiday.read', 'holiday.create', 'holiday.update', 'holiday.delete',
        'leave.read', 'leave.create', 'leave.approve', 'leave.balance.manage',
        'request.read', 'request.create', 'request.approve', 'request.reject',
        'division.read', 'division.create', 'division.update', 'division.delete', 'division.manage',
        'division.assignment.read', 'division.assignment.create', 'division.assignment.update', 'division.assignment.delete',
        'report.read', 'report.export',
        'report.timesheet.view', 'report.timesheet.export',
        'report.attendance.view', 'report.attendance.dashboard', 'report.attendance.statistics', 'report.attendance.export',
        'report.leave.view', 'report.leave.summary', 'report.leave.export',
        'report.overtime.view', 'report.overtime.summary', 'report.overtime.export',
        'report.transfer.view', 'report.transfer.summary',
        'report.dashboard.comprehensive',
        'reports.monthly-work-summary.view-all', 'reports.monthly-work-summary.view-team', 'reports.monthly-work-summary.view-own', 'reports.monthly-work-summary.export',
        'organization.read',
        'team.read', 'team.create', 'team.update', 'team.delete', 'team.manage', 'team.member.add', 'team.member.remove',
        'news.read', 'news.create', 'news.update', 'news.delete', 'news.submit', 'news.approve',
        'notification.read', 'notification.create', 'notification.update', 'notification.delete', 'notification.manage',
        'asset.create', 'asset.read', 'asset.update', 'asset.delete', 'asset.assign', 'asset.unassign', 'asset.statistics',
        'asset.request.create', 'asset.request.read', 'asset.request.update', 'asset.request.delete', 'asset.request.approve', 'asset.request.reject',
        'personnel.transfer.read', 'personnel.transfer.create', 'personnel.transfer.update', 'personnel.transfer.approve', 'personnel.transfer.reject', 'personnel.transfer.delete',
        'role.view', 'role.assign', 'role.revoke',
        'meeting_room.create', 'meeting_room.read', 'meeting_room.update', 'meeting_room.delete',
        'meeting_room.booking.create', 'meeting_room.booking.read', 'meeting_room.booking.update', 'meeting_room.booking.delete',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit', 'daily.approve', 'daily.reject',
        'milestone.create', 'milestone.read', 'milestone.update', 'milestone.delete',
        'system.admin', 'system.config.read',
      ],
    },

    // HR MANAGER - Quản lý nhân sự
    {
      role: 'hr_manager',
      permissions: [
        'user.read', 'user.create', 'user.update', 'user.profile.update',
        'timesheet.read', 'timesheet.statistics',
        'attendance.read', 'attendance.manage', 'attendance.statistics',
        'holiday.read', 'holiday.create', 'holiday.update', 'holiday.delete',
        'leave.read', 'leave.approve', 'leave.balance.manage',
        'request.read', 'request.approve', 'request.reject',
        'division.read', 'division.create', 'division.update', 'division.manage',
        'division.assignment.read', 'division.assignment.create', 'division.assignment.update',
        'report.read', 'report.export',
        'report.timesheet.view', 'report.timesheet.export',
        'report.attendance.view', 'report.attendance.dashboard', 'report.attendance.statistics', 'report.attendance.export',
        'report.leave.view', 'report.leave.summary', 'report.leave.export',
        'report.overtime.view', 'report.overtime.summary', 'report.overtime.export',
        'report.transfer.view', 'report.transfer.summary',
        'report.dashboard.comprehensive',
        'reports.monthly-work-summary.view-all', 'reports.monthly-work-summary.export',
        'organization.read',
        'team.read', 'team.create', 'team.update', 'team.delete', 'team.manage', 'team.member.add', 'team.member.remove',
        'news.read', 'news.create', 'news.update', 'news.delete', 'news.submit',
        'notification.read', 'notification.delete',
        'asset.create', 'asset.read', 'asset.update', 'asset.delete', 'asset.assign', 'asset.unassign', 'asset.statistics',
        'asset.request.create', 'asset.request.read', 'asset.request.update', 'asset.request.delete', 'asset.request.approve', 'asset.request.reject',
        'personnel.transfer.read', 'personnel.transfer.create', 'personnel.transfer.update', 'personnel.transfer.approve', 'personnel.transfer.reject', 'personnel.transfer.delete',
        'role.view', 'role.assign', 'role.revoke',
        'meeting_room.create', 'meeting_room.read', 'meeting_room.update', 'meeting_room.delete',
        'meeting_room.booking.create', 'meeting_room.booking.read', 'meeting_room.booking.update', 'meeting_room.booking.delete',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit',
      ],
    },

    // PROJECT MANAGER - Quản lý dự án
    {
      role: 'project_manager',
      permissions: [
        'user.read', 'user.profile.update',
        'project.read', 'project.create', 'project.update', 'project.assign',
        'timesheet.read', 'timesheet.approve', 'timesheet.statistics',
        'attendance.read', 'attendance.statistics',
        'leave.read', 'leave.approve',
        'request.read', 'request.approve', 'request.reject',
        'division.read',
        'report.read', 'report.export',
        'report.timesheet.view', 'report.attendance.view', 'report.attendance.statistics',
        'report.leave.view', 'report.overtime.view',
        'reports.monthly-work-summary.view-all', 'reports.monthly-work-summary.export',
        'organization.read',
        'team.read',
        'news.read',
        'notification.read', 'notification.delete',
        'asset.read', 'asset.request.create', 'asset.request.read',
        'personnel.transfer.read', 'personnel.transfer.create',
        'role.view', 'role.assign', 'role.revoke',
        'meeting_room.read', 'meeting_room.booking.create', 'meeting_room.booking.read', 'meeting_room.booking.update', 'meeting_room.booking.delete',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit', 'daily.approve', 'daily.reject',
        'milestone.create', 'milestone.read', 'milestone.update', 'milestone.delete',
      ],
    },

    // DIVISION HEAD - Trưởng phòng ban
    {
      role: 'division_head',
      permissions: [
        'user.read', 'user.update', 'user.profile.update',
        'project.read', 'project.update', 'project.assign',
        'timesheet.read', 'timesheet.create', 'timesheet.update', 'timesheet.approve', 'timesheet.statistics',
        'attendance.read', 'attendance.manage', 'attendance.statistics',
        'leave.read', 'leave.create', 'leave.approve',
        'request.read', 'request.create', 'request.approve', 'request.reject',
        'division.read', 'division.update', 'division.manage',
        'division.assignment.read', 'division.assignment.create', 'division.assignment.update',
        'report.read', 'report.export',
        'report.timesheet.view', 'report.attendance.view', 'report.attendance.dashboard', 'report.attendance.statistics',
        'report.leave.view', 'report.leave.summary', 'report.overtime.view', 'report.overtime.summary',
        'reports.monthly-work-summary.view-team', 'reports.monthly-work-summary.view-own', 'reports.monthly-work-summary.export',
        'organization.read',
        'team.read', 'team.create', 'team.update', 'team.delete', 'team.manage', 'team.member.add', 'team.member.remove',
        'news.read',
        'notification.read', 'notification.delete',
        'asset.read', 'asset.assign', 'asset.unassign', 'asset.statistics',
        'asset.request.create', 'asset.request.read', 'asset.request.update', 'asset.request.delete', 'asset.request.approve', 'asset.request.reject',
        'personnel.transfer.read', 'personnel.transfer.create', 'personnel.transfer.update', 'personnel.transfer.approve', 'personnel.transfer.reject',
        'role.view', 'role.assign', 'role.revoke',
        'meeting_room.read', 'meeting_room.booking.create', 'meeting_room.booking.read', 'meeting_room.booking.update', 'meeting_room.booking.delete',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit', 'daily.approve', 'daily.reject',
        'milestone.read',
      ],
    },

    // TEAM LEADER - Trưởng nhóm
    {
      role: 'team_leader',
      permissions: [
        'user.read', 'user.profile.update',
        'project.read', 'project.update',
        'timesheet.read', 'timesheet.create', 'timesheet.update', 'timesheet.approve',
        'attendance.read', 'attendance.checkin',
        'leave.read', 'leave.create', 'leave.approve',
        'request.read', 'request.create', 'request.approve', 'request.reject',
        'division.read',
        'report.read',
        'report.timesheet.view', 'report.attendance.view', 'report.attendance.statistics',
        'reports.monthly-work-summary.view-team', 'reports.monthly-work-summary.view-own',
        'organization.read',
        'team.read', 'team.update', 'team.manage', 'team.member.add', 'team.member.remove',
        'news.read',
        'notification.read', 'notification.delete',
        'asset.read', 'asset.request.create', 'asset.request.read', 'asset.request.update', 'asset.request.delete',
        'personnel.transfer.read', 'personnel.transfer.create',
        'role.view',
        'meeting_room.read', 'meeting_room.booking.create', 'meeting_room.booking.read', 'meeting_room.booking.update', 'meeting_room.booking.delete',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit', 'daily.approve', 'daily.reject',
        'milestone.read',
      ],
    },

    // EMPLOYEE - Nhân viên cơ bản
    {
      role: 'employee',
      permissions: [
        'user.read', 'user.profile.update',
        'project.read',
        'timesheet.read', 'timesheet.create', 'timesheet.update',
        'attendance.read', 'attendance.checkin',
        'leave.read', 'leave.create',
        'request.read', 'request.create',
        'division.read',
        'reports.monthly-work-summary.view-own',
        'organization.read',
        'team.read',
        'news.read',
        'notification.read', 'notification.delete',
        'asset.read', 'asset.request.create', 'asset.request.read', 'asset.request.update', 'asset.request.delete',
        'personnel.transfer.read',
        'role.view',
        'meeting_room.read', 'meeting_room.booking.read',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit',
        'milestone.read',
      ],
    },
  ];

  // Tạo permission_role records
  const permissionRoleData: Array<{ permission_id: number; role_id: number }> = [];

  for (const rolePermission of rolePermissions) {
    const roleId = getRoleId(rolePermission.role);
    if (!roleId) continue;

    for (const permissionName of rolePermission.permissions) {
      const permissionId = getPermissionId(permissionName);
      if (permissionId) {
        permissionRoleData.push({
          permission_id: permissionId,
          role_id: roleId,
        });
      }
    }
  }

  // Xóa các permission_role cũ để tránh duplicate
  await prisma.permission_role.deleteMany({});

  // Tạo mới permission_role
  await prisma.permission_role.createMany({
    data: permissionRoleData,
    skipDuplicates: true,
  });

  console.log(`✅ Đã tạo ${permissions.length} permissions`);
  console.log(`✅ Đã tạo ${roles.length} roles`);
  console.log(`✅ Đã gán ${permissionRoleData.length} permission-role relationships`);

  return {
    permissions,
    roles,
    permissionRoleCount: permissionRoleData.length,
  };
}

