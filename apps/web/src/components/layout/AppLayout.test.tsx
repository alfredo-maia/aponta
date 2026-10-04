import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppLayout } from './AppLayout';
import { useAuthStore } from '../../stores/authStore';

describe('AppLayout', () => {
  function renderLayout() {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'alfredo@dmtecnologia.com.br', role: 'ADMIN' },
    });
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div data-testid="page-content">Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the DS background tone (bg-gray-80) on the shell, not the old bg-background token', () => {
    const { container } = renderLayout();
    expect(container.firstChild).toHaveClass('bg-gray-80');
    expect(container.firstChild).not.toHaveClass('bg-background');
  });

  it('renders a white header with the DS border color, not the old bg-background token', () => {
    renderLayout();
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-white');
    expect(header).toHaveClass('border-gray-200');
    expect(header).not.toHaveClass('bg-background');
  });

  it('renders the Sidebar, UserMenu trigger and the routed page content', () => {
    renderLayout();
    expect(screen.getByText('Aponta')).toBeInTheDocument(); // Sidebar brand
    expect(screen.getByText('alfredo@dmtecnologia.com.br')).toBeInTheDocument(); // UserMenu
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });
});
