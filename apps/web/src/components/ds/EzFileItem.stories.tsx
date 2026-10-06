import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzFileItem } from './EzFileItem';

/**
 * Aponta DS File Item — linha de anexo com nome, tamanho e ações de
 * baixar/remover. Usado na aba de anexos de chamados e contratos.
 * Importar diretamente de './EzFileItem' (implementação standalone).
 */
const meta: Meta<typeof EzFileItem> = {
  title: 'DS/EzFileItem',
  component: EzFileItem,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzFileItem>;

export const Default: Story = {
  args: { fileName: 'contrato-manutencao-2026.pdf', fileSize: '248 KB' },
};

export const SemTamanho: Story = {
  args: { fileName: 'print-erro-login.png' },
};

export const ComAcoes: Story = {
  args: {
    fileName: 'relatorio-atendimentos-setembro.xlsx',
    fileSize: '1,2 MB',
    onDownload: () => undefined,
    onRemove: () => undefined,
  },
};

export const SomenteDownload: Story = {
  args: {
    fileName: 'sla-contratual.pdf',
    fileSize: '96 KB',
    onDownload: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [files, setFiles] = useState([
        { name: 'nota-fiscal-10234.pdf', size: '180 KB' },
        { name: 'evidencia-falha-servidor.zip', size: '4,6 MB' },
        { name: 'termo-de-garantia.pdf', size: '92 KB' },
      ]);
      return (
        <div className="flex w-full max-w-md flex-col gap-2">
          {files.map((file) => (
            <EzFileItem
              key={file.name}
              fileName={file.name}
              fileSize={file.size}
              onDownload={() => undefined}
              onRemove={() => setFiles((current) => current.filter((f) => f.name !== file.name))}
            />
          ))}
          {files.length === 0 && (
            <span className="text-[13px] text-gray-500">Todos os anexos foram removidos.</span>
          )}
        </div>
      );
    }
    return <Demo />;
  },
};
