CREATE TABLE "users" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"username" text,
	"avatar_url" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
