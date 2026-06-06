const prisma = require('./src/services/prisma.service');

async function checkData() {
  try {
    const cabs = await prisma.cab.findMany();
    console.log('Current CABS in DB:', JSON.stringify(cabs, null, 2));
  } catch (error) {
    console.error('Error fetching CABS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
