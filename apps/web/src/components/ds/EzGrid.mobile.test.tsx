import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzGridWrapper } from './EzGrid';
import { EzEntityGrid } from './EzEntityGrid';
import { EzTaskbar } from './EzTaskbar';

// DMTE-455: o grid precisa ser confortável em tela de celular (390px).
// jsdom não faz layout, então os testes cobrem comportamento de toque e as
// classes responsivas que definem alvos de toque e rolagem.

type Row = { id: number; name: string };
const columns = [{ accessorKey: 'name', header: 'Nome' }];
const data: Row[] = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' },
];

describe('EzGridWrapper no celular', () => {
  it('rola a tabela com o dedo sem arrastar a página (touch-pan-x + overscroll contido)', () => {
    const { container } = render(
      <EzGridWrapper alwaysShowHorizontalScrollbar>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );
    const scroller = container.querySelector('#ez-grid-table-container') as HTMLDivElement;
    expect(scroller).toHaveClass('touch-pan-x');
    expect(scroller).toHaveClass('touch-pan-y');
    expect(scroller).toHaveClass('overscroll-x-contain');
  });

  it('arrasta o thumb da barra horizontal por toque', () => {
    const { container } = render(
      <EzGridWrapper alwaysShowHorizontalScrollbar>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );
    const scroller = container.querySelector('#ez-grid-table-container') as HTMLDivElement;
    Object.defineProperty(scroller, 'scrollWidth', { value: 800, configurable: true });
    Object.defineProperty(scroller, 'clientWidth', { value: 400, configurable: true });
    scroller.scrollLeft = 0;
    const track = screen.getByTestId('ez-grid-horizontal-scrollbar');
    Object.defineProperty(track, 'clientWidth', { value: 400, configurable: true });
    const thumb = screen.getByTestId('ez-grid-horizontal-scrollbar-thumb');

    fireEvent.touchStart(thumb, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(thumb, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(thumb);

    expect(scroller.scrollLeft).toBeGreaterThan(0);
  });

  it('usa trilho e thumb maiores em ponteiro grosso (toque)', () => {
    render(
      <EzGridWrapper alwaysShowHorizontalScrollbar>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );
    expect(screen.getByTestId('ez-grid-horizontal-scrollbar').className).toContain(
      '[@media(pointer:coarse)]:h-5'
    );
    expect(screen.getByTestId('ez-grid-horizontal-scrollbar-thumb')).toHaveClass('touch-none');
  });
});

describe('EzEntityGrid paginação no celular', () => {
  it('empilha a paginação e dá alvos de toque de 44px aos botões de página', () => {
    render(<EzEntityGrid columns={columns} data={data} pageSize={2} pageSizeOptions={[2, 5]} />);
    const prev = screen.getByLabelText('Página anterior');
    const next = screen.getByLabelText('Próxima página');
    for (const button of [prev, next]) {
      expect(button).toHaveClass('h-11');
      expect(button).toHaveClass('w-11');
      expect(button).toHaveClass('sm:h-[32px]');
    }
    const bar = screen.getByTestId('ez-entity-grid-pagination-count').parentElement
      ?.parentElement as HTMLElement;
    expect(bar).toHaveClass('flex-col');
    expect(bar).toHaveClass('sm:flex-row');
  });

  it('aumenta o alvo do botão de opções da grade em ponteiro grosso', () => {
    render(
      <EzEntityGrid columns={columns} data={data} pageSize={2} showGridCornerMenu />
    );
    expect(screen.getByTestId('ez-grid-corner-menu-button').className).toContain(
      '[@media(pointer:coarse)]:h-11'
    );
  });
});

describe('EzTaskbar e seletor de linhas no celular (revisão interna)', () => {
  it('quebra linha e dá alvo de toque de 44px aos botões em ponteiro grosso', () => {
    render(<EzTaskbar buttons={['INSERT', 'SAVE']} onAction={() => undefined} />);
    const button = screen.getByRole('button', { name: 'Incluir' });
    expect(button.parentElement).toHaveClass('flex-wrap');
    expect(button.className).toContain('[@media(pointer:coarse)]:h-11');
  });

  it('seletor de linhas por página tem 44px de altura abaixo de sm', () => {
    render(<EzEntityGrid columns={columns} data={data} pageSize={2} pageSizeOptions={[2, 5]} />);
    expect(screen.getByRole('combobox', { name: 'Linhas por página:' }).parentElement).toHaveClass('h-11');
  });
});
