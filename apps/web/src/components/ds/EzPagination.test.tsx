import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzPagination } from './EzPagination';

describe('EzPagination', () => {
  it('renders correctly with given current and total pages', () => {
    render(<EzPagination currentPage={1} totalPages={5} onChange={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onChange when a page number is clicked', async () => {
    const handleChange = vi.fn();
    render(<EzPagination currentPage={1} totalPages={5} onChange={handleChange} />);
    const page2 = screen.getByText('2');
    await userEvent.click(page2);
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange when "Next" arrow is clicked', async () => {
    const handleChange = vi.fn();
    render(<EzPagination currentPage={2} totalPages={5} onChange={handleChange} />);
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1]; // Next arrow
    await userEvent.click(nextButton);
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange when "Prev" arrow is clicked', async () => {
    const handleChange = vi.fn();
    render(<EzPagination currentPage={2} totalPages={5} onChange={handleChange} />);
    const prevButton = screen.getAllByRole('button')[0];
    await userEvent.click(prevButton);
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('disables Prev arrow on first page', () => {
    render(<EzPagination currentPage={1} totalPages={5} onChange={vi.fn()} />);
    const prevButton = screen.getAllByRole('button')[0];
    expect(prevButton).toBeDisabled();
  });

  it('disables Next arrow on last page', () => {
    render(<EzPagination currentPage={5} totalPages={5} onChange={vi.fn()} />);
    const nextButton = screen.getAllByRole('button').at(-1);
    expect(nextButton).toBeDisabled();
  });
});
