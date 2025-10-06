import { PrismaClient } from '@prisma/client';

export async function seedContracts(prisma: PrismaClient) {
  console.log('🔖 Seeding contracts...');

  // Lấy danh sách users để tạo contracts
  const users = await prisma.users.findMany({
    where: { deleted_at: null },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  if (users.length === 0) {
    console.log('⚠️  No users found, skipping contracts seeding');
    return;
  }

  const contractsData = [
    // Admin contract
    {
      user_id: users[0].id, // Admin
      code: 'CT-2024-001',
      contract_category: 1, // Full-time
      status: 'ACTIVE' as const,
      type: true, // Permanent
      start_date: new Date('2024-01-01'),
      end_date: new Date('2025-12-31'),
      author_id: users[0].id,
      editor_id: null,
    },
    // HR Manager contract
    {
      user_id: users[1].id, // HR Manager
      code: 'CT-2024-002',
      contract_category: 1, // Full-time
      status: 'ACTIVE' as const,
      type: true, // Permanent
      start_date: new Date('2024-01-15'),
      end_date: new Date('2025-12-31'),
      author_id: users[0].id,
      editor_id: null,
    },
    // John Doe contract
    {
      user_id: users[2].id, // John Doe
      code: 'CT-2024-003',
      contract_category: 1, // Full-time
      status: 'ACTIVE' as const,
      type: true, // Permanent
      start_date: new Date('2024-02-01'),
      end_date: new Date('2025-12-31'),
      author_id: users[1].id, // HR Manager
      editor_id: null,
    },
    // Jane Smith contract
    {
      user_id: users[3].id, // Jane Smith
      code: 'CT-2024-004',
      contract_category: 1, // Full-time
      status: 'ACTIVE' as const,
      type: true, // Permanent
      start_date: new Date('2024-02-15'),
      end_date: new Date('2025-12-31'),
      author_id: users[1].id, // HR Manager
      editor_id: null,
    },
    // Bob Wilson contract
    {
      user_id: users[4].id, // Bob Wilson
      code: 'CT-2024-005',
      contract_category: 1, // Full-time
      status: 'ACTIVE' as const,
      type: true, // Permanent
      start_date: new Date('2024-03-01'),
      end_date: new Date('2025-12-31'),
      author_id: users[1].id, // HR Manager
      editor_id: null,
    },
    // Mike Johnson contract
    {
      user_id: users[5].id, // Mike Johnson
      code: 'CT-2024-006',
      contract_category: 2, // Part-time
      status: 'ACTIVE' as const,
      type: false, // Temporary
      start_date: new Date('2024-03-15'),
      end_date: new Date('2024-09-15'), // 6 months contract
      author_id: users[1].id, // HR Manager
      editor_id: null,
    },
  ];

  // Thêm contracts cho các users còn lại nếu có
  for (let i = 6; i < Math.min(users.length, 20); i++) {
    const contractStartDate = new Date('2024-01-01');
    contractStartDate.setMonth(contractStartDate.getMonth() + (i % 12));
    
    const contractEndDate = new Date(contractStartDate);
    contractEndDate.setFullYear(contractEndDate.getFullYear() + 1);

    contractsData.push({
      user_id: users[i].id,
      code: `CT-2024-${String(i + 1).padStart(3, '0')}`,
      contract_category: i % 3 === 0 ? 2 : 1, // Mix of full-time and part-time
      status: 'ACTIVE' as const,
      type: i % 4 !== 0, // Mostly permanent, some temporary
      start_date: contractStartDate,
      end_date: contractEndDate,
      author_id: users[1].id, // HR Manager
      editor_id: null,
    });
  }

  // Thêm một số contracts đã hết hạn (INACTIVE)
  const expiredContractsData = [
    {
      user_id: users[2].id, // John Doe - previous contract
      code: 'CT-2023-001',
      contract_category: 1,
      status: 'INACTIVE' as const,
      type: false, // Temporary
      start_date: new Date('2023-01-01'),
      end_date: new Date('2023-12-31'),
      author_id: users[1].id,
      editor_id: users[1].id,
    },
    {
      user_id: users[3].id, // Jane Smith - previous contract
      code: 'CT-2023-002',
      contract_category: 2,
      status: 'INACTIVE' as const,
      type: false, // Temporary
      start_date: new Date('2023-06-01'),
      end_date: new Date('2024-01-31'),
      author_id: users[1].id,
      editor_id: users[1].id,
    },
  ];

  // Combine all contracts
  const allContractsData = [...contractsData, ...expiredContractsData];

  // Seed contracts using createMany for better performance
  await prisma.contracts.createMany({
    data: allContractsData,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${allContractsData.length} contracts`);

  // Log summary
  const activeContracts = allContractsData.filter(c => c.status === 'ACTIVE').length;
  const inactiveContracts = allContractsData.filter(c => c.status === 'INACTIVE').length;
  const permanentContracts = allContractsData.filter(c => c.type === true).length;
  const temporaryContracts = allContractsData.filter(c => c.type === false).length;

  console.log(`   📊 Summary:`);
  console.log(`   - Active contracts: ${activeContracts}`);
  console.log(`   - Inactive contracts: ${inactiveContracts}`);
  console.log(`   - Permanent contracts: ${permanentContracts}`);
  console.log(`   - Temporary contracts: ${temporaryContracts}`);
}
