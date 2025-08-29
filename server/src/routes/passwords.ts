import express from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { 
  createPasswordEntrySchema, 
  updatePasswordEntrySchema, 
  searchPasswordsSchema 
} from '../utils/validation';
import { generateSalt, encrypt, decrypt } from '../utils/crypto';

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
      orderBy: [
        { site: 'asc' },
        { username: 'asc' }
      ]
    });

    // Transform to include decrypted data and tag information directly
    const formattedEntries = passwordEntries.map(entry => ({
      ...entry,
      password: entry.password ? decrypt(entry.password, entry.salt) : null,
      notes: entry.notes ? decrypt(entry.notes, entry.salt) : null,
      tags: entry.tags.map((t: any) => t.tag),
      salt: undefined // Remove salt from response for security
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

    // Transform to include decrypted data and tag information directly
    const formattedEntry = {
      ...passwordEntry,
      password: passwordEntry.password ? decrypt(passwordEntry.password, passwordEntry.salt) : null,
      notes: passwordEntry.notes ? decrypt(passwordEntry.notes, passwordEntry.salt) : null,
      tags: passwordEntry.tags.map((t: any) => t.tag),
      salt: undefined // Remove salt from response for security
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

    // Check for uniqueness: site + username combination for this user
    const existingEntry = await prisma.passwordEntry.findFirst({
      where: { site, username, userId }
    });

    if (existingEntry) {
      return res.status(400).json({ 
        error: 'Password entry already exists for this site and username combination' 
      });
    }

    // Check password length and add warning
    const warnings = [];
    if (password && password.length < 12) {
      warnings.push('Password is less than 12 characters - consider using a stronger password');
    }

    // Verify all tag IDs belong to the user
    if (tagIds && tagIds.length > 0) {
      const userTags = await prisma.tag.findMany({
        where: { id: { in: tagIds }, userId }
      });

      if (userTags.length !== tagIds.length) {
        return res.status(400).json({ error: 'Some tags do not belong to you' });
      }
    }

    // Generate salt for encryption
    const salt = generateSalt();

    // Encrypt password and notes
    const encryptedPassword = password ? encrypt(password, salt) : null;
    const encryptedNotes = notes ? encrypt(notes, salt) : null;

    // Create password entry
    const passwordEntry = await prisma.passwordEntry.create({
      data: {
        site,
        username,
        password: encryptedPassword,
        notes: encryptedNotes,
        salt,
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

    // Decrypt for response
    const decryptedEntry = {
      ...passwordEntry,
      password: passwordEntry.password ? decrypt(passwordEntry.password, passwordEntry.salt) : null,
      notes: passwordEntry.notes ? decrypt(passwordEntry.notes, passwordEntry.salt) : null,
      tags: passwordEntry.tags.map((t: any) => t.tag),
      salt: undefined // Remove salt from response for security
    };

    const response: any = { passwordEntry: decryptedEntry };
    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    res.status(201).json(response);
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

    // Check for uniqueness if site or username is being changed
    const newSite = site || existingEntry.site;
    const newUsername = username || existingEntry.username;
    
    if (site !== undefined || username !== undefined) {
      const duplicateEntry = await prisma.passwordEntry.findFirst({
        where: { 
          site: newSite, 
          username: newUsername, 
          userId,
          NOT: { id }
        }
      });

      if (duplicateEntry) {
        return res.status(400).json({ 
          error: 'Password entry already exists for this site and username combination' 
        });
      }
    }

    // Check password length and add warning
    const warnings = [];
    if (password !== undefined && password && password.length < 12) {
      warnings.push('Password is less than 12 characters - consider using a stronger password');
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

    // Prepare update data with encryption
    const updateData: any = {};
    
    if (site !== undefined) updateData.site = site;
    if (username !== undefined) updateData.username = username;
    
    // Handle password encryption
    if (password !== undefined) {
      updateData.password = password ? encrypt(password, existingEntry.salt) : null;
    }
    
    // Handle notes encryption  
    if (notes !== undefined) {
      updateData.notes = notes ? encrypt(notes, existingEntry.salt) : null;
    }

    // Update password entry
    const updatedEntry = await prisma.passwordEntry.update({
      where: { id },
      data: {
        ...updateData,
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

    // Decrypt for response
    const decryptedEntry = {
      ...updatedEntry,
      password: updatedEntry.password ? decrypt(updatedEntry.password, updatedEntry.salt) : null,
      notes: updatedEntry.notes ? decrypt(updatedEntry.notes, updatedEntry.salt) : null,
      tags: updatedEntry.tags.map((t: any) => t.tag),
      salt: undefined // Remove salt from response for security
    };

    const response: any = { passwordEntry: decryptedEntry };
    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    res.json(response);
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

// Validate site+username combination
router.post('/validate-entry', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { site, username, excludeId } = req.body;
    const userId = req.user!.id;
    
    if (!site || !username) {
      return res.status(400).json({ error: 'Site and username are required' });
    }

    const whereClause: any = { site, username, userId };
    if (excludeId) {
      whereClause.NOT = { id: excludeId };
    }

    const existingEntry = await prisma.passwordEntry.findFirst({
      where: whereClause
    });

    res.json({ 
      available: !existingEntry,
      message: existingEntry ? 'Password entry already exists for this site and username combination' : 'Site and username combination is available'
    });
  } catch (error) {
    console.error('Error validating password entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
