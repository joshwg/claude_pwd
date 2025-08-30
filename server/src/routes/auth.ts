import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { loginSchema } from '../utils/validation';

const router = express.Router();

// Progressive lockout durations in milliseconds
const LOCKOUT_DURATIONS = {
  3: 30 * 1000,      // 30 seconds for 3 attempts
  5: 3 * 60 * 1000,  // 3 minutes for 5 attempts
  8: 10 * 60 * 1000  // 10 minutes for 8 attempts
};

// Get lockout duration based on attempt count
const getLockoutDuration = (attempts: number): number => {
  if (attempts >= 8) return LOCKOUT_DURATIONS[8];
  if (attempts >= 5) return LOCKOUT_DURATIONS[5];
  if (attempts >= 3) return LOCKOUT_DURATIONS[3];
  return 0;
};

// Login
router.post('/login', async (req: any, res: any) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      });
    }

    const { name, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { name: name }
    }) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is currently locked out
    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
      return res.status(423).json({ 
        error: 'Account temporarily locked due to multiple failed login attempts',
        lockedUntil: user.lockedUntil,
        remainingSeconds: remainingTime,
        attempts: user.loginAttempts
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = user.loginAttempts + 1;
      const lockoutDuration = getLockoutDuration(newAttempts);
      
      const updateData: any = {
        loginAttempts: newAttempts,
        lastFailedLogin: now
      };

      // Apply lockout if threshold reached
      if (lockoutDuration > 0) {
        updateData.lockedUntil = new Date(now.getTime() + lockoutDuration);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData as any
      });

      if (lockoutDuration > 0) {
        const lockoutMinutes = lockoutDuration / (60 * 1000);
        return res.status(423).json({ 
          error: `Account locked for ${lockoutMinutes >= 1 ? `${lockoutMinutes} minutes` : '30 seconds'} due to ${newAttempts} failed login attempts`,
          lockedUntil: updateData.lockedUntil,
          remainingSeconds: Math.ceil(lockoutDuration / 1000),
          attempts: newAttempts
        });
      }

      return res.status(401).json({ 
        error: 'Invalid credentials',
        attempts: newAttempts,
        attemptsRemaining: Math.max(0, 3 - newAttempts)
      });
    }

    // Successful login - get failed attempt count before clearing
    const failedAttempts = user.loginAttempts >= 3 ? user.loginAttempts : 0;

    // Clear failed attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null
      } as any
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      },
      token,
      // Include failed attempts info if there were 3 or more failures
      ...(failedAttempts >= 3 && { previousFailedAttempts: failedAttempts })
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
router.get('/verify', async (req: any, res: any) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        isAdmin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
