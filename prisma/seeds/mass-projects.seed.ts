import { PrismaClient } from '@prisma/client';

// Danh sách tên dự án thực tế
const PROJECT_NAMES = [
  'Banking Core System', 'E-Commerce Platform', 'Mobile Banking App', 'CRM System',
  'ERP Solution', 'Healthcare Management', 'Education Portal', 'Real Estate Platform',
  'Food Delivery App', 'Travel Booking System', 'Inventory Management', 'HR Management System',
  'Financial Dashboard', 'Social Media Platform', 'IoT Monitoring System', 'AI Chatbot Platform',
  'Blockchain Wallet', 'Video Streaming Service', 'Online Learning Platform', 'Telemedicine App',
  'Supply Chain Management', 'Customer Support Portal', 'Digital Marketing Platform', 'Fleet Management',
  'Property Management System', 'Restaurant POS System', 'Warehouse Management', 'Event Management',
  'Document Management System', 'Project Management Tool', 'Time Tracking System', 'Payroll System',
  'Accounting Software', 'Booking Management', 'Content Management System', 'API Gateway',
  'Microservices Platform', 'Data Analytics Dashboard', 'Business Intelligence Tool', 'Compliance Management'
];

const PROJECT_CODES = [
  'BANK', 'ECOM', 'MBANK', 'CRM', 'ERP', 'HEALTH', 'EDU', 'REAL',
  'FOOD', 'TRAVEL', 'INV', 'HRM', 'FIN', 'SOCIAL', 'IOT', 'AI',
  'BLOCK', 'VIDEO', 'LEARN', 'TELE', 'SUPPLY', 'SUPPORT', 'MARKET', 'FLEET',
  'PROP', 'REST', 'WARE', 'EVENT', 'DOC', 'PM', 'TIME', 'PAY',
  'ACC', 'BOOK', 'CMS', 'API', 'MICRO', 'DATA', 'BI', 'COMP'
];

const COMPANIES = [
  'VietinBank', 'Techcombank', 'BIDV', 'Vietcombank', 'Sacombank',
  'FPT Software', 'TMA Solutions', 'KMS Technology', 'NashTech', 'Axon Active',
  'Vingroup', 'VNG Corporation', 'Tiki', 'Shopee Vietnam', 'Grab Vietnam',
  'VietJet Air', 'Vietnam Airlines', 'Vinhomes', 'Masan Group', 'Hoa Phat Group',
  'Samsung Vietnam', 'LG Electronics', 'Honda Vietnam', 'Toyota Vietnam', 'Panasonic Vietnam'
];

const TASK_TYPES = ['Story', 'Bug', 'Task', 'Epic', 'Sub-task'];
const TASK_STATUSES = ['To Do', 'In Progress', 'Code Review', 'Testing', 'Done', 'Blocked'];

// Hàm tạo ngày ngẫu nhiên trong khoảng
function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

// Hàm tạo task title
function generateTaskTitle(projectName: string, taskType: string): string {
  const actions = {
    'Story': ['Implement', 'Create', 'Develop', 'Build', 'Design'],
    'Bug': ['Fix', 'Resolve', 'Debug', 'Correct', 'Handle'],
    'Task': ['Setup', 'Configure', 'Update', 'Optimize', 'Refactor'],
    'Epic': ['Complete', 'Deliver', 'Implement', 'Build', 'Create'],
    'Sub-task': ['Add', 'Update', 'Fix', 'Implement', 'Test']
  };

  const features = [
    'user authentication', 'payment gateway', 'notification system', 'dashboard',
    'user profile', 'search functionality', 'data export', 'reporting module',
    'admin panel', 'mobile responsive', 'API integration', 'database optimization',
    'security enhancement', 'performance improvement', 'UI/UX update', 'testing coverage'
  ];

  const action = actions[taskType as keyof typeof actions][Math.floor(Math.random() * actions[taskType as keyof typeof actions].length)];
  const feature = features[Math.floor(Math.random() * features.length)];
  
  return `${action} ${feature}`;
}

