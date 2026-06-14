import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Button from '../Button';

describe('Button component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn', 'btn-primary');
  });

  it('applies custom variants and sizes', () => {
    render(<Button variant="danger" size="lg">Danger Large</Button>);
    const button = screen.getByRole('button', { name: /danger large/i });
    expect(button).toHaveClass('btn-danger', 'btn-lg');
  });

  it('handles clicks when not disabled', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    
    await userEvent.click(screen.getByRole('button', { name: /clickable/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', async () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    
    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state and prevents clicks', async () => {
    const handleClick = vi.fn();
    render(<Button isLoading onClick={handleClick}>Loading</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
    expect(screen.getByText('↻')).toBeInTheDocument();
  });
});
