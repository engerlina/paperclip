import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatApi } from "../chat";
import { agentsApi } from "../agents";
import { issuesApi } from "../issues";

vi.mock("../agents");
vi.mock("../issues");

describe("chatApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findCeoAgent", () => {
    it("returns the CEO agent when one exists", async () => {
      const mockAgents = [
        { id: "agent-1", role: "general", status: "active" },
        { id: "ceo-agent", role: "ceo", status: "active" },
      ];
      vi.mocked(agentsApi.list).mockResolvedValue(mockAgents as any);

      const result = await chatApi.findCeoAgent("company-123");

      expect(agentsApi.list).toHaveBeenCalledWith("company-123");
      expect(result).toEqual({ id: "ceo-agent", role: "ceo", status: "active" });
    });

    it("returns null when no CEO agent exists", async () => {
      vi.mocked(agentsApi.list).mockResolvedValue([
        { id: "agent-1", role: "general", status: "active" },
      ] as any);

      const result = await chatApi.findCeoAgent("company-123");

      expect(result).toBeNull();
    });

    it("ignores terminated CEO agents", async () => {
      vi.mocked(agentsApi.list).mockResolvedValue([
        { id: "ceo-agent", role: "ceo", status: "terminated" },
      ] as any);

      const result = await chatApi.findCeoAgent("company-123");

      expect(result).toBeNull();
    });
  });

  describe("listThreads", () => {
    it("lists issues with originKind=chat", async () => {
      const mockIssues = [
        { id: "issue-1", title: "Chat 1", description: "Hello", updatedAt: "2026-04-15T10:00:00Z", status: "in_progress" },
      ];
      vi.mocked(issuesApi.list).mockResolvedValue(mockIssues as any);

      const result = await chatApi.listThreads("company-123");

      expect(issuesApi.list).toHaveBeenCalledWith("company-123", { originKind: "chat" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("issue-1");
      expect(result[0].title).toBe("Chat 1");
    });
  });

  describe("createThread", () => {
    it("creates an issue with chat origin assigned to CEO, adds comment, and wakes agent", async () => {
      const mockIssue = { id: "new-issue", title: "Hello world" };
      const mockComment = { id: "comment-1", body: "Hello world" };
      const mockRun = { id: "run-1", status: "queued" };
      vi.mocked(issuesApi.create).mockResolvedValue(mockIssue as any);
      vi.mocked(issuesApi.addComment).mockResolvedValue(mockComment as any);
      vi.mocked(agentsApi.wakeup).mockResolvedValue(mockRun as any);

      const result = await chatApi.createThread("company-123", "ceo-id", "Hello world");

      expect(issuesApi.create).toHaveBeenCalledWith("company-123", expect.objectContaining({
        title: "Hello world",
        description: "",
        assigneeAgentId: "ceo-id",
        status: "in_progress",
        originKind: "chat",
      }));
      expect(issuesApi.addComment).toHaveBeenCalledWith("new-issue", "Hello world");
      expect(agentsApi.wakeup).toHaveBeenCalledWith(
        "ceo-id",
        expect.objectContaining({ source: "on_demand" }),
        "company-123"
      );
      expect(result.issue.id).toBe("new-issue");
      expect(result.run).toEqual(mockRun);
    });

    it("truncates long messages for title", async () => {
      vi.mocked(issuesApi.create).mockResolvedValue({ id: "issue" } as any);
      vi.mocked(issuesApi.addComment).mockResolvedValue({ id: "c1" } as any);
      vi.mocked(agentsApi.wakeup).mockResolvedValue({ id: "run-1", status: "queued" } as any);

      const longMessage = "A".repeat(100);
      await chatApi.createThread("company-123", "ceo-id", longMessage);

      expect(issuesApi.create).toHaveBeenCalledWith("company-123", expect.objectContaining({
        title: "A".repeat(47) + "...",
      }));
    });
  });

  describe("getMessages", () => {
    it("transforms comments to chat messages", async () => {
      const mockComments = [
        { id: "c1", body: "Hello", authorAgentId: null, createdAt: "2026-04-15T10:00:00Z" },
        { id: "c2", body: "Hi there!", authorAgentId: "ceo-id", createdAt: "2026-04-15T10:01:00Z" },
      ];
      vi.mocked(issuesApi.listComments).mockResolvedValue(mockComments as any);

      const result = await chatApi.getMessages("thread-123");

      expect(issuesApi.listComments).toHaveBeenCalledWith("thread-123");
      expect(result).toHaveLength(2);
      expect(result[0].authorType).toBe("user");
      expect(result[1].authorType).toBe("agent");
    });
  });

  describe("sendMessage", () => {
    it("adds comment and wakes up CEO agent", async () => {
      const mockComment = { id: "comment-1", body: "Test" };
      const mockRun = { id: "run-1", status: "queued" };
      vi.mocked(issuesApi.addComment).mockResolvedValue(mockComment as any);
      vi.mocked(agentsApi.wakeup).mockResolvedValue(mockRun as any);

      const result = await chatApi.sendMessage("thread-123", "Test message", "ceo-id", "company-123");

      expect(issuesApi.addComment).toHaveBeenCalledWith("thread-123", "Test message");
      expect(agentsApi.wakeup).toHaveBeenCalledWith(
        "ceo-id",
        expect.objectContaining({ source: "on_demand" }),
        "company-123"
      );
      expect(result.comment).toEqual(mockComment);
      expect(result.run).toEqual(mockRun);
    });
  });
});
