'use client';

import { useState } from 'react';
import { Send, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupTextarea } from '@/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { chatPromptSchema } from '../types/assistant';

import type { KeyboardEvent } from 'react';

type CustomChatComposerProps = {
  isStreaming: boolean;
  onSend: (prompt: string) => boolean;
  onStop: () => void;
};

const CustomChatComposer = ({ isStreaming, onSend, onStop }: CustomChatComposerProps) => {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = chatPromptSchema.safeParse(prompt);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Type a question first.');
      return;
    }
    if (onSend(parsed.data)) {
      setPrompt('');
      setError(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!isStreaming) submit();
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="assistant-prompt" className="sr-only">
        Ask the assistant
      </label>
      <InputGroup className="items-end rounded-2xl bg-card shadow-sm dark:bg-card">
        <InputGroupTextarea
          id="assistant-prompt"
          rows={1}
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about feeding or sensors"
          aria-invalid={error !== null}
          aria-describedby={error ? 'assistant-prompt-error' : 'assistant-prompt-hint'}
          className="max-h-40 min-h-13 px-4 py-3.5 text-base md:text-sm"
        />
        <InputGroupAddon align="inline-end" className="p-1 has-[>button]:mr-0">
          {isStreaming ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Stop answering"
                  className="size-11 rounded-xl"
                  onClick={onStop}
                >
                  <Square className="size-3.5 fill-current" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" aria-hidden>
                Stop answering
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" size="icon" aria-label="Send" className="size-11 rounded-xl">
                  <Send className="size-4.5" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" aria-hidden>
                Send (Enter)
              </TooltipContent>
            </Tooltip>
          )}
        </InputGroupAddon>
      </InputGroup>
      {error ? (
        <p id="assistant-prompt-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id="assistant-prompt-hint" className="hidden text-center text-xs text-muted-foreground sm:block">
          Enter sends, Shift+Enter adds a line. Answers can be wrong, so check the reading before you change water or feed.
        </p>
      )}
    </form>
  );
};

export default CustomChatComposer;
