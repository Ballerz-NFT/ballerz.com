"use client";

import { createClient } from "@/lib/supabase/client";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderIcon, LogOutIcon } from "lucide-react";

export function SignOut() {
  const [isLoading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut({
      scope: "local",
    });
    router.refresh();
  };

  return (
    <DropdownMenuItem onClick={handleSignOut}>
      {isLoading ? <LoaderIcon /> : <LogOutIcon />}
      Sign out
    </DropdownMenuItem>
  );
}
