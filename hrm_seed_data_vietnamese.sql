-- ============================================
-- HRM SYSTEM - VIETNAMESE SEED DATA (100 USERS)
-- Dữ liệu mẫu tiếng Việt chuẩn cho hệ thống HRM
-- Password: Mast@123 (bcrypt hash)
-- Generated: 2025-11-25
-- ============================================

SET FOREIGN_KEY_CHECKS=0;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================
-- 1. LANGUAGES
-- ============================================
TRUNCATE TABLE `languages`;
INSERT INTO `languages` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Vietnamese', NOW(), NOW(), NULL),
(2, 'English', NOW(), NOW(), NULL),
(3, 'Japanese', NOW(), NOW(), NULL),
(4, 'Korean', NOW(), NOW(), NULL),
(5, 'Chinese', NOW(), NOW(), NULL);

-- ============================================
-- 2. LEVELS (Cấp bậc)
-- ============================================
TRUNCATE TABLE `levels`;
INSERT INTO `levels` (`id`, `name`, `coefficient`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Intern', 0.5, NOW(), NOW(), NULL),
(2, 'Fresher', 0.8, NOW(), NOW(), NULL),
(3, 'Junior', 1.0, NOW(), NOW(), NULL),
(4, 'Middle', 1.5, NOW(), NOW(), NULL),
(5, 'Senior', 2.0, NOW(), NOW(), NULL),
(6, 'Lead', 2.5, NOW(), NOW(), NULL),
(7, 'Principal', 3.0, NOW(), NOW(), NULL);

-- ============================================
-- 3. POSITIONS (Vị trí công việc)
-- ============================================
TRUNCATE TABLE `positions`;
INSERT INTO `positions` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Backend Developer', NOW(), NOW(), NULL),
(2, 'Frontend Developer', NOW(), NOW(), NULL),
(3, 'Full Stack Developer', NOW(), NOW(), NULL),
(4, 'Mobile Developer', NOW(), NOW(), NULL),
(5, 'QA Tester', NOW(), NOW(), NULL),
(6, 'DevOps Engineer', NOW(), NOW(), NULL),
(7, 'UI/UX Designer', NOW(), NOW(), NULL),
(8, 'Project Manager', NOW(), NOW(), NULL),
(9, 'Business Analyst', NOW(), NOW(), NULL),
(10, 'Scrum Master', NOW(), NOW(), NULL),
(11, 'Data Engineer', NOW(), NOW(), NULL),
(12, 'Security Engineer', NOW(), NOW(), NULL);

-- ============================================
-- 4. SKILLS (Kỹ năng)
-- ============================================
TRUNCATE TABLE `skills`;
INSERT INTO `skills` (`id`, `name`, `position_id`, `created_at`, `updated_at`, `deleted_at`) VALUES
-- Backend skills
(1, 'Node.js', 1, NOW(), NOW(), NULL),
(2, 'NestJS', 1, NOW(), NOW(), NULL),
(3, 'Express.js', 1, NOW(), NOW(), NULL),
(4, 'PHP', 1, NOW(), NOW(), NULL),
(5, 'Laravel', 1, NOW(), NOW(), NULL),
(6, 'Java', 1, NOW(), NOW(), NULL),
(7, 'Spring Boot', 1, NOW(), NOW(), NULL),
(8, 'Python', 1, NOW(), NOW(), NULL),
(9, 'Django', 1, NOW(), NOW(), NULL),
(10, 'PostgreSQL', 1, NOW(), NOW(), NULL),
(11, 'MySQL', 1, NOW(), NOW(), NULL),
(12, 'MongoDB', 1, NOW(), NOW(), NULL),
-- Frontend skills
(13, 'React.js', 2, NOW(), NOW(), NULL),
(14, 'Vue.js', 2, NOW(), NOW(), NULL),
(15, 'Angular', 2, NOW(), NOW(), NULL),
(16, 'Next.js', 2, NOW(), NOW(), NULL),
(17, 'TypeScript', 2, NOW(), NOW(), NULL),
(18, 'JavaScript', 2, NOW(), NOW(), NULL),
(19, 'HTML/CSS', 2, NOW(), NOW(), NULL),
(20, 'Tailwind CSS', 2, NOW(), NOW(), NULL),
-- Mobile skills
(21, 'React Native', 4, NOW(), NOW(), NULL),
(22, 'Flutter', 4, NOW(), NOW(), NULL),
(23, 'iOS Native', 4, NOW(), NOW(), NULL),
(24, 'Android Native', 4, NOW(), NOW(), NULL),
-- Testing skills
(25, 'Manual Testing', 5, NOW(), NOW(), NULL),
(26, 'Automation Testing', 5, NOW(), NOW(), NULL),
(27, 'Selenium', 5, NOW(), NOW(), NULL),
(28, 'Jest', 5, NOW(), NOW(), NULL),
-- DevOps skills
(29, 'Docker', 6, NOW(), NOW(), NULL),
(30, 'Kubernetes', 6, NOW(), NOW(), NULL),
(31, 'AWS', 6, NOW(), NOW(), NULL),
(32, 'CI/CD', 6, NOW(), NOW(), NULL),
(33, 'Azure', 6, NOW(), NOW(), NULL),
-- Design skills
(34, 'Figma', 7, NOW(), NOW(), NULL),
(35, 'Adobe XD', 7, NOW(), NOW(), NULL),
(36, 'Sketch', 7, NOW(), NOW(), NULL),
-- Other skills
(37, 'Agile/Scrum', 8, NOW(), NOW(), NULL),
(38, 'JIRA', 8, NOW(), NOW(), NULL),
(39, 'Git', 1, NOW(), NOW(), NULL),
(40, 'REST API', 1, NOW(), NOW(), NULL);

-- ============================================
-- 5. ROLES (Vai trò) - 6 roles
-- ============================================
TRUNCATE TABLE `roles`;
INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'admin', NOW(), NOW(), NULL),
(2, 'hr_manager', NOW(), NOW(), NULL),
(3, 'project_manager', NOW(), NOW(), NULL),
(4, 'division_head', NOW(), NOW(), NULL),
(5, 'team_leader', NOW(), NOW(), NULL),
(6, 'employee', NOW(), NOW(), NULL);

-- ============================================
-- 6. PERMISSIONS (108 permissions - Complete RBAC)
-- Based on prisma/seeds/rbac.seed.ts
-- ============================================
TRUNCATE TABLE `permissions`;
INSERT INTO `permissions` (`name`, `created_at`, `updated_at`, `deleted_at`) VALUES
-- User Management (5)
('user.read', NOW(), NOW(), NULL),
('user.create', NOW(), NOW(), NULL),
('user.update', NOW(), NOW(), NULL),
('user.delete', NOW(), NOW(), NULL),
('user.profile.update', NOW(), NOW(), NULL),
-- Project Management (5)
('project.read', NOW(), NOW(), NULL),
('project.create', NOW(), NOW(), NULL),
('project.update', NOW(), NOW(), NULL),
('project.delete', NOW(), NOW(), NULL),
('project.assign', NOW(), NOW(), NULL),
-- Timesheet Management (6)
('timesheet.read', NOW(), NOW(), NULL),
('timesheet.create', NOW(), NOW(), NULL),
('timesheet.update', NOW(), NOW(), NULL),
('timesheet.delete', NOW(), NOW(), NULL),
('timesheet.approve', NOW(), NOW(), NULL),
('timesheet.statistics', NOW(), NOW(), NULL),
-- Attendance Management (4)
('attendance.read', NOW(), NOW(), NULL),
('attendance.manage', NOW(), NOW(), NULL),
('attendance.checkin', NOW(), NOW(), NULL),
('attendance.statistics', NOW(), NOW(), NULL),
-- Leave Management (4)
('leave.read', NOW(), NOW(), NULL),
('leave.create', NOW(), NOW(), NULL),
('leave.approve', NOW(), NOW(), NULL),
('leave.balance.manage', NOW(), NOW(), NULL),
-- Request Management (4)
('request.read', NOW(), NOW(), NULL),
('request.create', NOW(), NOW(), NULL),
('request.approve', NOW(), NOW(), NULL),
('request.reject', NOW(), NOW(), NULL),
-- Division Management (8)
('division.read', NOW(), NOW(), NULL),
('division.create', NOW(), NOW(), NULL),
('division.update', NOW(), NOW(), NULL),
('division.delete', NOW(), NOW(), NULL),
('division.assignment.read', NOW(), NOW(), NULL),
('division.assignment.create', NOW(), NOW(), NULL),
('division.assignment.update', NOW(), NOW(), NULL),
('division.assignment.delete', NOW(), NOW(), NULL),
-- Report & Analytics (3)
('report.read', NOW(), NOW(), NULL),
('report.export', NOW(), NOW(), NULL),
('analytics.view', NOW(), NOW(), NULL),
-- System Administration (3)
('system.admin', NOW(), NOW(), NULL),
('system.config', NOW(), NOW(), NULL),
('system.backup', NOW(), NOW(), NULL),
-- Organization Management (3)
('organization.read', NOW(), NOW(), NULL),
('organization.manage', NOW(), NOW(), NULL),
('division.manage', NOW(), NOW(), NULL),
-- Team Management (5)
('team.read', NOW(), NOW(), NULL),
('team.create', NOW(), NOW(), NULL),
('team.update', NOW(), NOW(), NULL),
('team.delete', NOW(), NOW(), NULL),
('team.manage', NOW(), NOW(), NULL),
-- News Management (6)
('news.read', NOW(), NOW(), NULL),
('news.create', NOW(), NOW(), NULL),
('news.update', NOW(), NOW(), NULL),
('news.delete', NOW(), NOW(), NULL),
('news.submit', NOW(), NOW(), NULL),
('news.approve', NOW(), NOW(), NULL),
-- Notification Management (5)
('notification.read', NOW(), NOW(), NULL),
('notification.create', NOW(), NOW(), NULL),
('notification.update', NOW(), NOW(), NULL),
('notification.delete', NOW(), NOW(), NULL),
('notification.manage', NOW(), NOW(), NULL),
-- Asset Management (7)
('asset.create', NOW(), NOW(), NULL),
('asset.read', NOW(), NOW(), NULL),
('asset.update', NOW(), NOW(), NULL),
('asset.delete', NOW(), NOW(), NULL),
('asset.assign', NOW(), NOW(), NULL),
('asset.unassign', NOW(), NOW(), NULL),
('asset.statistics', NOW(), NOW(), NULL),
-- Asset Request Management (4)
('asset.request.create', NOW(), NOW(), NULL),
('asset.request.read', NOW(), NOW(), NULL),
('asset.request.approve', NOW(), NOW(), NULL),
('asset.request.reject', NOW(), NOW(), NULL),
-- Contract & Device Management - Legacy (4)
('contract.read', NOW(), NOW(), NULL),
('contract.manage', NOW(), NOW(), NULL),
('device.read', NOW(), NOW(), NULL),
('device.manage', NOW(), NOW(), NULL),
-- Personnel Transfer Management (6)
('personnel.transfer.read', NOW(), NOW(), NULL),
('personnel.transfer.create', NOW(), NOW(), NULL),
('personnel.transfer.update', NOW(), NOW(), NULL),
('personnel.transfer.approve', NOW(), NOW(), NULL),
('personnel.transfer.reject', NOW(), NOW(), NULL),
('personnel.transfer.delete', NOW(), NOW(), NULL),
-- Role Management (9)
('role.view', NOW(), NOW(), NULL),
('role.assign', NOW(), NOW(), NULL),
('role.manage.employee', NOW(), NOW(), NULL),
('role.manage.team_leader', NOW(), NOW(), NULL),
('role.manage.division_head', NOW(), NOW(), NULL),
('role.manage.project_manager', NOW(), NOW(), NULL),
('role.manage.hr_manager', NOW(), NOW(), NULL),
('role.manage.admin', NOW(), NOW(), NULL),
('role.manage.all', NOW(), NOW(), NULL),
-- Daily Report Management (7)
('daily.read', NOW(), NOW(), NULL),
('daily.create', NOW(), NOW(), NULL),
('daily.update', NOW(), NOW(), NULL),
('daily.remove', NOW(), NOW(), NULL),
('daily.submit', NOW(), NOW(), NULL),
('daily.approve', NOW(), NOW(), NULL),
('daily.reject', NOW(), NOW(), NULL);

-- ============================================
-- 7. PERMISSION_ROLE (Gán quyền theo role hierarchy)
-- ============================================
TRUNCATE TABLE `permission_role`;

-- ADMIN - Full access (all permissions)
INSERT INTO `permission_role` (`permission_id`, `role_id`, `created_at`, `updated_at`)
SELECT p.id, 1, NOW(), NOW() FROM `permissions` p;

