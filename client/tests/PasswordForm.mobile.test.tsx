import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordForm from '../src/components/PasswordForm';

// Mock the device detection hooks for mobile
vi.mock('../src/hooks/useDeviceDetection', () => ({
  useIsMobile: vi.fn(() => true),
  useIsTouchDevice: vi.fn(() => true),
}));

// Mock the password service
vi.mock('../src/services/passwordService', () => ({
  validatePasswordEntry: vi.fn(() => Promise.resolve({ available: true, message: 'Available' }))
}));

const mockTags = [
  { id: 'tag1', name: 'Work', color: '#3B82F6', description: 'Work related', userId: '1', createdAt: '', updatedAt: '' },
  { id: 'tag2', name: 'Personal', color: '#10B981', description: 'Personal accounts', userId: '1', createdAt: '', updatedAt: '' },
  { id: 'tag3', name: 'Important', color: '#EF4444', description: 'Important accounts', userId: '1', createdAt: '', updatedAt: '' }
];

describe('PasswordForm Mobile Tag Selection', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render select interface on mobile', async () => {
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Available Tags')).toBeInTheDocument();
    expect(screen.getByText('Select a tag to add...')).toBeInTheDocument();
    
    // Should show select dropdown instead of drag areas
    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toBeInTheDocument();
  });

  it('should add tags via select dropdown', async () => {
    const user = userEvent.setup();
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const selectElement = screen.getByRole('combobox');
    
    // Select Work tag
    await user.selectOptions(selectElement, 'tag1');

    await waitFor(() => {
      expect(screen.getByText('Selected Tags')).toBeInTheDocument();
      const selectedSection = screen.getByText('Selected Tags').closest('div');
      expect(selectedSection).toHaveTextContent('Work');
    });
  });

  it('should remove selected tags from dropdown options', async () => {
    const user = userEvent.setup();
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const selectElement = screen.getByRole('combobox');
    
    // Select Work tag
    await user.selectOptions(selectElement, 'tag1');

    await waitFor(() => {
      // Work should no longer be available in dropdown
      const workOption = screen.queryByRole('option', { name: 'Work' });
      expect(workOption).toBeNull();
    });
  });

  it('should allow removing tags via X button on mobile', async () => {
    const user = userEvent.setup();
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const selectElement = screen.getByRole('combobox');
    
    // Select Work tag
    await user.selectOptions(selectElement, 'tag1');

    await waitFor(() => {
      const selectedSection = screen.getByText('Selected Tags').closest('div');
      expect(selectedSection).toHaveTextContent('Work');
    });

    // Find and click remove button
    const removeButtons = screen.getAllByRole('button');
    const workRemoveButton = removeButtons.find(button => {
      const parentDiv = button.closest('div');
      return parentDiv?.textContent?.includes('Work') && button.querySelector('svg');
    });

    if (workRemoveButton) {
      await user.click(workRemoveButton);
    }

    await waitFor(() => {
      // Work should be back in dropdown options
      expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
    });
  });

  it('should submit with correct tag IDs on mobile', async () => {
    const user = userEvent.setup();
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    // Fill required fields
    await user.type(screen.getByLabelText(/site/i), 'mobile.com');
    await user.type(screen.getByLabelText(/username/i), 'mobileuser');

    // Select tags via dropdown
    const selectElement = screen.getByRole('combobox');
    await user.selectOptions(selectElement, 'tag1'); // Work
    await user.selectOptions(selectElement, 'tag3'); // Important

    // Submit form
    await user.click(screen.getByText('Create Password'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          site: 'mobile.com',
          username: 'mobileuser',
          tagIds: expect.arrayContaining(['tag1', 'tag3'])
        })
      );
    });
  });
});
