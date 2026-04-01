import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { sendPasswordResetEmail } from '../services/emailService';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, storeName, storeAddress, timezone, currency } = req.body;

        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters' });
        }
        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Valid email is required' });
        }
        if (!password || typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }
        if (!storeName || typeof storeName !== 'string' || storeName.trim().length < 2) {
            return res.status(400).json({ message: 'Store name must be at least 2 characters' });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.create({
                data: {
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    password: hashedPassword,
                    role: 'OWNER',
                },
            });

            const store = await tx.store.create({
                data: {
                    name: storeName.trim(),
                    address: storeAddress?.trim() || null,
                    timezone: timezone || 'UTC',
                    defaultCurrency: currency || 'USD',
                    products: { create: [] }
                },
            });

            await tx.storeMembership.create({
                data: { userId: user.id, storeId: store.id, role: 'OWNER' },
            });

            return { user, store };
        });

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) return res.status(500).json({ message: 'Server configuration error' });

        const token = jwt.sign(
            { userId: result.user.id, email: result.user.email },
            jwtSecret,
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

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { stores: { include: { store: true } } }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) return res.status(500).json({ message: 'Server configuration error' });

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            jwtSecret,
            { expiresIn: '7d' }
        );

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

// Returns the authenticated user's profile — lets frontend verify token is still valid
export const getMe = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true },
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { name: name.trim() },
            select: { id: true, name: true, email: true, role: true }
        });

        res.json({ user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Admin: create a new client account + store (only OWNER role can do this)
export const createClient = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const adminUserId = req.user?.userId;
        if (!adminUserId) return res.status(401).json({ message: 'Unauthorized' });

        // Verify the caller is an OWNER
        const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
        if (!adminUser || adminUser.role !== 'OWNER') {
            return res.status(403).json({ message: 'Only admins can create client accounts' });
        }

        const { name, email, storeName, storeAddress, timezone, currency } = req.body;

        if (!name || !email || !storeName) {
            return res.status(400).json({ message: 'Name, email, and store name are required' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Valid email is required' });
        }

        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existing) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        // Generate a random temporary password
        const tempPassword = crypto.randomBytes(6).toString('hex'); // 12-char random password
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        const result = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.create({
                data: {
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    password: hashedPassword,
                    role: 'OWNER',
                },
            });

            const store = await tx.store.create({
                data: {
                    name: storeName.trim(),
                    address: storeAddress?.trim() || null,
                    timezone: timezone || 'UTC',
                    defaultCurrency: currency || 'USD',
                },
            });

            await tx.storeMembership.create({
                data: { userId: user.id, storeId: store.id, role: 'OWNER' },
            });

            return { user, store };
        });

        // Send them a password reset email so they can set their own password
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours for new accounts

        await prisma.user.update({
            where: { id: result.user.id },
            data: { passwordResetToken: hashedToken, passwordResetExpiry: expiry }
        });

        await sendPasswordResetEmail(result.user.email, rawToken);

        res.status(201).json({
            message: 'Client account created. A password setup email has been sent.',
            user: { id: result.user.id, name: result.user.name, email: result.user.email },
            store: { id: result.store.id, name: result.store.name },
            tempPassword // Include in response so admin can share it manually if email fails
        });
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Change password (authenticated user)
export const changePassword = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Step 1 of password reset — send email with reset link
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }

        // Generate a secure random token
        const rawToken = crypto.randomBytes(32).toString('hex');
        // Store hashed version in DB (raw token goes in the email link)
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordResetToken: hashedToken, passwordResetExpiry: expiry }
        });

        const sent = await sendPasswordResetEmail(user.email, rawToken);

        if (!sent) {
            console.warn('[Auth] Email service not configured — reset token generated but not sent');
        }

        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Step 2 of password reset — validate token and set new password
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ message: 'Reset token is required' });
        }
        if (!password || typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        // Hash the incoming token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpiry: { gt: new Date() }  // Must not be expired
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpiry: null
            }
        });

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
