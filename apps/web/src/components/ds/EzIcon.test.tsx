import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzIcon } from './EzIcon';

describe('EzIcon', () => {
  it('renders the SVG icon correctly', () => {
    const testIcon = <svg data-testid="test-svg" />;
    render(<EzIcon icon={testIcon} />);
    expect(screen.getByTestId('test-svg')).toBeInTheDocument();
  });

  it('applies medium size class by default', () => {
    const { container } = render(<EzIcon icon={<svg />} />);
    expect(container.firstChild).toHaveClass('w-4 h-4');
  });

  it('applies size classes correctly', () => {
    const { container: smallContainer } = render(<EzIcon icon={<svg />} size="small" />);
    expect(smallContainer.firstChild).toHaveClass('w-3 h-3');

    const { container: largeContainer } = render(<EzIcon icon={<svg />} size="large" />);
    expect(largeContainer.firstChild).toHaveClass('w-5 h-5');

    const { container: xLargeContainer } = render(<EzIcon icon={<svg />} size="x-large" />);
    expect(xLargeContainer.firstChild).toHaveClass('w-6 h-6');
  });

  it('applies colorClass correctly', () => {
    const { container } = render(<EzIcon icon={<svg />} colorClass="text-brand-500" />);
    expect(container.firstChild).toHaveClass('text-brand-500');
  });
});
