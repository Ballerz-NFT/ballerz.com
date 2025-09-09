"use server";

import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function generateNonce() {
  const nonce = randomBytes(32).toString("hex");
  const savedNonce = await addNonce(nonce);

  if (savedNonce) return { success: true, nonce: savedNonce.id };
  return { success: false, nonce };
}

export async function addNonce(nonce: string) {
  const supabase = await createClient();
  const { data: savedNonce } = await supabase
    .from("nonces")
    .insert({ id: nonce })
    .select()
    .single()
    .throwOnError();

  if (process.env.DEBUG) {
    console.log("Nonce after adding: ", savedNonce);
  }
  return savedNonce;
}

export async function checkNonce(nonce: string) {
  const supabase = await createClient();
  const { data: nonces } = await supabase
    .from("nonces")
    .select("id")
    .gte("expires", new Date().toISOString());

  if (process.env.DEBUG) console.log("Nonce: ", nonce);
  if (process.env.DEBUG) console.log("Nonces: ", nonces);
  if (process.env.DEBUG) {
    console.log(
      "Nonce check: ",
      (nonces?.map((n) => n.id) ?? []).includes(nonce)
    );
  }
  return (nonces?.map((n) => n.id) ?? []).includes(nonce);
}

export async function removeNonce(nonce: string) {
  const supabase = await createClient();
  await supabase.from("nonces").delete().eq("id", nonce).select();
  const { data: nonces } = await supabase.from("nonces").select();
  if (process.env.DEBUG) console.log("Nonces after removing: ", nonces);
}