-- HR_MANAGER - HR operations
INSERT INTO `permission_role` (`permission_id`, `role_id`, `created_at`, `updated_at`)
SELECT p.id, 2, NOW(), NOW() FROM `permissions` p
WHERE p.name IN (
    'user.read', 'user.create', 'user.update', 'user.profile.update',
    'timesheet.read', 'timesheet.statistics',
    'attendance.read', 'attendance.manage', 'attendance.statistics',
    'leave.read', 'leave.approve', 'leave.balance.manage',
    'request.read', 'request.approve', 'request.reject',
    'division.read', 'division.create', 'division.update',
    'division.assignment.read', 'division.assignment.create', 'division.assignment.update',
    'report.read', 'report.export',
    'organization.read', 'division.manage',
    'team.read', 'team.create', 'team.update', 'team.delete', 'team.manage',
    'news.read', 'news.create', 'news.update', 'news.delete', 'news.submit',
    'notification.read', 'notification.delete',
    'asset.create', 'asset.read', 'asset.update', 'asset.delete', 'asset.assign', 'asset.unassign', 'asset.statistics',
    'asset.request.create', 'asset.request.read', 'asset.request.approve', 'asset.request.reject',
    'contract.read', 'contract.manage', 'device.read', 'device.manage',
    'personnel.transfer.read', 'personnel.transfer.create', 'personnel.transfer.update',
    'personnel.transfer.approve', 'personnel.transfer.reject', 'personnel.transfer.delete',
    'role.view',
    'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit'
);

-- PROJECT_MANAGER - Project management
INSERT INTO `permission_role` (`permission_id`, `role_id`, `created_at`, `updated_at`)
SELECT p.id, 3, NOW(), NOW() FROM `permissions` p
WHERE p.name IN (
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
    'role.view', 'role.assign',
    'news.read',
    'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit', 'daily.approve', 'daily.reject'
);

-- DIVISION_HEAD - Division management
INSERT INTO `permission_role` (`permission_id`, `role_id`, `created_at`, `updated_at`)
SELECT p.id, 4, NOW(), NOW() FROM `permissions` p
WHERE p.name IN (
    'user.read', 'user.update', 'user.profile.update',
    'project.read', 'project.update', 'project.assign',
    'timesheet.read', 'timesheet.create', 'timesheet.update', 'timesheet.approve', 'timesheet.statistics',
    'attendance.read', 'attendance.manage', 'attendance.statistics',
    'leave.read', 'leave.create', 'leave.approve',
    'request.read', 'request.create', 'request.approve', 'request.reject',
    'division.read', 'division.update',
    'division.assignment.read', 'division.assignment.create', 'division.assignment.update',
    'report.read', 'report.export', 'analytics.view',
    'organization.read', 'division.manage',
    'team.read', 'team.create', 'team.update', 'team.delete', 'team.manage',
    'asset.read', 'asset.assign', 'asset.unassign', 'asset.statistics',
    'asset.request.create', 'asset.request.read', 'asset.request.approve', 'asset.request.reject',
    'contract.read', 'device.read',
    'personnel.transfer.read', 'personnel.transfer.create', 'personnel.transfer.update',
    'personnel.transfer.approve', 'personnel.transfer.reject',
    'notification.read', 'notification.delete',
    'role.view', 'role.assign',
    'news.read',
    'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit', 'daily.approve', 'daily.reject'
);

-- TEAM_LEADER - Team management
INSERT INTO `permission_role` (`permission_id`, `role_id`, `created_at`, `updated_at`)
SELECT p.id, 5, NOW(), NOW() FROM `permissions` p
WHERE p.name IN (
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
    'role.view',
    'news.read',
    'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit'
);

-- EMPLOYEE - Basic access
INSERT INTO `permission_role` (`permission_id`, `role_id`, `created_at`, `updated_at`)
SELECT p.id, 6, NOW(), NOW() FROM `permissions` p
WHERE p.name IN (
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
    'role.view',
    'news.read',
    'daily.read', 'daily.create', 'daily.update', 'daily.remove', 'daily.submit'
);

