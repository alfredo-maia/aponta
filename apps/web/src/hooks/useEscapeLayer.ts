import { useEffect, useRef } from 'react';

/** 'overlay' (modal, drawer, popover) sempre tem prioridade sobre 'page' (Voltar de tela). */
export type EscapeLayerKind = 'overlay' | 'page';

type Layer = { handler: { current: () => void }; kind: EscapeLayerKind };

// Pilha global: um único listener, só uma camada age a cada Esc.
const stack: Layer[] = [];

// Checkbox, radio, range, file, button etc. não editam texto: não seguram o Esc.
const NON_TEXT_INPUT = /^(checkbox|radio|range|file|button|submit|reset|image|color)$/;

const isTextField = (el: EventTarget | null): el is HTMLElement =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    /^(TEXTAREA|SELECT)$/.test(el.tagName) ||
    (el instanceof HTMLInputElement && !NON_TEXT_INPUT.test(el.type)));

// Valor do campo ao receber o foco: o Esc devolve o campo a ele (cancela a edição) antes de tirar o foco,
// para que campos que gravam no blur não salvem o texto digitado.
const valueOnFocus = new WeakMap<HTMLElement, string>();

function onFocusIn(e: FocusEvent) {
  const el = e.target;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    valueOnFocus.set(el, el.value);
  }
}

function revertField(el: HTMLElement) {
  const initial = valueOnFocus.get(el);
  if (initial === undefined || !('value' in el) || el.value === initial) return;
  // Setter nativo + evento, para o React (campo controlado) receber o valor de volta.
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')?.set?.call(el, initial);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  const top = [...stack].reverse().find((l) => l.kind === 'overlay') ?? stack[stack.length - 1];
  if (!top) return;
  // Em campo de texto o Esc pertence ao campo: só tira o foco dele; o próximo Esc age na camada.
  if (isTextField(e.target)) {
    revertField(e.target);
    e.target.blur();
    return;
  }
  e.preventDefault();
  top.handler.current();
}

/**
 * Registra uma camada de Esc. Em campo de texto o primeiro Esc devolve o campo ao valor do foco e sai dele. Ao desativar, o foco volta ao gatilho se ficou sem dono.
 * Campos que tratam Esc sozinhos devem chamar `preventDefault` (ex.: EzTextEdit).
 */
export function useEscapeLayer(onEscape: () => void, active = true, kind: EscapeLayerKind = 'overlay'): void {
  const handler = useRef(onEscape);
  handler.current = onEscape;
  const trigger = useRef<HTMLElement | null>(null);
  const wasActive = useRef(false);
  // Lido no render, antes de os filhos receberem foco (autoFocus).
  if (active && !wasActive.current) trigger.current = document.activeElement as HTMLElement | null;
  wasActive.current = active;

  useEffect(() => {
    if (!active) return;
    const layer: Layer = { handler, kind };
    if (stack.length === 0) {
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('focusin', onFocusIn);
    }
    stack.push(layer);
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('focusin', onFocusIn);
      }
      const focused = document.activeElement;
      const orphaned = !focused || focused === document.body || !focused.isConnected;
      if (orphaned && trigger.current?.isConnected) trigger.current.focus();
    };
  }, [active, kind]);
}
