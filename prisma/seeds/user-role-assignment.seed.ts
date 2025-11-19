import { PrismaClient, ScopeType } from '@prisma/client';

export async function seedUserRoleAssignment(prisma: PrismaClient, seedData: any) {
  console.log('👤 Seeding user role assignments...');

  const roles = await prisma.roles.findMany();
  const divisions = await prisma.divisions.findMany();
  const teams = await prisma.teams.findMany();
  const projects = await prisma.projects.findMany({ take: 50 });
  const users = await prisma.users.findMany({ take: 400 });

  if (users.length === 0) {
    console.log('⚠️  No users found. Skipping user role assignment seeding.');
    return;
  }

  const adminRole = roles.find(r => r.name === 'admin');
  const hrManagerRole = roles.find(r => r.name === 'hr_manager');
  const divisionHeadRole = roles.find(r => r.name === 'division_head');
  const teamLeaderRole = roles.find(r => r.name === 'team_leader');
  const projectManagerRole = roles.find(r => r.name === 'project_manager');
  const employeeRole = roles.find(r => r.name === 'employee');

  if (!adminRole || !employeeRole) {
    console.log('⚠️  Required roles not found. Skipping user role assignment seeding.');
    return;
  }

  await prisma.user_role_assignment.deleteMany({});

  const assignments: any[] = [];
  let userIndex = 0;

  assignments.push(
    { user_id: users[userIndex++].id, role_id: adminRole.id, scope_type: ScopeType.COMPANY, scope_id: null, assigned_by: users[0].id },
    { user_id: users[userIndex++].id, role_id: adminRole.id, scope_type: ScopeType.COMPANY, scope_id: null, assigned_by: users[0].id },
  );

  if (hrManagerRole) {
    assignments.push(
      { user_id: users[userIndex++].id, role_id: hrManagerRole.id, scope_type: ScopeType.COMPANY, scope_id: null, assigned_by: users[0].id },
      { user_id: users[userIndex++].id, role_id: hrManagerRole.id, scope_type: ScopeType.COMPANY, scope_id: null, assigned_by: users[0].id },
    );
  }

  if (divisionHeadRole && divisions.length > 0) {
    for (let i = 0; i < Math.min(divisions.length, 10); i++) {
      if (userIndex >= users.length) break;
      const divisionHeadId = users[userIndex++].id;
      assignments.push({
        user_id: divisionHeadId,
        role_id: divisionHeadRole.id,
        scope_type: ScopeType.DIVISION,
        scope_id: divisions[i].id,
        assigned_by: users[0].id,
      });

      for (let j = 0; j < 8 && userIndex < users.length; j++) {
        assignments.push({
          user_id: users[userIndex++].id,
          role_id: employeeRole.id,
          scope_type: ScopeType.DIVISION,
          scope_id: divisions[i].id,
          assigned_by: divisionHeadId,
        });
      }
    }
  }

  if (teamLeaderRole && teams.length > 0) {
    for (let i = 0; i < Math.min(teams.length, 12); i++) {
      if (userIndex >= users.length) break;
      const teamLeaderId = users[userIndex++].id;
      assignments.push({
        user_id: teamLeaderId,
        role_id: teamLeaderRole.id,
        scope_type: ScopeType.TEAM,
        scope_id: teams[i].id,
        assigned_by: users[0].id,
      });

      for (let j = 0; j < 10 && userIndex < users.length; j++) {
        assignments.push({
          user_id: users[userIndex++].id,
          role_id: employeeRole.id,
          scope_type: ScopeType.TEAM,
          scope_id: teams[i].id,
          assigned_by: teamLeaderId,
        });
      }
    }
  }

  if (projectManagerRole && projects.length > 0) {
    for (let i = 0; i < Math.min(projects.length, 50); i++) {
      if (userIndex >= users.length) break;
      const projectManagerId = users[userIndex++].id;
      assignments.push({
        user_id: projectManagerId,
        role_id: projectManagerRole.id,
        scope_type: ScopeType.PROJECT,
        scope_id: projects[i].id,
        assigned_by: users[0].id,
      });

      const memberCount = Math.floor(Math.random() * 5) + 3;
      for (let j = 0; j < memberCount && userIndex < users.length; j++) {
        assignments.push({
          user_id: users[userIndex++].id,
          role_id: employeeRole.id,
          scope_type: ScopeType.PROJECT,
          scope_id: projects[i].id,
          assigned_by: projectManagerId,
        });
      }
    }
  }

  while (userIndex < users.length) {
    const randomDivision = divisions[Math.floor(Math.random() * divisions.length)];
    if (randomDivision) {
      assignments.push({
        user_id: users[userIndex++].id,
        role_id: employeeRole.id,
        scope_type: ScopeType.DIVISION,
        scope_id: randomDivision.id,
        assigned_by: users[0].id,
      });
    } else {
      break;
    }
  }

  await prisma.user_role_assignment.createMany({
    data: assignments,
    skipDuplicates: true,
  });

  const stats = {
    total: assignments.length,
    company: assignments.filter(a => a.scope_type === ScopeType.COMPANY).length,
    division: assignments.filter(a => a.scope_type === ScopeType.DIVISION).length,
    team: assignments.filter(a => a.scope_type === ScopeType.TEAM).length,
    project: assignments.filter(a => a.scope_type === ScopeType.PROJECT).length,
  };

  console.log(`✅ Created ${stats.total} user role assignments:`);
  console.log(`   - COMPANY scope: ${stats.company}`);
  console.log(`   - DIVISION scope: ${stats.division}`);
  console.log(`   - TEAM scope: ${stats.team}`);
  console.log(`   - PROJECT scope: ${stats.project}`);

  return { assignments: stats };
}
