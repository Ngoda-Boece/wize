import "server-only";
import type { Viewer } from "@/lib/auth/viewer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DemoRepository } from "./demo-repository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase-repository";

export async function getRepository(viewer: Viewer): Promise<Repository> {
  if (viewer.kind === "demo") return new DemoRepository(viewer.id);
  return new SupabaseRepository(await createSupabaseServerClient(), viewer.id);
}

export { DuplicateMessageError, titleFromSubject } from "./repository";
export type { Repository } from "./repository";
