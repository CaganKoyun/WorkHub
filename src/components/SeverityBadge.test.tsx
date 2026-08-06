import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityBadge } from './SeverityBadge';
import type { Enums } from '@/integrations/supabase/types';

/**
 * BUG-03 · Severity görsel gösterimi. Bar sayısı seviyeye göre doluluk
 * artırıyor (low: 1 bar, medium: 2, high/critical: 3).
 */

const severities: Enums<'bug_severity'>[] = ['low', 'medium', 'high', 'critical'];

describe('SeverityBadge', () => {
  it.each(severities)('renders label for %s', (sev) => {
    render(<SeverityBadge severity={sev} />);
    expect(screen.getByText(new RegExp(sev, 'i'))).toBeInTheDocument();
  });

  it('critical fills bars 2 and 3 (bar 1 is low-only)', () => {
    const { container } = render(<SeverityBadge severity="critical" />);
    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(3);
    // Bar 1 sadece low için dolu — critical'ta 0.3.
    expect(rects[0].getAttribute('opacity')).toBe('0.3');
    // Bar 2 ve 3 critical'ta dolu.
    expect(rects[1].getAttribute('opacity') ?? '1').toBe('1');
    expect(rects[2].getAttribute('opacity') ?? '1').toBe('1');
  });

  it('low fills only the first bar; other two are dimmed', () => {
    const { container } = render(<SeverityBadge severity="low" />);
    const rects = container.querySelectorAll('rect');
    expect(rects[1].getAttribute('opacity')).toBe('0.3');
    expect(rects[2].getAttribute('opacity')).toBe('0.3');
  });
});
