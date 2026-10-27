import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InputForm } from './InputForm';

const generate = () => screen.getByRole('button', { name: 'Generate' });

describe('InputForm', () => {
  it('generate disabled until valid', async () => {
    render(<InputForm onSubmit={() => {}} disabled={false} />);
    expect(generate()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Topic'), 'Board exam stress');
    expect(generate()).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Blog post'));
    expect(generate()).toBeEnabled();
  });

  it('select all ticks all seven', async () => {
    render(<InputForm onSubmit={() => {}} disabled={false} />);
    await userEvent.click(screen.getByLabelText('Select all'));
    const labels = ['Blog post', 'LinkedIn post', 'X thread', 'Instagram caption', 'Meta ads (3)', 'Google ads (3)', 'Image'];
    for (const l of labels) expect(screen.getByLabelText(l)).toBeChecked();
  });

  it('submits form', async () => {
    const onSubmit = vi.fn();
    render(<InputForm onSubmit={onSubmit} disabled={false} />);
    await userEvent.type(screen.getByLabelText('Topic'), 'Board exam stress');
    await userEvent.click(screen.getByLabelText('Image'));
    await userEvent.click(screen.getByLabelText('LinkedIn post'));
    await userEvent.click(generate());
    expect(onSubmit).toHaveBeenCalledWith({ topic: 'Board exam stress', types: ['linkedin', 'image'] });
  });

  it('flags a non-http link', async () => {
    render(<InputForm onSubmit={() => {}} disabled={false} />);
    await userEvent.type(screen.getByLabelText('Link'), 'ftp://a');
    await userEvent.click(screen.getByLabelText('Blog post'));
    expect(generate()).toBeDisabled();
    expect(screen.getAllByText(/must start with http/).length).toBeGreaterThan(0);
  });
});
