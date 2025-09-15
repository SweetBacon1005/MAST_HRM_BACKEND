import { PrismaClient } from '@prisma/client';

export async function seedMiscData(prisma: PrismaClient, seedData: any) {
  console.log('📚 Seeding miscellaneous data...');

  const { users, skills, roles, groups } = seedData;

  // 1. Tạo education data
  console.log('🎓 Tạo education data...');
  await Promise.all([
    // John Doe education
    prisma.education.create({
      data: {
        user_id: users[2].id,
        name: 'Đại học Bách Khoa Hà Nội',
        major: 'Khoa học Máy tính',
        description: 'Cử nhân Khoa học Máy tính',
        start_date: new Date('2015-09-01'),
        end_date: new Date('2019-06-30'),
      },
    }),
    // Jane Smith education
    prisma.education.create({
      data: {
        user_id: users[3].id,
        name: 'Đại học Công nghệ',
        major: 'Thiết kế Đồ họa',
        description: 'Cử nhân Thiết kế Đồ họa và Truyền thông',
        start_date: new Date('2016-09-01'),
        end_date: new Date('2020-06-30'),
      },
    }),
    // Mike Johnson education
    prisma.education.create({
      data: {
        user_id: users[4].id,
        name: 'Đại học FPT',
        major: 'Công nghệ Phần mềm',
        description: 'Kỹ sư Công nghệ Phần mềm',
        start_date: new Date('2017-09-01'),
        end_date: new Date('2021-06-30'),
      },
    }),
    // Sarah Wilson education
    prisma.education.create({
      data: {
        user_id: users[5].id,
        name: 'Đại học Quốc gia Hà Nội',
        major: 'Công nghệ Thông tin',
        description: 'Cử nhân Công nghệ Thông tin',
        start_date: new Date('2014-09-01'),
        end_date: new Date('2018-06-30'),
      },
    }),
  ]);

  // 2. Tạo experience data
  console.log('💼 Tạo work experience data...');
  await Promise.all([
    // John Doe previous experience
    prisma.experience.create({
      data: {
        user_id: users[2].id,
        job_title: 'Junior Developer',
        company: 'TechStart Vietnam',
        start_date: new Date('2019-07-01'),
        end_date: new Date('2021-12-31'),
      },
    }),
    prisma.experience.create({
      data: {
        user_id: users[2].id,
        job_title: 'Backend Developer',
        company: 'Digital Solutions',
        start_date: new Date('2022-01-01'),
        end_date: new Date('2023-12-31'),
      },
    }),
    // Jane Smith previous experience
    prisma.experience.create({
      data: {
        user_id: users[3].id,
        job_title: 'UI/UX Designer',
        company: 'Creative Agency',
        start_date: new Date('2020-07-01'),
        end_date: new Date('2022-06-30'),
      },
    }),
    prisma.experience.create({
      data: {
        user_id: users[3].id,
        job_title: 'Frontend Developer',
        company: 'WebTech Solutions',
        start_date: new Date('2022-07-01'),
        end_date: new Date('2023-12-31'),
      },
    }),
    // Mike Johnson previous experience
    prisma.experience.create({
      data: {
        user_id: users[4].id,
        job_title: 'Mobile App Developer',
        company: 'MobileTech Co',
        start_date: new Date('2021-08-01'),
        end_date: new Date('2023-12-31'),
      },
    }),
    // Sarah Wilson previous experience
    prisma.experience.create({
      data: {
        user_id: users[5].id,
        job_title: 'QA Tester',
        company: 'Quality First Ltd',
        start_date: new Date('2018-07-01'),
        end_date: new Date('2021-12-31'),
      },
    }),
    prisma.experience.create({
      data: {
        user_id: users[5].id,
        job_title: 'Senior QA Engineer',
        company: 'TestPro Solutions',
        start_date: new Date('2022-01-01'),
        end_date: new Date('2023-12-31'),
      },
    }),
  ]);

  // 3. Tạo holidays
  console.log('🏖️ Tạo holidays...');
  const currentYear = new Date().getFullYear();
  await Promise.all([
    prisma.holidays.create({
      data: {
        name: 'Tết Nguyên Đán',
        type: 1, // National holiday
        status: 1, // Active
        start_date: new Date(`${currentYear}-02-08`),
        end_date: new Date(`${currentYear}-02-14`),
        description: 'Tết Nguyên Đán - Năm mới theo âm lịch',
      },
    }),
    prisma.holidays.create({
      data: {
        name: 'Giỗ Tổ Hùng Vương',
        type: 1,
        status: 1,
        start_date: new Date(`${currentYear}-04-18`),
        end_date: new Date(`${currentYear}-04-18`),
        description: 'Ngày Giỗ Tổ Hùng Vương',
      },
    }),
    prisma.holidays.create({
      data: {
        name: 'Ngày Chiến thắng',
        type: 1,
        status: 1,
        start_date: new Date(`${currentYear}-04-30`),
        end_date: new Date(`${currentYear}-04-30`),
        description: 'Ngày Giải phóng miền Nam',
      },
    }),
    prisma.holidays.create({
      data: {
        name: 'Ngày Quốc tế Lao động',
        type: 1,
        status: 1,
        start_date: new Date(`${currentYear}-05-01`),
        end_date: new Date(`${currentYear}-05-01`),
        description: 'Ngày Quốc tế Lao động',
      },
    }),
    prisma.holidays.create({
      data: {
        name: 'Ngày Quốc Khánh',
        type: 1,
        status: 1,
        start_date: new Date(`${currentYear}-09-02`),
        end_date: new Date(`${currentYear}-09-02`),
        description: 'Ngày Quốc Khánh Việt Nam',
      },
    }),
  ]);

  // 4. Tạo children data (cho một số user đã kết hôn)
  console.log('👶 Tạo children data...');
  await Promise.all([
    // HR Manager có 2 con
    prisma.children.create({
      data: {
        user_id: users[1].id, // HR Manager
        gender: 'Female',
        name: 'Nguyễn Minh Anh',
        birthday: new Date('2018-03-15'),
        phone: null,
        is_dependent: true,
        dependent_start_date: new Date('2018-03-15'),
        type: 'Daughter',
      },
    }),
    prisma.children.create({
      data: {
        user_id: users[1].id, // HR Manager
        gender: 'Male',
        name: 'Nguyễn Minh Đức',
        birthday: new Date('2020-07-20'),
        phone: null,
        is_dependent: true,
        dependent_start_date: new Date('2020-07-20'),
        type: 'Son',
      },
    }),
    // Mike Johnson có 1 con
    prisma.children.create({
      data: {
        user_id: users[4].id, // Mike Johnson
        gender: 'Male',
        name: 'Johnson Jr.',
        birthday: new Date('2019-11-10'),
        phone: null,
        is_dependent: true,
        dependent_start_date: new Date('2019-11-10'),
        type: 'Son',
      },
    }),
    // David Brown có 1 con
    prisma.children.create({
      data: {
        user_id: users[6].id, // David Brown
        gender: 'Female',
        name: 'Brown Emma',
        birthday: new Date('2021-05-05'),
        phone: null,
        is_dependent: true,
        dependent_start_date: new Date('2021-05-05'),
        type: 'Daughter',
      },
    }),
  ]);

  // 5. Tạo user_skills (kỹ năng của từng user)
  console.log('🎯 Tạo user skills...');
  await Promise.all([
    // John Doe skills (Backend Developer)
    prisma.user_skills.create({
      data: {
        user_id: users[2].id,
        skill_id: 1, // Node.js
        experience: 5,
        months_experience: 60,
        is_main: true,
      },
    }),
    prisma.user_skills.create({
      data: {
        user_id: users[2].id,
        skill_id: 2, // NestJS
        experience: 3,
        months_experience: 36,
        is_main: true,
      },
    }),
    prisma.user_skills.create({
      data: {
        user_id: users[2].id,
        skill_id: 15, // TypeScript
        experience: 4,
        months_experience: 48,
        is_main: false,
      },
    }),
    // Jane Smith skills (Frontend Developer)
    prisma.user_skills.create({
      data: {
        user_id: users[3].id,
        skill_id: 10, // React.js
        experience: 5,
        months_experience: 60,
        is_main: true,
      },
    }),
    prisma.user_skills.create({
      data: {
        user_id: users[3].id,
        skill_id: 11, // Vue.js
        experience: 3,
        months_experience: 36,
        is_main: false,
      },
    }),
    prisma.user_skills.create({
      data: {
        user_id: users[3].id,
        skill_id: 15, // TypeScript
        experience: 4,
        months_experience: 48,
        is_main: true,
      },
    }),
    // Mike Johnson skills (Mobile Developer)
    prisma.user_skills.create({
      data: {
        user_id: users[4].id,
        skill_id: 17, // React Native
        experience: 3,
        months_experience: 36,
        is_main: true,
      },
    }),
    prisma.user_skills.create({
      data: {
        user_id: users[4].id,
        skill_id: 18, // Flutter
        experience: 2,
        months_experience: 24,
        is_main: false,
      },
    }),
    // Sarah Wilson skills (QA Tester)
    prisma.user_skills.create({
      data: {
        user_id: users[5].id,
        skill_id: 21, // Manual Testing
        experience: 5,
        months_experience: 60,
        is_main: true,
      },
    }),
    prisma.user_skills.create({
      data: {
        user_id: users[5].id,
        skill_id: 22, // Automation Testing
        experience: 3,
        months_experience: 36,
        is_main: true,
      },
    }),
    prisma.user_skills.create({
      data: {
        user_id: users[5].id,
        skill_id: 23, // Selenium
        experience: 3,
        months_experience: 36,
        is_main: false,
      },
    }),
    // David Brown skills (DevOps Engineer)
    prisma.user_skills.create({
      data: {
        user_id: users[6].id,
        skill_id: 24, // Docker
        experience: 4,
        months_experience: 48,
        is_main: true,
      },
    }),
    prisma.user_skills.create({
      data: {
        user_id: users[6].id,
        skill_id: 25, // Kubernetes
        experience: 2,
        months_experience: 24,
        is_main: false,
      },
    }),
    prisma.user_skills.create({
      data: {
        user_id: users[6].id,
        skill_id: 26, // AWS
        experience: 3,
        months_experience: 36,
        is_main: true,
      },
    }),
  ]);

  // 6. Tạo user_certificates
  console.log('📜 Tạo user certificates...');
  await Promise.all([
    // David Brown - AWS Certificate
    prisma.user_certificates.create({
      data: {
        user_id: users[6].id, // David Brown
        name: 'AWS Certified Solutions Architect - Associate',
        authority: 'Amazon Web Services',
        issued_at: new Date('2023-06-15'),
        start_date: new Date('2023-06-15'),
        type: 'CERTIFICATE',
        certificate_id: 1,
      },
    }),
    // Sarah Wilson - ISTQB Certificate
    prisma.user_certificates.create({
      data: {
        user_id: users[5].id, // Sarah Wilson
        name: 'ISTQB Certified Tester Foundation Level',
        authority: 'International Software Testing Qualifications Board',
        issued_at: new Date('2022-03-20'),
        start_date: new Date('2022-03-20'),
        type: 'CERTIFICATE',
        certificate_id: 2,
      },
    }),
    // System Admin - PMP Certificate
    prisma.user_certificates.create({
      data: {
        user_id: users[0].id, // System Admin
        name: 'Project Management Professional (PMP)',
        authority: 'Project Management Institute',
        issued_at: new Date('2021-11-10'),
        start_date: new Date('2021-11-10'),
        type: 'CERTIFICATE',
        certificate_id: 3,
      },
    }),
  ]);

  // 7. Gán users vào groups
  console.log('👥 Gán users vào groups...');
  await Promise.all([
    // Hà Nội group
    prisma.user_group.create({
      data: {
        userId: users[0].id, // Admin
        group_id: groups[0].id,
        date: new Date('2024-01-01'),
      },
    }),
    prisma.user_group.create({
      data: {
        userId: users[1].id, // HR Manager
        group_id: groups[0].id,
        date: new Date('2024-01-01'),
      },
    }),
    prisma.user_group.create({
      data: {
        userId: users[2].id, // John Doe
        group_id: groups[0].id,
        date: new Date('2024-01-01'),
      },
    }),
    prisma.user_group.create({
      data: {
        userId: users[3].id, // Jane Smith
        group_id: groups[0].id,
        date: new Date('2024-01-01'),
      },
    }),
    prisma.user_group.create({
      data: {
        userId: users[5].id, // Sarah Wilson
        group_id: groups[0].id,
        date: new Date('2024-01-01'),
      },
    }),
    prisma.user_group.create({
      data: {
        userId: users[6].id, // David Brown
        group_id: groups[0].id,
        date: new Date('2024-01-01'),
      },
    }),
    // TP.HCM group
    prisma.user_group.create({
      data: {
        userId: users[4].id, // Mike Johnson
        group_id: groups[1].id,
        date: new Date('2024-01-01'),
      },
    }),
    // Đà Nẵng group
    prisma.user_group.create({
      data: {
        userId: users[7].id, // Lisa Davis
        group_id: groups[2].id,
        date: new Date('2024-01-01'),
      },
    }),
  ]);

  console.log('✅ Miscellaneous data seeded successfully!');
}
