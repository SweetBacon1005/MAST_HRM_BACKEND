import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Danh sách tên Việt Nam phổ biến
const VIETNAMESE_NAMES = {
  firstNames: [
    'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
    'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đào', 'Mai', 'Lương',
    'Tô', 'Chu', 'Trịnh', 'Tạ', 'Cao', 'Lâm', 'Vương', 'Hà', 'Kiều', 'Thái'
  ],
  maleNames: [
    'Văn Minh', 'Đức Anh', 'Hoàng Nam', 'Quang Huy', 'Thành Đạt', 'Minh Tuấn', 'Văn Hùng',
    'Quốc Bảo', 'Đình Khoa', 'Thanh Tùng', 'Minh Khang', 'Văn Đức', 'Quang Vinh', 'Thái Sơn',
    'Minh Hải', 'Đức Thắng', 'Văn Phong', 'Quang Dũng', 'Thành Long', 'Minh Tâm',
    'Đức Huy', 'Văn Thành', 'Quang Minh', 'Thái Bình', 'Minh Đức', 'Văn Khánh',
    'Quang Thắng', 'Thành Nam', 'Minh Phúc', 'Đức Mạnh', 'Văn Tài', 'Quang Tuấn',
    'Thái Dương', 'Minh Hoàng', 'Đức Kiên', 'Văn Bình', 'Quang Khải', 'Thành Công',
    'Minh Quân', 'Đức Trung', 'Văn Lâm', 'Quang Hải', 'Thái Học', 'Minh Nhật',
    'Đức Phong', 'Văn Hiếu', 'Quang Tú', 'Thành Trung', 'Minh Tiến', 'Đức Hạnh'
  ],
  femaleNames: [
    'Thị Lan', 'Minh Anh', 'Thu Hà', 'Ngọc Mai', 'Thúy Nga', 'Hồng Nhung', 'Thị Hoa',
    'Minh Châu', 'Thu Thảo', 'Ngọc Linh', 'Thúy Linh', 'Hồng Vân', 'Thị Hương',
    'Minh Thư', 'Thu Trang', 'Ngọc Hân', 'Thúy Kiều', 'Hồng Phượng', 'Thị Xuân',
    'Minh Ngọc', 'Thu Hiền', 'Ngọc Yến', 'Thúy Dung', 'Hồng Diễm', 'Thị Thu',
    'Minh Hương', 'Thu Phương', 'Ngọc Bích', 'Thúy Hằng', 'Hồng Loan', 'Thị Nga',
    'Minh Phương', 'Thu Vân', 'Ngọc Diệp', 'Thúy Vân', 'Hồng Thảo', 'Thị Dung',
    'Minh Tâm', 'Thu Giang', 'Ngọc Khánh', 'Thúy Hạnh', 'Hồng Anh', 'Thị Linh',
    'Minh Hạnh', 'Thu Hương', 'Ngọc Phương', 'Thúy Minh', 'Hồng Ngọc', 'Thị Tâm'
  ]
};

const CITIES = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Nha Trang', 'Huế', 'Vũng Tàu'];
const DISTRICTS = ['Quận 1', 'Quận 2', 'Quận 3', 'Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Tây Hồ'];

// Hàm tạo email từ tên
function generateEmail(fullName: string, index: number): string {
  const nameParts = fullName.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .split(' ');
  
  const firstName = nameParts[nameParts.length - 1];
  const lastName = nameParts[0];
  
  return `${firstName}.${lastName}${index}@company.com`;
}

// Hàm tạo mã nhân viên
function generateEmployeeCode(index: number): string {
  return `EMP${(index + 100).toString().padStart(3, '0')}`;
}

// Hàm tạo số điện thoại
function generatePhone(index: number): string {
  const basePhone = 901234000;
  return `+849${(basePhone + index).toString()}`;
}

// Hàm tạo địa chỉ
function generateAddress(): string {
  const streetNumber = Math.floor(Math.random() * 999) + 1;
  const streetName = ['Lê Lợi', 'Nguyễn Huệ', 'Trần Hưng Đạo', 'Hai Bà Trưng', 'Lý Thường Kiệt'][Math.floor(Math.random() * 5)];
  const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  
  return `${streetNumber} ${streetName}, ${district}, ${city}`;
}