-- ============================================
-- 8. DIVISIONS (Phòng ban)
-- ============================================
TRUNCATE TABLE `divisions`;
INSERT INTO `divisions` (`id`, `name`, `type`, `status`, `address`, `parent_id`, `founding_at`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Phòng Công Nghệ', 'TECHNICAL', 'ACTIVE', 'Tầng 5-6, Tòa nhà Innovation Tower, 72 Trần Đăng Ninh, Cầu Giấy, Hà Nội', NULL, '2020-01-15', 'Phòng ban công nghệ chính, phát triển sản phẩm phần mềm', NOW(), NOW(), NULL),
(2, 'Phòng Kinh Doanh', 'BUSINESS', 'ACTIVE', 'Tầng 3, Tòa nhà Innovation Tower, 72 Trần Đăng Ninh, Cầu Giấy, Hà Nội', NULL, '2020-01-15', 'Phòng kinh doanh và phát triển thị trường', NOW(), NOW(), NULL),
(3, 'Phòng Hành Chính Nhân Sự', 'OPERATIONS', 'ACTIVE', 'Tầng 2, Tòa nhà Innovation Tower, 72 Trần Đăng Ninh, Cầu Giấy, Hà Nội', NULL, '2020-01-15', 'Phòng quản lý nhân sự và hành chính', NOW(), NOW(), NULL),
(4, 'Bộ phận Backend', 'TECHNICAL', 'ACTIVE', 'Tầng 5, Tòa nhà Innovation Tower, 72 Trần Đăng Ninh, Cầu Giấy, Hà Nội', 1, '2020-06-01', 'Phát triển backend và API', NOW(), NOW(), NULL),
(5, 'Bộ phận Frontend', 'TECHNICAL', 'ACTIVE', 'Tầng 6, Tòa nhà Innovation Tower, 72 Trần Đăng Ninh, Cầu Giấy, Hà Nội', 1, '2020-06-01', 'Phát triển giao diện người dùng', NOW(), NOW(), NULL),
(6, 'Bộ phận Mobile', 'TECHNICAL', 'ACTIVE', 'Tầng 6, Tòa nhà Innovation Tower, 72 Trần Đăng Ninh, Cầu Giấy, Hà Nội', 1, '2020-06-01', 'Phát triển ứng dụng di động', NOW(), NOW(), NULL),
(7, 'Bộ phận QA', 'TECHNICAL', 'ACTIVE', 'Tầng 5, Tòa nhà Innovation Tower, 72 Trần Đăng Ninh, Cầu Giấy, Hà Nội', 1, '2020-06-01', 'Đảm bảo chất lượng sản phẩm', NOW(), NOW(), NULL);

-- ============================================
-- 9. TEAMS (Nhóm)
-- ============================================
TRUNCATE TABLE `teams`;
INSERT INTO `teams` (`id`, `name`, `division_id`, `founding_date`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Backend Team Alpha', 4, '2020-06-15', NOW(), NOW(), NULL),
(2, 'Backend Team Beta', 4, '2020-07-01', NOW(), NOW(), NULL),
(3, 'Frontend Team Gamma', 5, '2020-06-15', NOW(), NOW(), NULL),
(4, 'Frontend Team Delta', 5, '2020-07-01', NOW(), NOW(), NULL),
(5, 'Mobile Team 1', 6, '2020-08-01', NOW(), NOW(), NULL),
(6, 'QA Team 1', 7, '2020-06-15', NOW(), NOW(), NULL);

-- ============================================
-- 10. PROJECTS (Dự án)
-- ============================================
TRUNCATE TABLE `projects`;
INSERT INTO `projects` (`id`, `name`, `code`, `status`, `division_id`, `team_id`, `project_type`, `project_access_type`, `industry`, `progress`, `scope`, `description`, `start_date`, `end_date`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Hệ thống Thương mại điện tử', 'ECOM-2024', 'IN_PROGRESS', 1, 1, 'CUSTOMER', 'RESTRICTED', 'IT', 75.5, 'Full stack development', 'Xây dựng nền tảng thương mại điện tử hiện đại với kiến trúc microservices', '2024-01-01', '2024-12-31', NOW(), NOW(), NULL),
(2, 'Hệ thống Ngân hàng Core', 'BANK-2024', 'IN_PROGRESS', 1, 2, 'CUSTOMER', 'RESTRICTED', 'FINANCE', 60.0, 'Backend API development', 'Phát triển hệ thống ngân hàng cốt lõi với bảo mật cao', '2024-02-01', '2025-01-31', NOW(), NOW(), NULL),
(3, 'Hệ thống HRM Nội bộ', 'HRM-2024', 'IN_PROGRESS', 1, 1, 'INTERNAL', 'COMPANY', 'IT', 85.0, 'Full HRM solution', 'Hệ thống quản lý nhân sự toàn diện', '2023-06-01', '2024-06-30', NOW(), NOW(), NULL),
(4, 'Ứng dụng Mobile Banking', 'MBANK-2024', 'IN_PROGRESS', 1, 5, 'CUSTOMER', 'RESTRICTED', 'FINANCE', 45.0, 'Mobile application', 'Ứng dụng ngân hàng trên iOS và Android', '2024-03-01', '2024-09-30', NOW(), NOW(), NULL),
(5, 'Hệ thống AI Chatbot', 'AIBOT-2024', 'OPEN', 1, 2, 'START_UP', 'RESTRICTED', 'IT', 30.0, 'AI development', 'Hệ thống chatbot thông minh cho dịch vụ khách hàng', '2024-04-01', '2024-10-31', NOW(), NOW(), NULL);

-- ============================================
-- 11. USERS (100 người dùng với tên Việt)
-- Password: Mast@123 
-- Hash: $2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO
-- ============================================
TRUNCATE TABLE `users`;
INSERT INTO `users` (`id`, `email`, `email_verified_at`, `password`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES
-- Key users (6 users)
(1, 'admin@example.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(2, 'division@example.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(3, 'teamlead@example.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(4, 'pm@example.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(5, 'employee@example.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(6, 'user@example.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
-- 94 nhân viên với tên Việt
(7, 'anh.tran@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(8, 'huy.le@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(9, 'linh.pham@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(10, 'nam.hoang@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(11, 'thu.vu@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(12, 'khoa.dang@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(13, 'lan.do@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(14, 'tuan.ngo@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(15, 'mai.bui@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(16, 'dat.duong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(17, 'ha.ly@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(18, 'son.thai@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(19, 'nga.vo@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(20, 'phong.phan@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(21, 'hoa.truong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(22, 'dung.dinh@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(23, 'huong.ha@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(24, 'bao.cao@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(25, 'thao.ta@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(26, 'khanh.to@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(27, 'phuong.lam@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(28, 'vinh.chu@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(29, 'trang.trinh@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(30, 'hung.dao@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(31, 'yen.mai@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(32, 'quan.kieu@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(33, 'hanh.huynh@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(34, 'thang.luong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(35, 'giang.vuong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(36, 'duc.nguyen@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(37, 'chau.tran@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(38, 'long.le@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(39, 'tam.pham@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(40, 'kien.hoang@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(41, 'xuan.vu@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(42, 'binh.dang@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(43, 'loan.do@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(44, 'hai.ngo@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(45, 'diem.bui@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(46, 'quang.duong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(47, 'nhung.ly@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(48, 'tai.thai@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(49, 'bich.vo@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(50, 'duy.phan@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(51, 'hang.truong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(52, 'tu.dinh@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(53, 'diep.ha@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(54, 'trung.cao@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(55, 'hien.ta@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(56, 'cong.to@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(57, 'nhan.lam@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(58, 'khang.chu@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(59, 'thuy.trinh@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(60, 'hoc.dao@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(61, 'van.mai@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(62, 'nhat.kieu@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(63, 'kieu.huynh@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(64, 'manh.luong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(65, 'ngoc.vuong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(66, 'phuc.nguyen@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(67, 'han.tran@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(68, 'tien.le@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(69, 'lam.pham@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(70, 'nghia.hoang@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(71, 'anh.vu@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(72, 'hoang.dang@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(73, 'viet.do@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(74, 'thanh.ngo@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(75, 'thu.bui@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(76, 'hieu.duong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(77, 'oanh.ly@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(78, 'cuong.thai@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(79, 'tram.vo@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(80, 'hau.phan@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(81, 'kim.truong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(82, 'bach.dinh@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(83, 'ly.ha@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(84, 'ngan.cao@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(85, 'tan.ta@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(86, 'quy.to@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(87, 'uyen.lam@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(88, 'khai.chu@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(89, 'gam.trinh@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(90, 'dan.dao@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(91, 'vy.mai@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(92, 'phat.kieu@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(93, 'tuyet.huynh@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(94, 'tinh.luong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(95, 'my.vuong@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(96, 'danh.nguyen@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(97, 'hanh.tran@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(98, 'tho.le@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(99, 'suong.pham@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL),
(100, 'dat.hoang@company.com', NOW(), '$2b$12$8QqSc2XXr7gP2nrALLSnXeewDP8ojey2P7GcAyuuw9naC8asc4eCO', 'ACTIVE', NOW(), NOW(), NULL);

-- ============================================
-- 12. USER_INFORMATION (100 hồ sơ nhân viên)
-- NOTE: Không còn cột user_id, FK đã chuyển sang users.user_info_id
-- ============================================
TRUNCATE TABLE `user_information`;
INSERT INTO `user_information` (`id`, `personal_email`, `nationality`, `name`, `code`, `avatar`, `gender`, `marital`, `birthday`, `position_id`, `address`, `temp_address`, `phone`, `tax_code`, `level_id`, `expertise`, `language_id`, `created_at`, `updated_at`, `deleted_at`) VALUES
-- Key users (6 users)
(1, 'admin.personal@gmail.com', 'Vietnam', 'Nguyễn Văn Quản Trị', 'EMP001', NULL, 'Male', 'Married', '1985-05-15', 8, '123 Hoàng Quốc Việt, Cầu Giấy, Hà Nội', 'Hà Nội', '0901234001', '0100000001', 7, 'Quản trị hệ thống', 2, NOW(), NOW(), NULL),
(2, 'divhead@gmail.com', 'Vietnam', 'Trần Thị Hương', 'EMP002', NULL, 'Female', 'Married', '1988-03-20', 8, '456 Nguyễn Trãi, Thanh Xuân, Hà Nội', 'Hà Nội', '0901234002', '0100000002', 7, 'Quản lý nhân sự', 1, NOW(), NOW(), NULL),
(3, 'teamlead@gmail.com', 'Vietnam', 'Lê Văn Thành', 'EMP003', NULL, 'Male', 'Single', '1990-07-10', 10, '789 Láng Hạ, Đống Đa, Hà Nội', 'Hà Nội', '0901234003', '0100000003', 6, 'Quản lý nhóm', 2, NOW(), NOW(), NULL),
(4, 'pm@gmail.com', 'Vietnam', 'Phạm Thị Loan', 'EMP004', NULL, 'Female', 'Married', '1987-11-25', 8, '234 Lê Duẩn, Hoàn Kiếm, Hà Nội', 'Hà Nội', '0901234004', '0100000004', 6, 'Quản lý dự án', 2, NOW(), NOW(), NULL),
(5, 'employee@gmail.com', 'Vietnam', 'Hoàng Văn Em', 'EMP005', NULL, 'Male', 'Single', '1995-09-12', 1, '567 Giải Phóng, Hai Bà Trưng, Hà Nội', 'Hà Nội', '0901234005', '0100000005', 4, 'Backend Development', 1, NOW(), NOW(), NULL),
(6, 'user@gmail.com', 'Vietnam', 'Nguyễn Văn User', 'EMP006', NULL, 'Male', 'Married', '1992-06-20', 3, '888 Trần Duy Hưng, Cầu Giấy, Hà Nội', 'Hà Nội', '0901234006', '0100000006', 5, 'Full Stack Development', 2, NOW(), NOW(), NULL),
-- 94 nhân viên với đầy đủ thông tin Việt Nam
(7, 'anh.tran@gmail.com', 'Vietnam', 'Trần Đức Anh', 'EMP007', NULL, 'Male', 'Married', '1991-03-22', 2, '45 Nguyễn Huệ, Quận 1, TP.HCM', 'TP.HCM', '0901234007', '0100000007', 5, 'Frontend Development', 2, NOW(), NOW(), NULL),
(8, 'huy.le@gmail.com', 'Vietnam', 'Lê Quang Huy', 'EMP008', NULL, 'Male', 'Single', '1994-06-10', 1, '78 Trần Hưng Đạo, Ba Đình, Hà Nội', 'Hà Nội', '0901234008', '0100000008', 4, 'Backend Development', 1, NOW(), NOW(), NULL),
(9, 'linh.pham@gmail.com', 'Vietnam', 'Phạm Thúy Linh', 'EMP009', NULL, 'Female', 'Single', '1995-08-14', 2, '234 Hai Bà Trưng, Quận 1, TP.HCM', 'TP.HCM', '0901234009', '0100000009', 4, 'Frontend Development', 1, NOW(), NOW(), NULL),
(10, 'nam.hoang@gmail.com', 'Vietnam', 'Hoàng Thành Nam', 'EMP010', NULL, 'Male', 'Married', '1990-11-28', 3, '56 Lý Thường Kiệt, Đống Đa, Hà Nội', 'Hà Nội', '0901234010', '0100000010', 5, 'Full Stack Development', 2, NOW(), NOW(), NULL),
(11, 'thu.vu@gmail.com', 'Vietnam', 'Vũ Thu Hà', 'EMP011', NULL, 'Female', 'Single', '1996-02-19', 7, '89 Nguyễn Thị Minh Khai, Quận 3, TP.HCM', 'TP.HCM', '0901234011', '0100000011', 3, 'UI/UX Design', 1, NOW(), NOW(), NULL),
(12, 'khoa.dang@gmail.com', 'Vietnam', 'Đặng Đình Khoa', 'EMP012', NULL, 'Male', 'Married', '1989-04-07', 1, '123 Cầu Giấy, Cầu Giấy, Hà Nội', 'Hà Nội', '0901234012', '0100000012', 6, 'Backend Development', 2, NOW(), NOW(), NULL),
(13, 'lan.do@gmail.com', 'Vietnam', 'Đỗ Thị Lan', 'EMP013', NULL, 'Female', 'Married', '1992-07-23', 5, '456 Lê Văn Sỹ, Quận 3, TP.HCM', 'TP.HCM', '0901234013', '0100000013', 4, 'Quality Assurance', 1, NOW(), NOW(), NULL),
(14, 'tuan.ngo@gmail.com', 'Vietnam', 'Ngô Minh Tuấn', 'EMP014', NULL, 'Male', 'Single', '1994-10-05', 4, '789 Võ Văn Tần, Quận 3, TP.HCM', 'TP.HCM', '0901234014', '0100000014', 4, 'Mobile Development', 1, NOW(), NOW(), NULL),
(15, 'mai.bui@gmail.com', 'Vietnam', 'Bùi Ngọc Mai', 'EMP015', NULL, 'Female', 'Single', '1997-12-16', 2, '234 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội', 'Hà Nội', '0901234015', '0100000015', 3, 'Frontend Development', 1, NOW(), NOW(), NULL),
(16, 'dat.duong@gmail.com', 'Vietnam', 'Dương Thành Đạt', 'EMP016', NULL, 'Male', 'Married', '1991-05-30', 6, '567 Hoàng Diệu, Quận 4, TP.HCM', 'TP.HCM', '0901234016', '0100000016', 5, 'DevOps Engineering', 2, NOW(), NOW(), NULL),
(17, 'ha.ly@gmail.com', 'Vietnam', 'Lý Thu Hà', 'EMP017', NULL, 'Female', 'Single', '1995-03-18', 9, '89 Pasteur, Quận 1, TP.HCM', 'TP.HCM', '0901234017', '0100000017', 4, 'Business Analysis', 1, NOW(), NOW(), NULL),
(18, 'son.thai@gmail.com', 'Vietnam', 'Thái Sơn', 'EMP018', NULL, 'Male', 'Married', '1988-09-09', 1, '123 Nguyễn Du, Hoàn Kiếm, Hà Nội', 'Hà Nội', '0901234018', '0100000018', 6, 'Backend Development', 2, NOW(), NOW(), NULL),
(19, 'nga.vo@gmail.com', 'Vietnam', 'Võ Hồng Nga', 'EMP019', NULL, 'Female', 'Married', '1990-11-11', 7, '456 Trần Phú, Hải Châu, Đà Nẵng', 'Đà Nẵng', '0901234019', '0100000019', 5, 'UI/UX Design', 1, NOW(), NOW(), NULL),
(20, 'phong.phan@gmail.com', 'Vietnam', 'Phan Văn Phong', 'EMP020', NULL, 'Male', 'Single', '1993-06-25', 4, '789 Lê Duẩn, Hải Châu, Đà Nẵng', 'Đà Nẵng', '0901234020', '0100000020', 4, 'Mobile Development', 1, NOW(), NOW(), NULL);

-- Generate 80 user_information còn lại (id 21-100)
INSERT INTO `user_information` (`id`, `personal_email`, `nationality`, `name`, `code`, `avatar`, `gender`, `marital`, `birthday`, `position_id`, `address`, `temp_address`, `phone`, `tax_code`, `level_id`, `expertise`, `language_id`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    n + 21 as id,
    CONCAT(SUBSTRING_INDEX(u.email, '@', 1), '@gmail.com') as personal_email,
    'Vietnam' as nationality,
    CASE 
        WHEN MOD(n, 2) = 0 THEN CONCAT('Nguyễn Văn ', CHAR(65 + MOD(n, 26)))
        ELSE CONCAT('Trần Thị ', CHAR(65 + MOD(n, 26)))
    END as name,
    CONCAT('EMP', LPAD(n + 21, 3, '0')) as code,
    NULL as avatar,
    CASE WHEN MOD(n, 2) = 0 THEN 'Male' ELSE 'Female' END as gender,
    CASE WHEN MOD(n, 3) = 0 THEN 'Married' ELSE 'Single' END as marital,
    DATE_SUB('2000-01-01', INTERVAL MOD(n * 37, 5000) DAY) as birthday,
    MOD(n, 12) + 1 as position_id,
    CONCAT(MOD(n * 123, 500) + 1, ' ',
        CASE MOD(n, 10)
            WHEN 0 THEN 'Hoàng Quốc Việt, Cầu Giấy'
            WHEN 1 THEN 'Nguyễn Trãi, Thanh Xuân'
            WHEN 2 THEN 'Láng Hạ, Đống Đa'
            WHEN 3 THEN 'Lê Duẩn, Hoàn Kiếm'
            WHEN 4 THEN 'Giải Phóng, Hai Bà Trưng'
            WHEN 5 THEN 'Tôn Đức Thắng, Đống Đa'
            WHEN 6 THEN 'Trần Duy Hưng, Cầu Giấy'
            WHEN 7 THEN 'Cát Linh, Đống Đa'
            WHEN 8 THEN 'Kim Mã, Ba Đình'
            ELSE 'Đê La Thành, Đống Đa'
        END,
        ', Hà Nội'
    ) as address,
    'Hà Nội' as temp_address,
    CONCAT('090', LPAD(n + 1234021, 7, '0')) as phone,
    CONCAT('01000000', LPAD(n + 21, 2, '0')) as tax_code,
    MOD(n, 7) + 1 as level_id,
    CASE 
        WHEN MOD(n, 12) = 0 THEN 'Backend Development'
        WHEN MOD(n, 12) = 1 THEN 'Frontend Development'
        WHEN MOD(n, 12) = 2 THEN 'Full Stack Development'
        WHEN MOD(n, 12) = 3 THEN 'Mobile Development'
        WHEN MOD(n, 12) = 4 THEN 'Quality Assurance'
        WHEN MOD(n, 12) = 5 THEN 'DevOps Engineering'
        WHEN MOD(n, 12) = 6 THEN 'UI/UX Design'
        WHEN MOD(n, 12) = 7 THEN 'Project Management'
        WHEN MOD(n, 12) = 8 THEN 'Business Analysis'
        WHEN MOD(n, 12) = 9 THEN 'Scrum Master'
        WHEN MOD(n, 12) = 10 THEN 'Data Engineering'
        ELSE 'Security Engineering'
    END as expertise,
    MOD(n, 5) + 1 as language_id,
    NOW() as created_at,
    NOW() as updated_at,
    NULL as deleted_at
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7) b
    WHERE a.N + b.N * 10 BETWEEN 0 AND 79
) numbers
INNER JOIN users u ON u.id = numbers.n + 21
LIMIT 80;

-- Update users.user_info_id to link users -> user_information
UPDATE `users` SET `user_info_id` = 1 WHERE `id` = 1;
UPDATE `users` SET `user_info_id` = 2 WHERE `id` = 2;
UPDATE `users` SET `user_info_id` = 3 WHERE `id` = 3;
UPDATE `users` SET `user_info_id` = 4 WHERE `id` = 4;
UPDATE `users` SET `user_info_id` = 5 WHERE `id` = 5;
UPDATE `users` SET `user_info_id` = 6 WHERE `id` = 6;
UPDATE `users` SET `user_info_id` = 7 WHERE `id` = 7;
UPDATE `users` SET `user_info_id` = 8 WHERE `id` = 8;
UPDATE `users` SET `user_info_id` = 9 WHERE `id` = 9;
UPDATE `users` SET `user_info_id` = 10 WHERE `id` = 10;
UPDATE `users` SET `user_info_id` = 11 WHERE `id` = 11;
UPDATE `users` SET `user_info_id` = 12 WHERE `id` = 12;
UPDATE `users` SET `user_info_id` = 13 WHERE `id` = 13;
UPDATE `users` SET `user_info_id` = 14 WHERE `id` = 14;
UPDATE `users` SET `user_info_id` = 15 WHERE `id` = 15;
UPDATE `users` SET `user_info_id` = 16 WHERE `id` = 16;
UPDATE `users` SET `user_info_id` = 17 WHERE `id` = 17;
UPDATE `users` SET `user_info_id` = 18 WHERE `id` = 18;
UPDATE `users` SET `user_info_id` = 19 WHERE `id` = 19;
UPDATE `users` SET `user_info_id` = 20 WHERE `id` = 20;

-- Update users 21-100 using dynamic query
UPDATE `users` u
INNER JOIN `user_information` ui ON u.id = ui.id
SET u.user_info_id = ui.id
WHERE u.id BETWEEN 21 AND 100;

-- ============================================
-- 13. EDUCATION (200 bản ghi - 2 per user)
-- ✅ Liên kết qua user_info_id
-- ============================================
TRUNCATE TABLE `education`;
INSERT INTO `education` (`user_info_id`, `name`, `major`, `description`, `start_date`, `end_date`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    user_info_id,
    CASE 
        WHEN education_num = 1 THEN CASE MOD(user_info_id, 5)
            WHEN 0 THEN 'Đại học Bách Khoa Hà Nội'
            WHEN 1 THEN 'Đại học Quốc Gia Hà Nội'
            WHEN 2 THEN 'Đại học Công Nghệ - ĐHQGHN'
            WHEN 3 THEN 'Đại học FPT'
            ELSE 'Đại học Khoa học Tự nhiên'
        END
        ELSE CASE MOD(user_info_id, 4)
            WHEN 0 THEN 'Đại học Bách Khoa TP.HCM'
            WHEN 1 THEN 'Học viện Công nghệ Bưu chính Viễn thông'
            WHEN 2 THEN 'Đại học Kinh tế Quốc dân'
            ELSE 'Đại học Ngoại thương'
        END
    END as name,
    CASE 
        WHEN MOD(user_info_id, 6) = 0 THEN 'Khoa học máy tính'
        WHEN MOD(user_info_id, 6) = 1 THEN 'Công nghệ phần mềm'
        WHEN MOD(user_info_id, 6) = 2 THEN 'Công nghệ thông tin'
        WHEN MOD(user_info_id, 6) = 3 THEN 'Khoa học dữ liệu'
        WHEN MOD(user_info_id, 6) = 4 THEN 'Kỹ thuật máy tính'
        ELSE 'Hệ thống thông tin'
    END as major,
    CASE 
        WHEN education_num = 1 THEN 'Bằng Cử nhân'
        ELSE 'Bằng Thạc sĩ'
    END as description,
    DATE_SUB('2018-09-01', INTERVAL (user_info_id * education_num * 180) MOD 2000 DAY) as start_date,
    DATE_SUB('2022-06-30', INTERVAL (user_info_id * education_num * 90) MOD 1500 DAY) as end_date,
    NOW() as created_at,
    NOW() as updated_at,
    NULL as deleted_at
FROM (
    SELECT id as user_info_id FROM user_information WHERE id <= 100
) u
CROSS JOIN (
    SELECT 1 as education_num UNION ALL SELECT 2
) e;

-- ============================================
-- 14. EXPERIENCE (300 bản ghi - 3 per user)
-- ✅ Liên kết qua user_info_id
-- ============================================
TRUNCATE TABLE `experience`;
INSERT INTO `experience` (`user_info_id`, `job_title`, `company`, `start_date`, `end_date`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    user_info_id,
    CASE 
        WHEN exp_num = 1 THEN 'Junior Developer'
        WHEN exp_num = 2 THEN 'Middle Developer'
        ELSE 'Senior Developer'
    END as job_title,
    CASE 
        WHEN MOD(user_info_id + exp_num, 15) = 0 THEN 'FPT Software'
        WHEN MOD(user_info_id + exp_num, 15) = 1 THEN 'VNG Corporation'
        WHEN MOD(user_info_id + exp_num, 15) = 2 THEN 'Viettel Solutions'
        WHEN MOD(user_info_id + exp_num, 15) = 3 THEN 'TMA Solutions'
        WHEN MOD(user_info_id + exp_num, 15) = 4 THEN 'KMS Technology'
        WHEN MOD(user_info_id + exp_num, 15) = 5 THEN 'NAL Solutions'
        WHEN MOD(user_info_id + exp_num, 15) = 6 THEN 'Rikkeisoft'
        WHEN MOD(user_info_id + exp_num, 15) = 7 THEN 'CMC Corporation'
        WHEN MOD(user_info_id + exp_num, 15) = 8 THEN 'Base.vn'
        WHEN MOD(user_info_id + exp_num, 15) = 9 THEN 'Tiki'
        WHEN MOD(user_info_id + exp_num, 15) = 10 THEN 'VinID'
        WHEN MOD(user_info_id + exp_num, 15) = 11 THEN 'Sendo'
        WHEN MOD(user_info_id + exp_num, 15) = 12 THEN 'MoMo'
        WHEN MOD(user_info_id + exp_num, 15) = 13 THEN 'VPBank'
        ELSE 'Techcombank'
    END as company,
    DATE_SUB('2024-01-01', INTERVAL (user_info_id * exp_num * 365) MOD 3650 DAY) as start_date,
    DATE_SUB('2024-01-01', INTERVAL (user_info_id * exp_num * 180) MOD 1825 DAY) as end_date,
    NOW() as created_at,
    NOW() as updated_at,
    NULL as deleted_at
FROM (
    SELECT id as user_info_id FROM user_information WHERE id <= 100
) u
CROSS JOIN (
    SELECT 1 as exp_num UNION ALL SELECT 2 UNION ALL SELECT 3
) e;

-- ============================================
-- 15. USER_SKILLS (400 bản ghi - 4 per user)
-- ✅ Liên kết qua user_info_id
-- ============================================
TRUNCATE TABLE `user_skills`;
INSERT INTO `user_skills` (`user_info_id`, `skill_id`, `experience`, `months_experience`, `is_main`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    user_info_id,
    CASE 
        WHEN skill_num = 1 THEN MOD(user_info_id, 40) + 1
        WHEN skill_num = 2 THEN MOD(user_info_id + 10, 40) + 1
        WHEN skill_num = 3 THEN MOD(user_info_id + 20, 40) + 1
        ELSE MOD(user_info_id + 30, 40) + 1
    END as skill_id,
    MOD(user_info_id * skill_num, 5) + 1 as experience,
    (MOD(user_info_id * skill_num, 48) + 6) as months_experience,
    CASE WHEN skill_num = 1 THEN 1 ELSE 0 END as is_main,
    NOW() as created_at,
    NOW() as updated_at,
    NULL as deleted_at
FROM (
    SELECT id as user_info_id FROM user_information WHERE id <= 100
) u
CROSS JOIN (
    SELECT 1 as skill_num UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
) s;

-- ============================================
-- 16. USER_ROLE_ASSIGNMENT
-- ============================================
-- BASE RULE: Mọi user đều có role EMPLOYEE @ COMPANY scope (tạo sau)
-- MANAGEMENT ROLES: Admin, HR Manager, Division Heads, Team Leaders, PMs
-- 
-- Logic scope:
-- - admin: COMPANY scope
-- - hr_manager: COMPANY scope
-- - division_head: DIVISION scope (specific division)
-- - team_leader: TEAM scope (specific team)
-- - project_manager: PROJECT scope (specific project)
-- 
-- Note: Management users sẽ có 2 roles:
--   1. Base EMPLOYEE @ COMPANY
--   2. Management role @ specific scope
-- ============================================
TRUNCATE TABLE `user_role_assignment`;

-- MANAGEMENT ROLES (users 1-20)
-- Note: Những users này cũng sẽ có EMPLOYEE@COMPANY ở phần sau

-- Admin (user 1)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'COMPANY', NULL, 1, NOW(), NOW(), NULL);

-- HR Manager (user 2) - COMPANY scope
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(2, 2, 'COMPANY', NULL, 1, NOW(), NOW(), NULL);

-- Team Leader (user 3) - TEAM scope
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(3, 5, 'TEAM', 1, 1, NOW(), NOW(), NULL);

-- Project Manager (user 4) - PROJECT scope
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(4, 3, 'PROJECT', 1, 1, NOW(), NOW(), NULL);

-- Employee (user 5) - No additional role (only base EMPLOYEE@COMPANY)
-- (Role này sẽ được tạo bởi base assignment ở phần sau)

-- User 6 - ALL ROLES (admin, hr_manager, division_head, team_leader, project_manager, employee)
-- This user has ALL roles across ALL scopes for testing purposes

-- User 6: Admin role
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(6, 1, 'COMPANY', NULL, 1, NOW(), NOW(), NULL);

-- User 6: HR Manager role
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(6, 2, 'COMPANY', NULL, 1, NOW(), NOW(), NULL);

-- User 6: Division Heads for ALL divisions (7 assignments)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(6, 4, 'DIVISION', 1, 1, NOW(), NOW(), NULL),
(6, 4, 'DIVISION', 2, 1, NOW(), NOW(), NULL),
(6, 4, 'DIVISION', 3, 1, NOW(), NOW(), NULL),
(6, 4, 'DIVISION', 4, 1, NOW(), NOW(), NULL),
(6, 4, 'DIVISION', 5, 1, NOW(), NOW(), NULL),
(6, 4, 'DIVISION', 6, 1, NOW(), NOW(), NULL),
(6, 4, 'DIVISION', 7, 1, NOW(), NOW(), NULL);

-- User 6: Team Leaders for ALL teams (6 assignments)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(6, 5, 'TEAM', 1, 1, NOW(), NOW(), NULL),
(6, 5, 'TEAM', 2, 1, NOW(), NOW(), NULL),
(6, 5, 'TEAM', 3, 1, NOW(), NOW(), NULL),
(6, 5, 'TEAM', 4, 1, NOW(), NOW(), NULL),
(6, 5, 'TEAM', 5, 1, NOW(), NOW(), NULL),
(6, 5, 'TEAM', 6, 1, NOW(), NOW(), NULL);

-- User 6: Project Managers for ALL projects (5 assignments)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(6, 3, 'PROJECT', 1, 1, NOW(), NOW(), NULL),
(6, 3, 'PROJECT', 2, 1, NOW(), NOW(), NULL),
(6, 3, 'PROJECT', 3, 1, NOW(), NOW(), NULL),
(6, 3, 'PROJECT', 4, 1, NOW(), NOW(), NULL),
(6, 3, 'PROJECT', 5, 1, NOW(), NOW(), NULL);

-- Division Heads (users 7-13) - DIVISION scope
-- User 7: Head of Technology Division (division 1)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(7, 4, 'DIVISION', 1, 1, NOW(), NOW(), NULL);

-- User 8: Head of Business Division (division 2)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(8, 4, 'DIVISION', 2, 1, NOW(), NOW(), NULL);

-- User 9: Head of HR Division (division 3)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(9, 4, 'DIVISION', 3, 1, NOW(), NOW(), NULL);

-- User 10: Head of Backend Division (division 4)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(10, 4, 'DIVISION', 4, 1, NOW(), NOW(), NULL);

-- User 11: Head of Frontend Division (division 5)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(11, 4, 'DIVISION', 5, 1, NOW(), NOW(), NULL);

-- User 12: Head of Mobile Division (division 6)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(12, 4, 'DIVISION', 6, 1, NOW(), NOW(), NULL);

-- User 13: Head of QA Division (division 7)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(13, 4, 'DIVISION', 7, 1, NOW(), NOW(), NULL);

-- Team Leaders (users 14-19) - TEAM scope
-- User 14: Leader of Backend Team Alpha (team 1)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(14, 5, 'TEAM', 1, 1, NOW(), NOW(), NULL);

-- User 15: Leader of Backend Team Beta (team 2)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(15, 5, 'TEAM', 2, 1, NOW(), NOW(), NULL);

-- User 16: Leader of Frontend Team Gamma (team 3)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(16, 5, 'TEAM', 3, 1, NOW(), NOW(), NULL);

-- User 17: Leader of Frontend Team Delta (team 4)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(17, 5, 'TEAM', 4, 1, NOW(), NOW(), NULL);

-- User 18: Leader of Mobile Team 1 (team 5)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(18, 5, 'TEAM', 5, 1, NOW(), NOW(), NULL);

-- User 19: Leader of QA Team 1 (team 6)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(19, 5, 'TEAM', 6, 1, NOW(), NOW(), NULL);

-- Project Managers (users 20-24) - PROJECT scope
-- User 20: PM of E-Commerce project (project 1)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(20, 3, 'PROJECT', 1, 1, NOW(), NOW(), NULL);

-- User 21: PM of Banking Core project (project 2)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(21, 3, 'PROJECT', 2, 1, NOW(), NOW(), NULL);

-- User 22: PM of HRM project (project 3)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(22, 3, 'PROJECT', 3, 1, NOW(), NOW(), NULL);

-- User 23: PM of Mobile Banking project (project 4)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(23, 3, 'PROJECT', 4, 1, NOW(), NOW(), NULL);

-- User 24: PM of AI Chatbot project (project 5)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(24, 3, 'PROJECT', 5, 1, NOW(), NOW(), NULL);

-- ============================================
-- EMPLOYEES DISTRIBUTION STRATEGY (STRICT HIERARCHY)
-- ============================================
-- BASE RULE: MỌI USER đều có role EMPLOYEE ở COMPANY scope (base role)
-- Constraint: Team PHẢI thuộc Division
-- Rule: User trong team PHẢI cùng division với team đó
-- 
-- Structure:
-- - ALL 100 users: EMPLOYEE @ COMPANY (base role)
-- - 50 employees: + DIVISION assignment
-- - 25 employees: + DIVISION + TEAM assignment
-- - 5 employees: Chỉ có COMPANY (chưa phân bổ division/team)
-- ============================================

-- BASE ASSIGNMENT: ALL users get EMPLOYEE role at COMPANY scope (users 1-100)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    id as user_id,
    6 as role_id,  -- employee role
    'COMPANY' as scope_type,
    NULL as scope_id,
    1 as assigned_by,
    NOW(),
    NOW(),
    NULL
FROM users
WHERE id BETWEEN 1 AND 100;

-- PHASE 1: Division assignments (users 25-74) - 50 employees  
-- Những người được assign thêm vào division cụ thể
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    n + 24 as user_id,
    6 as role_id,
    'DIVISION' as scope_type,
    CASE 
        WHEN n <= 7 THEN 1   -- Technology Division (7 people)
        WHEN n <= 14 THEN 2  -- Business Division (7 people)
        WHEN n <= 21 THEN 3  -- HR Division (7 people)
        WHEN n <= 28 THEN 4  -- Backend Division (7 people)
        WHEN n <= 36 THEN 5  -- Frontend Division (8 people)
        WHEN n <= 43 THEN 6  -- Mobile Division (7 people)
        ELSE 7               -- QA Division (7 people)
    END as scope_id,
    1 as assigned_by,
    NOW(),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) b
    WHERE a.N + b.N * 10 BETWEEN 1 AND 50
) numbers;

-- PHASE 2: Employees with DIVISION + TEAM (users 75-99) - 25 employees
-- Constraint: Team's division_id PHẢI MATCH với user's division
-- 
-- Team structure:
-- Team 1, 2 → Division 4 (Backend)
-- Team 3, 4 → Division 5 (Frontend)
-- Team 5 → Division 6 (Mobile)
-- Team 6 → Division 7 (QA)

-- Step 2A: Assign users to DIVISIONS first
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    n + 74 as user_id,
    6 as role_id,
    'DIVISION' as scope_type,
    CASE 
        -- Backend Division employees (for teams 1, 2)
        WHEN n <= 8 THEN 4   -- 8 people for Backend Division
        -- Frontend Division employees (for teams 3, 4)
        WHEN n <= 17 THEN 5  -- 9 people for Frontend Division
        -- Mobile Division employees (for team 5)
        WHEN n <= 21 THEN 6  -- 4 people for Mobile Division
        -- QA Division employees (for team 6)
        ELSE 7               -- 4 people for QA Division
    END as scope_id,
    1 as assigned_by,
    NOW(),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2) b
    WHERE a.N + b.N * 10 BETWEEN 1 AND 25
) numbers;

-- Step 2B: Assign SAME users to TEAMS (matching division constraint)
INSERT INTO `user_role_assignment` (`user_id`, `role_id`, `scope_type`, `scope_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    n + 74 as user_id,
    6 as role_id,
    'TEAM' as scope_type,
    CASE 
        -- Backend Division → Backend Teams
        WHEN n <= 4 THEN 1   -- Team 1 (Backend Alpha, division_id=4): users 71-74
        WHEN n <= 8 THEN 2   -- Team 2 (Backend Beta, division_id=4): users 75-78
        -- Frontend Division → Frontend Teams
        WHEN n <= 13 THEN 3  -- Team 3 (Frontend Gamma, division_id=5): users 79-83
        WHEN n <= 17 THEN 4  -- Team 4 (Frontend Delta, division_id=5): users 84-87
        -- Mobile Division → Mobile Team
        WHEN n <= 21 THEN 5  -- Team 5 (Mobile, division_id=6): users 88-91
        -- QA Division → QA Team
        ELSE 6               -- Team 6 (QA, division_id=7): users 92-95
    END as scope_id,
    1 as assigned_by,
    NOW(),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2) b
    WHERE a.N + b.N * 10 BETWEEN 1 AND 25
) numbers;

-- PHASE 3: User 100 - Only COMPANY scope
-- Người này chỉ có base EMPLOYEE@COMPANY role, chưa được phân bổ division/team
-- (Base assignment đã được tạo ở trên, không cần thêm gì)

-- ============================================
-- 17. USER_LEAVE_BALANCES
-- ============================================
TRUNCATE TABLE `user_leave_balances`;
INSERT INTO `user_leave_balances` (`user_id`, `paid_leave_balance`, `unpaid_leave_balance`, `annual_paid_leave_quota`, `carry_over_days`, `last_reset_date`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    id,
    36 - MOD(id * 3, 12) as paid_leave_balance,
    0,
    36,
    MOD(id, 5),
    '2024-01-01',
    NOW(),
    NOW(),
    NULL
FROM users WHERE id <= 100;

-- ============================================
-- 18. HOLIDAYS (Ngày lễ Việt Nam)
-- ============================================
TRUNCATE TABLE `holidays`;
INSERT INTO `holidays` (`name`, `type`, `status`, `start_date`, `end_date`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
('Tết Nguyên Đán 2024', 'NATIONAL', 'ACTIVE', '2024-02-10', '2024-02-14', 'Tết Âm lịch Giáp Thìn', NOW(), NOW(), NULL),
('Giỗ Tổ Hùng Vương 2024', 'NATIONAL', 'ACTIVE', '2024-04-18', '2024-04-18', 'Giỗ Tổ Hùng Vương 10/3 Âm lịch', NOW(), NOW(), NULL),
('Ngày Giải phóng miền Nam 30/4', 'NATIONAL', 'ACTIVE', '2024-04-30', '2024-05-01', 'Ngày thống nhất đất nước', NOW(), NOW(), NULL),
('Ngày Quốc tế Lao động 1/5', 'NATIONAL', 'ACTIVE', '2024-05-01', '2024-05-01', 'Ngày Quốc tế Lao động', NOW(), NOW(), NULL),
('Quốc Khánh 2/9', 'NATIONAL', 'ACTIVE', '2024-09-02', '2024-09-02', 'Quốc khánh nước Việt Nam Dân chủ Cộng hòa', NOW(), NOW(), NULL),
('Ngày thành lập Công ty', 'COMPANY', 'ACTIVE', '2024-06-15', '2024-06-15', 'Kỷ niệm thành lập công ty', NOW(), NOW(), NULL);

-- ============================================
-- 19. ROOMS (Phòng họp)
-- ============================================
TRUNCATE TABLE `rooms`;
INSERT INTO `rooms` (`name`, `is_active`, `created_at`, `updated_at`, `deleted_at`) VALUES
('Phòng họp A', 1, NOW(), NOW(), NULL),
('Phòng họp B', 1, NOW(), NOW(), NULL),
('Phòng họp C', 1, NOW(), NOW(), NULL),
('Hội trường lớn', 1, NOW(), NOW(), NULL),
('Phòng đào tạo', 1, NOW(), NOW(), NULL),
('Phòng phỏng vấn', 1, NOW(), NOW(), NULL);

-- ============================================
-- 20. SCHEDULE_WORKS (Lịch làm việc)
-- ============================================
TRUNCATE TABLE `schedule_works`;
INSERT INTO `schedule_works` (`start_date`, `end_date`, `hour_start_morning`, `hour_end_morning`, `hour_start_afternoon`, `hour_end_afternoon`, `type`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES
('2024-01-01', '2024-12-31', '2024-01-01 08:00:00', '2024-01-01 12:00:00', '2024-01-01 13:00:00', '2024-01-01 17:00:00', 'NORMAL', 'Lịch làm việc chuẩn 2024', NOW(), NOW(), NULL);

-- ============================================
-- 21. DAILY_REPORTS (Báo cáo công việc hàng ngày)
-- ============================================
TRUNCATE TABLE `daily_reports`;
INSERT INTO `daily_reports` (`user_id`, `project_id`, `title`, `work_date`, `actual_time`, `status`, `approved_by`, `reviewed_at`, `description`, `reject_reason`, `created_at`, `updated_at`)
SELECT 
    MOD(n, 95) + 6 as user_id,
    MOD(n, 5) + 1 as project_id,
    CONCAT('Báo cáo công việc ngày ', DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n DAY), '%d/%m/%Y')) as title,
    DATE_SUB(CURDATE(), INTERVAL n DAY) as work_date,
    (MOD(n, 8) + 1) * 0.5 as actual_time,
    CASE 
        WHEN MOD(n, 10) < 8 THEN 'APPROVED'
        WHEN MOD(n, 10) = 8 THEN 'PENDING'
        ELSE 'REJECTED'
    END as status,
    CASE WHEN MOD(n, 10) < 9 THEN 4 ELSE NULL END as approved_by,
    CASE WHEN MOD(n, 10) < 9 THEN DATE_SUB(NOW(), INTERVAL n * 2 HOUR) ELSE NULL END as reviewed_at,
    'Hoàn thành công việc được giao đúng deadline. Tham gia họp team và review code.' as description,
    CASE WHEN MOD(n, 10) = 9 THEN 'Báo cáo thiếu chi tiết về công việc đã làm' ELSE NULL END as reject_reason,
    DATE_SUB(NOW(), INTERVAL n * 3 HOUR) as created_at,
    DATE_SUB(NOW(), INTERVAL n * 2 HOUR) as updated_at
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
    WHERE a.N + b.N * 10 < 100
) numbers;

-- ============================================
-- 22. ATTENDANCE_SESSIONS (Phiên chấm công - ĐẦY ĐỦ CÁC TRƯỜNG)
-- ============================================
TRUNCATE TABLE `attendance_sessions`;
INSERT INTO `attendance_sessions` (
    `user_id`, 
    `timesheet_id`,
    `work_date`, 
    `session_type`,
    `checkin_time`, 
    `checkout_time`, 
    `duration`,
    `is_open`,
    `location_type`,
    `checkin_photo`,
    `checkout_photo`,
    `note`,
    `status`, 
    `created_at`, 
    `updated_at`, 
    `deleted_at`
)
SELECT 
    MOD(n, 90) + 7 as user_id,
    NULL as timesheet_id,
    DATE_SUB(CURDATE(), INTERVAL n DAY) as work_date,
    'WORK' as session_type,
    DATE_SUB(DATE_ADD(DATE_SUB(CURDATE(), INTERVAL n DAY), INTERVAL 8 HOUR), INTERVAL MOD(n, 30) MINUTE) as checkin_time,
    DATE_SUB(DATE_ADD(DATE_SUB(CURDATE(), INTERVAL n DAY), INTERVAL 17 HOUR), INTERVAL MOD(n, 20) MINUTE) as checkout_time,
    (540 - MOD(n, 50)) as duration,
    0 as is_open,
    CASE WHEN MOD(n, 5) = 0 THEN 'REMOTE' ELSE 'OFFICE' END as location_type,
    NULL as checkin_photo,
    NULL as checkout_photo,
    CASE 
        WHEN MOD(n, 15) = 0 THEN 'Đi muộn do tắc đường'
        WHEN MOD(n, 20) = 0 THEN 'Về sớm do có việc'
        ELSE NULL
    END as note,
    CASE 
        WHEN MOD(n, 10) < 8 THEN 'APPROVED'
        WHEN MOD(n, 10) = 8 THEN 'PENDING'
        ELSE 'REJECTED'
    END as status,
    NOW(),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) b
    WHERE a.N + b.N * 10 < 50
) numbers;

-- ============================================
-- 23. TIME_SHEETS (Bảng công - 3,000 RECORDS: 100 users × 30 ngày)
-- Từ 30 ngày trước 26/11/2025 đến 26/11/2025
-- ============================================
TRUNCATE TABLE `time_sheets`;
INSERT INTO `time_sheets` (
    `user_id`, 
    `work_date`, 
    `type`, 
    `status`, 
    `checkin`, 
    `checkout`, 
    `checkin_checkout`, 
    `work_time_morning`, 
    `work_time_afternoon`, 
    `total_work_time`, 
    `break_time`, 
    `late_time`, 
    `late_time_approved`,
    `early_time`, 
    `early_time_approved`,
    `remote`,
    `day_off_id`,
    `has_forgot_checkin_request`,
    `has_late_early_request`,
    `has_remote_work_request`,
    `forgot_checkin_approved`,
    `late_early_approved`,
    `remote_work_approved`,
    `is_complete`,
    `created_at`, 
    `updated_at`
)
SELECT 
    user_id,
    work_date,
    'NORMAL' as type,
    CASE 
        WHEN MOD((user_id + day_offset), 10) < 8 THEN 'APPROVED'
        WHEN MOD((user_id + day_offset), 10) = 8 THEN 'PENDING'
        ELSE 'REJECTED'
    END as status,
    DATE_ADD(DATE_ADD(work_date, INTERVAL 8 HOUR), INTERVAL MOD((user_id + day_offset), 30) MINUTE) as checkin,
    DATE_SUB(DATE_ADD(work_date, INTERVAL 17 HOUR), INTERVAL MOD((user_id + day_offset), 20) MINUTE) as checkout,
    CONCAT(
        DATE_FORMAT(DATE_ADD(DATE_ADD(work_date, INTERVAL 8 HOUR), INTERVAL MOD((user_id + day_offset), 30) MINUTE), '%H:%i'),
        '-',
        DATE_FORMAT(DATE_SUB(DATE_ADD(work_date, INTERVAL 17 HOUR), INTERVAL MOD((user_id + day_offset), 20) MINUTE), '%H:%i')
    ) as checkin_checkout,
    240 - MOD((user_id + day_offset), 30) as work_time_morning,
    240 - MOD((user_id + day_offset), 20) as work_time_afternoon,
    480 - MOD((user_id + day_offset), 50) as total_work_time,
    60 as break_time,
    CASE WHEN MOD((user_id + day_offset), 15) = 0 THEN MOD((user_id + day_offset), 30) ELSE 0 END as late_time,
    CASE WHEN MOD((user_id + day_offset), 15) = 0 THEN MOD((user_id + day_offset), 30) ELSE NULL END as late_time_approved,
    CASE WHEN MOD((user_id + day_offset), 20) = 0 THEN MOD((user_id + day_offset), 20) ELSE 0 END as early_time,
    CASE WHEN MOD((user_id + day_offset), 20) = 0 THEN MOD((user_id + day_offset), 20) ELSE NULL END as early_time_approved,
    CASE WHEN MOD((user_id + day_offset), 5) = 0 THEN 'REMOTE' ELSE 'OFFICE' END as remote,
    NULL as day_off_id,
    CASE WHEN MOD((user_id + day_offset), 25) = 0 THEN 1 ELSE 0 END as has_forgot_checkin_request,
    CASE WHEN MOD((user_id + day_offset), 15) = 0 OR MOD((user_id + day_offset), 20) = 0 THEN 1 ELSE 0 END as has_late_early_request,
    CASE WHEN MOD((user_id + day_offset), 5) = 0 THEN 1 ELSE 0 END as has_remote_work_request,
    CASE WHEN MOD((user_id + day_offset), 25) = 0 THEN 1 ELSE 0 END as forgot_checkin_approved,
    CASE WHEN MOD((user_id + day_offset), 15) = 0 OR MOD((user_id + day_offset), 20) = 0 THEN 1 ELSE 0 END as late_early_approved,
    CASE WHEN MOD((user_id + day_offset), 5) = 0 THEN 1 ELSE 0 END as remote_work_approved,
    CASE WHEN MOD((user_id + day_offset), 10) < 8 THEN 1 ELSE 0 END as is_complete,
    NOW(),
    NOW()
FROM (
    SELECT 
        u.user_id,
        DATE_SUB('2025-11-26', INTERVAL d.day_offset DAY) as work_date,
        d.day_offset
    FROM (
        -- 100 users (1-100)
        SELECT 1 as user_id UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 
        UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
        UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
        UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
        UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25
        UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
        UNION ALL SELECT 31 UNION ALL SELECT 32 UNION ALL SELECT 33 UNION ALL SELECT 34 UNION ALL SELECT 35
        UNION ALL SELECT 36 UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39 UNION ALL SELECT 40
        UNION ALL SELECT 41 UNION ALL SELECT 42 UNION ALL SELECT 43 UNION ALL SELECT 44 UNION ALL SELECT 45
        UNION ALL SELECT 46 UNION ALL SELECT 47 UNION ALL SELECT 48 UNION ALL SELECT 49 UNION ALL SELECT 50
        UNION ALL SELECT 51 UNION ALL SELECT 52 UNION ALL SELECT 53 UNION ALL SELECT 54 UNION ALL SELECT 55
        UNION ALL SELECT 56 UNION ALL SELECT 57 UNION ALL SELECT 58 UNION ALL SELECT 59 UNION ALL SELECT 60
        UNION ALL SELECT 61 UNION ALL SELECT 62 UNION ALL SELECT 63 UNION ALL SELECT 64 UNION ALL SELECT 65
        UNION ALL SELECT 66 UNION ALL SELECT 67 UNION ALL SELECT 68 UNION ALL SELECT 69 UNION ALL SELECT 70
        UNION ALL SELECT 71 UNION ALL SELECT 72 UNION ALL SELECT 73 UNION ALL SELECT 74 UNION ALL SELECT 75
        UNION ALL SELECT 76 UNION ALL SELECT 77 UNION ALL SELECT 78 UNION ALL SELECT 79 UNION ALL SELECT 80
        UNION ALL SELECT 81 UNION ALL SELECT 82 UNION ALL SELECT 83 UNION ALL SELECT 84 UNION ALL SELECT 85
        UNION ALL SELECT 86 UNION ALL SELECT 87 UNION ALL SELECT 88 UNION ALL SELECT 89 UNION ALL SELECT 90
        UNION ALL SELECT 91 UNION ALL SELECT 92 UNION ALL SELECT 93 UNION ALL SELECT 94 UNION ALL SELECT 95
        UNION ALL SELECT 96 UNION ALL SELECT 97 UNION ALL SELECT 98 UNION ALL SELECT 99 UNION ALL SELECT 100
    ) u
    CROSS JOIN (
        -- 30 ngày (0-29 days ago)
        SELECT 0 as day_offset UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 
        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
        UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
        UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
        UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
        UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
    ) d
) user_date_matrix;

-- ============================================
-- 24. ASSETS (Tài sản công ty - THEO ĐÚNG SCHEMA)
-- ============================================
TRUNCATE TABLE `assets`;
INSERT INTO `assets` (
    `name`, 
    `description`,
    `asset_code`, 
    `category`, 
    `brand`,
    `model`,
    `serial_number`, 
    `purchase_date`, 
    `purchase_price`, 
    `warranty_end_date`,
    `location`,
    `status`, 
    `assigned_to`, 
    `assigned_date`, 
    `notes`,
    `created_by`, 
    `created_at`, 
    `updated_at`, 
    `deleted_at`
) VALUES
-- Laptops
('Laptop Dell Latitude 5420 #001', 'Laptop cho Backend Developer', 'ASSET-LAP-001', 'LAPTOP', 'Dell', 'Latitude 5420', 'DL5420-001', '2023-01-15', 25000000, '2026-01-15', 'Tầng 5 - Khu Backend', 'ASSIGNED', 7, '2023-01-20', 'CPU i7, 16GB RAM, 512GB SSD', 1, NOW(), NOW(), NULL),
('Laptop Dell Latitude 5420 #002', 'Laptop cho Backend Developer', 'ASSET-LAP-002', 'LAPTOP', 'Dell', 'Latitude 5420', 'DL5420-002', '2023-01-15', 25000000, '2026-01-15', 'Tầng 5 - Khu Backend', 'ASSIGNED', 8, '2023-01-20', 'CPU i7, 16GB RAM, 512GB SSD', 1, NOW(), NOW(), NULL),
('MacBook Pro 14 M2 #001', 'MacBook cho iOS Developer', 'ASSET-LAP-003', 'LAPTOP', 'Apple', 'MacBook Pro 14 M2', 'MBP14M2-001', '2023-02-10', 45000000, '2024-02-10', 'Tầng 6 - Khu Mobile', 'ASSIGNED', 9, '2023-02-15', 'M2 Pro, 16GB RAM, 512GB SSD', 1, NOW(), NOW(), NULL),
('MacBook Pro 14 M2 #002', 'MacBook cho iOS Developer', 'ASSET-LAP-004', 'LAPTOP', 'Apple', 'MacBook Pro 14 M2', 'MBP14M2-002', '2023-02-10', 45000000, '2024-02-10', 'Tầng 6 - Khu Mobile', 'ASSIGNED', 10, '2023-02-15', 'M2 Pro, 16GB RAM, 512GB SSD', 1, NOW(), NOW(), NULL),
('Laptop HP EliteBook #001', 'Laptop dự phòng', 'ASSET-LAP-005', 'LAPTOP', 'HP', 'EliteBook 840 G8', 'HPEB-001', '2023-04-01', 22000000, '2026-04-01', 'Kho tài sản', 'AVAILABLE', NULL, NULL, 'CPU i5, 8GB RAM, 256GB SSD', 1, NOW(), NOW(), NULL),
('Laptop HP EliteBook #002', 'Laptop dự phòng', 'ASSET-LAP-006', 'LAPTOP', 'HP', 'EliteBook 840 G8', 'HPEB-002', '2023-04-01', 22000000, '2026-04-01', 'Kho tài sản', 'AVAILABLE', NULL, NULL, 'CPU i5, 8GB RAM, 256GB SSD', 1, NOW(), NOW(), NULL),

-- Monitors
('Dell Monitor 27" #001', 'Màn hình phụ 27 inch', 'ASSET-MON-001', 'MONITOR', 'Dell', 'U2722DE', 'DLMON27-001', '2023-01-20', 5000000, '2026-01-20', 'Tầng 5 - Khu Backend', 'ASSIGNED', 7, '2023-01-25', 'QHD 2560x1440, IPS, USB-C', 1, NOW(), NOW(), NULL),
('Dell Monitor 27" #002', 'Màn hình phụ 27 inch', 'ASSET-MON-002', 'MONITOR', 'Dell', 'U2722DE', 'DLMON27-002', '2023-01-20', 5000000, '2026-01-20', 'Tầng 5 - Khu Backend', 'ASSIGNED', 8, '2023-01-25', 'QHD 2560x1440, IPS, USB-C', 1, NOW(), NOW(), NULL),

-- Phones
('iPhone 14 Pro #001', 'iPhone test cho QA', 'ASSET-PHO-001', 'PHONE', 'Apple', 'iPhone 14 Pro', 'IP14PRO-001', '2023-03-01', 30000000, '2024-03-01', 'Tầng 5 - Khu QA', 'ASSIGNED', 2, '2023-03-05', '256GB, Deep Purple', 1, NOW(), NOW(), NULL),
('iPhone 14 Pro #002', 'iPhone test cho QA', 'ASSET-PHO-002', 'PHONE', 'Apple', 'iPhone 14 Pro', 'IP14PRO-002', '2023-03-01', 30000000, '2024-03-01', 'Tầng 5 - Khu QA', 'ASSIGNED', 3, '2023-03-05', '256GB, Space Black', 1, NOW(), NOW(), NULL),
('Samsung Galaxy S23 #001', 'Android test phone', 'ASSET-PHO-003', 'PHONE', 'Samsung', 'Galaxy S23', 'SGS23-001', '2023-03-10', 22000000, '2024-03-10', 'Tầng 5 - Khu QA', 'ASSIGNED', 4, '2023-03-15', '256GB, Phantom Black', 1, NOW(), NOW(), NULL),

-- Peripherals
('Logitech MX Keys #001', 'Bàn phím cơ', 'ASSET-KEY-001', 'KEYBOARD', 'Logitech', 'MX Keys', 'MXKEY-001', '2023-02-01', 2500000, '2025-02-01', 'Tầng 5 - Khu Backend', 'ASSIGNED', 7, '2023-02-05', 'Wireless, Backlit', 1, NOW(), NOW(), NULL),
('Logitech MX Master 3 #001', 'Chuột không dây', 'ASSET-MOU-001', 'MOUSE', 'Logitech', 'MX Master 3', 'MXM3-001', '2023-02-01', 2000000, '2025-02-01', 'Tầng 5 - Khu Backend', 'ASSIGNED', 7, '2023-02-05', 'Wireless, 4000 DPI', 1, NOW(), NOW(), NULL),

-- Furniture
('Herman Miller Chair #001', 'Ghế ergonomic cho admin', 'ASSET-FUR-001', 'FURNITURE', 'Herman Miller', 'Aeron Chair', 'HMC-001', '2023-01-10', 15000000, NULL, 'Tầng 2 - Phòng Admin', 'ASSIGNED', 1, '2023-01-15', 'Size B, Adjustable Arms', 1, NOW(), NOW(), NULL),
('Standing Desk #001', 'Bàn đứng cho HR Manager', 'ASSET-FUR-002', 'FURNITURE', 'Flexispot', 'E7 Pro Plus', 'STDESK-001', '2023-01-10', 12000000, '2025-01-10', 'Tầng 2 - Phòng HR', 'ASSIGNED', 2, '2023-01-15', 'Electric Height Adjustable', 1, NOW(), NOW(), NULL),

-- Equipment
('iPad Pro 12.9 #001', 'Tablet cho design', 'ASSET-TAB-001', 'TABLET', 'Apple', 'iPad Pro 12.9', 'IPADP129-001', '2023-05-01', 28000000, '2024-05-01', 'Xưởng bảo trì', 'MAINTENANCE', NULL, NULL, 'M2, 256GB, Space Gray - Đang sửa màn hình', 1, NOW(), NOW(), NULL),
('Sony Camera A7 III', 'Camera cho marketing', 'ASSET-EQU-001', 'EQUIPMENT', 'Sony', 'Alpha A7 III', 'SONYA7III-001', '2023-02-20', 45000000, '2024-02-20', 'Tầng 3 - Phòng Marketing', 'ASSIGNED', NULL, NULL, 'Full-frame mirrorless, 24.2MP', 1, NOW(), NOW(), NULL),
('Projector Epson EB-X05', 'Máy chiếu phòng họp', 'ASSET-EQU-002', 'EQUIPMENT', 'Epson', 'EB-X05', 'EPEBX05-001', '2023-01-05', 12000000, '2026-01-05', 'Phòng họp A', 'ASSIGNED', NULL, NULL, '3300 lumens, XGA resolution', 1, NOW(), NOW(), NULL);

-- ============================================
-- 25. NOTIFICATIONS (Thông báo hệ thống - THEO ĐÚNG SCHEMA)
-- Schema: title, content, news_id, created_by, timestamps
-- ============================================
TRUNCATE TABLE `notifications`;
INSERT INTO `notifications` (`title`, `content`, `news_id`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
('Nhắc nhở chấm công', 'Đừng quên check-in khi đến công ty! Hệ thống chấm công sẽ tự động ghi nhận thời gian của bạn.', NULL, 1, DATE_SUB(NOW(), INTERVAL 8 DAY), NOW(), NULL),
('Cập nhật hệ thống HRM', 'Hệ thống sẽ bảo trì từ 22:00-23:00 hôm nay để nâng cấp tính năng mới. Vui lòng lưu công việc trước khi bảo trì.', NULL, 1, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW(), NULL),
('Họp team Backend', 'Meeting lúc 14:00 hôm nay tại phòng họp A. Chủ đề: Review code và planning cho sprint mới.', NULL, 10, DATE_SUB(NOW(), INTERVAL 4 DAY), NOW(), NULL),
('Duyệt timesheet tháng 11', 'Vui lòng kiểm tra và duyệt timesheet cho nhân viên trước ngày 30/11. Có 50 timesheet đang chờ duyệt.', NULL, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(), NULL),
('Chúc mừng sinh nhật!', 'Chúc mừng sinh nhật Nguyễn Văn Minh! Chúc bạn một ngày sinh nhật vui vẻ và hạnh phúc.', NULL, 2, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), NULL);

-- ============================================
-- 26. USER_NOTIFICATIONS (Thông báo đến user)
-- ============================================
TRUNCATE TABLE `user_notifications`;
INSERT INTO `user_notifications` (`user_id`, `notification_id`, `is_read`, `read_at`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    n + 1 as user_id,
    1 as notification_id,
    CASE WHEN MOD(n, 3) = 0 THEN 1 ELSE 0 END as is_read,
    CASE WHEN MOD(n, 3) = 0 THEN DATE_SUB(NOW(), INTERVAL 6 DAY) ELSE NULL END as read_at,
    DATE_SUB(NOW(), INTERVAL 7 DAY),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
    WHERE a.N + b.N * 10 < 100
) numbers
UNION ALL
SELECT 
    n + 1,
    2,
    CASE WHEN MOD(n, 2) = 0 THEN 1 ELSE 0 END,
    CASE WHEN MOD(n, 2) = 0 THEN DATE_SUB(NOW(), INTERVAL 4 DAY) ELSE NULL END,
    DATE_SUB(NOW(), INTERVAL 5 DAY),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
    WHERE a.N + b.N * 10 < 100
) numbers;

-- ============================================
-- 27. DAY_OFFS (Đơn nghỉ phép)
-- ============================================
TRUNCATE TABLE `day_offs`;
INSERT INTO `day_offs` (`user_id`, `work_date`, `duration`, `status`, `type`, `title`, `reason`, `approved_by`, `approved_at`, `is_past`, `balance_deducted`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    MOD(n, 90) + 7 as user_id,
    DATE_ADD(CURDATE(), INTERVAL n DAY) as work_date,
    CASE 
        WHEN MOD(n, 5) = 0 THEN 'MORNING'
        WHEN MOD(n, 5) = 1 THEN 'AFTERNOON'
        ELSE 'FULL_DAY'
    END as duration,
    CASE 
        WHEN n < 30 THEN 'APPROVED'
        WHEN n < 45 THEN 'PENDING'
        ELSE 'REJECTED'
    END as status,
    CASE 
        WHEN MOD(n, 6) = 0 THEN 'SICK'
        WHEN MOD(n, 6) = 1 THEN 'PERSONAL'
        WHEN MOD(n, 6) = 2 THEN 'UNPAID'
        ELSE 'PAID'
    END as type,
    CASE 
        WHEN MOD(n, 6) = 0 THEN 'Nghỉ ốm'
        WHEN MOD(n, 6) = 1 THEN 'Việc gia đình'
        WHEN MOD(n, 6) = 2 THEN 'Nghỉ không lương'
        ELSE 'Nghỉ phép năm'
    END as title,
    CASE 
        WHEN MOD(n, 6) = 0 THEN 'Bị cảm, sốt cao cần nghỉ ngơi'
        WHEN MOD(n, 6) = 1 THEN 'Có việc gia đình cần giải quyết'
        WHEN MOD(n, 6) = 2 THEN 'Cần nghỉ để đi du lịch'
        ELSE 'Nghỉ phép thường niên'
    END as reason,
    CASE WHEN n < 45 THEN MOD(n, 6) + 7 ELSE NULL END as approved_by,
    CASE WHEN n < 45 THEN DATE_SUB(NOW(), INTERVAL n HOUR) ELSE NULL END as approved_at,
    0 as is_past,
    CASE WHEN n < 30 THEN 1 ELSE 0 END as balance_deducted,
    DATE_SUB(NOW(), INTERVAL (n + 10) HOUR),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) b
    WHERE a.N + b.N * 10 < 50
) numbers;

-- ============================================
-- 28. OVER_TIMES_HISTORY (Lịch sử làm thêm giờ)
-- ============================================
TRUNCATE TABLE `over_times_history`;
INSERT INTO `over_times_history` (`user_id`, `work_date`, `title`, `start_time`, `end_time`, `total_hours`, `hourly_rate`, `total_amount`, `project_id`, `reason`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    MOD(n, 90) + 7 as user_id,
    DATE_SUB(CURDATE(), INTERVAL n DAY) as work_date,
    CONCAT('Làm thêm giờ dự án ', CASE MOD(n, 5) + 1 
        WHEN 1 THEN 'E-Commerce'
        WHEN 2 THEN 'Banking Core'
        WHEN 3 THEN 'HRM'
        WHEN 4 THEN 'Mobile Banking'
        ELSE 'AI Chatbot'
    END) as title,
    '18:00:00' as start_time,
    CASE 
        WHEN MOD(n, 3) = 0 THEN '21:00:00'
        WHEN MOD(n, 3) = 1 THEN '22:00:00'
        ELSE '20:00:00'
    END as end_time,
    CASE 
        WHEN MOD(n, 3) = 0 THEN 3.0
        WHEN MOD(n, 3) = 1 THEN 4.0
        ELSE 2.0
    END as total_hours,
    150000 + (MOD(n, 5) * 50000) as hourly_rate,
    CASE 
        WHEN MOD(n, 3) = 0 THEN (150000 + (MOD(n, 5) * 50000)) * 3
        WHEN MOD(n, 3) = 1 THEN (150000 + (MOD(n, 5) * 50000)) * 4
        ELSE (150000 + (MOD(n, 5) * 50000)) * 2
    END as total_amount,
    MOD(n, 5) + 1 as project_id,
    'Cần hoàn thành tính năng theo deadline khách hàng yêu cầu' as reason,
    CASE 
        WHEN n < 20 THEN 'APPROVED'
        WHEN n < 28 THEN 'PENDING'
        ELSE 'REJECTED'
    END as status,
    CASE WHEN n < 28 THEN MOD(n, 5) + 7 ELSE NULL END as approved_by,
    CASE WHEN n < 28 THEN DATE_SUB(NOW(), INTERVAL n * 2 HOUR) ELSE NULL END as approved_at,
    DATE_SUB(NOW(), INTERVAL (n + 5) HOUR),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2) b
    WHERE a.N + b.N * 10 < 30
) numbers;

-- ============================================
-- 29. REMOTE_WORK_REQUESTS (Đơn xin làm remote)
-- ============================================
TRUNCATE TABLE `remote_work_requests`;
INSERT INTO `remote_work_requests` (`user_id`, `work_date`, `remote_type`, `duration`, `title`, `reason`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    MOD(n, 90) + 7 as user_id,
    DATE_ADD(CURDATE(), INTERVAL n DAY) as work_date,
    'REMOTE' as remote_type,
    CASE 
        WHEN MOD(n, 4) = 0 THEN 'MORNING'
        WHEN MOD(n, 4) = 1 THEN 'AFTERNOON'
        ELSE 'FULL_DAY'
    END as duration,
    'Xin phép làm việc từ xa' as title,
    CASE 
        WHEN MOD(n, 4) = 0 THEN 'Cần đưa con đi học sáng'
        WHEN MOD(n, 4) = 1 THEN 'Có việc gia đình buổi chiều'
        WHEN MOD(n, 4) = 2 THEN 'Thời tiết xấu, đường xa'
        ELSE 'Tăng hiệu suất làm việc tại nhà'
    END as reason,
    CASE 
        WHEN n < 25 THEN 'APPROVED'
        WHEN n < 35 THEN 'PENDING'
        ELSE 'REJECTED'
    END as status,
    CASE WHEN n < 35 THEN MOD(n, 6) + 7 ELSE NULL END as approved_by,
    CASE WHEN n < 35 THEN DATE_SUB(NOW(), INTERVAL n HOUR) ELSE NULL END as approved_at,
    DATE_SUB(NOW(), INTERVAL (n + 8) HOUR),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
    WHERE a.N + b.N * 10 < 40
) numbers;

-- ============================================
-- 30. LATE_EARLY_REQUESTS (Đơn xin đi muộn/về sớm)
-- ============================================
TRUNCATE TABLE `late_early_requests`;
INSERT INTO `late_early_requests` (`user_id`, `work_date`, `request_type`, `title`, `late_minutes`, `early_minutes`, `reason`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    MOD(n, 90) + 7 as user_id,
    DATE_ADD(CURDATE(), INTERVAL n DAY) as work_date,
    CASE 
        WHEN MOD(n, 3) = 0 THEN 'LATE'
        WHEN MOD(n, 3) = 1 THEN 'EARLY'
        ELSE 'BOTH'
    END as request_type,
    CASE 
        WHEN MOD(n, 3) = 0 THEN 'Xin phép đi muộn'
        WHEN MOD(n, 3) = 1 THEN 'Xin phép về sớm'
        ELSE 'Xin phép đi muộn và về sớm'
    END as title,
    CASE WHEN MOD(n, 3) != 1 THEN 15 + (MOD(n, 6) * 15) ELSE NULL END as late_minutes,
    CASE WHEN MOD(n, 3) != 0 THEN 30 + (MOD(n, 4) * 15) ELSE NULL END as early_minutes,
    CASE 
        WHEN MOD(n, 3) = 0 THEN 'Xe hỏng trên đường đi làm'
        WHEN MOD(n, 3) = 1 THEN 'Cần đón con tan trường'
        ELSE 'Có hẹn khám bệnh'
    END as reason,
    CASE 
        WHEN n < 20 THEN 'APPROVED'
        WHEN n < 30 THEN 'PENDING'
        ELSE 'REJECTED'
    END as status,
    CASE WHEN n < 30 THEN MOD(n, 6) + 7 ELSE NULL END as approved_by,
    CASE WHEN n < 30 THEN DATE_SUB(NOW(), INTERVAL n * 2 HOUR) ELSE NULL END as approved_at,
    DATE_SUB(NOW(), INTERVAL (n + 6) HOUR),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
    WHERE a.N + b.N * 10 < 35
) numbers;

-- ============================================
-- 31. FORGOT_CHECKIN_REQUESTS (Đơn xin bổ sung chấm công)
-- ============================================
TRUNCATE TABLE `forgot_checkin_requests`;
INSERT INTO `forgot_checkin_requests` (`user_id`, `work_date`, `checkin_time`, `checkout_time`, `title`, `reason`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    MOD(n, 90) + 7 as user_id,
    DATE_SUB(CURDATE(), INTERVAL n DAY) as work_date,
    DATE_SUB(DATE_ADD(DATE_SUB(CURDATE(), INTERVAL n DAY), INTERVAL 8 HOUR), INTERVAL MOD(n, 15) MINUTE) as checkin_time,
    DATE_SUB(DATE_ADD(DATE_SUB(CURDATE(), INTERVAL n DAY), INTERVAL 17 HOUR), INTERVAL MOD(n, 10) MINUTE) as checkout_time,
    'Xin bổ sung chấm công' as title,
    CASE 
        WHEN MOD(n, 4) = 0 THEN 'Quên mang thẻ từ'
        WHEN MOD(n, 4) = 1 THEN 'Máy chấm công hỏng'
        WHEN MOD(n, 4) = 2 THEN 'Vào công ty bằng cổng phụ'
        ELSE 'Điện thoại hết pin không check-in được'
    END as reason,
    CASE 
        WHEN n < 15 THEN 'APPROVED'
        WHEN n < 22 THEN 'PENDING'
        ELSE 'REJECTED'
    END as status,
    CASE WHEN n < 22 THEN MOD(n, 6) + 7 ELSE NULL END as approved_by,
    CASE WHEN n < 22 THEN DATE_SUB(NOW(), INTERVAL n * 3 HOUR) ELSE NULL END as approved_at,
    DATE_SUB(NOW(), INTERVAL (n + 4) HOUR),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2) b
    WHERE a.N + b.N * 10 < 25
) numbers;

-- ============================================
-- 32. ASSET_REQUESTS (Yêu cầu cấp phát tài sản)
-- ============================================
TRUNCATE TABLE `asset_requests`;
INSERT INTO `asset_requests` (`user_id`, `asset_id`, `request_type`, `category`, `description`, `justification`, `expected_date`, `status`, `approved_by`, `approved_at`, `fulfilled_at`, `created_at`, `updated_at`, `deleted_at`)
VALUES
-- Yêu cầu cấp phát mới
(25, NULL, 'REQUEST', 'LAPTOP', 'Cần laptop Dell Latitude 5420 cho công việc', 'Nhân viên mới vào làm, cần trang thiết bị', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'APPROVED', 2, DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW(), NULL),
(26, NULL, 'REQUEST', 'MONITOR', 'Cần màn hình phụ 27 inch', 'Làm việc với nhiều cửa sổ, cần màn hình lớn', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'PENDING', NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(), NULL),
(27, NULL, 'REQUEST', 'KEYBOARD', 'Cần bàn phím cơ Logitech', 'Bàn phím cũ bị hỏng', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'APPROVED', 2, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 4 DAY), NOW(), NULL),
(28, NULL, 'REQUEST', 'MOUSE', 'Cần chuột không dây', 'Chuột dây bị đứt', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'FULFILLED', 2, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), NOW(), NULL),
(29, NULL, 'REQUEST', 'HEADPHONE', 'Cần tai nghe chống ồn', 'Làm việc cần tập trung, văn phòng ồn', DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'REJECTED', 2, DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW(), NULL),
-- Yêu cầu bảo trì
(7, 1, 'MAINTENANCE', 'LAPTOP', 'Laptop chạy chậm, cần nâng cấp RAM', 'Máy lag khi chạy nhiều ứng dụng', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'APPROVED', 2, DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(), NULL),
(8, 2, 'MAINTENANCE', 'LAPTOP', 'Pin laptop chai, cần thay pin', 'Pin chỉ dùng được 1 giờ', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'PENDING', NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), NULL),
-- Yêu cầu trả lại
(30, 16, 'RETURN', 'LAPTOP', 'Trả lại laptop dự phòng', 'Đã được cấp laptop mới', CURDATE(), 'RETURNED', 2, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), NOW(), NULL);

-- ============================================
-- 33. ROOM_BOOKINGS (Đặt phòng họp)
-- ============================================
TRUNCATE TABLE `room_bookings`;
INSERT INTO `room_bookings` (`room_id`, `title`, `description`, `start_time`, `end_time`, `organizer_id`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    MOD(n, 6) + 1 as room_id,
    CASE 
        WHEN MOD(n, 5) = 0 THEN 'Daily Standup Meeting'
        WHEN MOD(n, 5) = 1 THEN 'Sprint Planning'
        WHEN MOD(n, 5) = 2 THEN 'Sprint Review'
        WHEN MOD(n, 5) = 3 THEN 'Technical Discussion'
        ELSE 'Client Meeting'
    END as title,
    CASE 
        WHEN MOD(n, 5) = 0 THEN 'Họp daily với team'
        WHEN MOD(n, 5) = 1 THEN 'Lên kế hoạch sprint mới'
        WHEN MOD(n, 5) = 2 THEN 'Review công việc sprint vừa qua'
        WHEN MOD(n, 5) = 3 THEN 'Thảo luận kỹ thuật về architecture'
        ELSE 'Họp với khách hàng về yêu cầu dự án'
    END as description,
    DATE_ADD(
        DATE_ADD(CURDATE(), INTERVAL (n DIV 2) DAY),
        INTERVAL (9 + (MOD(n, 8))) HOUR
    ) as start_time,
    DATE_ADD(
        DATE_ADD(CURDATE(), INTERVAL (n DIV 2) DAY),
        INTERVAL (10 + (MOD(n, 8))) HOUR
    ) as end_time,
    MOD(n, 13) + 7 as organizer_id,
    DATE_SUB(NOW(), INTERVAL (50 - n) HOUR),
    NOW(),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
    WHERE a.N + b.N * 10 < 30
) numbers;

-- ============================================
-- 34. LEAVE_TRANSACTIONS (Giao dịch phép)
-- ============================================
TRUNCATE TABLE `leave_transactions`;
INSERT INTO `leave_transactions` (`user_id`, `transaction_type`, `leave_type`, `amount`, `balance_after`, `description`, `created_at`, `updated_at`, `deleted_at`)
SELECT 
    id as user_id,
    'EARNED' as transaction_type,
    'PAID' as leave_type,
    3.0 as amount,
    36.0 as balance_after,
    'Cộng phép tháng 1/2024' as description,
    '2024-01-01 00:00:00',
    '2024-01-01 00:00:00',
    NULL
FROM users 
WHERE id BETWEEN 7 AND 100
UNION ALL
-- Một số user đã sử dụng phép
SELECT 
    MOD(n, 90) + 7 as user_id,
    'USED' as transaction_type,
    'PAID' as leave_type,
    -1.0 as amount,
    35.0 - MOD(n, 5) as balance_after,
    CONCAT('Sử dụng phép ngày ', DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n DAY), '%d/%m/%Y')) as description,
    DATE_SUB(NOW(), INTERVAL n * 24 HOUR),
    DATE_SUB(NOW(), INTERVAL n * 24 HOUR),
    NULL
FROM (
    SELECT a.N + b.N * 10 as n
    FROM 
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
    WHERE a.N + b.N * 10 < 30
) numbers;

-- ============================================
-- 35. ROTATION_MEMBERS (Luân chuyển nhân sự)
-- ============================================
TRUNCATE TABLE `rotation_members`;
INSERT INTO `rotation_members` (`from_id`, `to_id`, `user_id`, `type`, `date_rotation`, `created_at`, `updated_at`, `deleted_at`)
VALUES
-- Luân chuyển giữa các division
(4, 5, 35, 'PERMANENT', '2024-03-01', DATE_SUB(NOW(), INTERVAL 60 DAY), NOW(), NULL),
(5, 6, 42, 'TEMPORARY', '2024-04-15', DATE_SUB(NOW(), INTERVAL 45 DAY), NOW(), NULL),
(4, 7, 48, 'PERMANENT', '2024-05-01', DATE_SUB(NOW(), INTERVAL 30 DAY), NOW(), NULL),
(6, 4, 56, 'TEMPORARY', '2024-06-01', DATE_SUB(NOW(), INTERVAL 15 DAY), NOW(), NULL),
(7, 5, 63, 'PERMANENT', '2024-06-15', DATE_SUB(NOW(), INTERVAL 10 DAY), NOW(), NULL);

SET FOREIGN_KEY_CHECKS=1;

-- ============================================
-- THÔNG TIN ĐĂNG NHẬP
-- ============================================
-- User 1:    admin@example.com       / Mast@123 (Admin - COMPANY scope)
-- User 2:    division@example.com   / Mast@123 (HR Manager - COMPANY scope)
-- User 3-9:  teamlead@..., pm@...   / Mast@123 (Division Heads - 7 divisions)
-- User 10-15:                       / Mast@123 (Team Leaders - 6 teams)
-- User 16-20:                       / Mast@123 (Project Managers - 5 projects)
-- User 21-70:                       / Mast@123 (Employees - Division only, 50 people)
-- User 71-95:                       / Mast@123 (Employees - Division + Team, 25 people)
--   • 71-78: Backend Division + Teams
--   • 79-87: Frontend Division + Teams
--   • 88-91: Mobile Division + Team
--   • 92-95: QA Division + Team
-- User 96-100:                      / Mast@123 (Employees - COMPANY, 5 unassigned)
-- ============================================

-- ============================================
-- ROLE ASSIGNMENTS SUMMARY
-- ============================================
-- Theo đúng scope logic:
-- • Admin (1 user): COMPANY scope - toàn quyền hệ thống
-- • HR Manager (1 user): COMPANY scope - quản lý nhân sự toàn công ty
-- • Division Heads (7 users): DIVISION scope - mỗi người quản lý 1 division cụ thể
--   - User 3: Technology Division (id: 1)
--   - User 4: Business Division (id: 2)
--   - User 5: HR Division (id: 3)
--   - User 6: Backend Division (id: 4)
--   - User 7: Frontend Division (id: 5)
--   - User 8: Mobile Division (id: 6)
--   - User 9: QA Division (id: 7)
-- • Team Leaders (6 users): TEAM scope - mỗi người quản lý 1 team cụ thể
--   - User 10: Backend Team Alpha (id: 1)
--   - User 11: Backend Team Beta (id: 2)
--   - User 12: Frontend Team Gamma (id: 3)
--   - User 13: Frontend Team Delta (id: 4)
--   - User 14: Mobile Team 1 (id: 5)
--   - User 15: QA Team 1 (id: 6)
-- • Project Managers (5 users): PROJECT scope - mỗi người quản lý 1 project cụ thể
--   - User 16: E-Commerce project (id: 1)
--   - User 17: Banking Core project (id: 2)
--   - User 18: HRM project (id: 3)
--   - User 19: Mobile Banking project (id: 4)
--   - User 20: AI Chatbot project (id: 5)
-- • Employees (80 users total):
--   - 50 employees: DIVISION only (users 21-70, ~7 người/division)
--   - 25 employees: DIVISION + TEAM (users 71-95)
--     • Users 71-78: Backend Division + Backend Teams (8 users)
--     • Users 79-87: Frontend Division + Frontend Teams (9 users)
--     • Users 88-91: Mobile Division + Mobile Team (4 users)
--     • Users 92-95: QA Division + QA Team (4 users)
--   - 5 employees: COMPANY (users 96-100, chưa phân bổ)
-- ============================================

-- ============================================
-- TỔNG KẾT DỮ LIỆU
-- ============================================
-- ✅ Users: 100 người dùng với tên Việt Nam
-- ✅ User Information: 100 hồ sơ (liên kết qua user_id)
-- ✅ Education: 200 bằng cấp (liên kết qua user_info_id)
-- ✅ Experience: 300 kinh nghiệm (liên kết qua user_info_id)
-- ✅ User Skills: 400 kỹ năng (liên kết qua user_info_id)
-- ✅ User Role Assignments: 225 total assignments (100 users)
--    BASE: 100 users × EMPLOYEE@COMPANY = 100 assignments
--    
--    ADDITIONAL ROLES:
--    - 1 Admin: +1 admin@COMPANY
--    - 1 HR Manager: +1 hr_manager@COMPANY
--    - 7 Division Heads: +7 division_head@DIVISION
--    - 6 Team Leaders: +6 team_leader@TEAM
--    - 5 Project Managers: +5 project_manager@PROJECT
--    - 50 Employees: +50 employee@DIVISION
--    - 25 Employees: +50 (employee@DIVISION + employee@TEAM)
--    
--    BREAKDOWN:
--    • ALL 100 users: EMPLOYEE@COMPANY (base role)
--    • Users 1-20: +Management roles (admin, hr_manager, etc.)
--    • Users 21-70: +DIVISION assignment (50)
--    • Users 71-95: +DIVISION + TEAM assignments (50)
--    • Users 96-100: Base EMPLOYEE@COMPANY only (no additional scope)
-- ✅ Leave Balances: 100
-- ✅ Divisions: 7 phòng ban
-- ✅ Teams: 6 nhóm
-- ✅ Projects: 5 dự án
-- ✅ Positions: 12 vị trí
-- ✅ Skills: 40 kỹ năng
-- ✅ Roles: 6 vai trò (admin, hr_manager, project_manager, division_head, team_leader, employee)
-- ✅ Permissions: 108 quyền hạn (complete RBAC)
-- ✅ Permission-Role Assignments: 300+ (theo hierarchy)
-- ✅ Daily Reports: 100 báo cáo
-- ✅ Holidays: 6 ngày lễ
-- ✅ Rooms: 6 phòng họp
-- ✅ Schedule Works: 1 lịch làm việc
-- ✅ Attendance Sessions: 50 phiên chấm công
-- ✅ Time Sheets: 50 bảng công
-- ✅ Assets: 20 tài sản
-- ✅ News: 6 tin tức
-- ✅ Notifications: 5 thông báo
-- ✅ User Notifications: 200 thông báo đến users
-- ✅ Day Offs: 50 đơn nghỉ phép
-- ✅ Over Times History: 30 lịch sử làm thêm giờ
-- ✅ Remote Work Requests: 40 đơn xin làm remote
-- ✅ Late Early Requests: 35 đơn xin đi muộn/về sớm
-- ✅ Forgot Checkin Requests: 25 đơn xin bổ sung chấm công
-- ✅ Asset Requests: 8 yêu cầu cấp phát tài sản
-- ✅ Room Bookings: 30 đặt phòng họp
-- ✅ Leave Transactions: 124 giao dịch phép (94 EARNED + 30 USED)
-- ✅ Rotation Members: 5 luân chuyển nhân sự
-- 
-- TỔNG CỘNG: 36 BẢNG với ~3,500+ records
-- ============================================
