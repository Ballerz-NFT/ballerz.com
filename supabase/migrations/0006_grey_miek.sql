ALTER TABLE "ballerz" DROP CONSTRAINT "ballerz_nftID_unique";--> statement-breakpoint
ALTER TABLE "ballerz" DROP CONSTRAINT "ballerz_nftSlug_unique";--> statement-breakpoint
ALTER TABLE "ballerz" ADD CONSTRAINT "ballerz_nft_id_unique" UNIQUE("nft_id");--> statement-breakpoint
ALTER TABLE "ballerz" ADD CONSTRAINT "ballerz_nft_slug_unique" UNIQUE("nft_slug");