import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Compass,
  HelpCircle,
  KeyRound,
  Bot,
  Ticket,
  Lock,
  Briefcase,
  BarChart,
  BookMarked,
} from 'lucide-react';

type SectionId =
  | 'conceitos'
  | 'tickets'
  | 'relatorios'
  | 'cofre'
  | 'contratos'
  | 'conhecimento'
  | 'faq'
  | 'api'
  | 'mcp';

interface NavGroup {
  label: string;
  items: { id: SectionId; label: string; icon: ReactNode }[];
}

const NAV: NavGroup[] = [
  {
    label: 'Conceitos',
    items: [{ id: 'conceitos', label: 'Visão geral do Aponta', icon: <Compass className="h-4 w-4" /> }],
  },
  {
    label: 'Módulos do Sistema',
    items: [
      { id: 'tickets', label: 'Tickets & Kanban', icon: <Ticket className="h-4 w-4" /> },
      { id: 'relatorios', label: 'Relatórios', icon: <BarChart className="h-4 w-4" /> },
      { id: 'cofre', label: 'Cofre de Senhas', icon: <Lock className="h-4 w-4" /> },
      { id: 'contratos', label: 'Contratos', icon: <Briefcase className="h-4 w-4" /> },
      { id: 'conhecimento', label: 'Base de Conhecimento', icon: <BookMarked className="h-4 w-4" /> },
    ],
  },
  {
    label: 'FAQ',
    items: [{ id: 'faq', label: 'Dúvidas Frequentes', icon: <HelpCircle className="h-4 w-4" /> }],
  },
  {
    label: 'Integrações',
    items: [
      { id: 'api', label: 'API & Tokens de Acesso', icon: <KeyRound className="h-4 w-4" /> },
      { id: 'mcp', label: 'MCP (Assistentes de IA)', icon: <Bot className="h-4 w-4" /> },
    ],
  },
];

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: SectionId;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-4">
      <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight mb-3">
        {icon}
        {title}
      </h2>
      <div className="prose prose-sm max-w-none text-foreground space-y-3">{children}</div>
    </section>
  );
}

