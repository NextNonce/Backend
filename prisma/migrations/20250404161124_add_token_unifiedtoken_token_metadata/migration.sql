-- CreateTable
CREATE TABLE "unified_tokens" (
    "id" TEXT NOT NULL,
    "tokenMetadataId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unified_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "tokenMetadataId" TEXT NOT NULL,
    "unifiedTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_metadata" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "logo" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unified_tokens_tokenMetadataId_key" ON "unified_tokens"("tokenMetadataId");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_tokenMetadataId_key" ON "tokens"("tokenMetadataId");

-- CreateIndex
CREATE INDEX "tokens_address_idx" ON "tokens"("address");

-- AddForeignKey
ALTER TABLE "unified_tokens" ADD CONSTRAINT "unified_tokens_tokenMetadataId_fkey" FOREIGN KEY ("tokenMetadataId") REFERENCES "token_metadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_tokenMetadataId_fkey" FOREIGN KEY ("tokenMetadataId") REFERENCES "token_metadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_unifiedTokenId_fkey" FOREIGN KEY ("unifiedTokenId") REFERENCES "unified_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
