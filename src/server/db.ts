import "@/server/server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 런타임 클라이언트는 드라이버 어댑터가 필요하다.
 * 연결 문자열은 환경 변수에서만 읽고 코드에 두지 않는다.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// dev 환경의 HMR에서 커넥션이 쌓이지 않게 전역에 보관한다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
