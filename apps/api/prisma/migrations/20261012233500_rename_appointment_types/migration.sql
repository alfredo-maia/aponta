-- Rename AppointmentType enum values to match the real Agenda taxonomy
-- (feedback on DMTE-18): Agenda (general), Ausência, Férias.
ALTER TYPE "AppointmentType" RENAME VALUE 'APPOINTMENT' TO 'AGENDA';
ALTER TYPE "AppointmentType" RENAME VALUE 'ALLOCATION' TO 'VACATION';
