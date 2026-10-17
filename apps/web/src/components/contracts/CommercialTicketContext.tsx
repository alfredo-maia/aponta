import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { EzAlert, EzButton, EzComboBox } from '../ds';

export function CommercialTicketContext({
  ticketId,
  isAdmin,
}: {
  ticketId: string;
  isAdmin: boolean;
}) {
  const client = useQueryClient();
  const [organizationId, setOrganizationId] = useState('');
  const ticket = useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: async () =>
      (
        await api.get<{ commercialOrganizationId?: string | null }>(
          `/tickets/${ticketId}`,
        )
      ).data,
  });
  const organizations = useQuery({
    queryKey: ['commercial-context-organizations'],
    enabled: isAdmin && ticket.data?.commercialOrganizationId === null,
    queryFn: async () =>
      (await api.get<{ id: string; name: string }[]>('/organizations')).data,
  });
  const save = useMutation({
    mutationFn: () =>
      api.patch(`/tickets/${ticketId}/worklog-context`, { organizationId }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['tickets', ticketId] });
    },
  });
  if (ticket.data?.commercialOrganizationId !== null) return null;
  return (
    <EzAlert variant="warning">
      <div className="space-y-3">
        <p>
          Empresa comercial não definida. Um administrador precisa regularizar o
          vínculo antes de novos lançamentos. A empresa deve estar vinculada à
          mesa do chamado.
        </p>
        {isAdmin && (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (organizationId) save.mutate();
            }}
          >
            <EzComboBox
              id="ticket-commercial-organization"
              label="Empresa comercial do chamado"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
            >
              <option value="">Selecione a empresa</option>
              {organizations.data?.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </EzComboBox>
            <EzButton
              type="submit"
              label="Regularizar empresa comercial"
              disabled={!organizationId || save.isPending}
            />
          </form>
        )}
        {save.isError && (
          <p role="alert">
            Não foi possível regularizar. Confira o vínculo com a mesa e se já
            existem apontamentos históricos.
          </p>
        )}
      </div>
    </EzAlert>
  );
}
