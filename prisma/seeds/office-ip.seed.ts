import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOfficeIpAddresses() {
  console.log('🌱 Seeding default office IP addresses...');

  const officeIpConfig = await prisma.system_configs.upsert({
    where: { key: 'OFFICE_IP_ADDRESSES' },
    update: {},
    create: {
      key: 'OFFICE_IP_ADDRESSES',
      value: ['127.0.0.1', '192.168.1.0/24', '10.0.0.*'], // Default IPs for testing
      description: 'Danh sách các địa chỉ IP hoặc dải IP của văn phòng được phép chấm công',
    },
  });

  console.log(`✅ Office IP addresses config upserted: ${officeIpConfig.key}`);
}
