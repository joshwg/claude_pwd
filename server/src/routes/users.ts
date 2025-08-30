import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { 
  createUserSchema, 
  updateUserSchema, 
  updatePasswordSchema, 
  adminUpdatePasswordSchema 
} from '../utils/validation';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const validation = createUserSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      });
    }

    const { name, password, isAdmin } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { name: name }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name,
        password: hashedPassword,
        isAdmin: isAdmin || false
      },
      select: {
        id: true,
        name: true,
        isAdmin: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only, cannot modify own admin status)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validation = updateUserSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      });
    }

    const { name, isAdmin } = validation.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent user from modifying their own admin status
    if (id === req.user!.id && isAdmin !== undefined) {
      return res.status(403).json({ error: 'Cannot modify your own admin status' });
    }

    // Check if new name conflicts with existing user
    if (name && name !== existingUser.name) {
      const conflictUser = await prisma.user.findUnique({
        where: { name: name }
      });
      
      if (conflictUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name: name }),
        ...(isAdmin !== undefined && { isAdmin })
      },
      select: {
        id: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only, cannot delete self)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if user exists and get related data counts for logging
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tags: true,
            passwordEntries: true
          }
        }
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent user from deleting themselves
    if (id === req.user!.id) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    // Log what will be cascade deleted
    console.log(`Deleting user "${existingUser.name}" with ${existingUser._count.tags} tags and ${existingUser._count.passwordEntries} password entries`);

    // Delete user (cascade will automatically handle related data)
    // This will cascade delete:
    // - All tags belonging to this user
    // - All password entries belonging to this user  
    // - All password entry tags associated with the user's tags and password entries
    await prisma.user.delete({
      where: { id }
    });

    console.log(`Successfully deleted user "${existingUser.name}" and all related data`);
    res.json({ 
      message: 'User deleted successfully',
      deletedData: {
        user: existingUser.name,
        tags: existingUser._count.tags,
        passwordEntries: existingUser._count.passwordEntries
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update own password
router.put('/me/password', authenticate, async (req: AuthRequest, res) => {
  try {
    const validation = updatePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      });
    }

    const { currentPassword, newPassword } = validation.data;
    const userId = req.user!.id;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin update user password
router.put('/:id/password', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validation = adminUpdatePasswordSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      });
    }

    const { newPassword } = validation.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating user password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate username availability (admin only)
router.post('/validate-username', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, excludeId } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const whereClause: any = { name: name };
    if (excludeId) {
      whereClause.NOT = { id: excludeId };
    }

    const existingUser = await prisma.user.findFirst({
      where: whereClause
    });

    res.json({ 
      available: !existingUser,
      message: existingUser ? 'Username already exists' : 'Username is available'
    });
  } catch (error) {
    console.error('Error validating username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
