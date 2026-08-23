-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'completed', 'completed_with_errors', 'failed');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('anthropic', 'openai');

-- CreateEnum
CREATE TYPE "AnswerStatus" AS ENUM ('ok', 'failed');

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competitors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'queued',
    "repetitions" INTEGER NOT NULL DEFAULT 3,
    "brandName" TEXT NOT NULL,
    "brandAliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brandCompetitors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "basisHash" TEXT NOT NULL,
    "heartbeatAt" TIMESTAMPTZ(6),
    "reclaimCount" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMPTZ(6),
    "startedAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunTarget" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "provider" "Provider" NOT NULL,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "RunTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunPrompt" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RunPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "runPromptId" UUID NOT NULL,
    "runTargetId" UUID NOT NULL,
    "repetition" INTEGER NOT NULL,
    "status" "AnswerStatus" NOT NULL,
    "rawText" TEXT,
    "failureReason" TEXT,
    "httpAttempts" INTEGER NOT NULL DEFAULT 1,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "searchCount" INTEGER,
    "costMicros" BIGINT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" UUID NOT NULL,
    "answerId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mention" (
    "id" UUID NOT NULL,
    "answerId" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "isSubject" BOOLEAN NOT NULL,
    "position" INTEGER NOT NULL,
    "totalRecognised" INTEGER NOT NULL,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_companyId_order_key" ON "Prompt"("companyId", "order");

-- CreateIndex
CREATE INDEX "Run_status_heartbeatAt_idx" ON "Run"("status", "heartbeatAt");

-- CreateIndex
CREATE INDEX "Run_companyId_idx" ON "Run"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RunTarget_runId_provider_modelId_key" ON "RunTarget"("runId", "provider", "modelId");

-- CreateIndex
CREATE UNIQUE INDEX "RunPrompt_runId_order_key" ON "RunPrompt"("runId", "order");

-- CreateIndex
CREATE INDEX "Answer_runId_idx" ON "Answer"("runId");

-- CreateIndex
CREATE INDEX "Answer_runTargetId_idx" ON "Answer"("runTargetId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_runPromptId_runTargetId_repetition_key" ON "Answer"("runPromptId", "runTargetId", "repetition");

-- CreateIndex
CREATE INDEX "Citation_answerId_idx" ON "Citation"("answerId");

-- CreateIndex
CREATE UNIQUE INDEX "Mention_answerId_brand_key" ON "Mention"("answerId", "brand");

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunTarget" ADD CONSTRAINT "RunTarget_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunPrompt" ADD CONSTRAINT "RunPrompt_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_runPromptId_fkey" FOREIGN KEY ("runPromptId") REFERENCES "RunPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_runTargetId_fkey" FOREIGN KEY ("runTargetId") REFERENCES "RunTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraint declared in ARCHITECTURE.md -> Data model -> Run.
-- Prisma cannot express CHECK, so it is added here by hand. A run of zero
-- repetitions would give every coverage figure a denominator of zero.
ALTER TABLE "Run" ADD CONSTRAINT "Run_repetitions_check" CHECK ("repetitions" >= 1);
