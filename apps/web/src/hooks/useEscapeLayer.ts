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

// Valor-base do campo: o do foco, ou o do último `change` confirmado. O Esc devolve o campo a ele
// antes de tirar o foco, para que campo que grava no blur não salve o texto digitado.
// shortcut: só input/textarea voltam (select grava no onChange e contenteditable só perde o foco), upgrade se surgir campo assim com rascunho.
const baseValue = new WeakMap<HTMLElement, string>();

function snapshot(el: EventTarget | null) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) baseValue.set(el, el.value);
}
const onFocusIn = (e: FocusEvent) => snapshot(e.target);
const onChange = (e: Event) => snapshot(e.target);

function revertField(el: HTMLElement) {
  const base = baseValue.get(el);
  if (base === undefined || !('value' in el) || el.value === base) return;
  // Setter nativo + evento, para o React (campo controlado) receber o valor de volta.
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')?.set?.call(el, base);
  el.dispatchEvent(new Event('input', { bubbles: true }));
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
    const focused = document.activeElement;
    if (focused && !baseValue.has(focused as HTMLElement)) snapshot(focused); // autoFocus: o foco veio antes deste efeito
    if (stack.length === 0) {
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('focusin', onFocusIn);
      document.addEventListener('change', onChange);
    }
    stack.push(layer);
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('focusin', onFocusIn);
        document.removeEventListener('change', onChange);
      }
      const focused = document.activeElement;
      const orphaned = !focused || focused === document.body || !focused.isConnected;
      if (orphaned && trigger.current?.isConnected) trigger.current.focus();
    };
  }, [active, kind]);
}
