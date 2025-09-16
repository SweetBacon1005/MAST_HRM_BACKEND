import { PrismaClient } from '@prisma/client';

export async function seedProjects(prisma: PrismaClient) {
  console.log('🚀 Seeding projects...');

  // 1. Tạo customers
  console.log('🏢 Tạo customers...');
  const customers = await Promise.all([
    prisma.customers.upsert({
      where: { id: 1 },
      update: {},
      create: {
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
    }),
    prisma.customers.upsert({
      where: { id: 2 },
      update: {},
      create: {
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
    }),
    prisma.customers.upsert({
      where: { id: 3 },
      update: {},
      create: {
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
    }),
  ]);

  // 2. Tạo projects
  console.log('🚀 Tạo projects...');
  const projects = await Promise.all([
    prisma.projects.upsert({
      where: { id: 1 },
      update: {},
      create: {
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
        industry: 1,
        language: 'Vietnamese, English',
        scope: 'Full CRM system with customer management',
        number_process_apply: 5,
        legal: 'AMELA_JP',
        communication: 'Daily standup, Weekly review',
        description: 'Complete CRM system for ABC Technology',
        contract_information: 'Fixed price contract for 6 months',
        critical: 'High priority project',
        note: 'Client requires weekly demos',
        teams_webhook_url: 'https://hooks.slack.com/services/abc-crm',
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-07-15'),
      },
    }),
    prisma.projects.upsert({
      where: { id: 2 },
      update: {},
      create: {
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
        industry: 2,
        language: 'English, Vietnamese',
        scope: 'Mobile banking application for iOS and Android',
        number_process_apply: 8,
        legal: 'AMELA_VN',
        communication: 'Bi-weekly meetings, Monthly review',
        description: 'Mobile banking app with full features',
        contract_information: 'Labo contract for 12 months',
        critical: 'Critical security requirements',
        note: 'Requires security audit',
        teams_webhook_url: 'https://hooks.slack.com/services/xyz-mobile',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2025-02-01'),
      },
    }),
    prisma.projects.upsert({
      where: { id: 3 },
      update: {},
      create: {
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
        industry: 3,
        language: 'Vietnamese',
        scope: 'Modern e-commerce platform with admin panel',
        number_process_apply: 6,
        legal: 'AMELA_VN',
        communication: 'Agile methodology, Sprint reviews',
        description: 'Next generation e-commerce platform',
        contract_information: 'Fixed price with milestone payments',
        critical: 'Performance optimization required',
        note: 'SEO and mobile optimization priority',
        teams_webhook_url: 'https://hooks.slack.com/services/ecs-platform',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-09-01'),
      },
    }),
    prisma.projects.upsert({
      where: { id: 4 },
      update: {},
      create: {
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
        industry: null,
        language: 'Vietnamese',
        scope: 'Human Resource Management System',
        number_process_apply: 4,
        legal: 'AMELA_VN',
        communication: 'Weekly team meetings',
        description: 'Internal HRM system for company use',
        contract_information: 'Internal project',
        critical: 'Medium priority',
        note: 'For internal use only',
        teams_webhook_url: null,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-06-01'),
      },
    }),
  ]);

  // 3. Tạo customer_project relationships
  console.log('🔗 Tạo customer-project relationships...');
  await Promise.all([
    prisma.customer_project.create({
      data: {
        customer_id: customers[0].id,
        project_id: projects[0].id,
      },
    }),
    prisma.customer_project.create({
      data: {
        customer_id: customers[1].id,
        project_id: projects[1].id,
      },
    }),
    prisma.customer_project.create({
      data: {
        customer_id: customers[2].id,
        project_id: projects[2].id,
      },
    }),
  ]);

  // 4. Tạo stages
  console.log('📋 Tạo project stages...');
  const stages = await Promise.all([
    // ABC CRM System stages
    prisma.stages.upsert({
      where: { id: 1 },
      update: {},
      create: {
        project_id: projects[0].id,
        type: 'SPRINT',
        version: 'v1.0.0',
        status: 'CLOSED',
        billable: 15000.0,
        budget: 18000.0,
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-02-15'),
        replan_start_date: new Date('2024-01-15'),
        replan_end_date: new Date('2024-02-15'),
        replan_by: null,
        reason: null,
        description: 'Initial setup and user authentication',
      },
    }),
    prisma.stages.upsert({
      where: { id: 2 },
      update: {},
      create: {
        project_id: projects[0].id,
        type: 'SPRINT',
        version: 'v1.1.0',
        status: 'IN_PROGRESS',
        billable: 20000.0,
        budget: 22000.0,
        start_date: new Date('2024-02-16'),
        end_date: new Date('2024-04-15'),
        replan_start_date: new Date('2024-02-16'),
        replan_end_date: new Date('2024-04-20'),
        replan_by: 'BY_TEAM',
        reason: 'Additional features requested',
        description: 'Customer management and contact features',
      },
    }),
    // XYZ Banking Mobile App stages
    prisma.stages.upsert({
      where: { id: 3 },
      update: {},
      create: {
        project_id: projects[1].id,
        type: 'LABO',
        version: 'Phase 1',
        status: 'IN_PROGRESS',
        billable: 40000.0,
        budget: 45000.0,
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-08-01'),
        replan_start_date: new Date('2024-02-01'),
        replan_end_date: new Date('2024-08-01'),
        replan_by: null,
        reason: null,
        description: 'Core banking features and security implementation',
      },
    }),
    // E-Commerce Platform stages
    prisma.stages.upsert({
      where: { id: 4 },
      update: {},
      create: {
        project_id: projects[2].id,
        type: 'SOLUTION',
        version: 'Discovery',
        status: 'OPEN',
        billable: 10000.0,
        budget: 12000.0,
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-04-01'),
        replan_start_date: new Date('2024-03-01'),
        replan_end_date: new Date('2024-04-01'),
        replan_by: null,
        reason: null,
        description: 'Requirements analysis and system design',
      },
    }),
  ]);

  return {
    customers,
    projects,
    stages,
  };
}
