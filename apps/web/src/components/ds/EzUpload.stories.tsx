import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzUpload, EzFileItem } from './EzUpload';

/**
 * Aponta DS Upload
 * Dropzone para envio de arquivos (anexos de chamados, comprovantes,
 * evidências). Suporta restrição de tipo via `accept`, múltiplos arquivos e
 * estado de erro com mensagem. `onChange` é obrigatório e recebe o array de
 * `File` selecionados. Use `EzFileItem` para listar os arquivos já enviados.
 */
const meta: Meta<typeof EzUpload> = {
  title: 'DS/EzUpload',
  component: EzUpload,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzUpload>;

export const Default: Story = {
  args: {
    onChange: () => undefined,
  },
};

export const ComTiposAceitos: Story = {
  args: {
    accept: 'image/*,.pdf',
    multiple: true,
    onChange: () => undefined,
  },
};

export const ComErro: Story = {
  args: {
    hasError: true,
    message: 'Arquivo excede o limite de 10MB permitido para anexos de chamado.',
    onChange: () => undefined,
  },
};

export const RotuloPersonalizado: Story = {
  args: {
    label: 'Envie o comprovante de pagamento do contrato',
    accept: '.pdf,.jpg,.png',
    message: 'Formatos aceitos: PDF, JPG ou PNG',
    onChange: () => undefined,
  },
};

export const Interativo: Story = {
  render: () => {
    function Demo() {
      const [files, setFiles] = useState<File[]>([]);

      return (
        <div className="flex w-full max-w-md flex-col gap-3">
          <EzUpload
            multiple
            accept=".pdf,.png,.jpg"
            message="Formatos aceitos: PDF, PNG ou JPG — anexos do chamado"
            onChange={(newFiles: any[]) => setFiles((current) => [...current, ...newFiles])}
          />
          {files.map((file, index) => (
            <EzFileItem
              key={`${file.name}-${index}`}
              file={file}
              onRemove={() => setFiles((current) => current.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      );
    }
    return <Demo />;
  },
};
