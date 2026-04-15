// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Chat } from "../Chat";
import { chatApi } from "@/api/chat";
import { CompanyContext } from "@/context/CompanyContext";
import { ThemeProvider } from "@/context/ThemeContext";

vi.mock("@/api/chat");

// Mock scrollIntoView which is not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn();

const mockCompanyContext = {
  selectedCompanyId: "company-123",
  selectedCompany: null,
  companies: [],
  setSelectedCompanyId: vi.fn(),
  selectionSource: "manual" as const,
  loading: false,
  error: null,
  reloadCompanies: vi.fn(),
  createCompany: vi.fn(),
};

function renderChat(initialPath = "/chat") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CompanyContext.Provider value={mockCompanyContext}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:threadId" element={<Chat />} />
            </Routes>
          </MemoryRouter>
        </CompanyContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("Chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chatApi.findCeoAgent).mockResolvedValue({ id: "ceo-1", role: "ceo", status: "active" } as any);
    vi.mocked(chatApi.listThreads).mockResolvedValue([]);
  });

  describe("empty state", () => {
    it("shows greeting when no thread selected", async () => {
      renderChat("/chat");

      await waitFor(() => {
        expect(screen.getByText(/good/i)).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText(/start a new project/i)).toBeInTheDocument();
    });
  });

  describe("thread view", () => {
    it("shows messages for selected thread", async () => {
      vi.mocked(chatApi.getMessages).mockResolvedValue([
        { id: "m1", body: "Hello from user", authorType: "user", authorName: "You", authorAgentId: null, createdAt: new Date() },
        { id: "m2", body: "Hi from agent!", authorType: "agent", authorName: "Company Manager", authorAgentId: "ceo-1", createdAt: new Date() },
      ]);
      vi.mocked(chatApi.listThreads).mockResolvedValue([
        { id: "thread-1", title: "Test Chat", lastMessage: "Last message preview", lastMessageAt: new Date(), status: "in_progress" },
      ]);

      renderChat("/chat/thread-1");

      await waitFor(() => {
        expect(screen.getByText("Hello from user")).toBeInTheDocument();
      });
      expect(screen.getByText("Hi from agent!")).toBeInTheDocument();
    });
  });

  describe("creating threads", () => {
    it("creates new thread when sending first message", async () => {
      const user = userEvent.setup();
      const mockIssue = { id: "new-thread" };
      vi.mocked(chatApi.createThread).mockResolvedValue(mockIssue as any);

      renderChat("/chat");

      // Wait for ceoAgent to load (send button becomes enabled)
      const sendButton = await screen.findByRole("button", { name: /send/i });
      await waitFor(() => {
        // Wait until ceoAgent is loaded - the textarea should not be disabled
        expect(screen.getByRole("textbox")).not.toBeDisabled();
      });

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Hello CEO");
      await user.click(sendButton);

      await waitFor(() => {
        expect(chatApi.createThread).toHaveBeenCalledWith("company-123", "ceo-1", "Hello CEO");
      });
    });
  });
});
