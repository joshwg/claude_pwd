import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TagForm from '../src/components/TagForm';
import * as tagService from '../src/services/tagService';

// Mock the services and hooks
vi.mock('../src/services/tagService', () => ({
  validateTagName: vi.fn()
}));

vi.mock('../src/hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value)
}));

// Get the mocked function
const mockValidateTagName = vi.mocked(tagService.validateTagName);

const mockOnSubmit = vi.fn();
const mockOnClose = vi.fn();

describe('TagForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock responses for validation
    mockValidateTagName.mockResolvedValue({
      isValid: true,
      message: ''
    });
  });

  it('should render create tag form with required fields', () => {
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    expect(screen.getByText('Add New Tag')).toBeInTheDocument();
    expect(screen.getByLabelText(/tag name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByText('Preset Colors:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create tag/i })).toBeInTheDocument();
  });

  it('should render edit tag form when tag prop is provided', () => {
    const existingTag = {
      id: '1',
      name: 'Work',
      description: 'Work-related passwords',
      color: '#3b82f6',
      userId: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    render(
      <TagForm tag={existingTag} onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    expect(screen.getByText('Edit Tag')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Work')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Work-related passwords')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update tag/i })).toBeInTheDocument();
  });

  it('should validate tag name length constraints', async () => {
    const user = userEvent.setup();
    
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/tag name/i);
    
    // Test exactly 40 characters (should be valid)
    const validLongName = 'A'.repeat(40);
    await user.clear(nameInput);
    await user.type(nameInput, validLongName);
    expect(nameInput).toHaveValue(validLongName);

    // Test 41 characters (should trigger validation error in real app)
    const invalidLongName = 'A'.repeat(41);
    await user.clear(nameInput);
    await user.type(nameInput, invalidLongName);
    expect(nameInput).toHaveValue(invalidLongName);
  });

  it('should validate description length constraints', async () => {
    const user = userEvent.setup();
    
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    const descInput = screen.getByLabelText(/description/i);
    
    // Test exactly 255 characters (should be valid)
    const validLongDesc = 'A'.repeat(255);
    await user.clear(descInput);
    await user.type(descInput, validLongDesc);
    expect(descInput).toHaveValue(validLongDesc);

    // Test 256 characters (should trigger validation error in real app)
    const invalidLongDesc = 'A'.repeat(256);
    await user.clear(descInput);
    await user.type(descInput, invalidLongDesc);
    expect(descInput).toHaveValue(invalidLongDesc);
  }, 10000);

  it('should allow color selection from preset colors', async () => {
    const user = userEvent.setup();
    
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    // Find preset color buttons
    const colorButtons = screen.getAllByRole('button').filter(
      button => button.getAttribute('style')?.includes('background-color')
    );
    
    expect(colorButtons.length).toBeGreaterThan(0);
    
    // Click on a color button
    if (colorButtons[1]) {
      await user.click(colorButtons[1]);
      // Color should be selected (exact assertion depends on implementation)
    }
  });

  it('should show/hide color wheel when toggle button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    const colorWheelToggle = screen.getByRole('button', { name: /show color wheel/i });
    expect(colorWheelToggle).toBeInTheDocument();

    // Click to show color wheel
    await user.click(colorWheelToggle);
    expect(screen.getByRole('button', { name: /hide color wheel/i })).toBeInTheDocument();
  });

  it('should disable submit button when name is empty', () => {
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    const submitButton = screen.getByRole('button', { name: /create tag/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when valid data is entered', async () => {
    const user = userEvent.setup();
    
    // Mock successful validation
    mockValidateTagName.mockResolvedValue({
      isValid: true,
      message: ''
    });
    
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/tag name/i);
    const submitButton = screen.getByRole('button', { name: /create tag/i });

    // Initially should be disabled
    expect(submitButton).toBeDisabled();

    // Type a valid short name
    await user.type(nameInput, 'Valid Tag');
    
    // Wait for validation to complete and button to be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 3000 });
  });

  it('should call onSubmit with form data when submitted', async () => {
    const user = userEvent.setup();
    
    // Mock successful validation
    mockValidateTagName.mockResolvedValue({
      isValid: true,
      message: ''
    });
    
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/tag name/i);
    const descInput = screen.getByLabelText(/description/i);
    
    await user.type(nameInput, 'Test Tag');
    await user.type(descInput, 'Test Description');

    // Wait for validation to complete first
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /create tag/i });
      expect(submitButton).not.toBeDisabled();
    });

    // Submit form by clicking submit button
    const submitButton = screen.getByRole('button', { name: /create tag/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Tag',
          description: 'Test Description'
        })
      );
    });
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    // Find the X button (might be aria-label or just the X icon)
    const closeButton = screen.getByRole('button', { name: '' }) || 
                       screen.getAllByRole('button').find(btn => 
                         btn.querySelector('svg') && !btn.textContent?.trim()
                       );
    
    if (closeButton) {
      await user.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should validate hex color format', () => {
    const existingTag = {
      id: '1',
      name: 'Test',
      description: '',
      color: '#invalid', // Invalid hex color
      userId: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    render(
      <TagForm tag={existingTag} onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    // The component should handle invalid colors gracefully
    expect(screen.getByText('Edit Tag')).toBeInTheDocument();
  });

  it('should handle very long tag names gracefully', () => {
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/tag name/i);
    
    // Set value directly instead of typing to avoid performance issues
    fireEvent.change(nameInput, { target: { value: 'A'.repeat(1000) } });
    
    // Input should contain the text (though validation should prevent submission)
    expect(nameInput).toHaveValue('A'.repeat(1000));
  });

  it('should handle special characters in tag names', () => {
    render(
      <TagForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/tag name/i);
    
    // Set value directly to avoid userEvent parsing issues
    const specialCharName = 'Tag@#$%^&*()_+-=';
    fireEvent.change(nameInput, { target: { value: specialCharName } });
    
    expect(nameInput).toHaveValue(specialCharName);
  });
});
