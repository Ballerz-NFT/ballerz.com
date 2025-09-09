CREATE UNIQUE INDEX "ballerz_team_name_idx" ON "ballerz_teams" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "ballerz_team_abbrev_idx" ON "ballerz_teams" USING btree ("abbrev");