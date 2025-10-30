import { PrismaClient } from '@prisma/client';

export async function seedAdditionalTestData(prisma: PrismaClient, seedData: any) {
  console.log('🧪 Seeding additional test data...');

  const { massUsers, users: originalUsers } = seedData;
  const allUsers = [...(originalUsers || []), ...(massUsers || [])];

  // 1. THÊM USER SKILLS
  console.log('🎯 Tạo user skills...');
  const skills = await prisma.skills.findMany();
  const userSkillsData: any[] = [];

  for (const user of allUsers) {
    // Mỗi user có 3-8 skills
    const skillCount = Math.floor(Math.random() * 6) + 3;
    const selectedSkills = skills.sort(() => Math.random() - 0.5).slice(0, skillCount);

    for (let i = 0; i < selectedSkills.length; i++) {
      const skill = selectedSkills[i];
      userSkillsData.push({
        user_id: user.id,
        skill_id: skill.id,
        experience: Math.floor(Math.random() * 10) + 1, // 1-10 years
        months_experience: Math.floor(Math.random() * 120) + 12, // 12-132 months
        is_main: i === 0, // First skill is main skill
      });
    }
  }

  // Batch create user skills
  const batchSize = 100;
  for (let i = 0; i < userSkillsData.length; i += batchSize) {
    const batch = userSkillsData.slice(i, i + batchSize);
    await prisma.user_skills.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created user skills batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userSkillsData.length / batchSize)}`);
  }

  // 2. THÊM USER CERTIFICATES
  console.log('📜 Tạo user certificates...');
  const certificates = await prisma.certificates.findMany();
  const userCertificatesData: any[] = [];

  for (const user of allUsers) {
    // 30% users có certificates
    if (Math.random() < 0.3) {
      const certCount = Math.floor(Math.random() * 3) + 1; // 1-3 certificates
      const selectedCerts = certificates.sort(() => Math.random() - 0.5).slice(0, certCount);

      for (const cert of selectedCerts) {
        const issuedDate = new Date();
        issuedDate.setFullYear(issuedDate.getFullYear() - Math.floor(Math.random() * 5)); // Last 5 years

        userCertificatesData.push({
          user_id: user.id,
          certificate_id: cert.id,
          name: `${cert.name} Certificate`,
          authority: ['Google', 'Microsoft', 'AWS', 'Oracle', 'Cisco', 'Adobe'][Math.floor(Math.random() * 6)],
          issued_at: issuedDate,
          start_date: issuedDate,
          type: Math.random() > 0.5 ? 'CERTIFICATE' : 'ACHIEVEMENT',
        });
      }
    }
  }

  // Batch create user certificates
  for (let i = 0; i < userCertificatesData.length; i += batchSize) {
    const batch = userCertificatesData.slice(i, i + batchSize);
    await prisma.user_certificates.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created user certificates batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userCertificatesData.length / batchSize)}`);
  }

  // 3. THÊM EDUCATION RECORDS
  console.log('🎓 Tạo education records...');
  const educationData: any[] = [];
  const universities = [
    'Đại học Bách khoa Hà Nội', 'Đại học Quốc gia Hà Nội', 'Đại học Công nghệ',
    'Đại học FPT', 'Đại học Kinh tế Quốc dân', 'Đại học Ngoại thương',
    'Đại học Bách khoa TP.HCM', 'Đại học Khoa học Tự nhiên', 'Đại học Sư phạm Kỹ thuật'
  ];
  const majors = [
    'Công nghệ Thông tin', 'Khoa học Máy tính', 'Kỹ thuật Phần mềm',
    'Hệ thống Thông tin', 'An toàn Thông tin', 'Trí tuệ Nhân tạo',
    'Kỹ thuật Điện tử', 'Quản trị Kinh doanh', 'Kế toán'
  ];

  for (const user of allUsers) {
    // Mỗi user có 1-2 education records
    const eduCount = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < eduCount; i++) {
      const startYear = 2010 + Math.floor(Math.random() * 10);
      const startDate = new Date(startYear, 8, 1); // September 1st
      const endDate = new Date(startYear + 4, 5, 30); // June 30th, 4 years later

      educationData.push({
        user_id: user.id,
        name: universities[Math.floor(Math.random() * universities.length)],
        major: majors[Math.floor(Math.random() * majors.length)],
        description: i === 0 ? 'Cử nhân' : 'Thạc sĩ',
        start_date: startDate,
        end_date: endDate,
      });
    }
  }

  // Batch create education records
  for (let i = 0; i < educationData.length; i += batchSize) {
    const batch = educationData.slice(i, i + batchSize);
    await prisma.education.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created education batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(educationData.length / batchSize)}`);
  }

  // 4. THÊM WORK EXPERIENCE
  console.log('💼 Tạo work experience...');
  const experienceData: any[] = [];
  const companies = [
    'FPT Software', 'TMA Solutions', 'KMS Technology', 'NashTech', 'Axon Active',
    'VNG Corporation', 'Tiki', 'Shopee Vietnam', 'Grab Vietnam', 'Zalo',
    'Viettel', 'VNPT', 'CMC Global', 'Harvey Nash', 'Saigon Technology'
  ];
  const jobTitles = [
    'Software Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'Mobile Developer', 'QA Engineer', 'DevOps Engineer', 'Business Analyst',
    'Project Manager', 'Technical Lead', 'Senior Developer', 'Junior Developer'
  ];

  for (const user of allUsers) {
    // 60% users có work experience trước đây
    if (Math.random() < 0.6) {
      const expCount = Math.floor(Math.random() * 3) + 1; // 1-3 experiences
      
      for (let i = 0; i < expCount; i++) {
        const startYear = 2015 + Math.floor(Math.random() * 8);
        const duration = Math.floor(Math.random() * 36) + 6; // 6-42 months
        const startDate = new Date(startYear, Math.floor(Math.random() * 12), 1);
        const endDate = new Date(startDate.getTime() + duration * 30 * 24 * 60 * 60 * 1000);

        experienceData.push({
          user_id: user.id,
          job_title: jobTitles[Math.floor(Math.random() * jobTitles.length)],
          company: companies[Math.floor(Math.random() * companies.length)],
          start_date: startDate,
          end_date: endDate,
        });
      }
    }
  }

  // Batch create experience records
  for (let i = 0; i < experienceData.length; i += batchSize) {
    const batch = experienceData.slice(i, i + batchSize);
    await prisma.experience.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created experience batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(experienceData.length / batchSize)}`);
  }

  // 5. THÊM USER DIVISIONS
  console.log('🏢 Tạo user divisions...');
  const divisions = await prisma.divisions.findMany();
  const teams = await prisma.teams.findMany();
  const roles = await prisma.roles.findMany();
  const userDivisionData: any[] = [];

  for (const user of allUsers) {
    const division = divisions[Math.floor(Math.random() * divisions.length)];
    const team = teams[Math.floor(Math.random() * teams.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];

    userDivisionData.push({
      userId: user.id,
      divisionId: division?.id || null,
      teamId: team?.id || null,
      role_id: role?.id || null,
      description: `Member of ${division?.name || 'Unknown Division'}`,
    });
  }

  // Batch create user divisions
  for (let i = 0; i < userDivisionData.length; i += batchSize) {
    const batch = userDivisionData.slice(i, i + batchSize);
    await prisma.user_division.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created user divisions batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userDivisionData.length / batchSize)}`);
  }

  // 6. THÊM HOLIDAYS
  console.log('🎉 Tạo holidays...');
  const holidayData: any[] = [
    {
      name: 'Tết Nguyên Đán 2024',
      type: 'NATIONAL',
      status: 'ACTIVE',
      start_date: new Date('2024-02-08'),
      end_date: new Date('2024-02-14'),
      description: 'Tết Nguyên Đán Giáp Thìn 2024'
    },
    {
      name: 'Giỗ Tổ Hùng Vương 2024',
      type: 'NATIONAL',
      status: 'ACTIVE',
      start_date: new Date('2024-04-18'),
      end_date: new Date('2024-04-18'),
      description: 'Ngày Giỗ Tổ Hùng Vương'
    },
    {
      name: 'Ngày Chiến thắng 30/4',
      type: 'NATIONAL',
      status: 'ACTIVE',
      start_date: new Date('2024-04-30'),
      end_date: new Date('2024-04-30'),
      description: 'Ngày Giải phóng miền Nam'
    },
    {
      name: 'Ngày Quốc tế Lao động 1/5',
      type: 'NATIONAL',
      status: 'ACTIVE',
      start_date: new Date('2024-05-01'),
      end_date: new Date('2024-05-01'),
      description: 'Ngày Quốc tế Lao động'
    },
    {
      name: 'Ngày Quốc khánh 2/9',
      type: 'NATIONAL',
      status: 'ACTIVE',
      start_date: new Date('2024-09-02'),
      end_date: new Date('2024-09-02'),
      description: 'Ngày Quốc khánh Việt Nam'
    },
    {
      name: 'Company Anniversary',
      type: 'COMPANY',
      status: 'ACTIVE',
      start_date: new Date('2024-12-25'),
      end_date: new Date('2024-12-25'),
      description: 'Ngày thành lập công ty'
    }
  ];

  await prisma.holidays.createMany({
    data: holidayData,
    skipDuplicates: true,
  });

  return {
    totalUserSkills: userSkillsData.length,
    totalUserCertificates: userCertificatesData.length,
    totalEducation: educationData.length,
    totalExperience: experienceData.length,
    totalUserDivisions: userDivisionData.length,
    totalHolidays: holidayData.length
  };
}