export async function seedMassProjects(prisma: PrismaClient, seedData: any) {
  console.log('🚀 Seeding mass projects and tasks...');

  const { massUsers, users: originalUsers } = seedData;
  const allUsers = [...(originalUsers || []), ...(massUsers || [])];

  // Lấy divisions và teams
  const divisions = await prisma.divisions.findMany();
  const teams = await prisma.teams.findMany();

  // Tạo 50 projects
  const numberOfProjects = 50;
  const projectData: any[] = [];

  for (let i = 0; i < numberOfProjects; i++) {
    const projectName = PROJECT_NAMES[i % PROJECT_NAMES.length];
    const projectCode = `${PROJECT_CODES[i % PROJECT_CODES.length]}-${(i + 1).toString().padStart(3, '0')}`;
    const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
    
    const startDate = randomDateBetween(new Date('2023-01-01'), new Date('2024-06-01'));
    const endDate = new Date(startDate.getTime() + (Math.random() * 365 + 90) * 24 * 60 * 60 * 1000); // 3-15 months

    const budget = (Math.random() * 200000 + 20000); // 20k - 220k USD
    const billable = budget * (0.7 + Math.random() * 0.3); // 70-100% of budget

    projectData.push({
      name: `${company} ${projectName}`,
      code: projectCode,
      status: ['OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED'][Math.floor(Math.random() * 4)] as any,
      division_id: divisions[Math.floor(Math.random() * divisions.length)]?.id || null,
      team_id: teams[Math.floor(Math.random() * teams.length)]?.id || null,
      project_type: ['CUSTOMER', 'IN_HOUSE', 'START_UP', 'INTERNAL'][Math.floor(Math.random() * 4)] as any,
      billable: Math.round(billable),
      budget: Math.round(budget),
      rank: Math.floor(Math.random() * 5) + 1,
      industry: ['IT', 'FINANCE', 'MANUFACTURING', 'OTHER'][Math.floor(Math.random() * 4)] as any,
      scope: `Complete ${projectName.toLowerCase()} solution with modern architecture`,
      number_process_apply: Math.floor(Math.random() * 8) + 3,
      description: `${projectName} for ${company} - comprehensive solution with full features`,
      critical: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
      note: `Project for ${company} - requires ${Math.floor(Math.random() * 10) + 5} team members`,
      start_date: startDate,
      end_date: endDate,
    });
  }

  console.log(`🚀 Tạo ${numberOfProjects} projects...`);
  
  // Tạo projects với batch processing
  const batchSize = 25;
  const createdProjects: any[] = [];
  
  for (let i = 0; i < projectData.length; i += batchSize) {
    const batch = projectData.slice(i, i + batchSize);
    const batchProjects = await Promise.all(
      batch.map((project) =>
        prisma.projects.upsert({
          where: { id: project.id },
          update: {},
          create: project,
        }),
      ),
    );
    createdProjects.push(...batchProjects);
    console.log(`✓ Created projects batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(projectData.length / batchSize)}`);
  }

  // Tạo project role assignments
  console.log('👥 Tạo project role assignments...');
  const projectRoleData: any[] = [];
  
  for (const project of createdProjects) {
    // Mỗi project có 3-8 members
    const memberCount = Math.floor(Math.random() * 6) + 3;
    const selectedUsers = allUsers
      .sort(() => Math.random() - 0.5)
      .slice(0, memberCount);

    for (let i = 0; i < selectedUsers.length; i++) {
      const user = selectedUsers[i];
      // Get user's role from user_information
      const userInfo = await prisma.user_information.findUnique({
        where: { user_id: user.id },
        include: { role: true }
      });

      if (userInfo) {
        projectRoleData.push({
          project_id: project.id,
          user_id: user.id,
          role_id: userInfo.role_id,
          position_in_project: i === 0 ? 1 : (i === 1 ? 2 : 3), // 1: monitor, 2: supporter, 3: implementor
        });
      }
    }
  }

  // Batch create project roles
  for (let i = 0; i < projectRoleData.length; i += batchSize) {
    const batch = projectRoleData.slice(i, i + batchSize);
    await prisma.project_role_user.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created project roles batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(projectRoleData.length / batchSize)}`);
  }

  // Tạo tasks cho mỗi project
  console.log('📋 Tạo tasks cho projects...');
  const taskData: any[] = [];
  
  for (const project of createdProjects) {
    // Mỗi project có 10-30 tasks
    const taskCount = Math.floor(Math.random() * 21) + 10;
    
    // Get project members
    const projectMembers = await prisma.project_role_user.findMany({
      where: { project_id: project.id },
      include: { user: true }
    });

    for (let i = 0; i < taskCount; i++) {
      const taskType = TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)];
      const assignedUser = projectMembers[Math.floor(Math.random() * projectMembers.length)];
      
      const taskStartDate = randomDateBetween(project.start_date, project.end_date);
      const taskDueDate = new Date(taskStartDate.getTime() + (Math.random() * 14 + 1) * 24 * 60 * 60 * 1000); // 1-14 days

      taskData.push({
        project_id: project.id,
        issue_id: Math.floor(Math.random() * 10000) + 1000, // Random issue ID
        user_id: assignedUser.user_id,
        title: generateTaskTitle(project.name, taskType),
        issue_type: taskType,
        status: TASK_STATUSES[Math.floor(Math.random() * TASK_STATUSES.length)],
        start_date: taskStartDate,
        due_date: taskDueDate,
        estimate_hours: Math.floor(Math.random() * 40) + 8, // 8-48 hours
        actual_hours: Math.floor(Math.random() * 50) + 5, // 5-55 hours
        billable: Math.floor(Math.random() * 2), // 0 or 1
      });
    }
  }

  // Batch create tasks
  for (let i = 0; i < taskData.length; i += batchSize) {
    const batch = taskData.slice(i, i + batchSize);
    await prisma.tasks.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created tasks batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(taskData.length / batchSize)}`);
  }

  return {
    massProjects: createdProjects,
    totalProjects: numberOfProjects,
    totalTasks: taskData.length,
    totalProjectRoles: projectRoleData.length
  };
}
