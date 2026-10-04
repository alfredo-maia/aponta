import { Ticket } from '../../hooks/useTickets';
import { EzProgressBar } from '../ds';

export function SlaProgress({ ticket }: { ticket: Ticket }) {
  if (!ticket.resolveDeadline) return null;

  const createdAt = new Date(ticket.createdAt).getTime();
  const deadline = new Date(ticket.resolveDeadline).getTime();
  const now = new Date().getTime();

  const isPaused = ticket.status === 'PENDING_CUSTOMER';
  
  let currentPauseMs = 0;
  if (isPaused && ticket.slaPausedAt) {
    currentPauseMs = Math.max(0, now - new Date(ticket.slaPausedAt).getTime());
  }
  
  const totalPauseMs = ((ticket.slaAccumulatedPauseTime || 0) * 60000) + currentPauseMs;
  const effectiveDeadlineMs = deadline + totalPauseMs;
  
  const totalWindow = effectiveDeadlineMs - createdAt;
  if (totalWindow <= 0) return null;

  const rawElapsed = now - createdAt;
  const activeElapsed = rawElapsed - totalPauseMs;
  
  let progress = (activeElapsed / (deadline - createdAt)) * 100;
  progress = Math.max(0, Math.min(progress, 100)); // Clamp between 0 and 100

  // Colors based on status (gray-400 is within the DS gray palette;
  // brand-600 matches EzButton's primary brand color; the status reds/
  // yellows/greens are semantic, not DS tokens, so they stay as-is).
  let barColor = 'bg-brand-600';
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') barColor = 'bg-gray-400';
  else if (ticket.resolveSlaStatus === 'BREACHED') barColor = 'bg-red-500';
  else if (ticket.resolveSlaStatus === 'AT_RISK') barColor = 'bg-yellow-500';
  else barColor = 'bg-green-500';

  const timeRemainingMs = effectiveDeadlineMs - now;
  const isBreached = timeRemainingMs < 0 && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
  
  const hoursLeft = Math.abs(Math.floor(timeRemainingMs / 3600000));
  const minsLeft = Math.abs(Math.floor((timeRemainingMs % 3600000) / 60000));
  
  const labelText = isBreached 
    ? `Vencido há ${hoursLeft}h ${minsLeft}m`
    : `Restam ${hoursLeft}h ${minsLeft}m`;

  return (
    <div className="w-full space-y-1 mt-2 mb-4">
      <div className="flex justify-between text-xs text-gray-500 font-medium">
        <span>Progresso do SLA (Resolução)</span>
        <span className={isBreached ? 'text-red-600 font-bold' : ''}>
          {isPaused ? `(PAUSADO) ${labelText}` : labelText}
        </span>
      </div>
      <EzProgressBar value={progress} colorClass={barColor} />
    </div>
  );
}
