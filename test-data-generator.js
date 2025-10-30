const fs = require('fs');
const path = require('path');

// Helper functions để generate data
function generateRandomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomEmail(name) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${name.toLowerCase().replace(/\s+/g, '.')}@${domain}`;
}

function generateRandomPhone() {
  return `0${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
}

function generateRandomDate(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
}

function generateRandomDateTime(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime).toISOString().replace('T', ' ').split('.')[0];
}

// Vietnamese names
const firstNames = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đào', 'Lương', 'Trịnh'
];

const lastNames = [
  'Văn Anh', 'Thị Bình', 'Văn Cường', 'Thị Dung', 'Văn Đức', 'Thị Hoa', 'Văn Hùng', 'Thị Lan',
  'Văn Long', 'Thị Mai', 'Văn Nam', 'Thị Nga', 'Văn Phong', 'Thị Quỳnh', 'Văn Sơn', 'Thị Thảo',
  'Văn Tuấn', 'Thị Uyên', 'Văn Việt', 'Thị Xuân', 'Minh Anh', 'Hoàng Bảo', 'Quang Dũng', 'Minh Hải'
];

function generateVietnameseName() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

// Generate SQL for mass users
function generateUsersSQL(count = 150) {
  let sql = `-- =============================================\n`;
  sql += `-- MASS USERS DATA (${count} users)\n`;
  sql += `-- =============================================\n\n`;

  const userInserts = [];
  const userInfoInserts = [];
  const userDivisionInserts = [];

  for (let i = 1; i <= count; i++) {
    const fullName = generateVietnameseName();
    const email = generateRandomEmail(fullName);
    const phone = generateRandomPhone();
    const employeeCode = `EMP${(i + 1000).toString().padStart(4, '0')}`;
    const createdAt = generateRandomDateTime('2024-01-01', '2024-10-30');
    
    // User record
    userInserts.push(`(
      '${generateRandomString(25)}',
      '${email}',
      '${createdAt}',
      NULL,
      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      NULL,
      NULL,
      '${createdAt}',
      '${createdAt}'
    )`);

    // User information record
    userInfoInserts.push(`(
      '${generateRandomString(25)}',
      (SELECT id FROM users WHERE email = '${email}' LIMIT 1),
      '${fullName}',
      '${employeeCode}',
      '${phone}',
      '${generateRandomDate('1980-01-01', '2000-12-31')}',
      ${Math.random() > 0.5 ? "'male'" : "'female'"},
      '${generateRandomString(50)} Street, District ${Math.floor(Math.random() * 12) + 1}, Ho Chi Minh City',
      'active',
      '${generateRandomDate('2020-01-01', '2024-01-01')}',
      ${Math.random() > 0.8 ? `'${generateRandomDate('2024-01-01', '2024-12-31')}'` : 'NULL'},
      '${createdAt}',
      '${createdAt}'
    )`);

    // User division assignment (random division 1-5)
    const divisionId = Math.floor(Math.random() * 5) + 1;
    userDivisionInserts.push(`(
      '${generateRandomString(25)}',
      (SELECT id FROM users WHERE email = '${email}' LIMIT 1),
      '${divisionId}',
      '${generateRandomDate('2020-01-01', '2024-01-01')}',
      NULL,
      '${createdAt}',
      '${createdAt}'
    )`);
  }

  sql += `-- Insert Users\n`;
  sql += `INSERT INTO users (id, email, email_verified_at, name, password, remember_token, current_team_id, created_at, updated_at) VALUES\n`;
  sql += userInserts.join(',\n') + ';\n\n';

  sql += `-- Insert User Information\n`;
  sql += `INSERT INTO user_information (id, user_id, full_name, employee_code, phone_number, date_of_birth, gender, address, status, start_date, end_date, created_at, updated_at) VALUES\n`;
  sql += userInfoInserts.join(',\n') + ';\n\n';

  sql += `-- Insert User Division Assignments\n`;
  sql += `INSERT INTO user_division (id, user_id, division_id, start_date, end_date, created_at, updated_at) VALUES\n`;
  sql += userDivisionInserts.join(',\n') + ';\n\n';

  return sql;
}

