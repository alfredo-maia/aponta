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

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  const top = [...stack].reverse().find((l) => l.kind === 'overlay') ?? stack[stack.length - 1];
  if (!top) return;
  // Em campo de texto o Esc pertence ao campo: só tira o foco dele; o próximo Esc age na camada.
  if (isTextField(e.target)) {
    e.target.blur();
    return;
  }
  e.preventDefault();
  top.handler.current();
}

/**
 * Registra uma camada de Esc. Em campo de texto o primeiro Esc só sai do campo. Ao desativar, o foco volta ao gatilho se ficou sem dono.
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
    if (stack.length === 0) document.addEventListener('keydown', onKeyDown);
    stack.push(layer);
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) document.removeEventListener('keydown', onKeyDown);
      const focused = document.activeElement;
      const orphaned = !focused || focused === document.body || !focused.isConnected;
      if (orphaned && trigger.current?.isConnected) trigger.current.focus();
    };
  }, [active, kind]);
}
