import { PrismaClient } from '@prisma/client';

export async function seedOrganization(prisma: PrismaClient) {
  console.log('🏛️ Seeding organization data...');

  // 1. Tạo divisions
  console.log('🏛️ Tạo divisions...');
  const divisions = await Promise.all([
    prisma.divisions.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Technology Division',
        is_active_project: 1,
        type: 1,
        status: 1,
        level: 1,
        address: 'Tầng 5, Tòa nhà ABC, Hà Nội',
        founding_at: new Date('2020-01-01'),
        description: 'Phòng ban công nghệ chính',
        total_member: 50,
      },
    }),
    prisma.divisions.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Human Resources',
        is_active_project: 0,
        type: 2,
        status: 1,
        level: 1,
        address: 'Tầng 3, Tòa nhà ABC, Hà Nội',
        founding_at: new Date('2020-01-01'),
        description: 'Phòng nhân sự',
        total_member: 10,
      },
    }),
    prisma.divisions.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Quality Assurance',
        is_active_project: 1,
        type: 1,
        status: 1,
        level: 2,
        parent_id: 1,
        address: 'Tầng 5, Tòa nhà ABC, Hà Nội',
        founding_at: new Date('2020-06-01'),
        description: 'Phòng đảm bảo chất lượng',
        total_member: 15,
      },
    }),
    prisma.divisions.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: 'Development Team A',
        is_active_project: 1,
        type: 1,
        status: 1,
        level: 2,
        parent_id: 1,
        address: 'Tầng 6, Tòa nhà ABC, Hà Nội',
        founding_at: new Date('2020-03-01'),
        description: 'Nhóm phát triển A',
        total_member: 20,
      },
    }),
    prisma.divisions.upsert({
      where: { id: 5 },
      update: {},
      create: {
        name: 'Development Team B',
        is_active_project: 1,
        type: 1,
        status: 1,
        level: 2,
        parent_id: 1,
        address: 'Tầng 7, Tòa nhà ABC, Hà Nội',
        founding_at: new Date('2020-09-01'),
        description: 'Nhóm phát triển B',
        total_member: 15,
      },
    }),
  ]);

  // 2. Tạo teams
  console.log('👨‍💻 Tạo teams...');
  const teams = await Promise.all([
    prisma.teams.upsert({
      where: { id: 1 },
      update: {},
      create: { name: 'Backend Team' },
    }),
    prisma.teams.upsert({
      where: { id: 2 },
      update: {},
      create: { name: 'Frontend Team' },
    }),
    prisma.teams.upsert({
      where: { id: 3 },
      update: {},
      create: { name: 'Mobile Team' },
    }),
    prisma.teams.upsert({
      where: { id: 4 },
      update: {},
      create: { name: 'QA Team' },
    }),
    prisma.teams.upsert({
      where: { id: 5 },
      update: {},
      create: { name: 'DevOps Team' },
    }),
    prisma.teams.upsert({
      where: { id: 6 },
      update: {},
      create: { name: 'UI/UX Team' },
    }),
  ]);

  // 3. Tạo groups
  console.log('👥 Tạo groups...');
  const groups = await Promise.all([
    prisma.groups.create({
      data: {
        name: 'Hà Nội Office Group',
        location: 'Hà Nội',
      },
    }),
    prisma.groups.create({
      data: {
        name: 'TP.HCM Office Group',
        location: 'TP.Hồ Chí Minh',
      },
    }),
    prisma.groups.create({
      data: {
        name: 'Đà Nẵng Office Group',
        location: 'Đà Nẵng',
      },
    }),
  ]);

  return {
    divisions,
    teams,
    groups,
  };
}
