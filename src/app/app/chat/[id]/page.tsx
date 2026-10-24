import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { aiStatus } from "@/lib/ai";
import { requireViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";

export const metadata: Metadata = { title: "Session" };

export default async function ChatPage({ params }: PageProps<"/app/chat/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const viewer = await requireViewer(`/app/chat/${id}`);
  const repo = await getRepository(viewer);
  // Scoped to the viewer: another user's id resolves to 404, never to their data.
  const conversation = await repo.getConversation(id);
  if (!conversation) notFound();
  const [messages, summary] = await Promise.all([repo.listMessages(id), repo.getSummary(id)]);

  return (
    <ChatWorkspace
      key={conversation.id}
      conversation={conversation}
      initialMessages={messages}
      initialSummary={summary}
      aiMode={aiStatus()}
    />
  );
}
