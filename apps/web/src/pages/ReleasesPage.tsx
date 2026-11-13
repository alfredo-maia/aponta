import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { EzButton, EzEmptyCard, EzModal, EzPageLayout, EzSpinner, EzTextArea } from '../components/ds';
import { EzEntityGrid } from '../components/ds/EzEntityGrid';
import { APPROVAL_TYPE_LABELS, WorklogApproval, useDecideWorklogApproval, useWorklogApprovals } from '../hooks/useWorklogApprovals';

const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

function errorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(message) ? message.join(' ') : message) || 'Não foi possível concluir a decisão.';
}

const COLUMNS: ColumnDef<WorklogApproval>[] = [
  { id: 'author', header: 'Consultor', accessorFn: (row) => row.author.name },
  { id: 'ticket', header: 'Ticket', accessorFn: (row) => row.ticket.protocol },
  { id: 'type', header: 'Tipo', accessorFn: (row) => APPROVAL_TYPE_LABELS[row.approvalType] },
  { id: 'period', header: 'Período', accessorFn: (row) => `${when(row.startTime)} a ${when(row.endTime)}` },
  { id: 'minutes', header: 'Minutos', accessorFn: (row) => row.minutes },
  { id: 'reason', header: 'Motivo', accessorFn: (row) => row.approvalReason },
];

/** DMTE-462 T5: liberações pendentes dos tipos que a pessoa decide; decide só o registro escolhido. */
export function ReleasesPage() {
  const { data, isLoading, isError } = useWorklogApprovals();
  const decide = useDecideWorklogApproval();
  const [selected, setSelected] = useState<WorklogApproval[]>([]);
  const [open, setOpen] = useState<WorklogApproval | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const rows = useMemo(() => data ?? [], [data]);
  const only = selected.length === 1 ? selected[0] : null;

  const close = () => {
    setOpen(null);
    setRejecting(false);
    setNote('');
    setError(null);
  };
  const openDecision = (row: WorklogApproval, reject: boolean) => {
    setOpen(row);
    setRejecting(reject);
    setNote('');
    setError(null);
  };
  const approve = (row: WorklogApproval, fromDialog: boolean) => {
    setError(null);
    setPageError(null);
    decide.mutate({ id: row.id }, {
      onSuccess: () => close(),
      onError: (e) => (fromDialog ? setError(errorMessage(e)) : setPageError(errorMessage(e))),
    });
  };
  const confirmReject = (row: WorklogApproval) => {
    if (!note.trim()) {
      setError('Informe o motivo da negação.');
      return;
    }
    setError(null);
    decide.mutate({ id: row.id, note: note.trim() }, { onSuccess: () => close(), onError: (e) => setError(errorMessage(e)) });
  };

  return (
    <EzPageLayout header={<h1 className="text-[18px] font-semibold text-gray-900">Liberações</h1>}>
      {isLoading ? (
        <div className="p-8"><EzSpinner label="Carregando liberações…" /></div>
      ) : isError ? (
        <p role="alert" className="p-4 text-[13px] text-red-600">Erro ao carregar as liberações.</p>
      ) : rows.length === 0 ? (
        <EzEmptyCard title="Nenhuma liberação pendente." />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <EzButton size="small" disabled={!only || decide.isPending} onClick={() => only && approve(only, false)}>
              Liberar selecionado
            </EzButton>
            <EzButton size="small" variant="secondary" disabled={!only || decide.isPending} onClick={() => only && openDecision(only, true)}>
              Negar selecionado
            </EzButton>
            <span className="text-[12px] text-gray-500">Selecione um registro, ou dê duplo clique para ver o motivo e decidir.</span>
          </div>
          {pageError && <p role="alert" className="text-[13px] text-red-600">{pageError}</p>}
          <EzEntityGrid
            key={rows.map((row) => row.id).join(',')}
            data={rows}
            columns={COLUMNS}
            selectable
            zebraStriping
            onSelectionChange={setSelected}
            onRowDoubleClick={(row) => openDecision(row, false)}
          />
        </div>
      )}

      {open && (
        <EzModal
          isOpen
          onClose={close}
          title={`Liberação: ${APPROVAL_TYPE_LABELS[open.approvalType]}`}
          maxWidth="lg"
          footer={
            rejecting ? (
              <>
                <EzButton variant="secondary" onClick={() => setRejecting(false)}>Voltar</EzButton>
                <EzButton disabled={decide.isPending} onClick={() => confirmReject(open)}>Confirmar negação</EzButton>
              </>
            ) : (
              <>
                <EzButton variant="secondary" onClick={() => setRejecting(true)}>Negar</EzButton>
                <EzButton disabled={decide.isPending} onClick={() => approve(open, true)}>Liberar</EzButton>
              </>
            )
          }
        >
          <div className="space-y-3 text-[13px] text-gray-800">
            <p><span className="font-semibold">{open.author.name}</span> no ticket {open.ticket.protocol} ({open.ticket.title})</p>
            <p>{when(open.startTime)} a {when(open.endTime)} · {open.minutes} min</p>
            <p className="whitespace-pre-line rounded border border-gray-200 bg-gray-50 p-3">{open.approvalReason}</p>
            {rejecting && (
              <EzTextArea id="release-reject-note" label="Motivo da negação" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            )}
            {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
          </div>
        </EzModal>
      )}
    </EzPageLayout>
  );
}

export default ReleasesPage;
