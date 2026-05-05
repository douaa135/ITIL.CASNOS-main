const { PrismaClient } = require('@prisma/client');
try {
  const { PrismaPg } = require('@prisma/adapter-pg');
  console.log('PrismaPg is available');
} catch (e) {
  console.error('PrismaPg is NOT available:', e.message);
}
