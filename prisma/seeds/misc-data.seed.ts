import { HolidayStatus, HolidayType, PrismaClient } from '@prisma/client';

export async function seedMiscData(prisma: PrismaClient, seedData: any) {
  console.log('📚 Seeding miscellaneous data...');

  const { users, groups } = seedData;

  // 1. Tạo education data - sử dụng createMany
  console.log('🎓 Tạo education data...');
  const educationData = [
    {
      user_id: users[2].id,
      name: 'Đại học Bách Khoa Hà Nội',
      major: 'Khoa học Máy tính',
      description: 'Cử nhân Khoa học Máy tính',
      start_date: new Date('2015-09-01'),
      end_date: new Date('2019-06-30'),
    },
    {
      user_id: users[3].id,
      name: 'Đại học Công nghệ',
      major: 'Thiết kế Đồ họa',
      description: 'Cử nhân Thiết kế Đồ họa và Truyền thông',
      start_date: new Date('2016-09-01'),
      end_date: new Date('2020-06-30'),
    },
    {
      user_id: users[4].id,
      name: 'Đại học FPT',
      major: 'Công nghệ Phần mềm',
      description: 'Kỹ sư Công nghệ Phần mềm',
      start_date: new Date('2017-09-01'),
      end_date: new Date('2021-06-30'),
    },
    {
      user_id: users[5].id,
      name: 'Đại học Quốc gia Hà Nội',
      major: 'Công nghệ Thông tin',
      description: 'Cử nhân Công nghệ Thông tin',
      start_date: new Date('2014-09-01'),
      end_date: new Date('2018-06-30'),
    },
  ];

  await prisma.education.createMany({
    data: educationData,
    skipDuplicates: true,
  });

  // 2. Tạo experience data - sử dụng createMany
  console.log('💼 Tạo work experience data...');
  const experienceData = [
    {
      user_id: users[2].id,
      job_title: 'Junior Developer',
      company: 'TechStart Vietnam',
      start_date: new Date('2019-07-01'),
      end_date: new Date('2021-12-31'),
    },
    {
      user_id: users[2].id,
      job_title: 'Backend Developer',
      company: 'Digital Solutions',
      start_date: new Date('2022-01-01'),
      end_date: new Date('2023-12-31'),
    },
    {
      user_id: users[3].id,
      job_title: 'UI/UX Designer',
      company: 'Creative Agency',
      start_date: new Date('2020-07-01'),
      end_date: new Date('2022-06-30'),
    },
    {
      user_id: users[3].id,
      job_title: 'Frontend Developer',
      company: 'WebTech Solutions',
      start_date: new Date('2022-07-01'),
      end_date: new Date('2023-12-31'),
    },
    {
      user_id: users[4].id,
      job_title: 'Mobile App Developer',
      company: 'MobileTech Co',
      start_date: new Date('2021-08-01'),
      end_date: new Date('2023-12-31'),
    },
    {
      user_id: users[5].id,
      job_title: 'QA Tester',
      company: 'Quality First Ltd',
      start_date: new Date('2018-07-01'),
      end_date: new Date('2021-12-31'),
    },
    {
      user_id: users[5].id,
      job_title: 'Senior QA Engineer',
      company: 'TestPro Solutions',
      start_date: new Date('2022-01-01'),
      end_date: new Date('2023-12-31'),
    },
  ];

  await prisma.experience.createMany({
    data: experienceData,
    skipDuplicates: true,
  });

  // 3. Tạo holidays - sử dụng createMany
  console.log('🏖️ Tạo holidays...');
  const currentYear = new Date().getFullYear();
  const holidaysData = [
    {
      name: 'Tết Nguyên Đán',
      type: HolidayType.NATIONAL,
      status: HolidayStatus.ACTIVE,
      start_date: new Date(`${currentYear}-02-08`),
      end_date: new Date(`${currentYear}-02-14`),
      description: 'Tết Nguyên Đán - Năm mới theo âm lịch',
    },
    {
      name: 'Giỗ Tổ Hùng Vương',
      type: HolidayType.NATIONAL,
      status: HolidayStatus.ACTIVE,
      start_date: new Date(`${currentYear}-04-18`),
      end_date: new Date(`${currentYear}-04-18`),
      description: 'Ngày Giỗ Tổ Hùng Vương',
    },
    {
      name: 'Ngày Chiến thắng',
      type: HolidayType.NATIONAL,
      status: HolidayStatus.ACTIVE,
      start_date: new Date(`${currentYear}-04-30`),
      end_date: new Date(`${currentYear}-04-30`),
      description: 'Ngày Giải phóng miền Nam',
    },
    {
      name: 'Ngày Quốc tế Lao động',
      type: HolidayType.NATIONAL,
      status: HolidayStatus.ACTIVE,
      start_date: new Date(`${currentYear}-05-01`),
      end_date: new Date(`${currentYear}-05-01`),
      description: 'Ngày Quốc tế Lao động',
    },
    {
      name: 'Ngày Quốc Khánh',
      type: HolidayType.NATIONAL,
      status: HolidayStatus.ACTIVE,
      start_date: new Date(`${currentYear}-09-02`),
      end_date: new Date(`${currentYear}-09-02`),
      description: 'Ngày Quốc Khánh Việt Nam',
    },
  ];

  await prisma.holidays.createMany({
    data: holidaysData,
    skipDuplicates: true,
  });

  // 4. Tạo children data - sử dụng createMany
  console.log('👶 Tạo children data...');
  const childrenData = [
    {
      user_id: users[1].id, // HR Manager
      gender: 'Female',
      name: 'Nguyễn Minh Anh',
      birthday: new Date('2018-03-15'),
      phone: null,
      is_dependent: true,
      dependent_start_date: new Date('2018-03-15'),
      type: 'Daughter',
    },
    {
      user_id: users[1].id, // HR Manager
      gender: 'Male',
      name: 'Nguyễn Minh Đức',
      birthday: new Date('2020-07-20'),
      phone: null,
      is_dependent: true,
      dependent_start_date: new Date('2020-07-20'),
      type: 'Son',
    },
    {
      user_id: users[4].id, // Mike Johnson
      gender: 'Male',
      name: 'Johnson Jr.',
      birthday: new Date('2019-11-10'),
      phone: null,
      is_dependent: true,
      dependent_start_date: new Date('2019-11-10'),
      type: 'Son',
    },
    {
      user_id: users[6].id, // David Brown
      gender: 'Female',
      name: 'Brown Emma',
      birthday: new Date('2021-05-05'),
      phone: null,
      is_dependent: true,
      dependent_start_date: new Date('2021-05-05'),
      type: 'Daughter',
    },
  ];

  await prisma.children.createMany({
    data: childrenData,
    skipDuplicates: true,
  });

  // 5. Tạo user_skills - sử dụng createMany
  console.log('🎯 Tạo user skills...');
  const userSkillsData = [
    // John Doe skills (Backend Developer)
    {
      user_id: users[2].id,
      skill_id: 1, // Node.js
      experience: 5,
      months_experience: 60,
      is_main: true,
    },
    {
      user_id: users[2].id,
      skill_id: 2, // NestJS
      experience: 3,
      months_experience: 36,
      is_main: true,
    },
    {
      user_id: users[2].id,
      skill_id: 15, // TypeScript
      experience: 4,
      months_experience: 48,
      is_main: false,
    },
    // Jane Smith skills (Frontend Developer)
    {
      user_id: users[3].id,
      skill_id: 10, // React.js
      experience: 5,
      months_experience: 60,
      is_main: true,
    },
    {
      user_id: users[3].id,
      skill_id: 11, // Vue.js
      experience: 3,
      months_experience: 36,
      is_main: false,
    },
    {
      user_id: users[3].id,
      skill_id: 15, // TypeScript
      experience: 4,
      months_experience: 48,
      is_main: true,
    },
    // Mike Johnson skills (Mobile Developer)
    {
      user_id: users[4].id,
      skill_id: 17, // React Native
      experience: 3,
      months_experience: 36,
      is_main: true,
    },
    {
      user_id: users[4].id,
      skill_id: 18, // Flutter
      experience: 2,
      months_experience: 24,
      is_main: false,
    },
    // Sarah Wilson skills (QA Tester)
    {
      user_id: users[5].id,
      skill_id: 21, // Manual Testing
      experience: 5,
      months_experience: 60,
      is_main: true,
    },
    {
      user_id: users[5].id,
      skill_id: 22, // Automation Testing
      experience: 3,
      months_experience: 36,
      is_main: true,
    },
    {
      user_id: users[5].id,
      skill_id: 23, // Selenium
      experience: 3,
      months_experience: 36,
      is_main: false,
    },
    // David Brown skills (DevOps Engineer)
    {
      user_id: users[6].id,
      skill_id: 24, // Docker
      experience: 4,
      months_experience: 48,
      is_main: true,
    },
    {
      user_id: users[6].id,
      skill_id: 25, // Kubernetes
      experience: 2,
      months_experience: 24,
      is_main: false,
    },
    {
      user_id: users[6].id,
      skill_id: 26, // AWS
      experience: 3,
      months_experience: 36,
      is_main: true,
    },
  ];

  await prisma.user_skills.createMany({
    data: userSkillsData,
    skipDuplicates: true,
  });

  // 6. Tạo user_certificates - sử dụng createMany
  console.log('📜 Tạo user certificates...');
  const userCertificatesData = [
    {
      user_id: users[6].id, // David Brown
      name: 'AWS Certified Solutions Architect - Associate',
      authority: 'Amazon Web Services',
      issued_at: new Date('2023-06-15'),
      start_date: new Date('2023-06-15'),
      type: 'CERTIFICATE' as const,
      certificate_id: 1,
    },
    {
      user_id: users[5].id, // Sarah Wilson
      name: 'ISTQB Certified Tester Foundation Level',
      authority: 'International Software Testing Qualifications Board',
      issued_at: new Date('2022-03-20'),
      start_date: new Date('2022-03-20'),
      type: 'CERTIFICATE' as const,
      certificate_id: 2,
    },
    {
      user_id: users[0].id, // System Admin
      name: 'Project Management Professional (PMP)',
      authority: 'Project Management Institute',
      issued_at: new Date('2021-11-10'),
      start_date: new Date('2021-11-10'),
      type: 'CERTIFICATE' as const,
      certificate_id: 3,
    },
  ];

  await prisma.user_certificates.createMany({
    data: userCertificatesData,
    skipDuplicates: true,
  });

  // 7. Gán users vào groups - sử dụng createMany
  console.log('👥 Gán users vào groups...');
  const userGroupData = [
    // Hà Nội group
    {
      userId: users[0].id, // Admin
      group_id: groups[0].id,
      date: new Date('2024-01-01'),
    },
    {
      userId: users[1].id, // HR Manager
      group_id: groups[0].id,
      date: new Date('2024-01-01'),
    },
    {
      userId: users[2].id, // John Doe
      group_id: groups[0].id,
      date: new Date('2024-01-01'),
    },
    {
      userId: users[3].id, // Jane Smith
      group_id: groups[0].id,
      date: new Date('2024-01-01'),
    },
    {
      userId: users[5].id, // Sarah Wilson
      group_id: groups[0].id,
      date: new Date('2024-01-01'),
    },
    {
      userId: users[6].id, // David Brown
      group_id: groups[0].id,
      date: new Date('2024-01-01'),
    },
    // TP.HCM group
    {
      userId: users[4].id, // Mike Johnson
      group_id: groups[1].id,
      date: new Date('2024-01-01'),
    },
    // Đà Nẵng group
    {
      userId: users[7].id, // Lisa Davis
      group_id: groups[2].id,
      date: new Date('2024-01-01'),
    },
  ];

  await prisma.user_group.createMany({
    data: userGroupData,
    skipDuplicates: true,
  });

  console.log('✅ Miscellaneous data seeded successfully!');
}