/** Portuguese labels for ticket sections — never show the enum/DB key in UI. */
export const TICKET_SECTION_LABELS: Record<string, string> = {
  GENERAL_INFO: 'Informações gerais',
  CATEGORY: 'Categoria',
  SERVICE_TYPE: 'Tipo de atendimento',
  WORKLOGS: 'Apontamentos',
  COMMUNICATION: 'Comunicação',
  APPOINTMENTS: 'Compromissos',
  VALUATION: 'Valorização',
  E_SIGNATURE: 'Assinatura eletrônica',
  GITHUB: 'GitHub',
  HISTORY: 'Histórico',
  TROUBLESHOOTING: 'Troubleshooting',
};

export function ticketSectionLabel(key: string): string {
  return TICKET_SECTION_LABELS[key] ?? key;
}
