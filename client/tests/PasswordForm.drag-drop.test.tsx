import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordForm from '../src/components/PasswordForm';

// Mock the device detection hooks
vi.mock('../src/hooks/useDeviceDetection', () => ({
  useIsMobile: vi.fn(() => false),
  useIsTouchDevice: vi.fn(() => false),
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

const mockPassword = {
  id: '1',
  site: 'example.com',
  username: 'testuser',
  password: 'testpass',
  notes: 'Test notes',
  tags: [mockTags[0], mockTags[2]], // Work and Important tags
  hasNotes: true,
  userId: '1',
  createdAt: '',
  updatedAt: ''
};

describe('PasswordForm with Drag and Drop Tags', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tag selection interface', async () => {
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Available Tags')).toBeInTheDocument();
    expect(screen.getByText('Selected Tags')).toBeInTheDocument();
  });

  it('should display available tags in drag areas', async () => {
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Important')).toBeInTheDocument();
  });

  it('should pre-select tags when editing existing password', async () => {
    render(
      <PasswordForm
        password={mockPassword}
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      // Should show Work and Important in selected area
      const selectedSection = screen.getByText('Selected Tags').closest('div');
      expect(selectedSection).toHaveTextContent('Work');
      expect(selectedSection).toHaveTextContent('Important');
    });

    // Personal should be in available section
    const availableSection = screen.getByText('Available Tags').closest('div');
    expect(availableSection).toHaveTextContent('Personal');
  });

  it('should move tag from available to selected when clicked', async () => {
    const user = userEvent.setup();
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    // Click on Work tag
    await user.click(screen.getByText('Work'));

    await waitFor(() => {
      // Work should now be in selected section
      const selectedSection = screen.getByText('Selected Tags').closest('div');
      expect(selectedSection).toHaveTextContent('Work');
    });
  });

  it('should remove tag from selected when X button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PasswordForm
        password={mockPassword}
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      const selectedSection = screen.getByText('Selected Tags').closest('div');
      expect(selectedSection).toHaveTextContent('Work');
    });

    // Find remove button for Work tag (X button)
    const removeButtons = screen.getAllByRole('button');
    const workRemoveButton = removeButtons.find(button => {
      const parentDiv = button.closest('div');
      return parentDiv?.textContent?.includes('Work') && button.querySelector('svg');
    });

    if (workRemoveButton) {
      await user.click(workRemoveButton);
    }

    await waitFor(() => {
      // Work should now be back in available section
      const availableSection = screen.getByText('Available Tags').closest('div');
      expect(availableSection).toHaveTextContent('Work');
    });
  });

  it('should submit form with selected tag IDs', async () => {
    const user = userEvent.setup();
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    // Fill required fields
    await user.type(screen.getByLabelText(/site/i), 'test.com');
    await user.type(screen.getByLabelText(/username/i), 'testuser');

    // Select a tag
    await user.click(screen.getByText('Work'));

    // Submit form
    await user.click(screen.getByText('Create Password'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          site: 'test.com',
          username: 'testuser',
          tagIds: ['tag1'] // Work tag ID
        })
      );
    });
  });

  it('should show tag count when tags are selected', async () => {
    const user = userEvent.setup();
    render(
      <PasswordForm
        tags={mockTags}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    // Select a tag
    await user.click(screen.getByText('Work'));

    await waitFor(() => {
      expect(screen.getByText('1 tag selected')).toBeInTheDocument();
    });

    // Select another tag
    await user.click(screen.getByText('Personal'));

    await waitFor(() => {
      expect(screen.getByText('2 tags selected')).toBeInTheDocument();
    });
  });
});
