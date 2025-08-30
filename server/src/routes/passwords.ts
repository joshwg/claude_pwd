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
    
    // Parse and validate query parameters
    const validation = searchPasswordsSchema.safeParse({
      query: req.query.query,
      tagIds: req.query.tagIds ? (Array.isArray(req.query.tagIds) ? req.query.tagIds : [req.query.tagIds]) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    });

    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid search parameters', details: validation.error });
    }

    const { query, tagIds, limit, offset } = validation.data;

    let whereClause: any = { userId };

    // Text search in site, username, or notes (encrypted notes will be searched after decryption)
    if (query && query.trim()) {
      whereClause.OR = [
        { site: { contains: query.trim(), mode: 'insensitive' } },
        { username: { contains: query.trim(), mode: 'insensitive' } }
      ];
    }

    // Tag filter
    if (tagIds && tagIds.length > 0) {
      whereClause.tags = {
        some: {
          tagId: { in: tagIds }
        }
      };
    }

    // First get the total count for pagination info
    const totalCount = await prisma.passwordEntry.count({
      where: whereClause
    });

    // Fetch limited password entries with pagination
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
      ],
      take: limit,
      skip: offset
    });

    // Transform to include decrypted data and tag information directly
    // Only decrypt passwords (not notes) and never send salt to client
    const formattedEntries = passwordEntries.map(entry => {
      const entryWithSalt = entry as any; // Type assertion to access salt field
      const decryptedEntry = {
        id: entry.id,
        site: entry.site,
        username: entry.username,
        password: entry.password ? decrypt(entry.password, entryWithSalt.salt) : null,
        hasNotes: Boolean(entry.notes), // Just indicate if notes exist, don't send them
        userId: entry.userId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        tags: entry.tags.map((t: any) => t.tag)
        // Explicitly exclude: notes, salt
      };

      // If there's a text query, check if this entry matches
      // We need to decrypt notes temporarily just for filtering, not for response
      if (query && query.trim() && entry.notes) {
        const queryLower = query.trim().toLowerCase();
        const decryptedNotes = decrypt(entry.notes, entryWithSalt.salt);
        const matchesNotes = decryptedNotes.toLowerCase().includes(queryLower);
        const matchesSite = entry.site.toLowerCase().includes(queryLower);
        const matchesUsername = entry.username.toLowerCase().includes(queryLower);
        
        // Only return if it matches the search criteria
        if (!matchesSite && !matchesUsername && !matchesNotes) {
          return null;
        }
      }

      return decryptedEntry;
    }).filter(entry => entry !== null); // Remove null entries

    res.json({
      entries: formattedEntries,
      pagination: {
        total: totalCount,
        limit: limit || 100,
        offset: offset || 0,
        hasMore: (offset || 0) + (limit || 100) < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching password entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notes for a specific password entry (separate endpoint for security)
router.get('/:id/notes', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const passwordEntry = await prisma.passwordEntry.findFirst({
      where: { id, userId }
    });

    if (!passwordEntry) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    // Decrypt and return only the notes
    const decryptedNotes = passwordEntry.notes ? decrypt(passwordEntry.notes, (passwordEntry as any).salt) : null;
    
    res.json({ 
      id: passwordEntry.id,
      notes: decryptedNotes 
    });
  } catch (error) {
    console.error('Error fetching password entry notes:', error);
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

    // Transform to exclude salt and notes for security
    const formattedEntry = {
      id: passwordEntry.id,
      site: passwordEntry.site,
      username: passwordEntry.username,
      password: passwordEntry.password ? decrypt(passwordEntry.password, (passwordEntry as any).salt) : null,
      hasNotes: Boolean(passwordEntry.notes), // Just indicate if notes exist
      userId: passwordEntry.userId,
      createdAt: passwordEntry.createdAt,
      updatedAt: passwordEntry.updatedAt,
      tags: passwordEntry.tags.map((t: any) => t.tag)
      // Explicitly exclude: notes, salt
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
    const createData: any = {
      site,
      username,
      salt,
      userId,
      tags: {
        create: tagIds?.map(tagId => ({ tagId })) || []
      }
    };

    // Only add password and notes if they exist
    if (encryptedPassword) createData.password = encryptedPassword;
    if (encryptedNotes) createData.notes = encryptedNotes;

    const passwordEntry = await prisma.passwordEntry.create({
      data: createData,
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // Format response excluding salt and notes for security
    const decryptedEntry = {
      id: passwordEntry.id,
      site: passwordEntry.site,
      username: passwordEntry.username,
      password: passwordEntry.password ? decrypt(passwordEntry.password, (passwordEntry as any).salt) : null,
      hasNotes: Boolean(passwordEntry.notes), // Just indicate if notes exist
      userId: passwordEntry.userId,
      createdAt: passwordEntry.createdAt,
      updatedAt: passwordEntry.updatedAt,
      tags: passwordEntry.tags.map((t: any) => t.tag)
      // Explicitly exclude: notes, salt
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
      updateData.password = password ? encrypt(password, (existingEntry as any).salt) : null;
    }
    
    // Handle notes encryption  
    if (notes !== undefined) {
      updateData.notes = notes ? encrypt(notes, (existingEntry as any).salt) : null;
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

    // Format response excluding salt and notes for security
    const decryptedEntry = {
      id: updatedEntry.id,
      site: updatedEntry.site,
      username: updatedEntry.username,
      password: updatedEntry.password ? decrypt(updatedEntry.password, (updatedEntry as any).salt) : null,
      hasNotes: Boolean(updatedEntry.notes), // Just indicate if notes exist
      userId: updatedEntry.userId,
      createdAt: updatedEntry.createdAt,
      updatedAt: updatedEntry.updatedAt,
      tags: updatedEntry.tags.map((t: any) => t.tag)
      // Explicitly exclude: notes, salt
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
