import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import PasswordEdit from '../src/pages/PasswordEdit';
import * as tagService from '../src/services/tagService';
import * as passwordService from '../src/services/passwordService';

// Mock the services and hooks
vi.mock('../src/services/tagService', () => ({
  getTags: vi.fn()
}));

vi.mock('../src/services/passwordService', () => ({
  validatePasswordEntry: vi.fn(),
  createPasswordEntry: vi.fn(),
  updatePasswordEntry: vi.fn(),
  getPasswordEntryNotes: vi.fn()
}));

vi.mock('../src/hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value)
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation()
  };
});

// Get the mocked functions
const mockGetTags = vi.mocked(tagService.getTags);
const mockValidatePasswordEntry = vi.mocked(passwordService.validatePasswordEntry);
const mockCreatePasswordEntry = vi.mocked(passwordService.createPasswordEntry);
const mockUpdatePasswordEntry = vi.mocked(passwordService.updatePasswordEntry);
const mockGetPasswordEntryNotes = vi.mocked(passwordService.getPasswordEntryNotes);

// Mock navigate and location
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

const mockTags = [
  {
    id: '1',
    name: 'Work',
    description: 'Work-related passwords',
    color: '#3b82f6',
    userId: 'user1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { passwordEntries: 5 }
  },
  {
    id: '2',
    name: 'Personal',
    description: 'Personal accounts',
    color: '#ef4444',
    userId: 'user1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { passwordEntries: 3 }
  },
  {
    id: '3',
    name: 'Shopping',
    description: '',
    color: '#22c55e',
    userId: 'user1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { passwordEntries: 1 }
  }
];

const mockPasswordEntry = {
  id: 'pass1',
  site: 'Gmail',
  username: 'test@gmail.com',
  password: 'password123',
  hasNotes: true,
  userId: 'user1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [mockTags[0], mockTags[1]]
};

