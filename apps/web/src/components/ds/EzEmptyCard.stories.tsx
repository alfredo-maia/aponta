import type { Meta, StoryObj } from '@storybook/react-vite';
import { Ticket, FileX2, SearchX } from 'lucide-react';
import { EzEmptyCard } from './EzEmptyCard';
import { EzButton } from './EzButton';

/**
 * Aponta DS Empty Card — estado vazio com ícone, título, descrição e ação
 * opcional. Usado em listas de chamados, contratos e anexos sem resultados.
 * Importar diretamente de './EzEmptyCard' (implementação standalone).
 */
const meta: Meta<typeof EzEmptyCard> = {
  title: 'DS/EzEmptyCard',
  component: EzEmptyCard,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzEmptyCard>;

export const Default: Story = {
  args: { title: 'Nenhum chamado encontrado' },
};

export const ComDescricao: Story = {
  args: {
    icon: Ticket,
    title: 'Nenhum chamado aberto',
    description: 'Não há chamados abertos para a Social Tecnologia no momento. Novos chamados aparecerão aqui.',
  },
};

export const BuscaSemResultado: Story = {
  args: {
    icon: SearchX,
    title: 'Nenhum resultado para "servidor"',
    description: 'Verifique os termos da busca ou ajuste os filtros aplicados à listagem.',
  },
};

export const ComAcao: Story = {
  args: {
    icon: FileX2,
    title: 'Nenhum anexo no chamado',
    description: 'Este chamado ainda não possui arquivos anexados pela equipe de suporte.',
    action: <EzButton variant="secondary" size="small" label="Anexar arquivo" onClick={() => undefined} />,
  },
};
