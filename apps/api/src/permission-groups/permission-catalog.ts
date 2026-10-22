/**
 * Catálogo de permissões (DMTE-84, Tarefa 1). Extraído ao vivo da tela real
 * do Tiflux (Configurações > Usuários > Grupos de permissões > detalhe de
 * um grupo), capturada via Playwright e anexada em DMTE-84 — os 5 blocos
 * ("Permissões administrativas/de cliente/de gestão/de relatório/técnicas")
 * e cada checkbox individual replicam exatamente o que existe lá, para que
 * `PermissionGroup.permissions` seja fiel ao Tiflux e não uma aproximação.
 *
 * Guardado como lista plana de chaves (não ~80 colunas booleanas) para que
 * adicionar/remover uma permissão no catálogo nunca exija uma migration.
 */
export enum PermissionCategory {
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  CLIENT = 'CLIENT',
  MANAGEMENT = 'MANAGEMENT',
  REPORTING = 'REPORTING',
  TECHNICAL = 'TECHNICAL',
}

export interface PermissionDefinition {
  key: string;
  category: PermissionCategory;
  label: string;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // Permissões administrativas
  { key: 'VIEW_CLIENTS_AND_RESOURCE_GROUPS', category: PermissionCategory.ADMINISTRATIVE, label: 'Visualizar clientes e grupos de recursos' },
  { key: 'MANAGE_CLIENTS_AND_RESOURCE_GROUPS', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar clientes e grupos de recursos' },
  { key: 'VIEW_CONTRACTS_ADMIN', category: PermissionCategory.ADMINISTRATIVE, label: 'Visualizar contratos' },
  { key: 'MANAGE_CONTRACTS', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar contratos' },
  { key: 'VIEW_RESOURCES_ADMIN', category: PermissionCategory.ADMINISTRATIVE, label: 'Visualizar recursos' },
  { key: 'MANAGE_RESOURCES', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar recursos' },
  { key: 'MANAGE_TRAVEL', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar deslocamentos' },
  { key: 'EDIT_CLOSED_TICKETS', category: PermissionCategory.ADMINISTRATIVE, label: 'Editar tickets fechados' },
  { key: 'MANAGE_BILLING', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar faturamento' },
  { key: 'MANAGE_BACKUP_RESOURCES', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar recursos de backup' },
  { key: 'ADD_SLA_TIME', category: PermissionCategory.ADMINISTRATIVE, label: 'Adicionar tempo de SLA' },
  { key: 'VIEW_TICKET_VALUES', category: PermissionCategory.ADMINISTRATIVE, label: 'Visualizar valores dos tickets' },
  { key: 'MANAGE_INTEGRATIONS', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar integrações' },
  { key: 'ACCESS_DATA_WAREHOUSES', category: PermissionCategory.ADMINISTRATIVE, label: 'Acessar Data Warehouses' },
  { key: 'MANAGE_SCHEDULES_ADMIN', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar agendas' },
  { key: 'MANAGE_CUSTOM_FIELDS', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar campos personalizados' },
  { key: 'MANAGE_CAMPAIGNS', category: PermissionCategory.ADMINISTRATIVE, label: 'Gerenciar campanhas' },

  // Permissões de cliente
  { key: 'ACCESS_CLIENT_PORTAL', category: PermissionCategory.CLIENT, label: 'Acessar o portal do cliente' },
  { key: 'UPLOAD_TICKET_ATTACHMENTS', category: PermissionCategory.CLIENT, label: 'Upload de anexos nos tickets' },
  { key: 'REMOVE_TICKET_ATTACHMENTS', category: PermissionCategory.CLIENT, label: 'Remover anexos nos tickets' },
  { key: 'VIEW_ALL_CLIENT_TICKETS', category: PermissionCategory.CLIENT, label: 'Visualizar todos os tickets do cliente' },
  { key: 'REMOVE_REPLY_ATTACHMENTS', category: PermissionCategory.CLIENT, label: 'Remover anexos das respostas' },
  { key: 'REMOVE_REPLIES', category: PermissionCategory.CLIENT, label: 'Remover respostas' },
  { key: 'VIEW_LAST_30_DAYS_TICKETS_WIDGET', category: PermissionCategory.CLIENT, label: 'Visualizar o widget de tickets nos últimos 30 dias' },
  { key: 'VIEW_TICKETS_BY_DESK_WIDGET', category: PermissionCategory.CLIENT, label: 'Visualizar o widget de tickets por mesa' },
  { key: 'VIEW_CONTRACT_CONSUMPTION_WIDGET', category: PermissionCategory.CLIENT, label: 'Visualizar o widget de gráfico de consumo de contrato' },
  { key: 'VIEW_WORKLOG_INFO', category: PermissionCategory.CLIENT, label: 'Visualizar informações de apontamento' },
  { key: 'CANCEL_TICKETS', category: PermissionCategory.CLIENT, label: 'Poder cancelar tickets' },
  { key: 'VIEW_SLA_INFO', category: PermissionCategory.CLIENT, label: 'Visualizar informações de SLA' },
  { key: 'VIEW_CUSTOM_FIELDS_INFO', category: PermissionCategory.CLIENT, label: 'Visualizar informações de campos personalizados' },
  { key: 'VIEW_VALUATION_INFO', category: PermissionCategory.CLIENT, label: 'Visualizar informações de valorização' },
  { key: 'VIEW_CHECKLIST_INFO', category: PermissionCategory.CLIENT, label: 'Visualizar informações de checklist' },
  { key: 'VIEW_TICKET_HISTORY', category: PermissionCategory.CLIENT, label: 'Visualizar o histórico dos tickets' },
  { key: 'OPEN_REQUESTS_AS_PRE_TICKETS', category: PermissionCategory.CLIENT, label: 'Abrir solicitações como pré-tickets' },
  { key: 'EDIT_CUSTOM_FIELDS', category: PermissionCategory.CLIENT, label: 'Editar campos personalizados' },
  { key: 'VIEW_RESOURCES_CLIENT', category: PermissionCategory.CLIENT, label: 'Visualizar recursos' },
  { key: 'VIEW_KNOWLEDGE_BASE', category: PermissionCategory.CLIENT, label: 'Visualizar base de conhecimento' },
  { key: 'VIEW_CONTRACTS_CLIENT', category: PermissionCategory.CLIENT, label: 'Visualizar contratos' },
  { key: 'OPEN_CHILD_TICKETS', category: PermissionCategory.CLIENT, label: 'Abrir tickets filhos' },

  // Permissões de gestão
  { key: 'MANAGE_PERMISSION_GROUPS', category: PermissionCategory.MANAGEMENT, label: 'Gerenciar grupos de permissão' },
  { key: 'MANAGE_USERS', category: PermissionCategory.MANAGEMENT, label: 'Gerenciar usuários' },
  { key: 'MANAGE_SERVICE_CATALOGS', category: PermissionCategory.MANAGEMENT, label: 'Gerenciar catálogos de serviço' },
  { key: 'MANAGE_SERVICE_DESKS', category: PermissionCategory.MANAGEMENT, label: 'Gerenciar mesas de serviços' },
  { key: 'ACCESS_AGENT_SETTINGS', category: PermissionCategory.MANAGEMENT, label: 'Acessar configurações de agente' },
  { key: 'REVIEW_REOPEN_CLOSED_TICKETS', category: PermissionCategory.MANAGEMENT, label: 'Revisar e reabrir tickets fechados' },
  { key: 'EDIT_ORGANIZATION_SETTINGS', category: PermissionCategory.MANAGEMENT, label: 'Editar configurações da organização' },
  { key: 'MANAGE_EMAIL_TICKETS', category: PermissionCategory.MANAGEMENT, label: 'Gerenciar tickets por e-mail' },
  { key: 'MANAGE_NEW_TICKET_AUTHORIZATION', category: PermissionCategory.MANAGEMENT, label: 'Gerenciar autorização de novos tickets' },
  { key: 'VIEW_USERS_IN_AGENT_REPORTS', category: PermissionCategory.MANAGEMENT, label: 'Visualizar usuários nos relatórios de atendentes' },
  { key: 'MANAGE_BULK_REMOTE_COMMANDS', category: PermissionCategory.MANAGEMENT, label: 'Gerenciar comandos remotos em massa' },
  { key: 'REMOVE_PUBLIC_TICKET_FILTERS', category: PermissionCategory.MANAGEMENT, label: 'Remover filtros de tickets públicos' },
  { key: 'MANAGE_TICKET_GROUP_TEMPLATES', category: PermissionCategory.MANAGEMENT, label: 'Gerenciar modelos de grupos de tickets' },

  // Permissões de relatório
  { key: 'VIEW_ADMIN_REPORTS', category: PermissionCategory.REPORTING, label: 'Visualizar relatórios administrativos' },
  { key: 'VIEW_AGENT_REPORTS', category: PermissionCategory.REPORTING, label: 'Visualizar relatórios dos atendentes' },
  { key: 'VIEW_RESOURCE_INVENTORY_REPORTS', category: PermissionCategory.REPORTING, label: 'Visualizar relatórios de inventário dos recursos' },
  { key: 'VIEW_CUSTOM_REPORTS', category: PermissionCategory.REPORTING, label: 'Visualizar relatórios personalizados' },
  { key: 'MANAGE_CUSTOM_REPORTS', category: PermissionCategory.REPORTING, label: 'Gerenciar relatórios personalizados' },
  { key: 'VIEW_CLIENT_CONSUMPTION_STATEMENT_REPORT', category: PermissionCategory.REPORTING, label: 'Visualizar relatório extrato consumo cliente' },
  { key: 'VIEW_EXTRA_VALUATION_REPORT', category: PermissionCategory.REPORTING, label: 'Visualizar relatório de valorização extra' },
  { key: 'VIEW_CONTRACT_CONSUMPTION_CHART_REPORT', category: PermissionCategory.REPORTING, label: 'Visualizar relatório gráfico consumo contrato' },
  { key: 'ACCESS_CHAT_INDICATORS', category: PermissionCategory.REPORTING, label: 'Acessar indicadores de chat' },
  { key: 'EXPORT_DATA', category: PermissionCategory.REPORTING, label: 'Exportar dados' },

  // Permissões técnicas
  { key: 'VIEW_AND_OPEN_TICKETS', category: PermissionCategory.TECHNICAL, label: 'Visualizar e abrir tickets' },
  { key: 'CREATE_EDIT_WORKLOGS', category: PermissionCategory.TECHNICAL, label: 'Criar e editar apontamentos' },
  { key: 'EDIT_TICKETS', category: PermissionCategory.TECHNICAL, label: 'Editar tickets' },
  { key: 'CHANGE_PRIORITY_AND_DISABLE_SLA', category: PermissionCategory.TECHNICAL, label: 'Mudar a prioridade e desativar SLA dos tickets' },
  { key: 'ADD_REMOVE_VALUATION_ON_OPEN_TICKETS', category: PermissionCategory.TECHNICAL, label: 'Inserir e remover valorização em tickets abertos' },
  { key: 'REMOTE_ACCESS', category: PermissionCategory.TECHNICAL, label: 'Acesso remoto' },
  { key: 'EDIT_ALL_WORKLOGS', category: PermissionCategory.TECHNICAL, label: 'Editar apontamentos de todos' },
  { key: 'VIEW_ADD_INTERNAL_COMMUNICATION', category: PermissionCategory.TECHNICAL, label: 'Visualizar e adicionar mensagens na comunicação interna' },
  { key: 'MANAGE_KNOWLEDGE_BASE', category: PermissionCategory.TECHNICAL, label: 'Gerenciar base de conhecimento' },
  { key: 'PAUSE_RESUME_SLA', category: PermissionCategory.TECHNICAL, label: 'Pausar e retomar SLA' },
  { key: 'VIEW_TICKETS_NOT_RESPONSIBLE_FOR', category: PermissionCategory.TECHNICAL, label: 'Visualizar tickets em que eu não sou o responsável' },
  { key: 'ACCESS_CHAT', category: PermissionCategory.TECHNICAL, label: 'Acessar o chat' },
  { key: 'CREATE_TICKET_SCHEDULING', category: PermissionCategory.TECHNICAL, label: 'Criar agendamento de tickets' },
  { key: 'MANAGE_PASSWORD_VAULT', category: PermissionCategory.TECHNICAL, label: 'Gerenciar cofre de senhas' },
  { key: 'VIEW_ALL_SCHEDULES', category: PermissionCategory.TECHNICAL, label: 'Visualizar todas as agendas' },
  { key: 'MANAGE_REQUESTERS_AND_CLIENT_USERS', category: PermissionCategory.TECHNICAL, label: 'Gerenciar solicitantes e usuários clientes' },
  { key: 'MANAGE_PRE_WORKLOGS', category: PermissionCategory.TECHNICAL, label: 'Gerenciar pré-apontamentos' },
  { key: 'ACCESS_PRE_TICKETS', category: PermissionCategory.TECHNICAL, label: 'Acessar pré-tickets' },
  { key: 'EDIT_PUBLIC_TICKET_FILTERS', category: PermissionCategory.TECHNICAL, label: 'Editar filtros de tickets públicos' },
  { key: 'MANAGE_JIRA_GITHUB_ISSUES', category: PermissionCategory.TECHNICAL, label: 'Abrir e manipular issues no Jira e Github' },
  { key: 'MANAGE_TEMPLATES', category: PermissionCategory.TECHNICAL, label: 'Gerenciar modelos' },
  { key: 'EDIT_SERVICE_CATALOG_ON_CLOSED_TICKET', category: PermissionCategory.TECHNICAL, label: 'Editar catálogo de serviços de um ticket fechado' },
  { key: 'MANAGE_CHECKLISTS', category: PermissionCategory.TECHNICAL, label: 'Gerenciar checklists' },
  { key: 'CANCEL_CHATS', category: PermissionCategory.TECHNICAL, label: 'Cancelar chats' },
];

export const PERMISSION_KEYS: readonly string[] = PERMISSION_CATALOG.map((p) => p.key);

export function isValidPermissionKey(key: string): boolean {
  return PERMISSION_KEYS.includes(key);
}
