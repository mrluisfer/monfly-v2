CREATE TABLE "CategoryBudget" (
	"id" text PRIMARY KEY,
	"userEmail" text NOT NULL,
	"category" text NOT NULL,
	"limitCents" integer NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "CategoryBudget_limitCents_check" CHECK ("limitCents" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "CategoryBudget_userEmail_category_key" ON "CategoryBudget" ("userEmail","category");--> statement-breakpoint
ALTER TABLE "CategoryBudget" ADD CONSTRAINT "CategoryBudget_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;