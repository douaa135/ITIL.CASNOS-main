const prisma = require('./src/services/prisma.service');

async function checkData() {
  try {
    const cabCount = await prisma.cab.count();
    const reunionCount = await prisma.reunionCab.count();
    const blackoutCount = await prisma.blackoutPeriod.count();
    
    console.log('CAB count:', cabCount);
    console.log('ReunionCab count:', reunionCount);
    console.log('BlackoutPeriod count:', blackoutCount);
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
