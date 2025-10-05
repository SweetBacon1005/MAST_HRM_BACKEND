import { PrismaClient } from '@prisma/client';

export async function seedBasicData(prisma: PrismaClient) {
  console.log('📝 Seeding basic data...');

  // 1. Tạo permissions - sử dụng createMany với skipDuplicates
  console.log('📝 Tạo permissions...');
  const permissionData = [
    { name: 'user.read' },
    { name: 'user.create' },
    { name: 'user.update' },
    { name: 'user.delete' },
    { name: 'project.read' },
    { name: 'project.create' },
    { name: 'project.update' },
    { name: 'project.delete' },
    { name: 'timesheet.read' },
    { name: 'timesheet.create' },
    { name: 'attendance.read' },
    { name: 'attendance.manage' },
  ];

  await prisma.permissions.createMany({
    data: permissionData,
    skipDuplicates: true,
  });

  // Lấy lại permissions để trả về
  const permissions = await prisma.permissions.findMany({
    where: { name: { in: permissionData.map(p => p.name) } },
  });

  // 2. Tạo roles - sử dụng createMany với skipDuplicates
  console.log('👥 Tạo roles...');
  const roleData = [
    { name: 'admin' },
    { name: 'manager' },
    { name: 'team_leader' },
    { name: 'developer' },
    { name: 'tester' },
    { name: 'employee' },
  ];

  await prisma.roles.createMany({
    data: roleData,
    skipDuplicates: true,
  });

  const roles = await prisma.roles.findMany({
    where: { name: { in: roleData.map(r => r.name) } },
  });
  // 4. Tạo levels - sử dụng upsert vì có ID cố định
  console.log('📊 Tạo levels...');
  const levelData = [
    { id: 1, name: 'Intern', coefficient: 0.5 },
    { id: 2, name: 'Fresher', coefficient: 0.8 },
    { id: 3, name: 'Junior', coefficient: 1.0 },
    { id: 4, name: 'Middle', coefficient: 1.5 },
    { id: 5, name: 'Senior', coefficient: 2.0 },
    { id: 6, name: 'Lead', coefficient: 2.5 },
    { id: 7, name: 'Principal', coefficient: 3.0 },
  ];

  const levels = await Promise.all(
    levelData.map(level =>
      prisma.levels.upsert({
        where: { id: level.id },
        update: {},
        create: level,
      })
    )
  );

  // 5. Tạo positions - sử dụng upsert vì có ID cố định
  console.log('💼 Tạo positions...');
  const positionData = [
    { id: 1, name: 'Backend Developer', is_active_project: true },
    { id: 2, name: 'Frontend Developer', is_active_project: true },
    { id: 3, name: 'Full Stack Developer', is_active_project: true },
    { id: 4, name: 'Mobile Developer', is_active_project: true },
    { id: 5, name: 'QA Tester', is_active_project: true },
    { id: 6, name: 'DevOps Engineer', is_active_project: true },
    { id: 7, name: 'UI/UX Designer', is_active_project: true },
    { id: 8, name: 'Project Manager', is_active_project: false },
    { id: 9, name: 'Business Analyst', is_active_project: true },
    { id: 10, name: 'Scrum Master', is_active_project: false },
  ];

  const positions = await Promise.all(
    positionData.map(position =>
      prisma.positions.upsert({
        where: { id: position.id },
        update: {},
        create: position,
      })
    )
  );

  // 6. Tạo languages - sử dụng upsert vì có ID cố định
  console.log('🌍 Tạo languages...');
  const languageData = [
    { id: 1, name: 'Vietnamese' },
    { id: 2, name: 'English' },
    { id: 3, name: 'Japanese' },
    { id: 4, name: 'Korean' },
  ];

  const languages = await Promise.all(
    languageData.map(language =>
      prisma.languages.upsert({
        where: { id: language.id },
        update: {},
        create: language,
      })
    )
  );

  return {
    permissions,
    roles,
    levels,
    positions,
    languages,
  };
}
