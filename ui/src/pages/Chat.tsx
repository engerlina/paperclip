import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { chatApi } from "@/api/chat";
import { heartbeatsApi, type LiveRunForIssue } from "@/api/heartbeats";
import { useLiveRunTranscripts } from "@/components/transcript/useLiveRunTranscripts";
import { RunTranscriptView } from "@/components/transcript/RunTranscriptView";
import {
  ChatMessage,
  ChatTypingIndicator,
  ChatThreadList,
  ChatInput,
} from "@/components/chat";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Chat() {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find CEO agent
  const { data: ceoAgent, isLoading: isCeoLoading } = useQuery({
    queryKey: ["chat", "ceo", selectedCompanyId],
    queryFn: () => chatApi.findCeoAgent(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // List chat threads
  const { data: threads = [] } = useQuery({
    queryKey: ["chat", "threads", selectedCompanyId],
    queryFn: () => chatApi.listThreads(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  // Get messages for current thread
  const { data: messages = [] } = useQuery({
    queryKey: ["chat", "messages", threadId],
    queryFn: () => chatApi.getMessages(threadId!),
    enabled: !!threadId,
    refetchInterval: isThinking ? 1000 : 5000,
  });

  // Get live runs for streaming when agent is processing
  const { data: liveRuns = [] } = useQuery({
    queryKey: ["chat", "liveRuns", threadId],
    queryFn: () => heartbeatsApi.liveRunsForIssue(threadId!),
    enabled: !!threadId && isThinking,
    refetchInterval: 2000,
  });

  // Combine with current run if we have one
  const runsForTranscript = useMemo((): LiveRunForIssue[] => {
    const runs: LiveRunForIssue[] = [...liveRuns];
    // If we have a currentRunId that's not in liveRuns, add a placeholder
    if (currentRunId && !runs.some((r) => r.id === currentRunId)) {
      runs.push({
        id: currentRunId,
        status: "running",
        adapterType: "claude_local",
        createdAt: new Date().toISOString(),
      } as LiveRunForIssue);
    }
    return runs;
  }, [liveRuns, currentRunId]);

  // Get live transcript for streaming Claude Code output
  const { transcriptByRun } = useLiveRunTranscripts({
    runs: runsForTranscript,
    companyId: selectedCompanyId,
  });

  // Get transcript for current run
  const currentTranscript = useMemo(() => {
    if (!currentRunId) return [];
    return transcriptByRun.get(currentRunId) ?? [];
  }, [transcriptByRun, currentRunId]);

  // Create new thread mutation
  const createThread = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedCompanyId || !ceoAgent) throw new Error("No CEO agent");
      return chatApi.createThread(selectedCompanyId, ceoAgent.id, message);
    },
    onSuccess: ({ issue, run }) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "threads", selectedCompanyId] });
      navigate(`/chat/${issue.id}`);
      setIsThinking(true);
      if (run.id) {
        setCurrentRunId(run.id);
      }
    },
    onError: (error) => {
      console.error("Failed to create thread:", error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`);
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!threadId || !ceoAgent || !selectedCompanyId) {
        throw new Error("Missing context");
      }
      return chatApi.sendMessage(threadId, body, ceoAgent.id, selectedCompanyId);
    },
    onMutate: () => {
      setIsThinking(true);
      setCurrentRunId(null); // Clear old run
    },
    onSuccess: ({ run }) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
      if (run.id) {
        setCurrentRunId(run.id);
      }
    },
    onError: (error) => {
      setIsThinking(false);
      setCurrentRunId(null);
      console.error("Failed to send message:", error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`);
    },
  });

  // Stop thinking when we get a new agent message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.authorType === "agent") {
        setIsThinking(false);
        setCurrentRunId(null);
      }
    }
  }, [messages]);

  // Scroll to bottom on new messages or transcript updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTranscript]);

  const handleSend = useCallback(
    (message: string) => {
      if (threadId) {
        sendMessage.mutate(message);
      } else {
        createThread.mutate(message);
      }
    },
    [threadId, sendMessage, createThread]
  );

  // TODO: Get user name from auth context
  const userName = "there";

  return (
    <div className="flex h-full">
      {/* Thread list sidebar - only show when viewing a thread */}
      {threadId && (
        <div className="w-72 border-r flex flex-col">
          <div className="p-3 border-b">
            <Link
              to="/chat"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Agent
            </Link>
          </div>
          <div className="px-3 py-2">
            <h2 className="font-semibold text-sm">CHATS</h2>
          </div>
          <ChatThreadList
            threads={threads}
            selectedThreadId={threadId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {!threadId ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <h1 className="text-2xl font-semibold mb-2">
              {getGreeting()}, {userName}!
            </h1>
            <p className="text-muted-foreground mb-8">
              {isCeoLoading
                ? "Loading..."
                : !ceoAgent
                  ? "Company Manager agent not found. Please contact support."
                  : "Want an update? Start chatting below."}
            </p>
            <div className="w-full max-w-2xl">
              <ChatInput
                onSend={handleSend}
                disabled={!ceoAgent || isCeoLoading || createThread.isPending}
              />
            </div>
          </div>
        ) : (
          // Thread view
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  body={msg.body}
                  authorType={msg.authorType}
                  authorName={msg.authorName}
                  timestamp={msg.createdAt}
                />
              ))}
              {isThinking && (
                <div className="space-y-2">
                  {currentTranscript.length > 0 ? (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm overflow-hidden">
                      <RunTranscriptView
                        entries={currentTranscript}
                        density="compact"
                        streaming
                      />
                    </div>
                  ) : (
                    <ChatTypingIndicator text="Reviewing your request..." />
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
              <ChatInput
                onSend={handleSend}
                disabled={!ceoAgent || sendMessage.isPending}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
