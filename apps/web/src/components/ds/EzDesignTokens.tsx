/**
 * Aponta DS — Tokens de proporção (D6, ADR 0001-paleta-unica-brand-na-aba-tickets).
 * Documenta, em Storybook, a escala fechada na fatia 1 da DMTE-427: altura de
 * controle, raio e sombra. Valores medidos nos primitivos já renderizados
 * (EzButton/EzTextInput/EzCardItem), não um novo conjunto inventado.
 */
export function EzDesignTokens() {
  const heights = [
    { token: '--control-height-md', value: '42px', label: 'Altura padrão de controle' },
    { token: '--control-height-compact', value: '32px', label: 'Altura compacta de controle' },
  ] as const;
  const radii = [
    { token: 'rounded-control (--radius-control)', value: '10px', label: 'Raio de controles da toolbar' },
    { token: 'rounded-card (--radius-card)', value: '16px', label: 'Raio de cartões' },
  ];
  const shadows = [
    { token: 'shadow-card (--shadow-card)', label: 'Sombra de cartão' },
    { token: 'shadow-popover (--shadow-popover)', label: 'Sombra de popover' },
  ];

  return (
    <div className="space-y-6 p-4 font-sans text-gray-900">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Altura de controle</h3>
        <ul className="space-y-2">
          {heights.map((item) => (
            <li key={item.token} className="flex items-center gap-3">
              <div
                className="flex items-center rounded-control border border-gray-200 bg-white px-3 text-[13px]"
                style={{ height: `var(${item.token})` }}
              >
                {item.label}
              </div>
              <code className="text-[12px] text-gray-500">
                {item.token}: {item.value}
              </code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Raio</h3>
        <ul className="space-y-2">
          {radii.map((item) => (
            <li key={item.token} className="text-[13px]">
              <code>{item.token}</code>: {item.value} — {item.label}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Sombra</h3>
        <ul className="space-y-2">
          {shadows.map((item) => (
            <li key={item.token} className="text-[13px]">
              <code>{item.token}</code> — {item.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
