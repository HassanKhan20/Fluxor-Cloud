import { Request } from 'express';
import { prisma } from './prisma';

/**
 * Resolves the storeId for an authenticated request.
 * Looks up the user's first active StoreMembership.
 */
export async function getStoreId(req: Request): Promise<string | null> {
    const userId = (req as any).user?.userId;
    if (!userId) return null;
    const membership = await prisma.storeMembership.findFirst({ where: { userId } });
    return membership?.storeId || null;
}