// Generate SQL for mass projects
function generateProjectsSQL(count = 50) {
  let sql = `-- =============================================\n`;
  sql += `-- MASS PROJECTS DATA (${count} projects)\n`;
  sql += `-- =============================================\n\n`;

  const projectNames = [
    'Website Redesign', 'Mobile App Development', 'Database Migration', 'API Integration',
    'Security Audit', 'Performance Optimization', 'User Experience Research', 'Cloud Migration',
    'Data Analytics Platform', 'Customer Portal', 'Internal Tools', 'Marketing Campaign',
    'E-commerce Platform', 'Content Management System', 'Inventory Management', 'HR System'
  ];

  const projectInserts = [];
  const taskInserts = [];
  const projectRoleInserts = [];

  for (let i = 1; i <= count; i++) {
    const projectName = `${projectNames[Math.floor(Math.random() * projectNames.length)]} ${i}`;
    const projectCode = `PRJ${i.toString().padStart(3, '0')}`;
    const startDate = generateRandomDate('2024-01-01', '2024-06-01');
    const endDate = generateRandomDate('2024-06-01', '2024-12-31');
    const createdAt = generateRandomDateTime('2024-01-01', '2024-10-30');

    // Project record
    projectInserts.push(`(
      '${generateRandomString(25)}',
      '${projectName}',
      '${projectCode}',
      'Project description for ${projectName}',
      '${startDate}',
      '${endDate}',
      ${Math.random() > 0.3 ? "'active'" : "'completed'"},
      '${createdAt}',
      '${createdAt}'
    )`);

    // Generate 3-8 tasks per project
    const taskCount = Math.floor(Math.random() * 6) + 3;
    for (let j = 1; j <= taskCount; j++) {
      taskInserts.push(`(
        '${generateRandomString(25)}',
        'Task ${j} for ${projectName}',
        'Task description ${j}',
        (SELECT id FROM projects WHERE code = '${projectCode}' LIMIT 1),
        (SELECT id FROM users ORDER BY RAND() LIMIT 1),
        ${Math.floor(Math.random() * 5) + 1},
        ${Math.random() > 0.7 ? "'completed'" : "'in_progress'"},
        '${generateRandomDate(startDate, endDate)}',
        '${createdAt}',
        '${createdAt}'
      )`);
    }

    // Assign 2-5 users to each project
    const userCount = Math.floor(Math.random() * 4) + 2;
    for (let k = 1; k <= userCount; k++) {
      const role = k === 1 ? 'project_manager' : (Math.random() > 0.5 ? 'developer' : 'tester');
      projectRoleInserts.push(`(
        '${generateRandomString(25)}',
        (SELECT id FROM projects WHERE code = '${projectCode}' LIMIT 1),
        (SELECT id FROM users ORDER BY RAND() LIMIT 1),
        '${role}',
        '${generateRandomDate(startDate, endDate)}',
        ${Math.random() > 0.8 ? `'${generateRandomDate(startDate, endDate)}'` : 'NULL'},
        '${createdAt}',
        '${createdAt}'
      )`);
    }
  }

  sql += `-- Insert Projects\n`;
  sql += `INSERT INTO projects (id, name, code, description, start_date, end_date, status, created_at, updated_at) VALUES\n`;
  sql += projectInserts.join(',\n') + ';\n\n';

  sql += `-- Insert Tasks\n`;
  sql += `INSERT INTO tasks (id, title, description, project_id, user_id, priority, status, due_date, created_at, updated_at) VALUES\n`;
  sql += taskInserts.join(',\n') + ';\n\n';

  sql += `-- Insert Project Role Assignments\n`;
  sql += `INSERT INTO project_role_user (id, project_id, user_id, role, start_date, end_date, created_at, updated_at) VALUES\n`;
  sql += projectRoleInserts.join(',\n') + ';\n\n';

  return sql;
}

