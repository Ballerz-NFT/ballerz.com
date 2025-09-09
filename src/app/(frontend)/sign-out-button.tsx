"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export function SignOutButton() {
  const supabase = createClient();

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={async () => {
        await supabase.auth.signOut();
        redirect("/login");
      }}
    >
      Sign out
    </Button>
  );
}
