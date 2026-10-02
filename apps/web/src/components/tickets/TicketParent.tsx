import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Unlink, Link2, GitFork, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Ticket } from '../../hooks/useTickets';
import { statusBadgeClasses, statusLabels } from './TicketCard';

export function TicketParentChild({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAgentOrAdmin = ['AGENT', 'AGENT_MASTER', 'ADMIN'].includes(user?.role as string);

  const [parentProtocol, setParentProtocol] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const mutation = useMutation({
    mutationFn: (protocol: string | null) => 
      api.patch(`/tickets/${ticket.id}/parent`, { parentProtocol: protocol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticket.id] });
      setIsEditing(false);
      setParentProtocol('');
    },
  });

  const isChild = !!ticket.parentTicketId;
  const hasChildren = ticket.subTickets && ticket.subTickets.length > 0;

  if (!isAgentOrAdmin) return null;

  return (
    <section className="space-y-3 rounded-lg border p-4 bg-muted/20 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          {hasChildren ? <GitFork className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          Agrupamento de Chamados
        </h2>
      </div>

      {isChild && ticket.parentTicket && (
        <div className="rounded bg-primary/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <span className="font-mono text-xs font-bold text-primary bg-background px-2 py-1 rounded">
               {ticket.parentTicket.protocol}
             </span>
             <a href={`/app/tickets/${ticket.parentTicket.id}`} className="text-sm font-medium hover:underline text-primary">
               {ticket.parentTicket.title}
             </a>
             <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${statusBadgeClasses[ticket.parentTicket.status]}`}>
               {statusLabels[ticket.parentTicket.status]}
             </span>
          </div>
          <button 
             onClick={() => mutation.mutate(null)}
             disabled={mutation.isPending}
             className="text-xs flex items-center gap-1 hover:text-red-600 transition-colors cursor-pointer"
          >
             <Unlink className="h-3 w-3" /> Desvincular
          </button>
        </div>
      )}

      {!isChild && !hasChildren && !isEditing && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          Este chamado não está vinculado.
          <button onClick={() => setIsEditing(true)} className="text-primary hover:underline font-medium cursor-pointer">Vincular a um chamado Pai</button>
        </p>
      )}

      {!isChild && (isEditing || hasChildren) && (
        <div className="space-y-4">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(parentProtocol);
            }} 
            className="flex items-center gap-2"
          >
             <div className="relative flex-1">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <input
                 className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
                 placeholder="Digite o protocolo AP-202X-... e aperte Enter"
                 value={parentProtocol}
                 onChange={(e) => setParentProtocol(e.target.value)}
                 disabled={mutation.isPending}
               />
             </div>
             {mutation.isError && <AlertCircle className="h-5 w-5 text-red-500" />}
          </form>

          {hasChildren && (
            <div className="mt-4">
               <h3 className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider uppercase">Este é o Chamado Pai de {ticket.subTickets?.length || 0} Solicitações:</h3>
               <ul className="space-y-2">
                 {ticket.subTickets?.map(sub => (
                   <li key={sub.id} className="flex flex-col gap-1 text-sm bg-background p-2 rounded border">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <a href={`/app/tickets/${sub.id}`} className="font-mono text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                           {sub.protocol}
                         </a>
                         <span className="font-medium truncate max-w-[200px] sm:max-w-md">{sub.title}</span>
                       </div>
                       <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold shrink-0 ${statusBadgeClasses[sub.status]}`}>
                         {statusLabels[sub.status]}
                       </span>
                     </div>
                   </li>
                 ))}
               </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
