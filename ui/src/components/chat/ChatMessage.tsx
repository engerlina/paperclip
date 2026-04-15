import { memo } from "react";
import { cn } from "@/lib/utils";
import { MarkdownBody } from "@/components/MarkdownBody";
import { Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  body: string;
  authorType: "user" | "agent";
  authorName: string;
  timestamp: Date;
}

export const ChatMessage = memo(function ChatMessage({
  body,
  authorType,
  timestamp,
}: ChatMessageProps) {
  const isUser = authorType === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-transparent"
        )}
      >
        {!isUser && (
          <div className="mb-2">
            <MarkdownBody>{body}</MarkdownBody>
          </div>
        )}
        {isUser && (
          <p className="whitespace-pre-wrap text-sm">{body}</p>
        )}

        {!isUser && (
          <div className="mt-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => navigator.clipboard.writeText(body)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
