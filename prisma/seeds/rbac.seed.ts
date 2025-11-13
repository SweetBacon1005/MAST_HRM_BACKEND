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
    
    // Leave Management
    { name: 'leave.read', description: 'Xem đơn nghỉ phép' },
    { name: 'leave.create', description: 'Tạo đơn nghỉ phép' },
    { name: 'leave.approve', description: 'Duyệt đơn nghỉ phép' },
    { name: 'leave.balance.manage', description: 'Quản lý số dư nghỉ phép' },
    
    // Request Management (Remote, Overtime, Late/Early)
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
    
    // Report & Analytics
    { name: 'report.read', description: 'Xem báo cáo' },
    { name: 'report.export', description: 'Xuất báo cáo' },
    { name: 'analytics.view', description: 'Xem phân tích dữ liệu' },
    
    // System Administration
    { name: 'system.admin', description: 'Quản trị hệ thống' },
    { name: 'system.config', description: 'Cấu hình hệ thống' },
    { name: 'system.backup', description: 'Sao lưu dữ liệu' },
    
    // Organization Management
    { name: 'organization.read', description: 'Xem cơ cấu tổ chức' },
    { name: 'organization.manage', description: 'Quản lý cơ cấu tổ chức' },
    { name: 'division.manage', description: 'Quản lý phòng ban' },
    
    // Team Management
    { name: 'team.read', description: 'Xem thông tin team' },
    { name: 'team.create', description: 'Tạo team mới' },
    { name: 'team.update', description: 'Cập nhật thông tin team' },
    { name: 'team.delete', description: 'Xóa team' },
    { name: 'team.manage', description: 'Quản lý team (tất cả quyền)' },
    
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
    { name: 'asset.request.approve', description: 'Duyệt/từ chối yêu cầu tài sản' },
    { name: 'asset.request.reject', description: 'Từ chối yêu cầu tài sản' },
    
    // Contract & Device Management (Legacy - sẽ được thay thế bởi Asset Management)
    { name: 'contract.read', description: 'Xem hợp đồng' },
    { name: 'contract.manage', description: 'Quản lý hợp đồng' },
    { name: 'device.read', description: 'Xem thiết bị (legacy)' },
    { name: 'device.manage', description: 'Quản lý thiết bị (legacy)' },
    
    // Personnel Transfer Management
    { name: 'personnel.transfer.read', description: 'Xem đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.create', description: 'Tạo đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.update', description: 'Cập nhật đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.approve', description: 'Phê duyệt đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.reject', description: 'Từ chối đơn điều chuyển nhân sự' },
    { name: 'personnel.transfer.delete', description: 'Xóa đơn điều chuyển nhân sự' },
    
    // Role Management with Hierarchy
    { name: 'role.read', description: 'Xem thông tin vai trò' },
    { name: 'role.manage.employee', description: 'Quản lý vai trò nhân viên' },
    { name: 'role.manage.team_leader', description: 'Quản lý vai trò trưởng nhóm' },
    { name: 'role.manage.division_head', description: 'Quản lý vai trò trưởng phòng ban' },
    { name: 'role.manage.project_manager', description: 'Quản lý vai trò quản lý dự án' },
    { name: 'role.manage.hr_manager', description: 'Quản lý vai trò quản lý nhân sự' },
    { name: 'role.manage.admin', description: 'Quản lý vai trò quản trị viên' },
    { name: 'role.manage.all', description: 'Quản lý tất cả vai trò' },
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
        'user.read', 'user.create', 'user.update', 'user.delete',
        'project.read', 'project.create', 'project.update', 'project.delete', 'project.assign',
        'timesheet.read', 'timesheet.create', 'timesheet.update', 'timesheet.delete', 'timesheet.approve', 'timesheet.statistics',
        'attendance.read', 'attendance.manage', 'attendance.statistics',
        'leave.read', 'leave.create', 'leave.approve', 'leave.balance.manage',
        'request.read', 'request.create', 'request.approve', 'request.reject',
        'division.read', 'division.create', 'division.update', 'division.delete',
        'division.assignment.read', 'division.assignment.create', 'division.assignment.update', 'division.assignment.delete',
        'report.read', 'report.export', 'analytics.view',
        'organization.read', 'organization.manage', 'division.manage',
        'team.read', 'team.create', 'team.update', 'team.delete', 'team.manage',
        'news.read', 'news.create', 'news.update', 'news.delete', 'news.submit', 'news.approve',
        'notification.read', 'notification.create', 'notification.update', 'notification.delete', 'notification.manage',
        'asset.create', 'asset.read', 'asset.update', 'asset.delete', 'asset.assign', 'asset.unassign', 'asset.statistics',
        'asset.request.create', 'asset.request.read', 'asset.request.approve', 'asset.request.reject',
        'contract.read', 'contract.manage', 'device.read', 'device.manage',
        'personnel.transfer.read', 'personnel.transfer.create', 'personnel.transfer.update', 'personnel.transfer.approve', 'personnel.transfer.reject', 'personnel.transfer.delete',
        'role.read', 'role.manage.employee', 'role.manage.team_leader', 'role.manage.division_head', 'role.manage.project_manager', 'role.manage.hr_manager', 'role.manage.admin', 'role.manage.all',
        'system.admin',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit', 'daily.approve','daily.reject'
      ],
    },

    // HR MANAGER - Quản lý nhân sự
    {
      role: 'hr_manager',
      permissions: [
        'user.read', 'user.create', 'user.update', 'user.profile.update',
        'timesheet.read', 'timesheet.statistics',
        'attendance.read', 'attendance.manage', 'attendance.statistics',
        'leave.read', 'leave.approve', 'leave.balance.manage',
        'request.read', 'request.approve', 'request.reject',
        'division.read', 'division.create', 'division.update', 'division.assignment.read', 'division.assignment.create', 'division.assignment.update',
        'report.read', 'report.export',
        'organization.read', 'division.manage',
        'team.read', 'team.create', 'team.update', 'team.delete', 'team.manage',
        'news.read', 'news.create', 'news.update', 'news.delete', 'news.submit',
        'notification.read', 'notification.delete',
        'asset.create', 'asset.read', 'asset.update', 'asset.delete', 'asset.assign', 'asset.unassign', 'asset.statistics',
        'asset.request.create', 'asset.request.read', 'asset.request.approve', 'asset.request.reject',
        'contract.read', 'contract.manage', 'device.read', 'device.manage',
        'personnel.transfer.read', 'personnel.transfer.create', 'personnel.transfer.update', 'personnel.transfer.approve', 'personnel.transfer.reject', 'personnel.transfer.delete',
        'role.read', 'role.manage.employee', 'role.manage.team_leader', 'role.manage.division_head', 'role.manage.project_manager',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit'
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
        'report.read', 'report.export', 'analytics.view',
        'organization.read',
        'asset.read', 'asset.request.create', 'asset.request.read',
        'personnel.transfer.read', 'personnel.transfer.create',
        'notification.read', 'notification.delete',
        'role.read', 'role.manage.employee', 'role.manage.team_leader',
        'news.read',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit', 'daily.approve','daily.reject'
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
        'division.read', 'division.update', 'division.assignment.read', 'division.assignment.create', 'division.assignment.update',
        'report.read', 'report.export', 'analytics.view',
        'organization.read', 'division.manage',
        'team.read', 'team.create', 'team.update', 'team.delete', 'team.manage',
        'asset.read', 'asset.assign', 'asset.unassign', 'asset.statistics',
        'asset.request.create', 'asset.request.read', 'asset.request.approve', 'asset.request.reject',
        'contract.read', 'device.read',
        'personnel.transfer.read', 'personnel.transfer.create', 'personnel.transfer.update', 'personnel.transfer.approve', 'personnel.transfer.reject',
        'notification.read', 'notification.delete',
        'role.read', 'role.manage.employee', 'role.manage.team_leader',
        'news.read',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit', 'daily.approve','daily.reject'
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
        'organization.read',
        'team.read', 'team.update', 'team.manage',
        'asset.read', 'asset.request.create', 'asset.request.read',
        'personnel.transfer.read', 'personnel.transfer.create',
        'notification.read', 'notification.delete',
        'role.read', 'role.manage.employee',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit'
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
        'organization.read',
        'team.read',
        'asset.read', 'asset.request.create',
        'personnel.transfer.read',
        'notification.read', 'notification.delete',
        'role.read',
        'news.read',
        'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit'
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

