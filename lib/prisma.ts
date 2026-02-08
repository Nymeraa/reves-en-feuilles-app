
// Mocking Prisma Client for now as we cannot generate it
export const prisma = {
    organization: {
        findUnique: async () => null,
        create: async () => ({ id: 'mock-org' }),
    },
    user: {
        findUnique: async () => null,
    }
} as any;
