import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzForm } from './EzForm';
import { EzTextInput } from './EzTextInput';
import { EzTextArea } from './EzTextArea';
import { EzButton } from './EzButton';

/**
 * Aponta DS Form — container de formulário em card (24px) com espaçamento
 * vertical padrão. Usado no cadastro/edição de chamados, clientes e
 * contratos do helpdesk.
 */
const meta: Meta<typeof EzForm> = {
  title: 'DS/EzForm',
  component: EzForm,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzForm>;

export const Default: Story = {
  args: { onSubmit: (e) => e.preventDefault() },
  render: (args) => (
    <EzForm {...args}>
      <EzTextInput id="form-assunto" label="Assunto do chamado" placeholder="Ex.: Falha no servidor de produção" />
      <EzTextInput id="form-cliente" label="Cliente" placeholder="Ex.: Social Tecnologia" />
      <EzButton variant="primary" label="Salvar chamado" type="submit" />
    </EzForm>
  ),
};

export const NovoCliente: Story = {
  args: { onSubmit: (e) => e.preventDefault() },
  render: (args) => (
    <EzForm {...args}>
      <EzTextInput id="form-razao" label="Razão social" placeholder="Ex.: Refrigeração Mota Ltda" required />
      <EzTextInput id="form-cnpj" label="CNPJ" placeholder="00.000.000/0000-00" required />
      <EzTextInput id="form-email" label="E-mail do contato" type="email" placeholder="contato@empresa.com.br" />
      <div className="flex justify-end gap-3">
        <EzButton variant="secondary" label="Cancelar" onClick={() => undefined} />
        <EzButton variant="primary" label="Cadastrar cliente" type="submit" />
      </div>
    </EzForm>
  ),
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [assunto, setAssunto] = useState('');
      const [descricao, setDescricao] = useState('');
      const [enviado, setEnviado] = useState(false);
      return (
        <EzForm
          onSubmit={(e) => {
            e.preventDefault();
            setEnviado(true);
          }}
        >
          <EzTextInput
            id="form-interactive-assunto"
            label="Assunto do chamado"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder="Ex.: Instabilidade no acesso remoto"
          />
          <EzTextArea
            id="form-interactive-descricao"
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o problema relatado pelo cliente..."
          />
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-gray-500">
              {enviado ? 'Chamado registrado com sucesso.' : 'Preencha os campos e envie.'}
            </span>
            <EzButton variant="primary" label="Abrir chamado" type="submit" />
          </div>
        </EzForm>
      );
    }
    return <Demo />;
  },
};
