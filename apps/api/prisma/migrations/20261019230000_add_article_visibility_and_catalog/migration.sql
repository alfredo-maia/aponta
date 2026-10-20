-- DMTE-88 (Stage 2): ACL de compartilhamento de Articles (Público/Privado +
-- grupos de atendentes/clientes selecionados) e Catálogo de Serviços do
-- painel de Conhecimentos (lista flat, busca fuzzy via pg_trgm).
--
-- NOTA DE NOMENCLATURA: o model novo chama-se `KnowledgeCatalogItem` (e não
-- `ServiceCatalogItem`) porque esse nome já é usado, desde a migration
-- 20261002160547_add_service_catalog, por um recurso diferente e já
-- implementado (catálogo de categorias/itens da ABERTURA DE CHAMADOS,
-- vinculado a ServiceCatalogCategory + ServiceDesk). Esta migration não toca
-- nas tabelas "ServiceCatalogItem"/"ServiceCatalogCategory" existentes.

-- CreateEnum
CREATE TYPE "ArticleVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable: nova coluna "visibility", com default temporário/definitivo
-- 'PUBLIC' (mesmo default do antigo "isPublic Boolean @default(true)"), para
-- popular todas as linhas existentes antes de tornar a coluna NOT NULL.
ALTER TABLE "Article" ADD COLUMN "visibility" "ArticleVisibility" NOT NULL DEFAULT 'PUBLIC';

-- DATA MIGRATION (critical): copiar o valor booleano existente de "isPublic"
-- para o novo enum ANTES de dropar a coluna antiga, para não perder nenhum
-- vínculo real (true -> PUBLIC, false -> PRIVATE).
UPDATE "Article" SET "visibility" = CASE WHEN "isPublic" THEN 'PUBLIC'::"ArticleVisibility" ELSE 'PRIVATE'::"ArticleVisibility" END;

-- AlterTable: remover a coluna antiga, já substituída por "visibility".
ALTER TABLE "Article" DROP COLUMN "isPublic";

-- AlterTable: nova coluna de auto-compartilhamento com clientes futuros.
ALTER TABLE "Article" ADD COLUMN "autoShareWithNewOrganizations" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "KnowledgeCatalogItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: junção Article<->AgentGroup (ACL de compartilhamento),
-- relation nomeada "ArticleAgentGroup". A/B seguem a ordem alfabética dos
-- nomes dos models ("AgentGroup" < "Article"), não a ordem do nome da
-- relation.
CREATE TABLE "_ArticleAgentGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArticleAgentGroup_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_ArticleAgentGroup_B_index" ON "_ArticleAgentGroup"("B");

ALTER TABLE "_ArticleAgentGroup" ADD CONSTRAINT "_ArticleAgentGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "AgentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ArticleAgentGroup" ADD CONSTRAINT "_ArticleAgentGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: junção Article<->Organization (ACL de compartilhamento),
-- relation nomeada "ArticleOrganization". A/B seguem a ordem alfabética dos
-- nomes dos models ("Article" < "Organization").
CREATE TABLE "_ArticleOrganization" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArticleOrganization_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_ArticleOrganization_B_index" ON "_ArticleOrganization"("B");

ALTER TABLE "_ArticleOrganization" ADD CONSTRAINT "_ArticleOrganization_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ArticleOrganization" ADD CONSTRAINT "_ArticleOrganization_B_fkey" FOREIGN KEY ("B") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: junção implícita (sem nome de relation) Article<->
-- KnowledgeCatalogItem. Nome da tabela segue a convenção padrão do Prisma
-- para m:n implícita sem @relation nomeado: "_{ModelA}To{ModelB}" em ordem
-- alfabética dos nomes dos models ("Article" < "KnowledgeCatalogItem").
CREATE TABLE "_ArticleToKnowledgeCatalogItem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArticleToKnowledgeCatalogItem_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_ArticleToKnowledgeCatalogItem_B_index" ON "_ArticleToKnowledgeCatalogItem"("B");

ALTER TABLE "_ArticleToKnowledgeCatalogItem" ADD CONSTRAINT "_ArticleToKnowledgeCatalogItem_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ArticleToKnowledgeCatalogItem" ADD CONSTRAINT "_ArticleToKnowledgeCatalogItem_B_fkey" FOREIGN KEY ("B") REFERENCES "KnowledgeCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Busca fuzzy (erro de digitação) do Catálogo de Serviços via pg_trgm.
-- IF NOT EXISTS: a extensão pode já existir em algum ambiente; idempotente.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "KnowledgeCatalogItem_name_trgm_idx" ON "KnowledgeCatalogItem" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "KnowledgeCatalogItem_description_trgm_idx" ON "KnowledgeCatalogItem" USING GIN ("description" gin_trgm_ops);
