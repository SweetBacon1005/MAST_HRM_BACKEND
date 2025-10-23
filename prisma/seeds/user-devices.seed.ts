import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedUserDevices() {
  console.log('🌱 Seeding user devices...');

  // Lấy một số user để gán thiết bị
  const users = await prisma.users.findMany({
    take: 5,
    select: { id: true},
  });

  if (users.length === 0) {
    console.log('⚠️ No users found, skipping user devices seed');
    return;
  }

  const devices = [
    {
      device_name: 'Laptop Dell XPS 13',
      device_type: 'LAPTOP' as const,
      device_serial: 'DELL-XPS13-001',
      notes: 'Laptop cao cấp cho developer',
    },
    {
      device_name: 'Laptop MacBook Pro M2',
      device_type: 'LAPTOP' as const,
      device_serial: 'MAC-MBP-M2-001',
      notes: 'MacBook Pro cho designer',
    },
    {
      device_name: 'Monitor Dell UltraSharp 27"',
      device_type: 'MONITOR' as const,
      device_serial: 'DELL-U2720Q-001',
      notes: 'Monitor 4K cho design',
    },
    {
      device_name: 'Keyboard Mechanical Keychron K2',
      device_type: 'KEYBOARD' as const,
      device_serial: 'KEY-K2-001',
      notes: 'Bàn phím cơ cho developer',
    },
    {
      device_name: 'Mouse Logitech MX Master 3',
      device_type: 'MOUSE' as const,
      device_serial: 'LOG-MX3-001',
      notes: 'Chuột không dây cao cấp',
    },
    {
      device_name: 'Headphone Sony WH-1000XM4',
      device_type: 'HEADPHONE' as const,
      device_serial: 'SONY-WH4-001',
      notes: 'Tai nghe chống ồn',
    },
  ];

  // Tạo user devices data
  const userDeviceData: any[] = [];
  
  for (const user of users) {
    // Gán 2-3 thiết bị cho mỗi user
    const userDevices = devices.slice(0, Math.floor(Math.random() * 3) + 2);
    
    for (const device of userDevices) {
      userDeviceData.push({
        user_id: user.id,
        device_name: device.device_name,
        device_type: device.device_type,
        device_serial: device.device_serial,
        assigned_date: new Date('2024-01-01'),
        status: 'ACTIVE' as const,
        notes: device.notes,
      });
    }
  }

  // Sử dụng createMany với skipDuplicates
  await prisma.user_devices.createMany({
    data: userDeviceData,
    skipDuplicates: true,
  });

  console.log('✅ User devices seeded successfully');
}
