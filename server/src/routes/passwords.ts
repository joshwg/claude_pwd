import express from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { 
  createPasswordEntrySchema, 
  updatePasswordEntrySchema, 
  searchPasswordsSchema 
} from '../utils/validation';

const router = express.Router();

// Get user's password entries with search/filter
router.get('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const userId = req.user!.id;
    const { query, tagIds } = req.query;

    let whereClause: any = { userId };

    // Text search in site or username
    if (query && typeof query === 'string') {
      whereClause.OR = [
        { site: { contains: query, mode: 'insensitive' } },
        { username: { contains: query, mode: 'insensitive' } }
      ];
    }

    // Tag filter
    if (tagIds) {
      const tagIdArray = Array.isArray(tagIds) ? tagIds : [tagIds];
      whereClause.tags = {
        some: {
          tagId: { in: tagIdArray }
        }
      };
    }

    const passwordEntries = await prisma.passwordEntry.findMany({
      where: whereClause,
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: { site: 'asc' }
    });

    // Transform to include tag information directly
    const formattedEntries = passwordEntries.map(entry => ({
      ...entry,
      tags: entry.tags.map(t => t.tag)
    }));

    res.json(formattedEntries);
  } catch (error) {
    console.error('Error fetching password entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single password entry
router.get('/:id', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const passwordEntry = await prisma.passwordEntry.findFirst({
      where: { id, userId },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!passwordEntry) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    // Transform to include tag information directly
    const formattedEntry = {
      ...passwordEntry,
      tags: passwordEntry.tags.map(t => t.tag)
    };

    res.json(formattedEntry);
  } catch (error) {
    console.error('Error fetching password entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new password entry
router.post('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const validation = createPasswordEntrySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      });
    }

    const { site, username, password, notes, tagIds } = validation.data;
    const userId = req.user!.id;

    // Verify all tag IDs belong to the user
    if (tagIds && tagIds.length > 0) {
      const userTags = await prisma.tag.findMany({
        where: { id: { in: tagIds }, userId }
      });

      if (userTags.length !== tagIds.length) {
        return res.status(400).json({ error: 'Some tags do not belong to you' });
      }
    }

    // Create password entry
    const passwordEntry = await prisma.passwordEntry.create({
      data: {
        site,
        username,
        password,
        notes,
        userId,
        tags: {
          create: tagIds?.map(tagId => ({ tagId })) || []
        }
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // Transform to include tag information directly
    const formattedEntry = {
      ...passwordEntry,
      tags: passwordEntry.tags.map(t => t.tag)
    };

    res.status(201).json(formattedEntry);
  } catch (error) {
    console.error('Error creating password entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update password entry
router.put('/:id', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const validation = updatePasswordEntrySchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      });
    }

    const { site, username, password, notes, tagIds } = validation.data;
    const userId = req.user!.id;

    // Check if password entry exists and belongs to user
    const existingEntry = await prisma.passwordEntry.findFirst({
      where: { id, userId }
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    // Verify all tag IDs belong to the user if provided
    if (tagIds && tagIds.length > 0) {
      const userTags = await prisma.tag.findMany({
        where: { id: { in: tagIds }, userId }
      });

      if (userTags.length !== tagIds.length) {
        return res.status(400).json({ error: 'Some tags do not belong to you' });
      }
    }

    // Update password entry
    const updatedEntry = await prisma.passwordEntry.update({
      where: { id },
      data: {
        ...(site && { site }),
        ...(username && { username }),
        ...(password && { password }),
        ...(notes !== undefined && { notes }),
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map(tagId => ({ tagId }))
          }
        })
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // Transform to include tag information directly
    const formattedEntry = {
      ...updatedEntry,
      tags: updatedEntry.tags.map(t => t.tag)
    };

    res.json(formattedEntry);
  } catch (error) {
    console.error('Error updating password entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete password entry
router.delete('/:id', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if password entry exists and belongs to user
    const existingEntry = await prisma.passwordEntry.findFirst({
      where: { id, userId }
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    // Delete password entry (cascade will handle tag associations)
    await prisma.passwordEntry.delete({
      where: { id }
    });

    res.json({ message: 'Password entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting password entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
