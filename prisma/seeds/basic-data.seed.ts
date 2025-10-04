import { PrismaClient } from '@prisma/client';

export async function seedBasicData(prisma: PrismaClient) {
  console.log('📝 Seeding basic data...');

  // 1. Tạo permissions
  console.log('📝 Tạo permissions...');
  const permissions = await Promise.all([
    prisma.permissions.upsert({
      where: { name: 'user.read' },
      update: {},
      create: { name: 'user.read' },
    }),
    prisma.permissions.upsert({
      where: { name: 'user.create' },
      update: {},
      create: { name: 'user.create' },
    }),
    prisma.permissions.upsert({
      where: { name: 'user.update' },
      update: {},
      create: { name: 'user.update' },
    }),
    prisma.permissions.upsert({
      where: { name: 'user.delete' },
      update: {},
      create: { name: 'user.delete' },
    }),
    prisma.permissions.upsert({
      where: { name: 'project.read' },
      update: {},
      create: { name: 'project.read' },
    }),
    prisma.permissions.upsert({
      where: { name: 'project.create' },
      update: {},
      create: { name: 'project.create' },
    }),
    prisma.permissions.upsert({
      where: { name: 'project.update' },
      update: {},
      create: { name: 'project.update' },
    }),
    prisma.permissions.upsert({
      where: { name: 'project.delete' },
      update: {},
      create: { name: 'project.delete' },
    }),
    prisma.permissions.upsert({
      where: { name: 'timesheet.read' },
      update: {},
      create: { name: 'timesheet.read' },
    }),
    prisma.permissions.upsert({
      where: { name: 'timesheet.create' },
      update: {},
      create: { name: 'timesheet.create' },
    }),
    prisma.permissions.upsert({
      where: { name: 'attendance.read' },
      update: {},
      create: { name: 'attendance.read' },
    }),
    prisma.permissions.upsert({
      where: { name: 'attendance.manage' },
      update: {},
      create: { name: 'attendance.manage' },
    }),
  ]);

  // 2. Tạo roles
  console.log('👥 Tạo roles...');
  const roles = await Promise.all([
    prisma.roles.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' },
    }),
    prisma.roles.upsert({
      where: { name: 'manager' },
      update: {},
      create: { name: 'manager' },
    }),
    prisma.roles.upsert({
      where: { name: 'team_leader' },
      update: {},
      create: { name: 'team_leader' },
    }),
    prisma.roles.upsert({
      where: { name: 'developer' },
      update: {},
      create: { name: 'developer' },
    }),
    prisma.roles.upsert({
      where: { name: 'tester' },
      update: {},
      create: { name: 'tester' },
    }),
    prisma.roles.upsert({
      where: { name: 'employee' },
      update: {},
      create: { name: 'employee' },
    }),
  ]);

  // 3. Tạo group_roles
  console.log('🏷️ Tạo group roles...');
  const groupRoles = await Promise.all([
    prisma.group_roles.upsert({
      where: { name: 'Super Admin' },
      update: {},
      create: {
        name: 'Super Admin',
        description: 'Quyền cao nhất trong hệ thống',
      },
    }),
    prisma.group_roles.upsert({
      where: { name: 'HR Manager' },
      update: {},
      create: {
        name: 'HR Manager',
        description: 'Quản lý nhân sự',
      },
    }),
    prisma.group_roles.upsert({
      where: { name: 'Project Manager' },
      update: {},
      create: {
        name: 'Project Manager',
        description: 'Quản lý dự án',
      },
    }),
    prisma.group_roles.upsert({
      where: { name: 'Team Lead' },
      update: {},
      create: {
        name: 'Team Lead',
        description: 'Trưởng nhóm',
      },
    }),
    prisma.group_roles.upsert({
      where: { name: 'Employee' },
      update: {},
      create: {
        name: 'Employee',
        description: 'Nhân viên',
      },
    }),
  ]);

  // 4. Tạo levels
  console.log('📊 Tạo levels...');
  const levels = await Promise.all([
    prisma.levels.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Intern',
        coefficient: 0.5,
      },
    }),
    prisma.levels.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Fresher',
        coefficient: 0.8,
      },
    }),
    prisma.levels.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Junior',
        coefficient: 1.0,
      },
    }),
    prisma.levels.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: 'Middle',
        coefficient: 1.5,
      },
    }),
    prisma.levels.upsert({
      where: { id: 5 },
      update: {},
      create: {
        name: 'Senior',
        coefficient: 2.0,
      },
    }),
    prisma.levels.upsert({
      where: { id: 6 },
      update: {},
      create: {
        name: 'Lead',
        coefficient: 2.5,
      },
    }),
    prisma.levels.upsert({
      where: { id: 7 },
      update: {},
      create: {
        name: 'Principal',
        coefficient: 3.0,
      },
    }),
  ]);

  // 5. Tạo positions
  console.log('💼 Tạo positions...');
  const positions = await Promise.all([
    prisma.positions.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Backend Developer',
        is_active_project: true,
      },
    }),
    prisma.positions.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Frontend Developer',
        is_active_project: true,
      },
    }),
    prisma.positions.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Full Stack Developer',
        is_active_project: true,
      },
    }),
    prisma.positions.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: 'Mobile Developer',
        is_active_project: true,
      },
    }),
    prisma.positions.upsert({
      where: { id: 5 },
      update: {},
      create: {
        name: 'QA Tester',
        is_active_project: true,
      },
    }),
    prisma.positions.upsert({
      where: { id: 6 },
      update: {},
      create: {
        name: 'DevOps Engineer',
        is_active_project: true,
      },
    }),
    prisma.positions.upsert({
      where: { id: 7 },
      update: {},
      create: {
        name: 'UI/UX Designer',
        is_active_project: true,
      },
    }),
    prisma.positions.upsert({
      where: { id: 8 },
      update: {},
      create: {
        name: 'Project Manager',
        is_active_project: false,
      },
    }),
    prisma.positions.upsert({
      where: { id: 9 },
      update: {},
      create: {
        name: 'Business Analyst',
        is_active_project: true,
      },
    }),
    prisma.positions.upsert({
      where: { id: 10 },
      update: {},
      create: {
        name: 'Scrum Master',
        is_active_project: false,
      },
    }),
  ]);

  // 7. Tạo languages
  console.log('🌍 Tạo languages...');
  const languages = await Promise.all([
    prisma.languages.upsert({
      where: { id: 1 },
      update: {},
      create: { name: 'Vietnamese' },
    }),
    prisma.languages.upsert({
      where: { id: 2 },
      update: {},
      create: { name: 'English' },
    }),
    prisma.languages.upsert({
      where: { id: 3 },
      update: {},
      create: { name: 'Japanese' },
    }),
    prisma.languages.upsert({
      where: { id: 4 },
      update: {},
      create: { name: 'Korean' },
    }),
  ]);

  return {
    permissions,
    roles,
    groupRoles,
    levels,
    positions,
    languages,
  };
}
