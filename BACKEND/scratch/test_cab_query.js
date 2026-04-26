const prisma = require('../src/services/prisma.service');
const userService = require('../src/services/user.service');

async function testQuery() {
  try {
    const roleName = 'MEMBRE_CAB';
    console.log(`Testing query for role: ${roleName}`);
    
    // Exactly what the controller does
    const result = await userService.getAllUsers({ nom_role: roleName, actif: 'true', limit: 200 });
    
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(`Found ${result.data?.length || 0} users.`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
