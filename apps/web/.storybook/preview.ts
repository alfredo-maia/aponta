import type { Preview } from '@storybook/react-vite';

// Carrega o Tailwind v4 + os design tokens da Aponta DS (ver
// apps/web/src/styles.css): sem este import, os componentes Ez* renderiam
// sem cor/raio/tipografia no Storybook, pois eles usam apenas classes
// utilitárias Tailwind (nenhum CSS-in-JS/módulo próprio).
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // O layout padrão do Aponta usa bg-gray-80 como fundo de página
    // (ver EzPageLayout) — espelhamos isso no canvas do Storybook em vez
    // do branco padrão, para as sombras/bordas dos cards ficarem visíveis
    // como ficam em produção.
    backgrounds: {
      default: 'aponta-gray-80',
      values: [
        { name: 'aponta-gray-80', value: '#F9F9F9' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
  },
};

export default preview;
