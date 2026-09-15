CREATE TABLE "ShortcutEvent" (
	"id" text PRIMARY KEY,
	"userEmail" text NOT NULL,
	"shortcutId" text NOT NULL,
	"pinned" boolean NOT NULL,
	"source" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ShortcutEvent_source_check" CHECK ("source" in ('page', 'header', 'lock'))
);
--> statement-breakpoint
CREATE INDEX "ShortcutEvent_userEmail_createdAt_idx" ON "ShortcutEvent" ("userEmail","createdAt");--> statement-breakpoint
ALTER TABLE "ShortcutEvent" ADD CONSTRAINT "ShortcutEvent_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;