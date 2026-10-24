import { getChatProvider } from "@/lib/ai";
import { getViewer } from "@/lib/auth/viewer";
import { handleChatRequest } from "@/lib/chat-handler";
import { getRepository } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const viewer = await getViewer();
  return handleChatRequest(request, {
    getViewerId: async () => viewer?.id ?? null,
    getRepository: () => getRepository(viewer!),
    getProvider: (conversation) => getChatProvider(conversation),
  });
}