// Generate SQL for mass attendance
function generateAttendanceSQL() {
  let sql = `-- =============================================\n`;
  sql += `-- MASS ATTENDANCE DATA (3 months)\n`;
  sql += `-- =============================================\n\n`;

  const timesheetInserts = [];
  const attendanceSessionInserts = [];
  const attendanceLogInserts = [];

  // Generate for last 90 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  for (let day = 0; day < 90; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    const dateStr = currentDate.toISOString().split('T')[0];

    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;

    // Generate attendance for random 80-120 users per day
    const userCount = Math.floor(Math.random() * 41) + 80;
    
    for (let u = 0; u < userCount; u++) {
      const checkInTime = `${dateStr} 0${Math.floor(Math.random() * 2) + 7}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`;
      const checkOutTime = `${dateStr} 1${Math.floor(Math.random() * 3) + 7}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`;
      const workHours = 8 + Math.random() * 2;

      // Timesheet
      timesheetInserts.push(`(
        '${generateRandomString(25)}',
        (SELECT id FROM users ORDER BY RAND() LIMIT 1),
        '${dateStr}',
        '${checkInTime}',
        '${checkOutTime}',
        ${workHours.toFixed(2)},
        'present',
        '${checkInTime}',
        '${checkInTime}'
      )`);

      // Attendance Session
      attendanceSessionInserts.push(`(
        '${generateRandomString(25)}',
        (SELECT id FROM users ORDER BY RAND() LIMIT 1),
        '${checkInTime}',
        '${checkOutTime}',
        ${workHours.toFixed(2)},
        'completed',
        '${checkInTime}',
        '${checkInTime}'
      )`);

      // Check-in log
      attendanceLogInserts.push(`(
        '${generateRandomString(25)}',
        (SELECT id FROM users ORDER BY RAND() LIMIT 1),
        'check_in',
        '${checkInTime}',
        'Office',
        '${checkInTime}',
        '${checkInTime}'
      )`);

      // Check-out log
      attendanceLogInserts.push(`(
        '${generateRandomString(25)}',
        (SELECT id FROM users ORDER BY RAND() LIMIT 1),
        'check_out',
        '${checkOutTime}',
        'Office',
        '${checkOutTime}',
        '${checkOutTime}'
      )`);
    }
  }

  sql += `-- Insert Timesheets\n`;
  sql += `INSERT INTO time_sheets (id, user_id, date, check_in_time, check_out_time, total_hours, status, created_at, updated_at) VALUES\n`;
  sql += timesheetInserts.slice(0, 1000).join(',\n') + ';\n\n';

  sql += `-- Insert Attendance Sessions\n`;
  sql += `INSERT INTO attendance_sessions (id, user_id, check_in_time, check_out_time, total_hours, status, created_at, updated_at) VALUES\n`;
  sql += attendanceSessionInserts.slice(0, 1000).join(',\n') + ';\n\n';

  sql += `-- Insert Attendance Logs\n`;
  sql += `INSERT INTO attendance_logs (id, user_id, type, timestamp, location, created_at, updated_at) VALUES\n`;
  sql += attendanceLogInserts.slice(0, 2000).join(',\n') + ';\n\n';

  return sql;
}

// Main function to generate complete SQL file
function generateCompleteTestDataSQL() {
  console.log('🚀 Generating complete test data SQL file...');

  let sql = `-- =============================================\n`;
  sql += `-- MAST HRM - COMPLETE TEST DATA SQL\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- =============================================\n`;
  sql += `-- This file contains realistic test data for development\n`;
  sql += `-- Import this after running basic seed\n`;
  sql += `-- =============================================\n\n`;

  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // Generate all test data
  sql += generateUsersSQL(150);
  sql += generateProjectsSQL(50);
  sql += generateAttendanceSQL();

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n\n`;

  sql += `-- =============================================\n`;
  sql += `-- SUMMARY\n`;
  sql += `-- =============================================\n`;
  sql += `-- ✅ 150 additional users with full information\n`;
  sql += `-- ✅ 50 projects with tasks and assignments\n`;
  sql += `-- ✅ 3 months of attendance data\n`;
  sql += `-- ✅ Thousands of related records\n`;
  sql += `-- =============================================\n`;

  return sql;
}

// Generate and save the SQL file
const sqlContent = generateCompleteTestDataSQL();
fs.writeFileSync(path.join(__dirname, 'test-data-complete.sql'), sqlContent);

console.log('✅ Generated test-data-complete.sql successfully!');
console.log('📁 File location: test-data-complete.sql');
console.log('📊 File size:', (sqlContent.length / 1024 / 1024).toFixed(2), 'MB');
console.log('\n🚀 To import:');
console.log('   mysql -u username -p database_name < test-data-complete.sql');
console.log('   or use MySQL Workbench/phpMyAdmin');
