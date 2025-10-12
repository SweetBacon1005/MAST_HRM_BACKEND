import { PrismaClient } from '@prisma/client';

export async function seedBasicData(prisma: PrismaClient) {
  console.log('📝 Seeding basic data (levels, positions, languages)...');
  
  // 1. Tạo levels - sử dụng upsert vì có ID cố định
  console.log('📊 Tạo levels...');
  const levelData = [
    { id: 1, name: 'Intern', coefficient: 0.5 },
    { id: 2, name: 'Fresher', coefficient: 0.8 },
    { id: 3, name: 'Junior', coefficient: 1.0 },
    { id: 4, name: 'Middle', coefficient: 1.5 },
    { id: 5, name: 'Senior', coefficient: 2.0 },
    { id: 6, name: 'Lead', coefficient: 2.5 },
    { id: 7, name: 'Principal', coefficient: 3.0 },
  ];

  const levels = await Promise.all(
    levelData.map(level =>
      prisma.levels.upsert({
        where: { id: level.id },
        update: {},
        create: level,
      })
    )
  );

  // 2. Tạo positions - sử dụng upsert vì có ID cố định
  console.log('💼 Tạo positions...');
  const positionData = [
    { id: 1, name: 'Backend Developer', is_active_project: true },
    { id: 2, name: 'Frontend Developer', is_active_project: true },
    { id: 3, name: 'Full Stack Developer', is_active_project: true },
    { id: 4, name: 'Mobile Developer', is_active_project: true },
    { id: 5, name: 'QA Tester', is_active_project: true },
    { id: 6, name: 'DevOps Engineer', is_active_project: true },
    { id: 7, name: 'UI/UX Designer', is_active_project: true },
    { id: 8, name: 'Project Manager', is_active_project: false },
    { id: 9, name: 'Business Analyst', is_active_project: true },
    { id: 10, name: 'Scrum Master', is_active_project: false },
  ];

  const positions = await Promise.all(
    positionData.map(position =>
      prisma.positions.upsert({
        where: { id: position.id },
        update: {},
        create: position,
      })
    )
  );

  // 3. Tạo languages - sử dụng upsert vì có ID cố định
  console.log('🌍 Tạo languages...');
  const languageData = [
    { id: 1, name: 'Vietnamese' },
    { id: 2, name: 'English' },
    { id: 3, name: 'Japanese' },
    { id: 4, name: 'Korean' },
  ];

  const languages = await Promise.all(
    languageData.map(language =>
      prisma.languages.upsert({
        where: { id: language.id },
        update: {},
        create: language,
      })
    )
  );

  return {
    levels,
    positions,
    languages,
  };
}
