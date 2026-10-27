import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressView } from './ProgressView';

describe('ProgressView', () => {
  it('shows plain-language state per piece', () => {
    render(
      <ProgressView
        types={['blog', 'linkedin', 'x_thread']}
        events={[
          { stage: 'research', status: 'started' },
          { stage: 'research', status: 'done' },
          { stage: 'draft', type: 'blog', attempt: 1, status: 'started' },
          { stage: 'check', type: 'blog', attempt: 1, status: 'started' },
          { stage: 'check', type: 'blog', attempt: 1, status: 'failed' },
          { stage: 'draft', type: 'blog', attempt: 2, status: 'started' },
          { stage: 'draft', type: 'linkedin', attempt: 1, status: 'started' },
          { stage: 'check', type: 'linkedin', attempt: 1, status: 'started' },
          { stage: 'check', type: 'linkedin', attempt: 1, status: 'passed' },
        ]}
      />,
    );
    expect(screen.getByText('Polishing')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });
});
