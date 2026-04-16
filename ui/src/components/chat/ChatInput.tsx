import { memo, useCallback, useRef, useState } from "react";
import { ArrowUp, Plus, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = memo(function ChatInput({
  onSend,
  disabled,
  placeholder = "Start a new project or ask something...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  return (
    <div className="border rounded-xl bg-background shadow-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Chat message"
        className={cn(
          "w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm",
          "placeholder:text-muted-foreground focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground"
            disabled={disabled}
            type="button"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground"
            disabled={disabled}
            type="button"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          className="h-8 w-8 rounded-lg p-0"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
          type="button"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
