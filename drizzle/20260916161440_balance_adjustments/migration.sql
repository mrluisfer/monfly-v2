CREATE TABLE "BalanceAdjustment" (
	"id" text PRIMARY KEY,
	"userEmail" text NOT NULL,
	"cardId" text NOT NULL,
	"amountCents" bigint NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX "BalanceAdjustment_cardId_createdAt_idx" ON "BalanceAdjustment" ("cardId","createdAt");--> statement-breakpoint
CREATE INDEX "BalanceAdjustment_userEmail_idx" ON "BalanceAdjustment" ("userEmail");--> statement-breakpoint
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;