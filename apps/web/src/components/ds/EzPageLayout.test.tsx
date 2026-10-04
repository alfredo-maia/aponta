import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzPageLayout, EzPageHeader } from './EzPageLayout';

describe('EzPageLayout & EzPageHeader', () => {
  describe('EzPageLayout', () => {
    it('renders header and children correctly', () => {
      render(
        <EzPageLayout header={<header data-testid="page-header">My Header</header>}>
          <div data-testid="page-content">Page Content</div>
        </EzPageLayout>
      );
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });
  });

  describe('EzPageHeader', () => {
    it('renders basic props', () => {
      render(
        <EzPageHeader
          title="Home"
          breadcrumbs={<span>Home / Dash</span>}
          actions={<button>New</button>}
        />
      );
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Home / Dash')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders back button when showBackButton is true and calls onBack', async () => {
      const mockBack = vi.fn();
      const user = userEvent.setup();
      render(<EzPageHeader title="Home" showBackButton onBack={mockBack} />);
      
      const backBtn = screen.getByTitle('Voltar');
      expect(backBtn).toBeInTheDocument();
      
      await user.click(backBtn);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('renders mode switcher and calls onModeChange', async () => {
      const mockModeChange = vi.fn();
      const user = userEvent.setup();
      render(<EzPageHeader title="Home" activeMode="list" onModeChange={mockModeChange} />);
      
      const listBtn = screen.getByTitle('Modo Lista');
      const formBtn = screen.getByTitle('Modo Formulário');
      
      expect(listBtn).toBeInTheDocument();
      expect(formBtn).toBeInTheDocument();
      
      await user.click(formBtn);
      expect(mockModeChange).toHaveBeenCalledWith('form');
    });

    it('does not render back button when showBackButton is false', () => {
      render(<EzPageHeader title="Home" showBackButton={false} />);
      expect(screen.queryByTitle('Voltar')).not.toBeInTheDocument();
    });
  });
});
