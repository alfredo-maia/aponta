-- Tiflux-parity (#57): Mesa<->Cliente passa de 1:1 (FK simples ServiceDesk.organizationId,
-- criado na feature #54) para N:N (tabela de junção), + nova entidade AgentGroup
-- (Grupo de Atendentes por cliente, N:N com User e com ServiceDesk).
--
-- Também adiciona campos simples confirmados na aba "Informações" do cliente real:
-- workFolder, notes, visibleToClients, quarterlyBilling.

-- AlterTable: novos campos simples em Organization
ALTER TABLE "Organization" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "quarterlyBilling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibleToClients" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "workFolder" TEXT;

-- CreateTable: nova tabela de junção Organization<->ServiceDesk (N:N)
CREATE TABLE "_OrganizationToServiceDesk" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrganizationToServiceDesk_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_OrganizationToServiceDesk_B_index" ON "_OrganizationToServiceDesk"("B");

ALTER TABLE "_OrganizationToServiceDesk" ADD CONSTRAINT "_OrganizationToServiceDesk_A_fkey" FOREIGN KEY ("A") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_OrganizationToServiceDesk" ADD CONSTRAINT "_OrganizationToServiceDesk_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DATA MIGRATION (critical): copiar vínculos 1:1 existentes (feature #54, já em
-- produção) para a nova tabela de junção ANTES de remover a coluna antiga, para
-- não perder nenhum vínculo real.
INSERT INTO "_OrganizationToServiceDesk" ("A", "B")
SELECT "organizationId", "id" FROM "ServiceDesk" WHERE "organizationId" IS NOT NULL;

-- DropForeignKey + DropIndex + DropColumn: remover o FK simples antigo, agora
-- que os dados foram migrados para a tabela de junção.
ALTER TABLE "ServiceDesk" DROP CONSTRAINT "ServiceDesk_organizationId_fkey";
DROP INDEX "ServiceDesk_organizationId_idx";
ALTER TABLE "ServiceDesk" DROP COLUMN "organizationId";

-- CreateTable: AgentGroup (Grupo de Atendentes por cliente)
CREATE TABLE "AgentGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentGroup_organizationId_idx" ON "AgentGroup"("organizationId");

ALTER TABLE "AgentGroup" ADD CONSTRAINT "AgentGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: junção AgentGroup<->User (membros)
CREATE TABLE "_AgentGroupMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AgentGroupMembers_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_AgentGroupMembers_B_index" ON "_AgentGroupMembers"("B");

ALTER TABLE "_AgentGroupMembers" ADD CONSTRAINT "_AgentGroupMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "AgentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AgentGroupMembers" ADD CONSTRAINT "_AgentGroupMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: junção AgentGroup<->ServiceDesk
CREATE TABLE "_AgentGroupToServiceDesk" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AgentGroupToServiceDesk_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_AgentGroupToServiceDesk_B_index" ON "_AgentGroupToServiceDesk"("B");

ALTER TABLE "_AgentGroupToServiceDesk" ADD CONSTRAINT "_AgentGroupToServiceDesk_A_fkey" FOREIGN KEY ("A") REFERENCES "AgentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AgentGroupToServiceDesk" ADD CONSTRAINT "_AgentGroupToServiceDesk_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
