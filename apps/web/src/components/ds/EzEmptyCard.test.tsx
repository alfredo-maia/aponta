import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Search } from 'lucide-react';
import { EzEmptyCard } from './EzEmptyCard';

describe('EzEmptyCard', () => {
  it('renders title and description', () => {
    render(<EzEmptyCard title="Nada encontrado" description="Tente outra busca" />);
    expect(screen.getByText('Nada encontrado')).toBeInTheDocument();
    expect(screen.getByText('Tente outra busca')).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    const { container } = render(<EzEmptyCard title="Vazio" icon={Search} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders action node', () => {
    render(<EzEmptyCard title="Vazio" action={<button>Recarregar</button>} />);
    expect(screen.getByText('Recarregar')).toBeInTheDocument();
  });
});
