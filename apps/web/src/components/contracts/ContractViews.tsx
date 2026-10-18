import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  Contract,
  ContractInput,
  ContractOrganization,
} from '../../hooks/useContracts';
import { brasiliaDayStartIso } from '../../lib/billingTime';
import { brasiliaDateString, brasiliaTimeString } from '../../lib/brasiliaTime';
import {
  EzAlert,
  EzButton,
  EzComboBox,
  EzEmptyCard,
  EzEntityGrid,
  EzSpinner,
  EzTextInput,
} from '../ds';

export const contractMoney = (value: number | null | undefined) =>
  value == null
    ? 'Não informado'
    : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateLabel = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : 'Não informada';
const allowance = (c: Contract) =>
  c.includedMinutes != null ? c.includedMinutes / 60 : c.hoursLimit;
// End dates entered in the form include the entire selected civil day.
function validityDay(value?: string | null, end = false): string {
  if (!value) return '';
  if (value.length === 10) return value;
  const instant = new Date(value);
  const isEndBoundary =
    end &&
    brasiliaTimeString(instant) === '00:00' &&
    instant.getUTCSeconds() === 0 &&
    instant.getUTCMilliseconds() === 0;
  return brasiliaDateString(
    new Date(instant.getTime() - (isEndBoundary ? 1 : 0)),
  );
}
function nextDay(day: string): string {
  return new Date(Date.parse(day + 'T00:00:00Z') + 86400000)
    .toISOString()
    .slice(0, 10);
}
export const commercialModalities: Record<string, string> = {
  FIXED_PROJECT: 'Empreito',
  MONTHLY_HOURS: 'Horas Mensais + Excedente',
  HOURLY: 'Horas Avulsas',
};
const modality = (c: Contract) =>
  commercialModalities[c.type] ||
  (c.type === 'HOURS_LIMIT' ? `Pacote: ${allowance(c) ?? '—'}h` : 'Cobertura');
const isLegacy = (c: Contract) => !commercialModalities[c.type];

export function ContractList({
  contracts = [],
  showFinancial,
  loading,
  error,
  onDetail,
}: {
  contracts?: Contract[];
  showFinancial: boolean;
  loading?: boolean;
  error?: boolean;
  onDetail: (id: string) => void;
}) {
  const columns = useMemo<ColumnDef<Contract>[]>(
    () => [
      {
        id: 'contract',
        header: 'Contrato',
        accessorFn: (c) => c.name || 'Sem nome',
      },
      {
        id: 'organization',
        header: 'Empresa',
        accessorFn: (c) => c.organization?.name || '—',
      },
      {
        id: 'modality',
        header: 'Modalidade',
        accessorFn: (c) => modality(c),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <>
              <span>{c.active ? 'Ativo' : 'Inativo'}</span>
              <span className="block text-sm">
                {isLegacy(c)
                  ? 'Regularização pendente'
                  : c.approved
                    ? 'Aprovado'
                    : 'Rascunho'}
              </span>
            </>
          );
        },
      },
      ...(showFinancial
        ? ([
            {
              id: 'monthlyValue',
              header: 'Valor mensal',
              cell: ({ row }) =>
                contractMoney(
                  row.original.monthlyFeeCents != null
                    ? row.original.monthlyFeeCents / 100
                    : row.original.monthlyValue,
                ),
            },
            {
              id: 'excessHourlyRate',
              header: 'Hora excedente',
              cell: ({ row }) =>
                contractMoney(
                  row.original.excessHourlyRateCents == null
                    ? null
                    : row.original.excessHourlyRateCents / 100,
                ),
            },
            {
              id: 'adjustmentDate',
              header: 'Reajuste',
              cell: ({ row }) => dateLabel(row.original.adjustmentDate),
            },
          ] as ColumnDef<Contract>[])
        : []),
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <EzButton
              variant="tertiary"
              size="small"
              label="Ver detalhes"
              aria-label={`Ver detalhes ${c.name || c.organization?.name || c.id}`}
              onClick={() => onDetail(c.id)}
            />
          );
        },
      },
    ],
    [showFinancial, onDetail],
  );

  if (loading) return <EzSpinner label="Carregando contratos..." />;
  if (error)
    return <EzAlert variant="error">Erro ao carregar os contratos.</EzAlert>;
  if (!contracts.length)
    return <EzEmptyCard title="Nenhum contrato encontrado." />;
  return <EzEntityGrid columns={columns} data={contracts} />;
}

