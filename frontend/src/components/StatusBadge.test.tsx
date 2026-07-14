import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders Ready label', () => {
    render(<StatusBadge status="READY" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders In Progress label', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders Failed label', () => {
    render(<StatusBadge status="FAILED" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
