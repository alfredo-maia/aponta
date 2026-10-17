import type { Worklog } from '../../hooks/useWorklogs';

export function WorklogValuation({
  worklog,
  showFinancial,
}: {
  worklog: Pick<
    Worklog,
    | 'contractId'
    | 'valuationType'
    | 'value'
    | 'valueCents'
    | 'costCents'
    | 'valuationSnapshot'
  >;
  showFinancial: boolean;
}) {
  const amount =
    worklog.valueCents != null ? worklog.valueCents / 100 : worklog.value;
  const label = {
    CONTRACT: 'Contrato',
    GUARANTEE: 'Garantia',
    BONUS: 'Bonificação',
    MANUAL: 'Valor manual',
  }[worklog.valuationType];
  return (
    <div className="space-y-1 text-sm">
      <p>
        {label}
        {worklog.contractId || worklog.valuationType === 'CONTRACT'
          ? ` · ${worklog.valuationSnapshot?.contractName || worklog.contractId || 'Legado / sem contrato vinculado'}`
          : ''}
      </p>
      {showFinancial && (
        <p className="font-mono">
          {amount == null
            ? 'Valor desconhecido'
            : amount.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
        </p>
      )}
      {showFinancial && (
        <p>
          Custo do esforço:{' '}
          {worklog.costCents == null
            ? 'Desconhecido'
            : (worklog.costCents / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
        </p>
      )}
    </div>
  );
}