// Hàm tạo ngày sinh ngẫu nhiên
function generateBirthday(): Date {
  const year = 1985 + Math.floor(Math.random() * 15); // 1985-1999
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
}

export async function seedMassUsers(prisma: PrismaClient, seedData: any) {
  console.log('👥 Seeding mass users (100+ employees)...');

  const { roles, positions, levels, languages } = seedData;
  const hashedPassword = await bcrypt.hash('123456', 12);

  // Tạo 150 users
  const numberOfUsers = 150;
  const userData: any[] = [];
  const userInfoData: any[] = [];

  for (let i = 0; i < numberOfUsers; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = VIETNAMESE_NAMES.firstNames[Math.floor(Math.random() * VIETNAMESE_NAMES.firstNames.length)];
    const lastName = isMale 
      ? VIETNAMESE_NAMES.maleNames[Math.floor(Math.random() * VIETNAMESE_NAMES.maleNames.length)]
      : VIETNAMESE_NAMES.femaleNames[Math.floor(Math.random() * VIETNAMESE_NAMES.femaleNames.length)];
    
    const fullName = `${firstName} ${lastName}`;
    const email = generateEmail(fullName, i + 10);
    
    // Tạo user data
    userData.push({
      email,
      password: hashedPassword,
      email_verified_at: new Date(),
    });

    // Tạo user info data (sẽ được tạo sau khi có user IDs)
    const positionId = positions[Math.floor(Math.random() * positions.length)].id;
    const levelId = levels[Math.floor(Math.random() * levels.length)].id;
    const roleId = roles[Math.floor(Math.random() * (roles.length - 2)) + 2].id; // Bỏ qua admin và manager
    const languageId = languages[Math.floor(Math.random() * languages.length)].id;

    userInfoData.push({
      personal_email: email.replace('@company.com', '@gmail.com'),
      nationality: 'Vietnamese',
      name: fullName,
      code: generateEmployeeCode(i + 10),
      avatar: `/avatars/user${i + 10}.jpg`,
      gender: isMale ? 'Male' : 'Female',
      marital: Math.random() > 0.6 ? 'Married' : 'Single',
      birthday: generateBirthday(),
      position_id: positionId,
      address: generateAddress(),
      temp_address: generateAddress(),
      phone: generatePhone(i + 100),
      tax_code: `TAX${(i + 100).toString().padStart(3, '0')}`,
      role_id: roleId,
      status: 'ACTIVE' as const,
      description: `${positions.find(p => p.id === positionId)?.name || 'Employee'}`,
      level_id: levelId,
      note: `Generated employee ${i + 1}`,
      overview: `Experienced ${positions.find(p => p.id === positionId)?.name || 'professional'} with good technical skills`,
      expertise: positions.find(p => p.id === positionId)?.name || 'General',
      technique: 'Various modern technologies and frameworks',
      main_task: `${positions.find(p => p.id === positionId)?.name || 'General'} tasks`,
      language_id: languageId,
    });
  }

  console.log(`👤 Tạo ${numberOfUsers} users...`);
  
  // Tạo users với batch processing
  const batchSize = 50;
  const createdUsers: any[] = [];
  
  for (let i = 0; i < userData.length; i += batchSize) {
    const batch = userData.slice(i, i + batchSize);
    const batchUsers = await Promise.all(
      batch.map((user) =>
        prisma.users.upsert({
          where: { email: user.email },
          update: {},
          create: user,
        }),
      ),
    );
    createdUsers.push(...batchUsers);
    console.log(`✓ Created users batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userData.length / batchSize)}`);
  }

  console.log(`📋 Tạo ${numberOfUsers} user information records...`);
  
  // Tạo user information với batch processing
  for (let i = 0; i < userInfoData.length; i += batchSize) {
    const batch = userInfoData.slice(i, i + batchSize);
    await Promise.all(
      batch.map((userInfo, index) =>
        prisma.user_information.upsert({
          where: { user_id: createdUsers[i + index].id },
          update: {},
          create: {
            ...userInfo,
            user_id: createdUsers[i + index].id,
          },
        }),
      ),
    );
    console.log(`✓ Created user info batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userInfoData.length / batchSize)}`);
  }

  return { 
    massUsers: createdUsers,
    totalCreated: numberOfUsers 
  };
}
