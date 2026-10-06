import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzAttachmentList, type EzAttachment } from './EzAttachmentList';

/**
 * Aponta DS Attachment List — espelha o comportamento visual do `snk-attach`
 * do catálogo Sankhya DS: lista de arquivos anexados a um registro, com
 * nome, tamanho e ícone por tipo, além de ações de visualizar, baixar e
 * remover, e uma dropzone para adicionar novos anexos. Sem nenhuma
 * dependência de SnkApplication/DataUnit/registerKey/entityName — apenas a
 * UI genérica, composta a partir de ícones do `lucide-react`.
 */
const meta: Meta<typeof EzAttachmentList> = {
  title: 'DS/EzAttachmentList',
  component: EzAttachmentList,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzAttachmentList>;

const baseAttachments: EzAttachment[] = [
  { id: '1', name: 'contrato-manutencao-2026.pdf', size: 253952, url: 'https://example.com/contrato.pdf' },
  { id: '2', name: 'relatorio-atendimentos.xlsx', size: 1258291 },
  { id: '3', name: 'print-erro-login.png', size: 87654 },
  { id: '4', name: 'evidencia-falha-servidor.zip', size: 4823040 },
];

export const Default: Story = {
  args: {
    attachments: baseAttachments,
  },
};

export const ComAcoes: Story = {
  args: {
    attachments: baseAttachments,
    onView: () => undefined,
    onDownload: () => undefined,
    onRemove: () => undefined,
  },
};

export const ComDropzoneParaAdicionar: Story = {
  args: {
    attachments: baseAttachments.slice(0, 2),
    onView: () => undefined,
    onDownload: () => undefined,
    onRemove: () => undefined,
    onAdd: () => undefined,
  },
};

export const Vazio: Story = {
  args: {
    attachments: [],
    onAdd: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [attachments, setAttachments] = useState<EzAttachment[]>(baseAttachments);

      return (
        <div className="flex w-full max-w-md flex-col gap-2">
          <EzAttachmentList
            attachments={attachments}
            onView={() => undefined}
            onDownload={() => undefined}
            onRemove={(id) => setAttachments((current) => current.filter((item) => item.id !== id))}
            onAdd={(files) =>
              setAttachments((current) => [
                ...current,
                ...files.map((file, index) => ({
                  id: `novo-${Date.now()}-${index}`,
                  name: file.name,
                  size: file.size,
                })),
              ])
            }
          />
        </div>
      );
    }
    return <Demo />;
  },
};
