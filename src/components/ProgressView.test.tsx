import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressView } from './ProgressView';

describe('ProgressView', () => {
  it('ProgressView shows latest state', () => {
    render(
      <ProgressView
        types={['blog', 'linkedin']}
        events={[
          { stage: 'research', status: 'started' },
          { stage: 'research', status: 'done' },
          { stage: 'draft', type: 'blog', attempt: 1, status: 'started' },
          { stage: 'check', type: 'blog', attempt: 1, status: 'started' },
          { stage: 'check', type: 'blog', attempt: 1, status: 'failed' },
          { stage: 'draft', type: 'blog', attempt: 2, status: 'started' },
          { stage: 'check', type: 'blog', attempt: 2, status: 'started' },
        ]}
      />,
    );
    expect(screen.getByText('Checking (attempt 2 of 3)')).toBeInTheDocument();
    expect(screen.getByText('Attempt 1: sent back')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
  });
});
