import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EzSelect } from './EzSelect';

const options = (
  <>
    <option value="open">Aberto</option>
    <option value="wait">Aguardando Sankhya</option>
    <option value="blocked" disabled>
      Bloqueado
    </option>
    <option value="done">Fechado</option>
  </>
);

function setup(props: Partial<React.ComponentProps<typeof EzSelect>> = {}) {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <EzSelect id="st" label="Status" defaultValue="open" onChange={onChange} {...props}>
      {options}
    </EzSelect>,
  );
  const control = screen.getByRole('combobox', { name: /status/i });
  return { user, onChange, control };
}

describe('EzSelect (DMTE-490 T2)', () => {
  it('AC-08: shows the selected option label on the closed control, with the list closed', () => {
    const { control } = setup({ defaultValue: 'wait' });

    expect(control).toHaveTextContent('Aguardando Sankhya');
    expect(control).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('AC-08/AC-10: opens its own listbox with every option, marking the selected one', async () => {
    const { user, control } = setup({ defaultValue: 'wait' });

    await user.click(control);

    expect(control).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('listbox');
    const items = within(list).getAllByRole('option');
    expect(items.map((o) => o.textContent)).toEqual(['Aberto', 'Aguardando Sankhya', 'Bloqueado', 'Fechado']);
    expect(items.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false']);
  });

  it('AC-08: choosing an option by click calls onChange with the new value, closes the list and returns focus', async () => {
    const { user, onChange, control } = setup();

    await user.click(control);
    await user.click(screen.getByRole('option', { name: 'Fechado' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target.value).toBe('done');
    expect(control).toHaveTextContent('Fechado');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(control).toHaveFocus();
  });

  it('AC-08: a disabled option cannot be chosen', async () => {
    const { user, onChange, control } = setup();

    await user.click(control);
    await user.click(screen.getByRole('option', { name: 'Bloqueado' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(control).toHaveTextContent('Aberto');
  });

  it('AC-08: is controlled, showing `value` until the parent changes it', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState('open');
      return (
        <>
          <button type="button" onClick={() => setValue('done')}>
            parent sets done
          </button>
          <EzSelect id="c" label="Status" value={value} onChange={() => undefined}>
            {options}
          </EzSelect>
        </>
      );
    }
    render(<Controlled />);
    const control = screen.getByRole('combobox', { name: /status/i });

    await user.click(control);
    await user.click(screen.getByRole('option', { name: 'Fechado' }));
    expect(control).toHaveTextContent('Aberto');

    await user.click(screen.getByRole('button', { name: 'parent sets done' }));
    expect(control).toHaveTextContent('Fechado');
  });

  it('AC-09: ArrowDown opens, arrows move the active option skipping disabled ones, Enter chooses', async () => {
    const { user, onChange, control } = setup();
    control.focus();

    await user.keyboard('{ArrowDown}');
    expect(control).toHaveAttribute('aria-expanded', 'true');
    const items = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(control).toHaveAttribute('aria-activedescendant', items[0].id);

    await user.keyboard('{ArrowDown}');
    expect(control).toHaveAttribute('aria-activedescendant', items[1].id);

    await user.keyboard('{ArrowDown}');
    expect(control).toHaveAttribute('aria-activedescendant', items[3].id);

    await user.keyboard('{ArrowUp}');
    expect(control).toHaveAttribute('aria-activedescendant', items[1].id);

    await user.keyboard('{Enter}');
    expect(onChange.mock.calls[0][0].target.value).toBe('wait');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('AC-09: Home and End jump to the first and last enabled option', async () => {
    const { user, control } = setup({ defaultValue: 'wait' });
    control.focus();
    await user.keyboard('{ArrowDown}');
    const items = within(screen.getByRole('listbox')).getAllByRole('option');

    await user.keyboard('{End}');
    expect(control).toHaveAttribute('aria-activedescendant', items[3].id);

    await user.keyboard('{Home}');
    expect(control).toHaveAttribute('aria-activedescendant', items[0].id);
  });

  it('AC-09: Escape closes without choosing, returns focus to the control and does not reach a parent Escape handler', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const parentKey = vi.fn();
    render(
      <div onKeyDown={parentKey}>
        <EzSelect id="e" label="Status" defaultValue="open" onChange={onChange}>
          {options}
        </EzSelect>
      </div>,
    );
    const control = screen.getByRole('combobox', { name: /status/i });

    await user.click(control);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(control).toHaveFocus();
    expect(parentKey.mock.calls.some(([e]) => e.key === 'Escape')).toBe(false);
  });

  describe('rolagem da lista longa', () => {
    afterEach(() => {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    });

    it('AC-09: keeps the active option in view while navigating with the keyboard', async () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const { user, control } = setup();
      control.focus();

      await user.keyboard('{ArrowDown}{ArrowDown}');

      const items = within(screen.getByRole('listbox')).getAllByRole('option');
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' });
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(items[1]);
    });
  });

  it('AC-09: typing letters jumps to the next enabled option that starts with them', async () => {
    const { user, control } = setup();
    control.focus();
    await user.keyboard('{ArrowDown}');
    const items = within(screen.getByRole('listbox')).getAllByRole('option');

    await user.keyboard('f');
    expect(control).toHaveAttribute('aria-activedescendant', items[3].id);

    await user.keyboard('a');
    expect(control).toHaveAttribute('aria-activedescendant', items[0].id);

    await user.keyboard('ag');
    expect(control).toHaveAttribute('aria-activedescendant', items[1].id);

    await user.keyboard('b');
    expect(control).toHaveAttribute('aria-activedescendant', items[1].id);
  });

  it('AC-09: a click outside closes the list', async () => {
    const { user, control } = setup();

    await user.click(control);
    await user.click(document.body);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('AC-10: has a visible label, a required marker and a hidden native select wired to that label', () => {
    render(
      <EzSelect id="lbl" label="Prioridade" required defaultValue="open">
        {options}
      </EzSelect>,
    );

    expect(screen.getByText('Prioridade')).toBeVisible();
    expect(screen.getByText('*')).toBeInTheDocument();
    const native = screen.getByLabelText('Prioridade', { selector: 'select' });
    expect(native).toBeRequired();
    expect(native).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-10: clicking the label moves focus to the visible control, not to the hidden native select', async () => {
    const { user, control } = setup();

    await user.click(screen.getByText('Status'));

    expect(control).toHaveFocus();
  });

  it('AC-10: a required select left empty blocks the submit and focuses the visible control, flagged invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <EzSelect id="req" label="Mesa" required defaultValue="">
          <option value="">Selecione</option>
          <option value="a">Suporte</option>
        </EzSelect>
        <button type="submit">Enviar</button>
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    const control = screen.getByRole('combobox', { name: /mesa/i });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(control).toHaveFocus();
    expect(control).toHaveAttribute('aria-invalid', 'true');

    await user.click(control);
    await user.click(screen.getByRole('option', { name: 'Suporte' }));
    expect(control).not.toHaveAttribute('aria-invalid');
  });

  it('AC-10: announces the popup as a listbox and names the control after its label', () => {
    const { control } = setup();

    expect(control).toHaveAttribute('aria-haspopup', 'listbox');
    expect(control).toHaveAccessibleName(/status/i);
  });

  it('AC-10: disabled control does not open', async () => {
    const { user, control } = setup({ disabled: true });

    await user.click(control);

    expect(control).toBeDisabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('AC-10: error state flags the control invalid and shows the message', () => {
    const { control } = setup({ hasError: true, message: 'Escolha um status' });

    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Escolha um status')).toBeInTheDocument();
  });

  it('AC-11: forwards id, name, data-testid and ref to the native select and keeps userEvent.selectOptions working', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const ref = { current: null as HTMLSelectElement | null };
    render(
      <EzSelect ref={ref} id="nat" name="status" data-testid="nat-select" label="Status" defaultValue="open" onChange={onChange}>
        {options}
      </EzSelect>,
    );
    const native = screen.getByTestId('nat-select') as HTMLSelectElement;

    expect(ref.current).toBe(native);
    expect(native).toHaveAttribute('name', 'status');
    expect(native).toHaveAttribute('id', 'nat');

    await user.selectOptions(native, 'done');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(native.value).toBe('done');
    expect(screen.getByRole('combobox', { name: /status/i })).toHaveTextContent('Fechado');
  });

  it('AC-11: lists options declared inside optgroup', async () => {
    const user = userEvent.setup();
    render(
      <EzSelect id="grp" label="Filtro" defaultValue="a">
        <optgroup label="Atalhos">
          <option value="a">Todos</option>
        </optgroup>
        <optgroup label="Status">
          <option value="b">Aberto</option>
        </optgroup>
      </EzSelect>,
    );

    await user.click(screen.getByRole('combobox', { name: /filtro/i }));

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Todos', 'Aberto']);
  });

  it('DMTE-500 AC-01: o rótulo mantém leading-none em todas as variantes', () => {
    render(
      <>
        <EzSelect id="v-def" label="Padrão" defaultValue="open">{options}</EzSelect>
        <EzSelect id="v-cla" label="Clássico" variant="classic" defaultValue="open">{options}</EzSelect>
        <EzSelect id="v-com" label="Compacto" variant="compact" defaultValue="open">{options}</EzSelect>
      </>,
    );

    for (const name of ['Padrão', 'Clássico', 'Compacto']) {
      expect(screen.getByText(name)).toHaveClass('leading-none');
    }
  });

  it('DMTE-500 AC-02: a linha do rótulo e do asterisco tem leading-none', () => {
    render(
      <EzSelect id="v-req" label="Mesa" required defaultValue="open">{options}</EzSelect>,
    );

    const star = screen.getByText('*');
    expect(star.parentElement).toHaveClass('leading-none');
    // O asterisco tem o tamanho do rótulo: com o tamanho do corpo (16px) a linha ficaria 2px mais alta que a dos campos sem asterisco.
    expect(star).toHaveClass('text-[14px]');
  });
});
