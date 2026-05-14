import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  migrations:{
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
})