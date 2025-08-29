import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than or equal to 100 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const adminUpdatePasswordSchema = z.object({
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than or equal to 100 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  isAdmin: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than or equal to 100 characters').optional(),
  isAdmin: z.boolean().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(40, 'Name must be less than or equal to 40 characters'),
  description: z.string().max(255, 'Description must be less than or equal to 255 characters').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'),
});

export const updateTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(40, 'Name must be less than or equal to 40 characters').optional(),
  description: z.string().max(255, 'Description must be less than or equal to 255 characters').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
});

export const createPasswordEntrySchema = z.object({
  site: z.string().min(1, 'Site is required').max(256, 'Site must be less than or equal to 256 characters'),
  username: z.string().min(1, 'Username is required').max(128, 'Username must be less than or equal to 128 characters'),
  password: z.string().max(128, 'Password must be less than or equal to 128 characters').optional(),
  notes: z.string().max(4096, 'Notes must be less than or equal to 4096 characters').optional(),
  tagIds: z.array(z.string()).optional().default([]),
});

export const updatePasswordEntrySchema = z.object({
  site: z.string().min(1, 'Site is required').max(256, 'Site must be less than or equal to 256 characters').optional(),
  username: z.string().min(1, 'Username is required').max(128, 'Username must be less than or equal to 128 characters').optional(),
  password: z.string().max(128, 'Password must be less than or equal to 128 characters').optional(),
  notes: z.string().max(4096, 'Notes must be less than or equal to 4096 characters').optional(),
  tagIds: z.array(z.string()).optional(),
});

export const searchPasswordsSchema = z.object({
  query: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});
