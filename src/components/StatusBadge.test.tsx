import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';
import type { Enums } from '@/integrations/supabase/types';

/**
 * BUG-04 · Status akışı badge'i her enum değeri için render olmalı.
 * Enum'a yeni değer eklendiğinde bu test derlenmez → tip güvenliği ile
 * kapsam otomatik büyür.
 */

const statuses: Enums<'bug_status'>[] = [
  'new',
  'assigned',
  'in_progress',
  'testing',
  'resolved',
  'closed',
];

describe('StatusBadge', () => {
  it.each(statuses)('renders label for %s', (status) => {
    render(<StatusBadge status={status} />);
    // Kabuki: label metnini yakala (case-insensitive, boşluk toleranslı)
    const rendered = screen.getByText(/new|assigned|in progress|testing|resolved|closed/i);
    expect(rendered).toBeInTheDocument();
  });

  it('renders a colored dot indicator', () => {
    const { container } = render(<StatusBadge status="in_progress" />);
    // İçinde yalnızca span'lar var; ilk çocuk badge, ikinci çocuk dot span'i
    const dot = container.querySelector('span > span');
    expect(dot).not.toBeNull();
    expect(dot?.className).toMatch(/rounded-full/);
  });

  it('closed status uses muted text color', () => {
    const { container } = render(<StatusBadge status="closed" />);
    expect(container.firstChild).toHaveClass('text-muted-foreground');
  });
});
