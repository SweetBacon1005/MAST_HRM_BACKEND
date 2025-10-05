import { PrismaClient } from '@prisma/client';

export async function seedSkillsAndCertificates(prisma: PrismaClient) {
  console.log('🛠️ Seeding skills and certificates...');

  // 1. Tạo skills - sử dụng createMany với skipDuplicates
  console.log('🛠️ Tạo skills...');
  const skillData = [
    // Backend skills
    { name: 'Node.js', position_id: 1 },
    { name: 'NestJS', position_id: 1 },
    { name: 'Express.js', position_id: 1 },
    { name: 'PHP', position_id: 1 },
    { name: 'Laravel', position_id: 1 },
    { name: 'Java', position_id: 1 },
    { name: 'Spring Boot', position_id: 1 },
    { name: 'Python', position_id: 1 },
    { name: 'Django', position_id: 1 },
    // Frontend skills
    { name: 'React.js', position_id: 2 },
    { name: 'Vue.js', position_id: 2 },
    { name: 'Angular', position_id: 2 },
    { name: 'Next.js', position_id: 2 },
    { name: 'TypeScript', position_id: 2 },
    { name: 'JavaScript', position_id: 2 },
    // Mobile skills
    { name: 'React Native', position_id: 4 },
    { name: 'Flutter', position_id: 4 },
    { name: 'iOS Native', position_id: 4 },
    { name: 'Android Native', position_id: 4 },
    // Testing skills
    { name: 'Manual Testing', position_id: 5 },
    { name: 'Automation Testing', position_id: 5 },
    { name: 'Selenium', position_id: 5 },
    // DevOps skills
    { name: 'Docker', position_id: 6 },
    { name: 'Kubernetes', position_id: 6 },
    { name: 'AWS', position_id: 6 },
    { name: 'CI/CD', position_id: 6 },
  ];

  await prisma.skills.createMany({
    data: skillData,
    skipDuplicates: true,
  });

  const skills = await prisma.skills.findMany({
    where: { name: { in: skillData.map(s => s.name) } },
  });

  // 2. Tạo certificate_categories - sử dụng createMany với skipDuplicates
  console.log('🏆 Tạo certificate categories...');
  const certificateCategoryData = [
    { name: 'Cloud Computing' },
    { name: 'Programming Languages' },
    { name: 'Project Management' },
    { name: 'Quality Assurance' },
  ];

  await prisma.certificate_categories.createMany({
    data: certificateCategoryData,
    skipDuplicates: true,
  });

  const certificateCategories = await prisma.certificate_categories.findMany({
    where: { name: { in: certificateCategoryData.map(cc => cc.name) } },
  });

  // 3. Tạo certificates - sử dụng createMany với skipDuplicates
  console.log('🏅 Tạo certificates...');
  const certificateData = [
    {
      name: 'AWS Certified Solutions Architect',
      certificate_category_id: certificateCategories[0].id,
    },
    {
      name: 'Oracle Java SE Certification',
      certificate_category_id: certificateCategories[1].id,
    },
    {
      name: 'PMP - Project Management Professional',
      certificate_category_id: certificateCategories[2].id,
    },
    {
      name: 'ISTQB Foundation Level',
      certificate_category_id: certificateCategories[3].id,
    },
  ];

  await prisma.certificates.createMany({
    data: certificateData,
    skipDuplicates: true,
  });

  const certificates = await prisma.certificates.findMany({
    where: { name: { in: certificateData.map(c => c.name) } },
  });

  return {
    skills,
    certificateCategories,
    certificates,
  };
}
