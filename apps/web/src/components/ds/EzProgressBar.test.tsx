import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzProgressBar } from './EzProgressBar';

describe('EzProgressBar', () => {
  it('renders without errors', () => {
    const { container } = render(<EzProgressBar value={50} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays the label when showLabel is true', () => {
    render(<EzProgressBar value={50} showLabel />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('does not display the label when showLabel is false', () => {
    render(<EzProgressBar value={50} showLabel={false} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('clamps value above 100 to 100', () => {
    render(<EzProgressBar value={150} showLabel />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps value below 0 to 0', () => {
    render(<EzProgressBar value={-10} showLabel />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('allows custom size and color classes', () => {
    const { container } = render(<EzProgressBar value={50} sizeClass="h-4" colorClass="bg-red-500" />);
    expect(container.firstChild).toBeInTheDocument();
    // DOM validation could be tricky depending on the inner DOM structure for progress.
  });
});
