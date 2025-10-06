import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedUsers(prisma: PrismaClient, seedData: any) {
  console.log('👤 Seeding users...');

  const { roles } = seedData;
  const hashedPassword = await bcrypt.hash('123456', 10);
  const mastPassword = await bcrypt.hash('Mast@123', 10);

  // 1. Tạo users - sử dụng upsert vì cần email unique
  console.log('👤 Tạo users...');
  const userData = [
    {
      name: 'System Admin',
      email: 'admin@company.com',
      password: hashedPassword,
      email_verified_at: new Date(),
    },
    {
      name: 'HR Manager',
      email: 'hr.manager@company.com',
      password: hashedPassword,
      email_verified_at: new Date(),
    },
    {
      name: 'John Doe',
      email: 'john.doe@company.com',
      password: hashedPassword,
      email_verified_at: new Date(),
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      password: hashedPassword,
      email_verified_at: new Date(),
    },
    {
      name: 'Mike Johnson',
      email: 'mike.johnson@company.com',
      password: hashedPassword,
      email_verified_at: new Date(),
    },
    {
      name: 'Sarah Wilson',
      email: 'sarah.wilson@company.com',
      password: hashedPassword,
      email_verified_at: new Date(),
    },
    {
      name: 'David Brown',
      email: 'david.brown@company.com',
      password: hashedPassword,
      email_verified_at: new Date(),
    },
    {
      name: 'Lisa Davis',
      email: 'lisa.davis@company.com',
      password: hashedPassword,
      email_verified_at: new Date(),
    },
    {
      name: 'User Example',
      email: 'user@example.com',
      password: mastPassword,
      email_verified_at: new Date(),
    },
  ];

  const users = await Promise.all(
    userData.map(user =>
      prisma.users.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      })
    )
  );

  // 2. Tạo user_information - sử dụng upsert vì có user_id unique
  console.log('📋 Tạo user information...');
  const userInfoData = [
    {
      status: 'ACTIVE' as const,
      user_id: users[0].id,
      email: 'admin@company.com',
      personal_email: 'admin.personal@gmail.com',
      nationality: 'Vietnamese',
      name: 'System Admin',
      code: 'EMP001',
      avatar: '/avatars/admin.jpg',
      gender: 'Male',
      marital: 'Single',
      birthday: new Date('1990-01-15'),
      position_id: 8, // Project Manager
      office_id: 1, // Hà Nội Office
      address: '123 Main St, Hà Nội',
      temp_address: '123 Main St, Hà Nội',
      phone: '+84901234567',
      tax_code: 'TAX001',
      role_id: roles[0].id, // admin
      description: 'System Administrator',
      level_id: 7, // Principal
      note: 'Super admin user',
      overview: 'Experienced system administrator',
      expertise: 'System Administration',
      technique: 'DevOps, System Management',
      main_task: 'System Administration',
      language_id: 2, // English
    },
    {
      status: 'ACTIVE' as const,
      user_id: users[1].id,
      email: 'hr.manager@company.com',
      personal_email: 'hr.personal@gmail.com',
      nationality: 'Vietnamese',
      name: 'HR Manager',
      code: 'EMP002',
      avatar: '/avatars/hr.jpg',
      gender: 'Female',
      marital: 'Married',
      birthday: new Date('1988-03-20'),
      position_id: 8, // Project Manager
      office_id: 1,
      address: '456 HR St, Hà Nội',
      temp_address: '456 HR St, Hà Nội',
      phone: '+84901234568',
      tax_code: 'TAX002',
      role_id: roles[1].id, // manager
      description: 'Human Resources Manager',
      level_id: 6, // Lead
      note: 'HR Manager',
      overview: 'HR management expert',
      expertise: 'Human Resources',
      technique: 'HR Management, Recruitment',
      main_task: 'HR Management',
      language_id: 1, // Vietnamese
    },
    {
      status: 'ACTIVE' as const,
      user_id: users[2].id,
      email: 'john.doe@company.com',
      personal_email: 'john.personal@gmail.com',
      nationality: 'Vietnamese',
      name: 'John Doe',
      code: 'EMP003',
      avatar: '/avatars/john.jpg',
      gender: 'Male',
      marital: 'Single',
      birthday: new Date('1995-07-10'),
      position_id: 1, // Backend Developer
      office_id: 1,
      address: '789 Dev St, Hà Nội',
      temp_address: '789 Dev St, Hà Nội',
      phone: '+84901234569',
      tax_code: 'TAX003',
      role_id: roles[3].id, // developer
      description: 'Senior Backend Developer',
      level_id: 5, // Senior
      note: 'Senior backend developer',
      overview: 'Experienced in Node.js and NestJS',
      expertise: 'Backend Development',
      technique: 'Node.js, NestJS, TypeScript',
      main_task: 'Backend Development',
      language_id: 2, // English
    },
    {
      status: 'ACTIVE' as const,
      user_id: users[3].id,
      email: 'jane.smith@company.com',
      personal_email: 'jane.personal@gmail.com',
      nationality: 'Vietnamese',
      name: 'Jane Smith',
      code: 'EMP004',
      avatar: '/avatars/jane.jpg',
      gender: 'Female',
      marital: 'Single',
      birthday: new Date('1993-11-25'),
      position_id: 2, // Frontend Developer
      office_id: 1,
      address: '321 Frontend Ave, Hà Nội',
      temp_address: '321 Frontend Ave, Hà Nội',
      phone: '+84901234570',
      tax_code: 'TAX004',
      role_id: roles[3].id, // developer
      description: 'Senior Frontend Developer',
      level_id: 5, // Senior
      note: 'Senior frontend developer',
      overview: 'Expert in React and Vue.js',
      expertise: 'Frontend Development',
      technique: 'React.js, Vue.js, TypeScript',
      main_task: 'Frontend Development',
      language_id: 2, // English
    },
    {
      status: 'ACTIVE' as const,
      user_id: users[4].id,
      email: 'mike.johnson@company.com',
      personal_email: 'mike.personal@gmail.com',
      nationality: 'Vietnamese',
      name: 'Mike Johnson',
      code: 'EMP005',
      avatar: '/avatars/mike.jpg',
      gender: 'Male',
      marital: 'Married',
      birthday: new Date('1992-05-18'),
      position_id: 4, // Mobile Developer
      office_id: 2,
      address: '654 Mobile St, TP.HCM',
      temp_address: '654 Mobile St, TP.HCM',
      phone: '+84901234571',
      tax_code: 'TAX005',
      role_id: roles[3].id, // developer
      description: 'Mobile Developer',
      level_id: 4, // Middle
      note: 'Mobile developer',
      overview: 'React Native and Flutter expert',
      expertise: 'Mobile Development',
      technique: 'React Native, Flutter',
      main_task: 'Mobile Development',
      language_id: 2, // English
    },
    {
      status: 'ACTIVE' as const,
      user_id: users[5].id,
      email: 'sarah.wilson@company.com',
      personal_email: 'sarah.personal@gmail.com',
      nationality: 'Vietnamese',
      name: 'Sarah Wilson',
      code: 'EMP006',
      avatar: '/avatars/sarah.jpg',
      gender: 'Female',
      marital: 'Single',
      birthday: new Date('1994-09-12'),
      position_id: 5, // QA Tester
      office_id: 1,
      address: '987 QA Lane, Hà Nội',
      temp_address: '987 QA Lane, Hà Nội',
      phone: '+84901234572',
      tax_code: 'TAX006',
      role_id: roles[4].id, // tester
      description: 'Senior QA Tester',
      level_id: 5, // Senior
      note: 'Senior QA tester',
      overview: 'Manual and automation testing expert',
      expertise: 'Quality Assurance',
      technique: 'Manual Testing, Selenium, Automation',
      main_task: 'Quality Assurance',
      language_id: 2, // English
    },
    {
      status: 'ACTIVE' as const,
      user_id: users[6].id,
      email: 'david.brown@company.com',
      personal_email: 'david.personal@gmail.com',
      nationality: 'Vietnamese',
      name: 'David Brown',
      code: 'EMP007',
      avatar: '/avatars/david.jpg',
      gender: 'Male',
      marital: 'Married',
      birthday: new Date('1991-12-03'),
      position_id: 6, // DevOps Engineer
      office_id: 1,
      address: '147 DevOps Rd, Hà Nội',
      temp_address: '147 DevOps Rd, Hà Nội',
      phone: '+84901234573',
      tax_code: 'TAX007',
      role_id: roles[3].id, // developer
      description: 'DevOps Engineer',
      level_id: 4, // Middle
      note: 'DevOps engineer',
      overview: 'Infrastructure and deployment expert',
      expertise: 'DevOps',
      technique: 'Docker, Kubernetes, AWS, CI/CD',
      main_task: 'DevOps Engineering',
      language_id: 2, // English
    },
    {
      status: 'ACTIVE' as const,
      user_id: users[7].id,
      email: 'lisa.davis@company.com',
      personal_email: 'lisa.personal@gmail.com',
      nationality: 'Vietnamese',
      name: 'Lisa Davis',
      code: 'EMP008',
      avatar: '/avatars/lisa.jpg',
      gender: 'Female',
      marital: 'Single',
      birthday: new Date('1996-04-28'),
      position_id: 7, // UI/UX Designer
      office_id: 3,
      address: '258 Design St, Đà Nẵng',
      temp_address: '258 Design St, Đà Nẵng',
      phone: '+84901234574',
      tax_code: 'TAX008',
      role_id: roles[5].id, // employee
      description: 'UI/UX Designer',
      level_id: 3, // Junior
      note: 'UI/UX designer',
      overview: 'Creative designer with modern UI/UX skills',
      expertise: 'UI/UX Design',
      technique: 'Figma, Adobe XD, Sketch',
      main_task: 'UI/UX Design',
      language_id: 1, // Vietnamese
    },
    {
      status: 'ACTIVE' as const,
      user_id: users[8].id,
      email: 'user@example.com',
      personal_email: 'user.personal@gmail.com',
      nationality: 'Vietnamese',
      name: 'User Example',
      code: 'EMP009',
      avatar: '/avatars/user.jpg',
      gender: 'Male',
      marital: 'Single',
      birthday: new Date('1995-01-01'),
      position_id: 1, // Backend Developer
      office_id: 1,
      address: '123 Example St, Hà Nội',
      temp_address: '123 Example St, Hà Nội',
      phone: '+84901234575',
      tax_code: 'TAX009',
      role_id: roles[5].id, // employee
      description: 'Example User',
      level_id: 3, // Junior
      note: 'Example user for testing',
      overview: 'New employee for testing purposes',
      expertise: 'General',
      technique: 'Various technologies',
      main_task: 'General tasks',
      language_id: 1, // Vietnamese
    },
  ];

  await Promise.all(
    userInfoData.map(userInfo =>
      prisma.user_information.upsert({
        where: { user_id: userInfo.user_id },
        update: {},
        create: userInfo,
      })
    )
  );

  return { users };
}
