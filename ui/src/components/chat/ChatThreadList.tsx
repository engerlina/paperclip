import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatThread } from "@/api/chat";

interface ChatThreadListProps {
  threads: ChatThread[];
  selectedThreadId?: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function groupThreadsByDate(threads: ChatThread[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { label: string; threads: ChatThread[] }[] = [
    { label: "TODAY", threads: [] },
    { label: "YESTERDAY", threads: [] },
    { label: "LAST WEEK", threads: [] },
    { label: "EARLIER", threads: [] },
  ];

  for (const thread of threads) {
    const date = new Date(thread.lastMessageAt);
    if (date >= today) {
      groups[0].threads.push(thread);
    } else if (date >= yesterday) {
      groups[1].threads.push(thread);
    } else if (date >= lastWeek) {
      groups[2].threads.push(thread);
    } else {
      groups[3].threads.push(thread);
    }
  }

  return groups.filter((g) => g.threads.length > 0);
}

export const ChatThreadList = memo(function ChatThreadList({
  threads,
  selectedThreadId,
  searchQuery,
  onSearchChange,
}: ChatThreadListProps) {
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.lastMessage.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const groupedThreads = useMemo(
    () => groupThreadsByDate(filteredThreads),
    [filteredThreads]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {groupedThreads.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
              {group.label}
            </div>
            {group.threads.map((thread) => (
              <Link
                key={thread.id}
                to={`/chat/${thread.id}`}
                className={cn(
                  "block px-3 py-2 hover:bg-muted/50 transition-colors",
                  selectedThreadId === thread.id && "bg-muted"
                )}
              >
                <div className="font-medium text-sm truncate">
                  {thread.title}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {thread.lastMessage}
                </div>
              </Link>
            ))}
          </div>
        ))}

        {filteredThreads.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {searchQuery ? "No chats found" : "No conversations yet"}
          </div>
        )}
      </div>
    </div>
  );
});
