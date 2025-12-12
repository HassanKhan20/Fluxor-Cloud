import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, storeName, storeAddress, timezone, currency } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User, Store, and Membership in transaction
        const result = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: 'OWNER',
                },
            });

            const store = await tx.store.create({
                data: {
                    name: storeName,
                    address: storeAddress,
                    timezone: timezone || 'UTC',
                    defaultCurrency: currency || 'USD',
                    products: {
                        create: [] // Initialize with empty products if needed, or leave blank
                    }
                },
            });

            await tx.storeMembership.create({
                data: {
                    userId: user.id,
                    storeId: store.id,
                    role: 'OWNER',
                },
            });

            return { user, store };
        });

        const token = jwt.sign(
            { userId: result.user.id, email: result.user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User and Store created successfully',
            token,
            user: { id: result.user.id, name: result.user.name, email: result.user.email },
            store: result.store
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                stores: {
                    include: {
                        store: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        // Get the first store (MVP assumption: user has one active store context usually)
        const activeStore = user.stores[0]?.store || null;

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            activeStore
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