describe('PasswordEdit Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock responses
    mockGetTags.mockResolvedValue(mockTags);
    mockValidatePasswordEntry.mockResolvedValue({
      available: true,
      message: 'Site and username combination is available'
    });
    mockGetPasswordEntryNotes.mockResolvedValue({
      id: 'pass1',
      notes: 'Test notes content'
    });
    mockCreatePasswordEntry.mockResolvedValue(mockPasswordEntry);
    mockUpdatePasswordEntry.mockResolvedValue(mockPasswordEntry);
    
    // Set up location mock for new password
    mockUseLocation.mockReturnValue({
      state: null,
      pathname: '/password/new',
      search: '',
      hash: '',
      key: 'test'
    });
  });

  const renderPasswordEdit = (locationState: any = null) => {
    mockUseLocation.mockReturnValue({
      state: locationState,
      pathname: locationState ? '/password/edit' : '/password/new',
      search: '',
      hash: '',
      key: 'test'
    });

    return render(
      <BrowserRouter>
        <PasswordEdit />
      </BrowserRouter>
    );
  };

  it('should render create password form for new password', async () => {
    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByText('Add New Password Entry')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/site\/service/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username\/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByText('Tag Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create password/i })).toBeInTheDocument();
  });

  it('should render edit password form when editing existing password', async () => {
    const locationState = { password: mockPasswordEntry };
    renderPasswordEdit(locationState);

    await waitFor(() => {
      expect(screen.getByText('Edit Password Entry')).toBeInTheDocument();
    });

    // Should pre-populate form fields
    expect(screen.getByDisplayValue('Gmail')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@gmail.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('password123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });

  it('should load and display notes for existing password', async () => {
    const locationState = { password: mockPasswordEntry };
    renderPasswordEdit(locationState);

    await waitFor(() => {
      expect(mockGetPasswordEntryNotes).toHaveBeenCalledWith('pass1');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test notes content')).toBeInTheDocument();
    });
  });

  it('should display available and selected tags correctly', async () => {
    const locationState = { password: mockPasswordEntry };
    renderPasswordEdit(locationState);

    await waitFor(() => {
      expect(screen.getByText('Selected Tags (2)')).toBeInTheDocument();
      expect(screen.getByText('Available Tags (1)')).toBeInTheDocument();
    });

    // Should show selected tags
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();

    // Should show available tag in the available list
    expect(screen.getByText('Shopping')).toBeInTheDocument();
  });

  it('should handle drag and drop tag functionality', async () => {
    const user = userEvent.setup();
    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByText('Available Tags (3)')).toBeInTheDocument();
    });

    // Find a tag in available list
    const workTag = screen.getByText('Work').closest('div');
    const dropZone = screen.getByText('Drag tags here or click to add').closest('div');

    // Simulate drag and drop
    if (workTag && dropZone) {
      fireEvent.dragStart(workTag);
      fireEvent.dragOver(dropZone);
      fireEvent.drop(dropZone);
    }

    await waitFor(() => {
      // Tag should move to selected area
      expect(screen.getByText('Selected Tags (1)')).toBeInTheDocument();
      expect(screen.getByText('Available Tags (2)')).toBeInTheDocument();
    });
  });

  it('should allow clicking to add tags', async () => {
    const user = userEvent.setup();
    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByText('Available Tags (3)')).toBeInTheDocument();
    });

    // Click on a tag to add it
    const workTagInAvailable = screen.getAllByText('Work')[0];
    await user.click(workTagInAvailable);

    await waitFor(() => {
      expect(screen.getByText('Selected Tags (1)')).toBeInTheDocument();
      expect(screen.getByText('Available Tags (2)')).toBeInTheDocument();
    });
  });

  it('should allow removing selected tags', async () => {
    const user = userEvent.setup();
    const locationState = { password: mockPasswordEntry };
    renderPasswordEdit(locationState);

    await waitFor(() => {
      expect(screen.getByText('Selected Tags (2)')).toBeInTheDocument();
    });

    // Find and click the remove button for a tag
    const removeButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg') && btn.closest('.inline-flex')
    );
    
    if (removeButtons.length > 0) {
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Selected Tags (1)')).toBeInTheDocument();
        expect(screen.getByText('Available Tags (2)')).toBeInTheDocument();
      });
    }
  });

  it('should validate site and username combination', async () => {
    const user = userEvent.setup();
    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByLabelText(/site\/service/i)).toBeInTheDocument();
    });

    const siteInput = screen.getByLabelText(/site\/service/i);
    const usernameInput = screen.getByLabelText(/username\/email/i);

    await user.type(siteInput, 'GitHub');
    await user.type(usernameInput, 'testuser');

    await waitFor(() => {
      expect(mockValidatePasswordEntry).toHaveBeenCalledWith('GitHub', 'testuser', undefined);
    });
  });

  it('should generate password when generate button is clicked', async () => {
    const user = userEvent.setup();
    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    const generateButton = screen.getByText('Generate');
    const passwordInput = screen.getByLabelText(/password/i);

    // Password should initially be empty
    expect(passwordInput).toHaveValue('');

    await user.click(generateButton);

    // Password should now have a generated value
    await waitFor(() => {
      expect(passwordInput).not.toHaveValue('');
    });
  });

  it('should submit form with correct data for new password', async () => {
    const user = userEvent.setup();
    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByLabelText(/site\/service/i)).toBeInTheDocument();
    });

    // Fill out form
    const siteInput = screen.getByLabelText(/site\/service/i);
    const usernameInput = screen.getByLabelText(/username\/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const notesInput = screen.getByLabelText(/notes/i);

    await user.type(siteInput, 'Test Site');
    await user.type(usernameInput, 'test@example.com');
    await user.type(passwordInput, 'testpass123');
    await user.type(notesInput, 'Test notes');

    // Add a tag
    const workTag = screen.getAllByText('Work')[0];
    await user.click(workTag);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePasswordEntry).toHaveBeenCalledWith({
        site: 'Test Site',
        username: 'test@example.com',
        password: 'testpass123',
        notes: 'Test notes',
        tagIds: ['1'] // Work tag ID
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should submit form with correct data for password update', async () => {
    const user = userEvent.setup();
    const locationState = { password: mockPasswordEntry };
    renderPasswordEdit(locationState);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Gmail')).toBeInTheDocument();
    });

    // Modify the site
    const siteInput = screen.getByDisplayValue('Gmail');
    await user.clear(siteInput);
    await user.type(siteInput, 'Updated Gmail');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /update password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdatePasswordEntry).toHaveBeenCalledWith('pass1', {
        site: 'Updated Gmail',
        username: 'test@gmail.com',
        password: 'password123',
        notes: 'Test notes content',
        tagIds: ['1', '2'] // Work and Personal tag IDs
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should navigate back to dashboard when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should navigate back to dashboard when back arrow is clicked', async () => {
    const user = userEvent.setup();
    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByRole('button').closest('button')).toBeInTheDocument();
    });

    // Find the back arrow button
    const backButton = screen.getAllByRole('button')[0];
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should disable submit button when validation fails', async () => {
    const user = userEvent.setup();
    
    // Mock validation failure
    mockValidatePasswordEntry.mockResolvedValue({
      available: false,
      message: 'Site and username combination already exists'
    });

    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByLabelText(/site\/service/i)).toBeInTheDocument();
    });

    const siteInput = screen.getByLabelText(/site\/service/i);
    const usernameInput = screen.getByLabelText(/username\/email/i);
    const submitButton = screen.getByRole('button', { name: /create password/i });

    await user.type(siteInput, 'Existing Site');
    await user.type(usernameInput, 'existing@example.com');

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should show character counters for input fields', async () => {
    renderPasswordEdit();

    await waitFor(() => {
      expect(screen.getByText('0/256 characters')).toBeInTheDocument(); // Site
      expect(screen.getByText('0/128 characters')).toBeInTheDocument(); // Username
      expect(screen.getByText('0/4096 characters')).toBeInTheDocument(); // Notes
    });
  });

  it('should handle loading state correctly', () => {
    // Mock getTags to never resolve to test loading state
    mockGetTags.mockImplementation(() => new Promise(() => {}));
    
    renderPasswordEdit();

    expect(screen.getByRole('status') || screen.getByText(/loading/i) || 
           document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
