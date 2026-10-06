import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzTileMedium } from './EzTileMedium';

describe('EzTileMedium', () => {
  it('renders the small title and description text', () => {
    render(
      <EzTileMedium
        smallTitleText="Título pequeno"
        descriptionText="Texto de descrição do card"
      />
    );
    expect(screen.getByText('Título pequeno')).toBeInTheDocument();
    expect(screen.getByText('Texto de descrição do card')).toBeInTheDocument();
  });

  it('renders the default color theme', () => {
    const { container } = render(<EzTileMedium smallTitleText="Default" />);
    expect(container.firstChild).toHaveClass('border-gray-200');
  });

  it('renders different color themes correctly (e.g. green)', () => {
    const { container } = render(<EzTileMedium smallTitleText="Green" color="green" />);
    expect(container.firstChild).toHaveClass('bg-green-50');
  });

  it('renders an icon when iconName is provided (no avatar)', () => {
    render(<EzTileMedium smallTitleText="Icon" iconName="user" />);
    expect(screen.getByTestId('ez-tile-medium-icon')).toBeInTheDocument();
  });

  it('renders an avatar instead of the icon when avatarProps is provided', () => {
    render(
      <EzTileMedium
        smallTitleText="Avatar"
        iconName="user"
        avatarProps={{ name: 'João Silva' }}
      />
    );
    expect(screen.queryByTestId('ez-tile-medium-icon')).not.toBeInTheDocument();
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders up to 3 tags on the top right', () => {
    render(
      <EzTileMedium
        smallTitleText="Tags"
        tags={[{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }]}
      />
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByText('D')).not.toBeInTheDocument();
  });

  it('renders a button and fires onClick when buttonProps is provided', () => {
    const onClick = vi.fn();
    render(
      <EzTileMedium
        smallTitleText="Button"
        buttonProps={{ label: 'Ver mais', onClick }}
      />
    );
    const button = screen.getByRole('button', { name: 'Ver mais' });
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render a button when buttonProps is not provided', () => {
    render(<EzTileMedium smallTitleText="No button" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('limits the description to the given maximum number of lines via style', () => {
    render(
      <EzTileMedium
        smallTitleText="Clamped"
        descriptionText="Texto longo"
        descriptionMaximumLines={2}
      />
    );
    const desc = screen.getByText('Texto longo');
    expect(desc).toHaveStyle({ WebkitLineClamp: '2' });
  });

  it('applies custom height and width', () => {
    const { container } = render(
      <EzTileMedium smallTitleText="Sized" height="300px" width="500px" />
    );
    expect(container.firstChild).toHaveStyle({ height: '300px', width: '500px' });
  });
});
