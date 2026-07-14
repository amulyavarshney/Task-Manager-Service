import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityBadge } from '../components/PriorityBadge';

describe('PriorityBadge', () => {
  it('renders HIGH priority', () => {
    render(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders MEDIUM priority', () => {
    render(<PriorityBadge priority="MEDIUM" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });
});
