ALTER TABLE "Transaction" ADD COLUMN "transferId" text;--> statement-breakpoint
CREATE INDEX "Transaction_transferId_idx" ON "Transaction" ("transferId");