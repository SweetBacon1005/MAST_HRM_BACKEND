import { PrismaClient } from '@prisma/client';

export async function seedSkillsAndCertificates(prisma: PrismaClient) {
  console.log('🛠️ Seeding skills and certificates...');

  // 1. Tạo skills
  console.log('🛠️ Tạo skills...');
  const skills = await Promise.all([
    // Backend skills
    prisma.skills.upsert({
      where: { name: 'Node.js' },
      update: {},
      create: { name: 'Node.js', position_id: 1 },
    }),
    prisma.skills.upsert({
      where: { name: 'NestJS' },
      update: {},
      create: { name: 'NestJS', position_id: 1 },
    }),
    prisma.skills.upsert({
      where: { name: 'Express.js' },
      update: {},
      create: { name: 'Express.js', position_id: 1 },
    }),
    prisma.skills.upsert({
      where: { name: 'PHP' },
      update: {},
      create: { name: 'PHP', position_id: 1 },
    }),
    prisma.skills.upsert({
      where: { name: 'Laravel' },
      update: {},
      create: { name: 'Laravel', position_id: 1 },
    }),
    prisma.skills.upsert({
      where: { name: 'Java' },
      update: {},
      create: { name: 'Java', position_id: 1 },
    }),
    prisma.skills.upsert({
      where: { name: 'Spring Boot' },
      update: {},
      create: { name: 'Spring Boot', position_id: 1 },
    }),
    prisma.skills.upsert({
      where: { name: 'Python' },
      update: {},
      create: { name: 'Python', position_id: 1 },
    }),
    prisma.skills.upsert({
      where: { name: 'Django' },
      update: {},
      create: { name: 'Django', position_id: 1 },
    }),
    // Frontend skills
    prisma.skills.upsert({
      where: { name: 'React.js' },
      update: {},
      create: { name: 'React.js', position_id: 2 },
    }),
    prisma.skills.upsert({
      where: { name: 'Vue.js' },
      update: {},
      create: { name: 'Vue.js', position_id: 2 },
    }),
    prisma.skills.upsert({
      where: { name: 'Angular' },
      update: {},
      create: { name: 'Angular', position_id: 2 },
    }),
    prisma.skills.upsert({
      where: { name: 'Next.js' },
      update: {},
      create: { name: 'Next.js', position_id: 2 },
    }),
    prisma.skills.upsert({
      where: { name: 'TypeScript' },
      update: {},
      create: { name: 'TypeScript', position_id: 2 },
    }),
    prisma.skills.upsert({
      where: { name: 'JavaScript' },
      update: {},
      create: { name: 'JavaScript', position_id: 2 },
    }),
    // Mobile skills
    prisma.skills.upsert({
      where: { name: 'React Native' },
      update: {},
      create: { name: 'React Native', position_id: 4 },
    }),
    prisma.skills.upsert({
      where: { name: 'Flutter' },
      update: {},
      create: { name: 'Flutter', position_id: 4 },
    }),
    prisma.skills.upsert({
      where: { name: 'iOS Native' },
      update: {},
      create: { name: 'iOS Native', position_id: 4 },
    }),
    prisma.skills.upsert({
      where: { name: 'Android Native' },
      update: {},
      create: { name: 'Android Native', position_id: 4 },
    }),
    // Testing skills
    prisma.skills.upsert({
      where: { name: 'Manual Testing' },
      update: {},
      create: { name: 'Manual Testing', position_id: 5 },
    }),
    prisma.skills.upsert({
      where: { name: 'Automation Testing' },
      update: {},
      create: { name: 'Automation Testing', position_id: 5 },
    }),
    prisma.skills.upsert({
      where: { name: 'Selenium' },
      update: {},
      create: { name: 'Selenium', position_id: 5 },
    }),
    // DevOps skills
    prisma.skills.upsert({
      where: { name: 'Docker' },
      update: {},
      create: { name: 'Docker', position_id: 6 },
    }),
    prisma.skills.upsert({
      where: { name: 'Kubernetes' },
      update: {},
      create: { name: 'Kubernetes', position_id: 6 },
    }),
    prisma.skills.upsert({
      where: { name: 'AWS' },
      update: {},
      create: { name: 'AWS', position_id: 6 },
    }),
    prisma.skills.upsert({
      where: { name: 'CI/CD' },
      update: {},
      create: { name: 'CI/CD', position_id: 6 },
    }),
  ]);

  // 2. Tạo certificate_categories
  console.log('🏆 Tạo certificate categories...');
  const certificateCategories = await Promise.all([
    prisma.certificate_categories.upsert({
      where: { name: 'Cloud Computing' },
      update: {},
      create: { name: 'Cloud Computing' },
    }),
    prisma.certificate_categories.upsert({
      where: { name: 'Programming Languages' },
      update: {},
      create: { name: 'Programming Languages' },
    }),
    prisma.certificate_categories.upsert({
      where: { name: 'Project Management' },
      update: {},
      create: { name: 'Project Management' },
    }),
    prisma.certificate_categories.upsert({
      where: { name: 'Quality Assurance' },
      update: {},
      create: { name: 'Quality Assurance' },
    }),
  ]);

  // 3. Tạo certificates
  const certificates = await Promise.all([
    prisma.certificates.upsert({
      where: { name: 'AWS Certified Solutions Architect' },
      update: {},
      create: {
        name: 'AWS Certified Solutions Architect',
        certificate_category_id: certificateCategories[0].id,
      },
    }),
    prisma.certificates.upsert({
      where: { name: 'Oracle Java SE Certification' },
      update: {},
      create: {
        name: 'Oracle Java SE Certification',
        certificate_category_id: certificateCategories[1].id,
      },
    }),
    prisma.certificates.upsert({
      where: { name: 'PMP - Project Management Professional' },
      update: {},
      create: {
        name: 'PMP - Project Management Professional',
        certificate_category_id: certificateCategories[2].id,
      },
    }),
    prisma.certificates.upsert({
      where: { name: 'ISTQB Foundation Level' },
      update: {},
      create: {
        name: 'ISTQB Foundation Level',
        certificate_category_id: certificateCategories[3].id,
      },
    }),
  ]);

  return {
    skills,
    certificateCategories,
    certificates,
  };
}
