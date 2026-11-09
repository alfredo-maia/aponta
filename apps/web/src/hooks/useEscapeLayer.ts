import { useEffect, useRef } from 'react';

type Layer = { current: () => void };

// Pilha global: um único listener, só a camada do topo age a cada Esc.
const stack: Layer[] = [];

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  const top = stack[stack.length - 1];
  if (!top) return;
  e.preventDefault();
  top.current();
}

/**
 * Registra uma camada de Esc (modal, diálogo, drawer, "Voltar" de tela).
 * A camada do topo da pilha trata o Esc; ao desativar, o foco volta ao gatilho.
 * Campos que tratam Esc sozinhos devem chamar `preventDefault` (ex.: EzTextEdit).
 */
export function useEscapeLayer(onEscape: () => void, active = true): void {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const trigger = document.activeElement as HTMLElement | null;
    const layer: Layer = handler;
    if (stack.length === 0) document.addEventListener('keydown', onKeyDown);
    stack.push(layer);
    return () => {
      stack.splice(stack.indexOf(layer), 1);
      if (stack.length === 0) document.removeEventListener('keydown', onKeyDown);
      if (trigger?.isConnected) trigger.focus();
    };
  }, [active]);
}
