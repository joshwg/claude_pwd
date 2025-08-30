import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../src/pages/Dashboard';
import { MemoryRouter } from 'react-router-dom';

const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
};

// Mock useAuth hook
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    token: 'test-token',
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  })),
}));

// Mock services
vi.mock('../src/services/passwordService', () => ({
  getPasswordEntries: vi.fn(),
  deletePasswordEntry: vi.fn(),
  createPasswordEntry: vi.fn(),
  updatePasswordEntry: vi.fn(),
  getPasswordEntryNotes: vi.fn(),
}));

vi.mock('../src/services/tagService', () => ({
  getTags: vi.fn(),
}));

vi.mock('react-hot-toast');

// Mock drag and drop
vi.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

const mockPasswords = [
  {
    id: '1',
    site: 'example.com',
    username: 'testuser',
    password: 'password123',
    hasNotes: false,
    userId: '1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    tags: [
      { id: 'tag1', name: 'Work', color: '#3B82F6', description: '', userId: '1', createdAt: '', updatedAt: '' },
      { id: 'tag2', name: 'Important', color: '#EF4444', description: '', userId: '1', createdAt: '', updatedAt: '' }
    ]
  },
  {
    id: '2',
    site: 'github.com',
    username: 'developer',
    password: 'devpass456',
    hasNotes: true,
    userId: '1',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    tags: [
      { id: 'tag1', name: 'Work', color: '#3B82F6', description: '', userId: '1', createdAt: '', updatedAt: '' }
    ]
  }
];

const mockTags = [
  { id: 'tag1', name: 'Work', color: '#3B82F6', description: 'Work related accounts', userId: '1', createdAt: '', updatedAt: '' },
  { id: 'tag2', name: 'Important', color: '#EF4444', description: 'Important accounts', userId: '1', createdAt: '', updatedAt: '' },
  { id: 'tag3', name: 'Personal', color: '#10B981', description: 'Personal accounts', userId: '1', createdAt: '', updatedAt: '' }
];

const renderDashboard = () => {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
};

describe('Dashboard Tag Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getPasswordEntries } = require('../src/services/passwordService');
    const { getTags } = require('../src/services/tagService');
    
    getPasswordEntries.mockResolvedValue({ entries: mockPasswords });
    getTags.mockResolvedValue(mockTags);
  });

  it('should render tag search section', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Filter by Tags')).toBeInTheDocument();
    });

    expect(screen.getByText('Available Tags')).toBeInTheDocument();
    expect(screen.getByText('Selected Tags')).toBeInTheDocument();
  });

  it('should display available tags', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('should display all passwords initially', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('github.com')).toBeInTheDocument();
    expect(screen.getByText('Passwords (2)')).toBeInTheDocument();
  });

  it('should move tag from available to selected when clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    // Click on the Work tag
    await user.click(screen.getByText('Work'));

    // Check that the tag appears in selected area and is removed from available
    await waitFor(() => {
      const selectedSection = screen.getByText('Selected Tags').closest('div');
      expect(selectedSection).toHaveTextContent('Work');
    });
  });

  it('should filter passwords based on selected tags', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    // Initially should show 2 passwords
    expect(screen.getByText('Passwords (2)')).toBeInTheDocument();

    // Click on the Work tag to select it
    await user.click(screen.getByText('Work'));

    // Should now show only passwords with Work tag (both passwords have it)
    await waitFor(() => {
      expect(screen.getByText('Passwords (2)')).toBeInTheDocument();
    });

    // Click on Important tag
    await user.click(screen.getByText('Important'));

    // Should now show only passwords with both Work AND Important tags (only example.com has both)
    await waitFor(() => {
      expect(screen.getByText('Passwords (1)')).toBeInTheDocument();
    });
  });

  it('should show filter status message when tags are selected', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    // Click on a tag
    await user.click(screen.getByText('Work'));

    await waitFor(() => {
      expect(screen.getByText('Showing passwords with all 1 selected tag')).toBeInTheDocument();
    });
  });

  it('should remove tag from selected when X button is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    // Click on the Work tag to select it
    await user.click(screen.getByText('Work'));

    // Wait for tag to appear in selected area with X button
    await waitFor(() => {
      const selectedSection = screen.getByText('Selected Tags').closest('div');
      expect(selectedSection).toHaveTextContent('Work');
    });

    // Find and click the X button (assuming it's rendered as an X icon)
    const removeButtons = screen.getAllByRole('button');
    const removeButton = removeButtons.find(button => 
      button.closest('div')?.textContent?.includes('Work') && 
      button.querySelector('svg') // Looking for SVG icon
    );

    if (removeButton) {
      await user.click(removeButton);
    }

    // Tag should be back in available section
    await waitFor(() => {
      const availableSection = screen.getByText('Available Tags').closest('div');
      expect(availableSection).toHaveTextContent('Work');
    });
  });

  it('should show appropriate empty state messages', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Available Tags')).toBeInTheDocument();
    });

    // Should show instructional text in selected tags area
    expect(screen.getByText('Drag tags here or click on available tags to filter passwords')).toBeInTheDocument();
  });

  it('should combine search term and tag filtering', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search passwords...');
    await user.type(searchInput, 'github');

    // Should show only github.com password
    await waitFor(() => {
      expect(screen.getByText('Passwords (1)')).toBeInTheDocument();
      expect(screen.getByText('github.com')).toBeInTheDocument();
      expect(screen.queryByText('example.com')).not.toBeInTheDocument();
    });

    // Now select Work tag (github.com has Work tag)
    await user.click(screen.getByText('Work'));

    // Should still show github.com since it matches both search and tag
    await waitFor(() => {
      expect(screen.getByText('Passwords (1)')).toBeInTheDocument();
      expect(screen.getByText('github.com')).toBeInTheDocument();
    });

    // Select Important tag (github.com doesn't have Important tag)
    await user.click(screen.getByText('Important'));

    // Should show no results since github.com doesn't have both Work AND Important
    await waitFor(() => {
      expect(screen.getByText('Passwords (0)')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or tag filters.')).toBeInTheDocument();
    });
  });
});