export function ContractDetail({
  contract: c,
  showFinancial,
}: {
  contract: Contract;
  showFinancial: boolean;
}) {
  const rows = [
    ['Nome', c.name || 'Sem nome'],
    ['Empresa', c.organization?.name || '—'],
    ['Modalidade', modality(c)],
    ['Status', c.active ? 'Ativo' : 'Inativo'],
    ['Aprovação', c.approved ? 'Aprovado' : 'Pendente'],
    [
      'Mesas cobertas',
      c.serviceDesks?.map((desk) => desk.name).join(', ') ||
        'Nenhuma mesa vinculada',
    ],
    ...(c.type === 'FIXED_PROJECT'
      ? [
          ['Escopo', c.scope || 'Não informado'],
          ['Estimativa total', `${(c.estimatedMinutes || 0) / 60}h`],
        ]
      : []),
    [
      'Início da vigência',
      validityDay(c.startsAt).split('-').reverse().join('/') || 'Não informada',
    ],
    [
      'Fim da vigência',
      validityDay(c.endsAt, true).split('-').reverse().join('/') ||
        'Não informada',
    ],
    ...(showFinancial
      ? [
          [
            'Valor mensal',
            contractMoney(
              c.monthlyFeeCents != null
                ? c.monthlyFeeCents / 100
                : c.monthlyValue,
            ),
          ],
          ...(c.type === 'FIXED_PROJECT'
            ? [
                [
                  'Preço fechado',
                  contractMoney(
                    c.fixedPriceCents == null ? null : c.fixedPriceCents / 100,
                  ),
                ],
              ]
            : []),
          ...(c.type === 'HOURLY'
            ? [
                [
                  'Hora avulsa',
                  contractMoney(
                    c.hourlyRateCents == null ? null : c.hourlyRateCents / 100,
                  ),
                ],
              ]
            : []),
          [
            'Hora excedente',
            contractMoney(
              c.excessHourlyRateCents == null
                ? null
                : c.excessHourlyRateCents / 100,
            ),
          ],
          ['Reajuste', dateLabel(c.adjustmentDate)],
        ]
      : []),
  ];
  return (
    <div className="space-y-4">
      {(isLegacy(c) || !c.approved || !c.serviceDesks?.length) && (
        <EzAlert variant="warning">
          Novos lançamentos bloqueados até regularizar modalidade, aprovação,
          vigência e mesas do contrato. Dados históricos são preservados.
        </EzAlert>
      )}
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
      {showFinancial && isLegacy(c) && c.excessHourlyRateCents == null && (
        <EzAlert variant="info">
          Tarifa de excedente não informada. Os excedentes ficam sem valor
          conhecido; o valor mensal não define essa tarifa.
        </EzAlert>
      )}
      {!!c.terms?.length && (
        <section aria-label="Histórico de condições">
          <h3 className="font-semibold">Histórico de condições</h3>
          <ul className="space-y-2">
            {c.terms.map((term) => (
              <li key={term.id} className="rounded border p-3">
                Desde{' '}
                {new Date(term.effectiveFrom).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                })}
                {term.effectiveTo
                  ? ` até ${new Date(term.effectiveTo).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
                  : ' · vigente'}
                {showFinancial && (
                  <span className="block text-sm">
                    Mensalidade:{' '}
                    {contractMoney(
                      term.monthlyFeeCents == null
                        ? null
                        : term.monthlyFeeCents / 100,
                    )}{' '}
                    · Hora:{' '}
                    {contractMoney(
                      (term.hourlyRateCents ?? term.excessHourlyRateCents) ==
                        null
                        ? null
                        : (term.hourlyRateCents ??
                            term.excessHourlyRateCents ??
                            0) / 100,
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-sm text-gray-500">
        Alterações no contrato se aplicam aos novos apontamentos e preservam os
        valores históricos.
      </p>
    </div>
  );
}

export function ContractForm({
  contract: c,
  organizations,
  organizationsLoading,
  organizationsError,
  pending,
  error,
  onSave,
  onCancel,
}: {
  contract?: Contract;
  organizations: ContractOrganization[];
  organizationsLoading?: boolean;
  organizationsError?: boolean;
  pending?: boolean;
  error?: string;
  onSave: (values: ContractInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(c?.name || '');
  const [organizationId, setOrganizationId] = useState(c?.organizationId || '');
  const [type, setType] = useState(c?.type || 'MONTHLY_HOURS');
  const [active, setActive] = useState(c?.active ?? true);
  const [approved, setApproved] = useState(c?.approved ?? false);
  const [serviceDeskIds, setServiceDeskIds] = useState<string[]>(
    c?.serviceDeskIds || c?.serviceDesks?.map((desk) => desk.id) || [],
  );
  const [scope, setScope] = useState(c?.scope || '');
  const [estimate, setEstimate] = useState(
    c?.estimatedMinutes == null ? '' : String(c.estimatedMinutes / 60),
  );
  const [price, setPrice] = useState(
    c?.fixedPriceCents == null ? '' : String(c.fixedPriceCents / 100),
  );
  const [hourly, setHourly] = useState(
    c?.hourlyRateCents == null ? '' : String(c.hourlyRateCents / 100),
  );
  const [effectiveDay, setEffectiveDay] = useState('');
  const desks =
    organizations.find((organization) => organization.id === organizationId)
      ?.serviceDesks || [];
  const [startsAt, setStartsAt] = useState(validityDay(c?.startsAt));
  const [endsAt, setEndsAt] = useState(validityDay(c?.endsAt, true));
  const [adjustmentDate, setAdjustmentDate] = useState(
    c?.adjustmentDate?.slice(0, 10) || '',
  );
  const [hours, setHours] = useState(c ? String(allowance(c) ?? '') : '');
  const [monthly, setMonthly] = useState(
    c?.monthlyFeeCents != null
      ? String(c.monthlyFeeCents / 100)
      : c?.monthlyValue == null
        ? ''
        : String(c.monthlyValue),
  );
  const [rate, setRate] = useState(
    c?.excessHourlyRateCents == null
      ? ''
      : String(c.excessHourlyRateCents / 100),
  );
  const [validation, setValidation] = useState('');
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!organizationId) {
          setValidation('Selecione a empresa.');
          return;
        }
        if (startsAt && endsAt && startsAt > endsAt) {
          setValidation(
            'O fim da vigência deve ser igual ou posterior ao início.',
          );
          return;
        }
        if (
          [monthly, rate, hours, price, hourly, estimate]
            .filter((v) => v !== '')
            .some((v) => !Number.isFinite(Number(v)) || Number(v) < 0)
        ) {
          setValidation('Informe valores não negativos e válidos.');
          return;
        }
        const minutes = hours === '' ? null : Math.round(Number(hours) * 60);
        if (
          (type === 'HOURS_LIMIT' || type === 'MONTHLY_HOURS') &&
          (approved || type === 'HOURS_LIMIT' || hours !== '') &&
          (minutes == null || minutes < 0 || (type === 'HOURS_LIMIT' && minutes === 0) || !Number.isSafeInteger(minutes))
        ) {
          setValidation(type === 'HOURS_LIMIT' ? 'Informe uma franquia mensal maior que zero.' : 'Informe uma franquia mensal não negativa.');
          return;
        }
        if (
          [monthly, rate, price, hourly]
            .filter((v) => v !== '')
            .some(
              (v) =>
                !Number.isSafeInteger(Math.round(Number(v) * 100)) ||
                !/^\d+(\.\d{1,2})?$/.test(v),
            )
        ) {
          setValidation(
            'Informe valores monetários com até duas casas decimais.',
          );
          return;
        }
        if (
          approved &&
          (!commercialModalities[type] || !startsAt || !serviceDeskIds.length)
        ) {
          setValidation(
            'Para aprovar, escolha uma modalidade atual, início da vigência e ao menos uma mesa vinculada à empresa.',
          );
          return;
        }
        if (
          approved &&
          serviceDeskIds.some((id) => !desks.some((desk) => desk.id === id))
        ) {
          setValidation(
            'Remova as mesas que não estão mais vinculadas à empresa antes de aprovar.',
          );
          return;
        }
        if (
          approved &&
          ((type === 'FIXED_PROJECT' &&
            (!scope.trim() ||
              price === '' ||
              !estimate ||
              Number(estimate) <= 0)) ||
            (type === 'MONTHLY_HOURS' && (monthly === '' || rate === '')) ||
            (type === 'HOURLY' && hourly === ''))
        ) {
          setValidation(
            'Complete as condições comerciais da modalidade antes de aprovar.',
          );
          return;
        }
        setValidation('');
        onSave({
          name: name.trim() || null,
          organizationId,
          type,
          active,
          approved,
          serviceDeskIds,
          scope: type === 'FIXED_PROJECT' ? scope.trim() : null,
          fixedPriceCents:
            type === 'FIXED_PROJECT' && price !== ''
              ? Math.round(Number(price) * 100)
              : null,
          estimatedMinutes:
            type === 'FIXED_PROJECT' && estimate !== ''
              ? Math.round(Number(estimate) * 60)
              : null,
          monthlyFeeCents:
            type === 'MONTHLY_HOURS' && monthly !== ''
              ? Math.round(Number(monthly) * 100)
              : null,
          hourlyRateCents:
            type === 'HOURLY' && hourly !== ''
              ? Math.round(Number(hourly) * 100)
              : null,
          ...(effectiveDay
            ? { conditionsEffectiveAt: brasiliaDayStartIso(effectiveDay) }
            : {}),
          startsAt:
            startsAt === validityDay(c?.startsAt)
              ? (c?.startsAt ?? null)
              : startsAt
                ? brasiliaDayStartIso(startsAt)
                : null,
          endsAt:
            endsAt === validityDay(c?.endsAt, true)
              ? (c?.endsAt ?? null)
              : endsAt
                ? brasiliaDayStartIso(nextDay(endsAt))
                : null,
          adjustmentDate:
            adjustmentDate === (c?.adjustmentDate?.slice(0, 10) || '')
              ? (c?.adjustmentDate ?? null)
              : adjustmentDate || null,
          includedMinutes: ['HOURS_LIMIT', 'MONTHLY_HOURS'].includes(type)
            ? minutes
            : null,
          monthlyValue: monthly === '' ? null : Number(monthly),
          excessHourlyRateCents:
            rate === '' ? null : Math.round(Number(rate) * 100),
        });
      }}
    >
      {(validation || error) && (
        <EzAlert variant="error">{validation || error}</EzAlert>
      )}
      <fieldset
        disabled={pending}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <EzTextInput
          id="contract-name"
          label="Nome do contrato"
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <EzComboBox
          id="contract-organization"
          label="Empresa"
          required
          value={organizationId}
          onChange={(e) => {
            setOrganizationId(e.target.value);
            setServiceDeskIds([]);
          }}
          disabled={organizationsLoading || organizationsError}
        >
          <option value="">
            {organizationsLoading
              ? 'Carregando empresas...'
              : 'Selecione a empresa'}
          </option>
          {c?.organization &&
            !organizations.some((o) => o.id === c.organizationId) && (
              <option value={c.organizationId}>{c.organization.name}</option>
            )}
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </EzComboBox>
        <EzComboBox
          id="contract-type"
          label="Modalidade"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {c && isLegacy(c) && (
            <option value={c.type}>
              {modality(c)} — regularização pendente
            </option>
          )}
          {Object.entries(commercialModalities).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </EzComboBox>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Contrato ativo
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={approved}
            onChange={(event) => setApproved(event.target.checked)}
          />
          Condições comerciais aprovadas
        </label>
        <fieldset className="space-y-2 sm:col-span-2">
          <legend className="font-medium">Mesas de serviços cobertas</legend>
          {serviceDeskIds
            .filter((id) => !desks.some((desk) => desk.id === id))
            .map((id) => (
              <label
                key={id}
                className="flex items-center gap-2 text-amber-700"
              >
                <input
                  type="checkbox"
                  checked
                  onChange={() =>
                    setServiceDeskIds(
                      serviceDeskIds.filter((selected) => selected !== id),
                    )
                  }
                />
                Mesa não vinculada à empresa (
                {c?.serviceDesks?.find((desk) => desk.id === id)?.name || id}) —
                remova para regularizar
              </label>
            ))}
          {desks.length ? (
            desks.map((desk) => (
              <label
                key={desk.id}
                className="mr-4 inline-flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={serviceDeskIds.includes(desk.id)}
                  onChange={(event) =>
                    setServiceDeskIds(
                      event.target.checked
                        ? [...serviceDeskIds, desk.id]
                        : serviceDeskIds.filter((id) => id !== desk.id),
                    )
                  }
                />
                {desk.name}
              </label>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              Selecione uma empresa com mesas explicitamente vinculadas. Sem
              esse vínculo, novos lançamentos ficam bloqueados.
            </p>
          )}
        </fieldset>
        <EzTextInput
          id="contract-start"
          label="Início da vigência"
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <EzTextInput
          id="contract-end"
          label="Fim da vigência"
          message="Inclui todo o dia selecionado, no horário de Brasília."
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
        {['HOURS_LIMIT', 'MONTHLY_HOURS'].includes(type) && (
          <EzTextInput
            id="contract-hours"
            label="Franquia mensal (horas)"
            type="number"
            min="0"
            step="0.01"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        )}
        {type === 'FIXED_PROJECT' && (
          <>
            <EzTextInput
              id="contract-scope"
              label="Escopo aprovado"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            />
            <EzTextInput
              id="contract-price"
              label="Preço fechado (R$)"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
            <EzTextInput
              id="contract-estimate"
              label="Estimativa total (horas)"
              type="number"
              min="0"
              step="0.01"
              value={estimate}
              onChange={(event) => setEstimate(event.target.value)}
            />
            <p className="text-sm sm:col-span-2">
              A estimativa é global ao projeto. Horas adicionais aumentam o
              custo sem gerar cobrança automática.
            </p>
          </>
        )}
        {type === 'HOURLY' && (
          <EzTextInput
            id="contract-hourly"
            label="Hora avulsa (R$)"
            type="number"
            min="0"
            step="0.01"
            value={hourly}
            onChange={(event) => setHourly(event.target.value)}
          />
        )}
        {['HOURS_LIMIT', 'FIXED_COVERAGE', 'MONTHLY_HOURS'].includes(type) && (
          <>
            <EzTextInput
              id="contract-monthly"
              label="Valor mensal (R$)"
              type="number"
              min="0"
              step="0.01"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
            <EzTextInput
              id="contract-rate"
              label="Hora excedente (R$)"
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              message="Tarifa explícita obrigatória para aprovação. Zero é uma tarifa válida."
            />
          </>
        )}
        {c && (
          <EzTextInput
            id="contract-effective"
            label="Novas condições a partir de"
            type="date"
            value={effectiveDay}
            onChange={(event) => setEffectiveDay(event.target.value)}
            message="Informe a vigência de um aditivo. Apontamentos anteriores não são recalculados."
          />
        )}
        <EzTextInput
          id="contract-adjustment"
          label="Data de reajuste"
          type="date"
          value={adjustmentDate}
          onChange={(e) => setAdjustmentDate(e.target.value)}
        />
      </fieldset>
      {organizationsError && (
        <EzAlert variant="error">
          Erro ao carregar empresas. Feche o formulário e tente novamente.
        </EzAlert>
      )}
      <div className="flex justify-end gap-3">
        <EzButton
          type="button"
          variant="secondary"
          label="Cancelar"
          onClick={onCancel}
          disabled={pending}
        />
        <EzButton
          type="submit"
          label={pending ? 'Salvando...' : 'Salvar contrato'}
          disabled={pending || organizationsLoading || organizationsError}
        />
      </div>
    </form>
  );
}
