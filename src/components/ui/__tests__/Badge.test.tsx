import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Badge, { NotificationBadge, StatusBadge } from '../Badge';

describe('Badge Components', () => {
  describe('Badge', () => {
    it('renders with default purple color', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge', 'badge-purple');
    });

    it('renders with filled color and dot', () => {
      render(<Badge color="green" filled dot>Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('badge-filled-green', 'badge-dot');
    });
  });

  describe('NotificationBadge', () => {
    it('does not render if count is 0', () => {
      const { container } = render(<NotificationBadge count={0} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders exact count if 9 or less', () => {
      render(<NotificationBadge count={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders 9+ if count is greater than 9', () => {
      render(<NotificationBadge count={12} />);
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  describe('StatusBadge', () => {
    it('renders correctly with given status and label', () => {
      render(<StatusBadge status="completed" label="Done" />);
      const badge = screen.getByText('Done');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('status-badge', 'status-badge-completed');
    });
  });
});
