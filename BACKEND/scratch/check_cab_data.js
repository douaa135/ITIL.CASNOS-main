const prisma = require('../src/services/prisma.service');

async function checkData() {
  try {
    const roles = await prisma.role.findMany();
    console.log('--- ROLES ---');
    roles.forEach(r => console.log(`- ${r.nom_role} (${r.code_metier})`));

    const users = await prisma.utilisateur.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    console.log('\n--- USERS ---');
    users.forEach(u => {
      const uRoles = u.userRoles.map(ur => ur.role.nom_role).join(', ');
      console.log(`- ${u.prenom_user} ${u.nom_user} [${u.email_user}] Roles: [${uRoles}] Actif: ${u.actif}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
