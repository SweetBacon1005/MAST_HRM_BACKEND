import { PrismaClient, projects } from '@prisma/client';

export async function seedProjects(prisma: PrismaClient) {
  console.log('🚀 Seeding projects...');

  // 2. Tạo projects
  console.log('🚀 Tạo projects...');
  const projectData = [
    {
      name: 'ABC CRM System',
      code: 'ABC-CRM-001',
      status: 'IN_PROGRESS' as const,
      division_id: 4, // Development Team A
      team_id: 1, // Backend Team
      project_type: 'CUSTOMER' as const,
      billable: 50000.0,
      budget: 60000.0,
      rank: 1,
      industry: 'IT' as const,
      scope: 'Full CRM system with customer management',
      number_process_apply: 5,
      description: 'Complete CRM system for ABC Technology',
      critical: 'High priority project',
      note: 'Client requires weekly demos',
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-07-15'),
    },
    {
      name: 'XYZ Banking Mobile App',
      code: 'XYZ-MOBILE-001',
      status: 'IN_PROGRESS' as const,
      division_id: 5, // Development Team B
      team_id: 3, // Mobile Team
      project_type: 'CUSTOMER' as const,
      billable: 80000.0,
      budget: 90000.0,
      rank: 1,
      industry: 'FINANCE' as const,
      scope: 'Mobile banking application for iOS and Android',
      number_process_apply: 8,
      description: 'Mobile banking app with full features',
      critical: 'Critical security requirements',
      note: 'Requires security audit',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2025-02-01'),
    },
    {
      name: 'E-Commerce Platform V2',
      code: 'ECS-PLATFORM-002',
      status: 'OPEN' as const,
      division_id: 4, // Development Team A
      team_id: 2, // Frontend Team
      project_type: 'CUSTOMER' as const,
      billable: 75000.0,
      budget: 85000.0,
      rank: 2,
      industry: 'IT' as const,
      scope: 'Modern e-commerce platform with admin panel',
      number_process_apply: 6,
      description: 'Next generation e-commerce platform',
      critical: 'Performance optimization required',
      note: 'SEO and mobile optimization priority',
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-09-01'),
    },
    {
      name: 'Internal HRM System',
      code: 'INT-HRM-001',
      status: 'IN_PROGRESS' as const,
      division_id: 1, // Technology Division
      team_id: 1, // Backend Team
      project_type: 'IN_HOUSE' as const,
      billable: 0.0,
      budget: 30000.0,
      rank: 3,
      industry: 'IT' as const,
      scope: 'Human Resource Management System',
      number_process_apply: 4,
      description: 'Internal HRM system for company use',
      critical: 'Medium priority',
      note: 'For internal use only',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-06-01'),
    },
  ];

  // Check if projects already exist by code, if not create them
  const createdProjects: projects[] = [];
  for (const projectInfo of projectData) {
    const existingProject = await prisma.projects.findFirst({
      where: { code: projectInfo.code },
    });

    if (existingProject) {
      console.log(`✓ Project ${projectInfo.code} already exists`);
      createdProjects.push(existingProject);
    } else {
      const project = await prisma.projects.create({
        data: projectInfo,
      });
      console.log(`✓ Created project: ${project.name}`);
      createdProjects.push(project);
    }
  }

  return {
    projects: createdProjects,
  };
}
