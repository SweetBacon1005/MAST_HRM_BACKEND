import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedAssets() {
  console.log('🌱 Seeding assets...');

  // Lấy một số user để gán tài sản và làm creator
  const users = await prisma.users.findMany({
    take: 10,
    select: { id: true },
  });

  if (users.length === 0) {
    console.log('⚠️ No users found, skipping assets seed');
    return;
  }

  // Lấy user đầu tiên làm creator (giả sử là HR/Admin)
  const creatorId = users[0].id;

  const assets = [
    // Laptops
    {
      name: 'Laptop Dell XPS 13',
      description: 'Laptop cao cấp cho developer với CPU Intel i7, RAM 16GB, SSD 512GB',
      asset_code: 'LAPTOP-001',
      category: 'LAPTOP',
      brand: 'Dell',
      model: 'XPS 13 9320',
      serial_number: 'DELL-XPS13-001',
      purchase_date: new Date('2024-01-15'),
      purchase_price: 25000000,
      warranty_end_date: new Date('2026-01-15'),
      location: 'Tầng 2 - Phòng IT',
      status: 'ASSIGNED',
      assigned_to: users[1]?.id,
      assigned_date: new Date('2024-01-20'),
      notes: 'Laptop cho senior developer',
      created_by: creatorId,
    },
    {
      name: 'Laptop MacBook Pro M2',
      description: 'MacBook Pro với chip M2, RAM 16GB, SSD 512GB cho designer',
      asset_code: 'LAPTOP-002',
      category: 'LAPTOP',
      brand: 'Apple',
      model: 'MacBook Pro 14" M2',
      serial_number: 'MAC-MBP-M2-001',
      purchase_date: new Date('2024-02-01'),
      purchase_price: 45000000,
      warranty_end_date: new Date('2026-02-01'),
      location: 'Tầng 3 - Phòng Design',
      status: 'ASSIGNED',
      assigned_to: users[2]?.id,
      assigned_date: new Date('2024-02-05'),
      notes: 'MacBook Pro cho UI/UX designer',
      created_by: creatorId,
    },
    {
      name: 'Laptop ThinkPad X1 Carbon',
      description: 'Laptop business cao cấp với độ bền cao',
      asset_code: 'LAPTOP-003',
      category: 'LAPTOP',
      brand: 'Lenovo',
      model: 'ThinkPad X1 Carbon Gen 10',
      serial_number: 'LEN-X1C-001',
      purchase_date: new Date('2024-01-10'),
      purchase_price: 30000000,
      warranty_end_date: new Date('2026-01-10'),
      location: 'Kho tài sản',
      status: 'AVAILABLE',
      notes: 'Laptop dự phòng',
      created_by: creatorId,
    },

    // Monitors
    {
      name: 'Monitor Dell UltraSharp 27"',
      description: 'Monitor 4K 27 inch cho công việc design và development',
      asset_code: 'MONITOR-001',
      category: 'MONITOR',
      brand: 'Dell',
      model: 'U2720Q',
      serial_number: 'DELL-U2720Q-001',
      purchase_date: new Date('2024-01-20'),
      purchase_price: 8000000,
      warranty_end_date: new Date('2026-01-20'),
      location: 'Tầng 2 - Phòng IT',
      status: 'ASSIGNED',
      assigned_to: users[1]?.id,
      assigned_date: new Date('2024-01-25'),
      notes: 'Monitor phụ cho developer',
      created_by: creatorId,
    },
    {
      name: 'Monitor LG UltraWide 34"',
      description: 'Monitor ultrawide 34 inch cho productivity cao',
      asset_code: 'MONITOR-002',
      category: 'MONITOR',
      brand: 'LG',
      model: '34WN80C-B',
      serial_number: 'LG-34WN-001',
      purchase_date: new Date('2024-02-10'),
      purchase_price: 12000000,
      warranty_end_date: new Date('2026-02-10'),
      location: 'Kho tài sản',
      status: 'AVAILABLE',
      notes: 'Monitor ultrawide dự phòng',
      created_by: creatorId,
    },

    // Keyboards
    {
      name: 'Keyboard Mechanical Keychron K2',
      description: 'Bàn phím cơ không dây với switch Blue',
      asset_code: 'KEYBOARD-001',
      category: 'KEYBOARD',
      brand: 'Keychron',
      model: 'K2 V2',
      serial_number: 'KEY-K2-001',
      purchase_date: new Date('2024-01-25'),
      purchase_price: 2500000,
      warranty_end_date: new Date('2025-01-25'),
      location: 'Tầng 2 - Phòng IT',
      status: 'ASSIGNED',
      assigned_to: users[3]?.id,
      assigned_date: new Date('2024-01-30'),
      notes: 'Bàn phím cơ cho developer',
      created_by: creatorId,
    },

    // Mice
    {
      name: 'Mouse Logitech MX Master 3',
      description: 'Chuột không dây cao cấp với nhiều tính năng',
      asset_code: 'MOUSE-001',
      category: 'MOUSE',
      brand: 'Logitech',
      model: 'MX Master 3',
      serial_number: 'LOG-MX3-001',
      purchase_date: new Date('2024-01-30'),
      purchase_price: 2000000,
      warranty_end_date: new Date('2025-01-30'),
      location: 'Tầng 2 - Phòng IT',
      status: 'ASSIGNED',
      assigned_to: users[3]?.id,
      assigned_date: new Date('2024-02-01'),
      notes: 'Chuột không dây cao cấp',
      created_by: creatorId,
    },

    // Headphones
    {
      name: 'Headphone Sony WH-1000XM4',
      description: 'Tai nghe chống ồn cao cấp',
      asset_code: 'HEADPHONE-001',
      category: 'HEADPHONE',
      brand: 'Sony',
      model: 'WH-1000XM4',
      serial_number: 'SONY-WH4-001',
      purchase_date: new Date('2024-02-05'),
      purchase_price: 8000000,
      warranty_end_date: new Date('2025-02-05'),
      location: 'Tầng 3 - Phòng Design',
      status: 'ASSIGNED',
      assigned_to: users[2]?.id,
      assigned_date: new Date('2024-02-10'),
      notes: 'Tai nghe chống ồn cho designer',
      created_by: creatorId,
    },

    // Phones
    {
      name: 'iPhone 15 Pro',
      description: 'Điện thoại công ty cho testing mobile app',
      asset_code: 'PHONE-001',
      category: 'PHONE',
      brand: 'Apple',
      model: 'iPhone 15 Pro 128GB',
      serial_number: 'APPLE-IP15-001',
      purchase_date: new Date('2024-02-15'),
      purchase_price: 28000000,
      warranty_end_date: new Date('2025-02-15'),
      location: 'Tầng 2 - Phòng IT',
      status: 'AVAILABLE',
      notes: 'Điện thoại test mobile app',
      created_by: creatorId,
    },

    // Furniture
    {
      name: 'Bàn làm việc đứng',
      description: 'Bàn làm việc có thể điều chỉnh độ cao',
      asset_code: 'FURNITURE-001',
      category: 'FURNITURE',
      brand: 'IKEA',
      model: 'BEKANT',
      purchase_date: new Date('2024-01-05'),
      purchase_price: 5000000,
      location: 'Tầng 2 - Phòng IT',
      status: 'ASSIGNED',
      assigned_to: users[4]?.id,
      assigned_date: new Date('2024-01-10'),
      notes: 'Bàn làm việc ergonomic',
      created_by: creatorId,
    },

    // Equipment
    {
      name: 'Máy chiếu Epson',
      description: 'Máy chiếu cho phòng họp',
      asset_code: 'EQUIPMENT-001',
      category: 'EQUIPMENT',
      brand: 'Epson',
      model: 'EB-X41',
      serial_number: 'EPSON-EBX41-001',
      purchase_date: new Date('2024-01-12'),
      purchase_price: 15000000,
      warranty_end_date: new Date('2026-01-12'),
      location: 'Phòng họp A',
      status: 'AVAILABLE',
      notes: 'Máy chiếu phòng họp chính',
      created_by: creatorId,
    },
  ];

  // Tạo assets
  for (const asset of assets) {
    try {
      await prisma.assets.create({
        data: asset as any,
      });
    } catch (error) {
      console.log(`⚠️ Skipping duplicate asset: ${asset.asset_code}`);
    }
  }

  console.log('✅ Assets seeded successfully');
}

