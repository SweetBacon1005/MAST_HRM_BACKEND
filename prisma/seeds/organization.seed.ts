import { PrismaClient } from '@prisma/client';

export async function seedOrganization(prisma: PrismaClient) {
  console.log('🏛️ Seeding organization data...');

  // 1. Tạo divisions - sử dụng upsert vì có ID cố định và parent_id
  console.log('🏛️ Tạo divisions...');
  const divisionData = [
    {
      id: 1,
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
    {
      id: 2,
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
    {
      id: 3,
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
    {
      id: 4,
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
    {
      id: 5,
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
  ];

  const divisions = await Promise.all(
    divisionData.map(division =>
      prisma.divisions.upsert({
        where: { id: division.id },
        update: {},
        create: division,
      })
    )
  );

  // 2. Tạo teams - sử dụng upsert vì có ID cố định
  console.log('👨‍💻 Tạo teams...');
  const teamData = [
    { id: 1, name: 'Backend Team' },
    { id: 2, name: 'Frontend Team' },
    { id: 3, name: 'Mobile Team' },
    { id: 4, name: 'QA Team' },
    { id: 5, name: 'DevOps Team' },
    { id: 6, name: 'UI/UX Team' },
  ];

  const teams = await Promise.all(
    teamData.map(team =>
      prisma.teams.upsert({
        where: { id: team.id },
        update: {},
        create: team,
      })
    )
  );

  // 3. Tạo groups - sử dụng createMany với skipDuplicates
  console.log('👥 Tạo groups...');
  const groupData = [
    {
      name: 'Hà Nội Office Group',
      location: 'Hà Nội',
    },
    {
      name: 'TP.HCM Office Group',
      location: 'TP.Hồ Chí Minh',
    },
    {
      name: 'Đà Nẵng Office Group',
      location: 'Đà Nẵng',
    },
  ];

  await prisma.groups.createMany({
    data: groupData,
    skipDuplicates: true,
  });

  const groups = await prisma.groups.findMany({
    where: { name: { in: groupData.map(g => g.name) } },
  });

  return {
    divisions,
    teams,
    groups,
  };
}
