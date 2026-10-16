import { useState } from 'react';
import type { Contract, ContractInput } from '../../hooks/useContracts';
import { brasiliaDayStartIso } from '../../lib/billingTime';
import { brasiliaDateString, brasiliaTimeString } from '../../lib/brasiliaTime';
import {
  EzAlert,
  EzButton,
  EzComboBox,
  EzEmptyCard,
  EzGridWrapper,
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
const modality = (c: Contract) =>
  c.type === 'HOURS_LIMIT' ? `Pacote: ${allowance(c) ?? '—'}h` : 'Cobertura';

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
  if (loading) return <EzSpinner label="Carregando contratos..." />;
  if (error)
    return <EzAlert variant="error">Erro ao carregar os contratos.</EzAlert>;
  if (!contracts.length)
    return <EzEmptyCard title="Nenhum contrato encontrado." />;
  return (
    <EzGridWrapper>
      <thead className="bg-gray-90">
        <tr>
          {[
            'Contrato',
            'Empresa',
            'Modalidade',
            'Status',
            ...(showFinancial
              ? ['Valor mensal', 'Hora excedente', 'Reajuste']
              : []),
            'Ações',
          ].map((label) => (
            <th key={label} className="px-4 py-3 text-left">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {contracts.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3">{c.name || 'Sem nome'}</td>
            <td className="px-4 py-3">{c.organization?.name || '—'}</td>
            <td className="px-4 py-3">{modality(c)}</td>
            <td className="px-4 py-3">{c.active ? 'Ativo' : 'Inativo'}</td>
            {showFinancial && (
              <>
                <td className="px-4 py-3">{contractMoney(c.monthlyValue)}</td>
                <td className="px-4 py-3">
                  {contractMoney(
                    c.excessHourlyRateCents == null
                      ? null
                      : c.excessHourlyRateCents / 100,
                  )}
                </td>
                <td className="px-4 py-3">{dateLabel(c.adjustmentDate)}</td>
              </>
            )}
            <td className="px-4 py-3">
              <EzButton
                variant="tertiary"
                size="small"
                label="Ver detalhes"
                aria-label={`Ver detalhes ${c.name || c.organization?.name || c.id}`}
                onClick={() => onDetail(c.id)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </EzGridWrapper>
  );
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
          ['Valor mensal', contractMoney(c.monthlyValue)],
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
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
      {showFinancial && c.excessHourlyRateCents == null && (
        <EzAlert variant="info">
          Tarifa de excedente não informada. Os excedentes ficam sem valor
          conhecido; o valor mensal não define essa tarifa.
        </EzAlert>
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
  organizations: { id: string; name: string }[];
  organizationsLoading?: boolean;
  organizationsError?: boolean;
  pending?: boolean;
  error?: string;
  onSave: (values: ContractInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(c?.name || '');
  const [organizationId, setOrganizationId] = useState(c?.organizationId || '');
  const [type, setType] = useState(
    c?.type === 'HOURS_LIMIT' ? 'HOURS_LIMIT' : 'FIXED_COVERAGE',
  );
  const [active, setActive] = useState(c?.active ?? true);
  const [startsAt, setStartsAt] = useState(validityDay(c?.startsAt));
  const [endsAt, setEndsAt] = useState(validityDay(c?.endsAt, true));
  const [adjustmentDate, setAdjustmentDate] = useState(
    c?.adjustmentDate?.slice(0, 10) || '',
  );
  const [hours, setHours] = useState(c ? String(allowance(c) ?? '') : '');
  const [monthly, setMonthly] = useState(
    c?.monthlyValue == null ? '' : String(c.monthlyValue),
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
          [monthly, rate, hours]
            .filter((v) => v !== '')
            .some((v) => !Number.isFinite(Number(v)) || Number(v) < 0)
        ) {
          setValidation('Informe valores não negativos e válidos.');
          return;
        }
        const minutes = hours === '' ? null : Math.round(Number(hours) * 60);
        if (
          type === 'HOURS_LIMIT' &&
          (minutes == null || minutes <= 0 || !Number.isSafeInteger(minutes))
        ) {
          setValidation('Informe uma franquia mensal maior que zero.');
          return;
        }
        if (
          [monthly, rate]
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
        setValidation('');
        onSave({
          name: name.trim() || null,
          organizationId,
          type,
          active,
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
          includedMinutes: type === 'HOURS_LIMIT' ? minutes : null,
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
          onChange={(e) => setOrganizationId(e.target.value)}
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
          <option value="FIXED_COVERAGE">Cobertura</option>
          <option value="HOURS_LIMIT">Pacote de horas</option>
        </EzComboBox>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Contrato ativo
        </label>
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
        {type === 'HOURS_LIMIT' && (
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
          message="Em branco: excedentes sem valor conhecido. Zero: tarifa gratuita."
        />
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
