import { PrismaClient } from '@prisma/client';

export async function seedProjects(prisma: PrismaClient) {
  console.log('🚀 Seeding projects...');

  // 1. Tạo customers - sử dụng upsert vì có ID cố định
  console.log('🏢 Tạo customers...');
  const customerData = [
    {
      id: 1,
      name: 'ABC Technology Corp',
      original_name: 'ABC Technology Corporation',
      code: 'ABC001',
      email: 'contact@abctech.com',
      phone: '+84-24-1234-5678',
      city: 'Hà Nội',
      domain: 'abctech.com',
      industry: 'Technology',
      state: 'Active',
      address: '123 Tech Street, Cau Giay District, Hanoi',
      supporter: 'John Doe',
      note: 'Long-term technology partner',
    },
    {
      id: 2,
      name: 'XYZ Financial Services',
      original_name: 'XYZ Financial Services Ltd',
      code: 'XYZ001',
      email: 'info@xyzfinance.com',
      phone: '+84-28-9876-5432',
      city: 'TP.Hồ Chí Minh',
      domain: 'xyzfinance.com',
      industry: 'Financial Services',
      state: 'Active',
      address: '456 Finance Avenue, District 1, Ho Chi Minh City',
      supporter: 'Jane Smith',
      note: 'Banking and finance solutions',
    },
    {
      id: 3,
      name: 'E-Commerce Solutions',
      original_name: 'E-Commerce Solutions Vietnam',
      code: 'ECS001',
      email: 'hello@ecommerce-vn.com',
      phone: '+84-236-123-4567',
      city: 'Đà Nẵng',
      domain: 'ecommerce-vn.com',
      industry: 'E-Commerce',
      state: 'Active',
      address: '789 Commerce Street, Hai Chau District, Da Nang',
      supporter: 'Mike Johnson',
      note: 'Online retail platform development',
    },
  ];

  const customers = await Promise.all(
    customerData.map(customer =>
      prisma.customers.upsert({
        where: { id: customer.id },
        update: {},
        create: customer,
      })
    )
  );

  // 2. Tạo projects - sử dụng upsert vì có ID cố định
  console.log('🚀 Tạo projects...');
  const projectData = [
    {
      id: 1,
      name: 'ABC CRM System',
      code: 'ABC-CRM-001',
      status: 'IN_PROGRESS',
      division_id: 4, // Development Team A
      team_id: 1, // Backend Team
      contract_type: 'FIXED_PRICE',
      project_type: 'CUSTOMER',
      billable: 50000.0,
      budget: 60000.0,
      rank: 1,
      customer_type: 'END_USER',
      industry: 'IT',
      scope: 'Full CRM system with customer management',
      number_process_apply: 5,
      description: 'Complete CRM system for ABC Technology',
      contract_information: 'Fixed price contract for 6 months',
      critical: 'High priority project',
      note: 'Client requires weekly demos',
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-07-15'),
    },
    {
      id: 2,
      name: 'XYZ Banking Mobile App',
      code: 'XYZ-MOBILE-001',
      status: 'IN_PROGRESS',
      division_id: 5, // Development Team B
      team_id: 3, // Mobile Team
      contract_type: 'LABO',
      project_type: 'CUSTOMER',
      billable: 80000.0,
      budget: 90000.0,
      rank: 1,
      customer_type: 'SI_COMPANY',
      industry: "OTHER",
      scope: 'Mobile banking application for iOS and Android',
      number_process_apply: 8,
      description: 'Mobile banking app with full features',
      contract_information: 'Labo contract for 12 months',
      critical: 'Critical security requirements',
      note: 'Requires security audit',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2025-02-01'),
    },
    {
      id: 3,
      name: 'E-Commerce Platform V2',
      code: 'ECS-PLATFORM-002',
      status: 'OPEN',
      division_id: 4, // Development Team A
      team_id: 2, // Frontend Team
      contract_type: 'FIXED_PRICE',
      project_type: 'CUSTOMER',
      billable: 75000.0,
      budget: 85000.0,
      rank: 2,
      customer_type: 'END_USER',
      scope: 'Modern e-commerce platform with admin panel',
      number_process_apply: 6,
      description: 'Next generation e-commerce platform',
      contract_information: 'Fixed price with milestone payments',
      critical: 'Performance optimization required',
      note: 'SEO and mobile optimization priority',
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-09-01'),
    },
    {
      id: 4,
      name: 'Internal HRM System',
      code: 'INT-HRM-001',
      status: 'IN_PROGRESS',
      division_id: 1, // Technology Division
      team_id: 1, // Backend Team
      contract_type: 'LABO',
      project_type: 'IN_HOUSE',
      billable: 0.0,
      budget: 30000.0,
      rank: 3,
      customer_type: null,
      industry: "MANUFACTURING",
      scope: 'Human Resource Management System',
      number_process_apply: 4,
      description: 'Internal HRM system for company use',
      contract_information: 'Internal project',
      critical: 'Medium priority',
      note: 'For internal use only',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-06-01'),
    },
  ];

  const projects = await Promise.all(
    projectData.map(project =>
      prisma.projects.upsert({
        where: { id: project.id },
        update: {},
        create: project,
      })
    )
  );

  // 3. Tạo customer_project relationships - sử dụng createMany với skipDuplicates
  console.log('🔗 Tạo customer-project relationships...');
  const customerProjectData = [
    {
      customer_id: customers[0].id,
      project_id: projects[0].id,
    },
    {
      customer_id: customers[1].id,
      project_id: projects[1].id,
    },
    {
      customer_id: customers[2].id,
      project_id: projects[2].id,
    },
  ];

  await prisma.customer_project.createMany({
    data: customerProjectData,
    skipDuplicates: true,
  });

  // 4. Tạo stages - sử dụng upsert vì có ID cố định
  console.log('📋 Tạo project stages...');
  const stageData = [
    // ABC CRM System stages
    {
      id: 1,
      project_id: projects[0].id,
      type: 'SPRINT',
      version: 'v1.0.0',
      status: 'CLOSED',
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-02-15'),
      replan_start_date: new Date('2024-01-15'),
      replan_end_date: new Date('2024-02-15'),
      replan_by: null,
      reason: null,
      description: 'Initial setup and user authentication',
    },
    {
      id: 2,
      project_id: projects[0].id,
      type: 'SPRINT',
      version: 'v1.1.0',
      status: 'IN_PROGRESS',
      start_date: new Date('2024-02-16'),
      end_date: new Date('2024-04-15'),
      replan_start_date: new Date('2024-02-16'),
      replan_end_date: new Date('2024-04-20'),
      replan_by: 'BY_TEAM',
      reason: 'Additional features requested',
      description: 'Customer management and contact features',
    },
    // XYZ Banking Mobile App stages
    {
      id: 3,
      project_id: projects[1].id,
      type: 'LABO',
      version: 'Phase 1',
      status: 'IN_PROGRESS',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-08-01'),
      replan_start_date: new Date('2024-02-01'),
      replan_end_date: new Date('2024-08-01'),
      replan_by: null,
      reason: null,
      description: 'Core banking features and security implementation',
    },
    // E-Commerce Platform stages
    {
      id: 4,
      project_id: projects[2].id,
      type: 'SOLUTION',
      version: 'Discovery',
      status: 'OPEN',
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-04-01'),
      replan_start_date: new Date('2024-03-01'),
      replan_end_date: new Date('2024-04-01'),
      replan_by: null,
      reason: null,
      description: 'Requirements analysis and system design',
    },
  ];

  const stages = await Promise.all(
    stageData.map(stage =>
      prisma.stages.upsert({
        where: { id: stage.id },
        update: {},
        create: stage,
      })
    )
  );

  return {
    customers,
    projects,
    stages,
  };
}
