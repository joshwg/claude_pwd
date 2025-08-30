import express from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createTagSchema, updateTagSchema } from '../utils/validation';

const router = express.Router();

// Get user's tags
router.get('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const userId = req.user!.id;

    const tags = await prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { passwordEntries: true }
        }
      }
    });

    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new tag
router.post('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const validation = createTagSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      });
    }

    const { name, description, color } = validation.data;
    const userId = req.user!.id;

    // Check if tag with same name already exists for user
    const existingTag = await prisma.tag.findUnique({
      where: {
        name_userId: {
          name: name,
          userId
        }
      }
    });

    if (existingTag) {
      return res.status(400).json({ error: 'Tag with this name already exists' });
    }

    const tag = await prisma.tag.create({
      data: {
        name: name,
        description,
        color,
        userId
      },
      include: {
        _count: {
          select: { passwordEntries: true }
        }
      }
    });

    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tag
router.put('/:id', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const validation = updateTagSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      });
    }

    const { name, description, color } = validation.data;
    const userId = req.user!.id;

    // Check if tag exists and belongs to user
    const existingTag = await prisma.tag.findFirst({
      where: { id, userId }
    });

    if (!existingTag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if new name conflicts with existing tag
    if (name && name !== existingTag.name) {
      const conflictTag = await prisma.tag.findUnique({
        where: {
          name_userId: {
            name: name,
            userId
          }
        }
      });
      
      if (conflictTag) {
        return res.status(400).json({ error: 'Tag with this name already exists' });
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name && { name: name }),
        ...(description !== undefined && { description }),
        ...(color && { color })
      },
      include: {
        _count: {
          select: { passwordEntries: true }
        }
      }
    });

    res.json(updatedTag);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete tag
router.delete('/:id', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if tag exists and belongs to user
    const existingTag = await prisma.tag.findFirst({
      where: { id, userId }
    });

    if (!existingTag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Delete tag (cascade will handle password entry associations)
    await prisma.tag.delete({
      where: { id }
    });

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate tag name
router.post('/validate-name', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { name, excludeId } = req.body;
    const userId = req.user!.id;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Check if tag with same name already exists for user (case insensitive)
    const existingTag = await prisma.tag.findFirst({
      where: {
        userId,
        name: name,
        // Exclude current tag when editing
        ...(excludeId && { id: { not: excludeId } })
      }
    });

    const isValid = !existingTag;
    const message = isValid ? 'Tag name is available' : 'Tag name already exists';

    res.json({ isValid, message });
  } catch (error) {
    console.error('Error validating tag name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
