import type { Issue, IssueComment, Agent } from "@paperclipai/shared";
import { agentsApi } from "./agents";
import { issuesApi } from "./issues";

export interface ChatThread {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: Date;
  status: string;
}

export interface ChatMessage {
  id: string;
  body: string;
  authorType: "user" | "agent";
  authorName: string;
  authorAgentId: string | null;
  createdAt: Date;
}

const CHAT_ORIGIN_KIND = "chat";

export const chatApi = {
  findCeoAgent: async (companyId: string): Promise<Agent | null> => {
    const agents = await agentsApi.list(companyId);
    // Look for CEO role first, fallback to Manager Agent by name (import may not set role correctly)
    const active = agents.filter((a) => a.status !== "terminated");
    return (
      active.find((a) => a.role === "ceo") ??
      active.find((a) => a.name === "Manager Agent") ??
      null
    );
  },

  listThreads: async (companyId: string): Promise<ChatThread[]> => {
    const issues = await issuesApi.list(companyId, {
      originKind: CHAT_ORIGIN_KIND,
    });
    return issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      lastMessage: issue.description ?? "",
      lastMessageAt: new Date(issue.updatedAt),
      status: issue.status,
    }));
  },

  createThread: async (
    companyId: string,
    ceoAgentId: string,
    firstMessage: string
  ): Promise<Issue> => {
    const title = firstMessage.length > 50
      ? firstMessage.slice(0, 47) + "..."
      : firstMessage;

    return issuesApi.create(companyId, {
      title,
      description: firstMessage,
      assigneeAgentId: ceoAgentId,
      status: "in_progress",
      priority: "medium",
      originKind: CHAT_ORIGIN_KIND,
    });
  },

  getMessages: async (threadId: string): Promise<ChatMessage[]> => {
    const comments = await issuesApi.listComments(threadId);
    return comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      authorType: comment.authorAgentId ? "agent" : "user",
      authorName: comment.authorAgentId ? "Manager Agent" : "You",
      authorAgentId: comment.authorAgentId ?? null,
      createdAt: new Date(comment.createdAt),
    }));
  },

  sendMessage: async (
    threadId: string,
    body: string,
    ceoAgentId: string,
    companyId: string
  ): Promise<{ comment: IssueComment; run: { id?: string; status: string } }> => {
    const comment = await issuesApi.addComment(threadId, body);
    const run = await agentsApi.wakeup(
      ceoAgentId,
      {
        source: "on_demand",
        triggerDetail: "manual",
        reason: `Chat message on thread ${threadId}`,
      },
      companyId
    );
    return { comment, run };
  },
};
