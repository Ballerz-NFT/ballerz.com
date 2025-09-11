CREATE TABLE "nonces" (
	"id" text PRIMARY KEY NOT NULL,
	"expires" timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL
);
