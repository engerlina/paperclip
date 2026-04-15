import { memo } from "react";

interface ChatTypingIndicatorProps {
  text?: string;
}

export const ChatTypingIndicator = memo(function ChatTypingIndicator({
  text = "Thinking...",
}: ChatTypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span>{text}</span>
      <span className="text-xs">›</span>
    </div>
  );
});
