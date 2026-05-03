/**
 * ============================================================
 * Prisma Client — instance unique (singleton)
 * ============================================================
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = global.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;
// si on est en mode développement, on stocke l'instance de Prisma dans la variable globale `global.prisma` 
// pour éviter de créer plusieurs instances lors du rechargement du code. En production, on crée simplement 
// une nouvelle instance sans la stocker globalement.

// Cette approche garantit que nous avons une seule instance de Prisma Client tout au long de l'application, 
// ce qui est important pour la gestion des connexions à la base de données et les performances.