export function DocsPage() {
  const [active, setActive] = useState<SectionId>('conceitos');

  const handleNavClick = (id: SectionId) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex gap-8">
      <nav className="hidden w-60 flex-shrink-0 lg:block">
        <div className="sticky top-4 space-y-6">
          <div className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="h-5 w-5" /> Documentação
          </div>
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavClick(item.id)}
                      className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm ${
                        active === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="min-w-0 flex-1 pb-16">
        <h1 className="mb-8 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <BookOpen className="h-8 w-8" /> Central de Documentação
        </h1>

        <Section id="conceitos" title="Visão geral do Aponta" icon={<Compass className="h-6 w-6" />}>
          <p>
            O <strong>Aponta</strong> é uma plataforma de Service Desk (gestão de tickets de
            atendimento) multitenant, pensada para organizar o fluxo entre clientes, agentes e
            administradores com total isolamento de dados por empresa (<em>Organização</em>).
          </p>
          <p>
            <strong>Papéis (Roles):</strong>
          </p>
          <ul className="list-disc pl-6">
            <li><strong>ADMIN</strong> — acesso global ao sistema.</li>
            <li><strong>AGENT_MASTER</strong> — vê todos os tickets das Mesas de Serviço em que atua.</li>
            <li><strong>AGENT</strong> — atende tickets das Mesas de Serviço às quais está vinculado.</li>
            <li><strong>CLIENT_MASTER</strong> — vê todos os tickets da sua Organização (empresa).</li>
            <li><strong>CLIENT</strong> — vê apenas os próprios chamados abertos.</li>
          </ul>
          <p>
            <strong>Ticket:</strong> unidade de atendimento (chamado), com protocolo único,
            prioridade, SLA de resposta/resolução e histórico de status.
          </p>
          <p>
            <strong>Mesa de Serviço (ServiceDesk):</strong> fila/departamento para onde um ticket é
            direcionado (ex: TI, Financeiro). Agentes são vinculados a uma ou mais Mesas.
          </p>
        </Section>

        <Section id="tickets" title="Tickets & Kanban" icon={<Ticket className="h-6 w-6" />}>
          <p>
            A <strong>Caixa de Entrada</strong> (página inicial para Agentes/Admin) exibe os tickets
            em um quadro Kanban por status (Aberto, Em Andamento, Pausado, Resolvido, Fechado).
            Arraste um card entre colunas para mudar seu status, ou use o seletor de status na tela
            de detalhe do ticket.
          </p>
          <p>
            Clientes veem a mesma lista filtrada para <strong>apenas os seus próprios chamados</strong>,
            na página <Link to="/" className="text-primary underline">Meus Chamados</Link>, e podem
            abrir um novo chamado em <Link to="/tickets/new" className="text-primary underline">Abrir Chamado</Link>.
          </p>
          <p>
            Cada ticket acompanha prazos de SLA (resposta e resolução) calculados a partir da Mesa de
            Serviço, com pausas automáticas quando o ticket aguarda retorno do cliente.
          </p>
        </Section>

        <Section id="relatorios" title="Relatórios" icon={<BarChart className="h-6 w-6" />}>
          <p>
            A aba <Link to="/reports" className="text-primary underline">Relatórios</Link> reúne duas
            visões, separadas por abas:
          </p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Carga de Trabalho</strong> — minutos apontados (Worklogs) por agente. Um Agente
              comum só vê os próprios apontamentos; Admin e Agent Master veem a equipe inteira.
            </li>
            <li>
              <strong>Faturamento</strong> — horas faturáveis/não-faturáveis agregadas por
              organização. Visível apenas para <strong>ADMIN</strong> e{' '}
              <strong>CLIENT_MASTER</strong> — a API bloqueia a consulta para os demais papéis antes
              mesmo de tocar no banco de dados.
            </li>
          </ul>
        </Section>

        <Section id="cofre" title="Cofre de Senhas" icon={<Lock className="h-6 w-6" />}>
          <p>
            O <Link to="/vault" className="text-primary underline">Cofre de Senhas</Link> guarda
            credenciais de acesso a sistemas de clientes (usuário/senha, URL, notas), restrito a
            papéis internos (<strong>ADMIN</strong>, <strong>AGENT_MASTER</strong>,{' '}
            <strong>AGENT</strong>). Clientes <strong>nunca</strong> têm acesso a este módulo — a API
            retorna 403 mesmo que a URL seja acessada diretamente. Apenas <strong>ADMIN</strong> pode
            criar, editar ou excluir credenciais.
          </p>
        </Section>

        <Section id="contratos" title="Contratos" icon={<Briefcase className="h-6 w-6" />}>
          <p>
            A tela de <Link to="/contracts" className="text-primary underline">Contratos</Link> lista
            os contratos de cobertura/SLA vinculados a cada Organização. Campos financeiros (valor
            mensal, valor de última aditivo, data de reajuste) só são retornados pela API para{' '}
            <strong>ADMIN</strong> e <strong>CLIENT_MASTER</strong> — para Agentes e Agent Masters o
            próprio backend zera esses campos antes da resposta, nunca dependendo apenas da interface
            para escondê-los.
          </p>
        </Section>

        <Section id="conhecimento" title="Base de Conhecimento" icon={<BookMarked className="h-6 w-6" />}>
          <p>
            A <Link to="/knowledge" className="text-primary underline">Base de Conhecimento</Link>{' '}
            funciona como uma Wiki/FAQ interna. Artigos podem ser marcados como{' '}
            <strong>públicos</strong> (visíveis a Clientes) ou <strong>internos</strong> (somente
            equipe).
          </p>
          <ul className="list-disc pl-6">
            <li><strong>ADMIN</strong> — cria, edita e exclui qualquer artigo.</li>
            <li><strong>AGENT / AGENT_MASTER</strong> — criam e editam, mas não podem excluir (evita perda de histórico).</li>
            <li><strong>CLIENT / CLIENT_MASTER</strong> — veem apenas artigos marcados como públicos.</li>
          </ul>
        </Section>

        <Section id="faq" title="Dúvidas Frequentes" icon={<HelpCircle className="h-6 w-6" />}>
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Como abro um novo chamado?</p>
              <p>
                Clique em <strong>Abrir Chamado</strong> / <strong>Novo Chamado</strong> no menu
                lateral, escolha a Mesa de Serviço de destino, descreva o problema e envie.
              </p>
            </div>
            <div>
              <p className="font-semibold">Por que não vejo o módulo de Contratos ou Cofre de Senhas?</p>
              <p>
                Esses módulos são restritos por papel (role). Clientes não têm acesso ao Cofre de
                Senhas; apenas Admin e Client Master veem valores financeiros de Contratos.
              </p>
            </div>
            <div>
              <p className="font-semibold">Como gero um token para integrar com outro sistema ou IA?</p>
              <p>
                Veja a seção <a href="#api" onClick={() => handleNavClick('api')} className="text-primary underline cursor-pointer">API &amp; Tokens de Acesso</a> abaixo.
              </p>
            </div>
          </div>
        </Section>

        <Section id="api" title="API & Tokens de Acesso" icon={<KeyRound className="h-6 w-6" />}>
          <p>
            O Aponta expõe uma API REST completa (action-driven, documentada via Swagger/OpenAPI) que
            cobre todos os módulos do sistema. Para autenticar uma integração externa (automação,
            script, ou um assistente de IA via MCP), gere um{' '}
            <strong>Token de API pessoal</strong>:
          </p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>
              Acesse <Link to="/my-account" className="text-primary underline">Configurações &gt; Minha Conta</Link>.
            </li>
            <li>Clique na aba <strong>Tokens de API</strong>.</li>
            <li>Dê um nome claro ao token (ex: &quot;Integração n8n&quot;, &quot;MCP Claude Desktop&quot;).</li>
            <li>Clique em <strong>Gerar Novo Token</strong>.</li>
            <li>
              O valor completo do token é exibido <strong>uma única vez</strong>. Copie e guarde em
              local seguro — o Aponta não armazena o texto puro e não pode exibi-lo novamente.
            </li>
          </ol>
          <p>
            <strong>Importante sobre permissões:</strong> o token herda automaticamente o mesmo
            Role e Organização do usuário que o gerou. Um <strong>Client Master</strong> que gera um
            token só consegue acessar, via API, os mesmos dados que já vê na interface — nunca dados
            de outra empresa.
          </p>
          <p>
            Para revogar um token comprometido ou não utilizado, volte à mesma aba e clique em{' '}
            <strong>Revogar</strong> ao lado do token na lista.
          </p>
        </Section>

        <Section id="mcp" title="MCP — Conectando Assistentes de IA" icon={<Bot className="h-6 w-6" />}>
          <p>
            O Aponta possui um servidor <strong>MCP (Model Context Protocol)</strong> standalone, que
            permite que assistentes de IA (Claude Desktop, e outros clientes compatíveis) consultem e
            operem o sistema diretamente, usando linguagem natural.
          </p>
          <p><strong>Passo 1 — Gerar o token:</strong> siga o passo a passo da seção <a href="#api" onClick={() => handleNavClick('api')} className="text-primary underline cursor-pointer">API &amp; Tokens de Acesso</a> acima.</p>
          <p><strong>Passo 2 — Configurar o cliente MCP</strong> (exemplo Claude Desktop):</p>
          <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "aponta": {
      "command": "node",
      "args": ["/caminho/para/aponta/dist/apps/mcp/main.js"],
      "env": {
        "APONTA_API_URL": "https://sua-instancia.aponta.com/api",
        "APONTA_API_TOKEN": "apta_xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}`}
          </pre>
          <p><strong>Ferramentas (tools) disponíveis para a IA:</strong></p>
          <ul className="list-disc pl-6">
            <li><strong>Tickets</strong> — listar, buscar, criar, mudar status, atribuir a um agente.</li>
            <li><strong>Relatórios</strong> — carga de trabalho por agente, faturamento por organização.</li>
            <li><strong>Cofre de Senhas</strong> — listar e criar credenciais.</li>
            <li><strong>Contratos</strong> — listar contratos (valores financeiros respeitam o mesmo RBAC do token).</li>
            <li><strong>Base de Conhecimento</strong> — listar e criar artigos.</li>
          </ul>
          <p>
            Todas as regras de visibilidade (Role/Organização) são aplicadas pelo mesmo motor de
            segurança usado pela interface web — a IA nunca acessa mais dados do que o usuário que
            gerou o token teria acesso.
          </p>
          <p className="text-sm text-muted-foreground">
            Problemas comuns: se a IA relatar &quot;acesso negado&quot; ao tentar uma ação
            administrativa (ex: criar credencial no Cofre), confirme que o token foi gerado por um
            usuário com o papel (Role) necessário.
          </p>
        </Section>
      </div>
    </div>
  );
}

export default DocsPage;
