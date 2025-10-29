import { DivisionStatus, DivisionType, PrismaClient } from '@prisma/client';

export async function seedOrganization(prisma: PrismaClient) {
  console.log('🏛️ Seeding organization data...');

  // 1. Tạo divisions - sử dụng upsert vì có ID cố định và parent_id
  console.log('🏛️ Tạo divisions...');
  const divisionData = [
    {
      id: 1,
      name: 'Technology Division',
      is_active_project: true,
      type: DivisionType.TECHNICAL,
      status: DivisionStatus.ACTIVE,
      level: 1,
      address: 'Tầng 5, Tòa nhà ABC, Hà Nội',
      founding_at: new Date('2020-01-01'),
      description: 'Phòng ban công nghệ chính',
      total_member: 50,
    },
    {
      id: 2,
      name: 'Human Resources',
      is_active_project: false,
      type: DivisionType.BUSINESS,
      status: DivisionStatus.ACTIVE,
      level: 1,
      address: 'Tầng 3, Tòa nhà ABC, Hà Nội',
      founding_at: new Date('2020-01-01'),
      description: 'Phòng nhân sự',
      total_member: 10,
    },
    {
      id: 3,
      name: 'Quality Assurance',
      is_active_project: true,
      type: DivisionType.TECHNICAL,
      status: DivisionStatus.ACTIVE,
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
      is_active_project: true,
      type: DivisionType.TECHNICAL,
      status: DivisionStatus.ACTIVE,
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
      is_active_project: true,
      type: DivisionType.TECHNICAL,
      status: DivisionStatus.ACTIVE,
      level: 2,
      parent_id: 1,
      address: 'Tầng 7, Tòa nhà ABC, Hà Nội',
      founding_at: new Date('2020-09-01'),
      description: 'Nhóm phát triển B',
      total_member: 15,
    },
  ];

  // Tạo divisions theo thứ tự level để tránh lỗi foreign key
  // Level 1 (parent divisions) trước
  const level1Divisions = divisionData.filter(d => d.level === 1);
  const level2Divisions = divisionData.filter(d => d.level === 2);

  // Tạo level 1 divisions trước (không có parent_id)
  await prisma.divisions.createMany({
    data: level1Divisions,
    skipDuplicates: true,
  });

  // Tạo level 2 divisions sau (có parent_id)
  await prisma.divisions.createMany({
    data: level2Divisions,
    skipDuplicates: true,
  });

  // Lấy tất cả divisions đã tạo
  const divisions = await prisma.divisions.findMany({
    where: {
      id: { in: divisionData.map(d => d.id) }
    }
  });

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

  // Tạo teams với createMany để tối ưu
  await prisma.teams.createMany({
    data: teamData,
    skipDuplicates: true,
  });

  // Lấy tất cả teams đã tạo
  const teams = await prisma.teams.findMany({
    where: {
      id: { in: teamData.map(t => t.id) }
    }
  });

  return {
    divisions,
    teams,
  };
}
