require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

async function run() {
  await prisma.utilisateur.updateMany({ where: { email_user: 'change.manager@casnos.dz' }, data: { email_user: 'k.merabti@casnos.dz' } });
  await prisma.utilisateur.updateMany({ where: { email_user: 'demandeur@casnos.dz' }, data: { email_user: 's.rahmani@casnos.dz' } });
  await prisma.utilisateur.updateMany({ where: { email_user: 'implementeur@casnos.dz' }, data: { email_user: 'y.benamara@casnos.dz' } });
  await prisma.utilisateur.updateMany({ where: { email_user: 'cab@casnos.dz' }, data: { email_user: 'n.hamdi@casnos.dz' } });
  await prisma.utilisateur.updateMany({ where: { email_user: 'servicedesk@casnos.dz' }, data: { email_user: 'r.tlemcani@casnos.dz' } });
  await prisma.utilisateur.updateMany({ where: { email_user: 'inactif@casnos.dz' }, data: { email_user: 'o.khelifi@casnos.dz' } });
  console.log('Updated users mapping');
}

run().catch(console.error).finally(() => prisma.$disconnect());
