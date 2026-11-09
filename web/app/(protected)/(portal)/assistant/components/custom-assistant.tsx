'use client';

import { Bot } from 'lucide-react';

import CustomPageHeader from '@/components/custom/custom-page-header';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';

import CustomAssistantContext from './custom-assistant-context';
import CustomChatComposer from './custom-chat-composer';
import CustomChatMessage from './custom-chat-message';
import CustomContextChips from './custom-context-chips';
import CustomSuggestionChips from './custom-suggestion-chips';
import { useScriptedChat } from '../lib/use-scripted-chat';

import type { ContextReading } from '../types/assistant';

type CustomAssistantProps = {
  userName: string;
  readings: ContextReading[];
  suggestions: readonly string[];
};

const CustomAssistant = ({ userName, readings, suggestions }: CustomAssistantProps) => {
  const { messages, isStreaming, send, stop } = useScriptedChat();
  const hasThread = messages.length > 0;
  const lastAnswer = messages.findLast(({ role }) => role === 'assistant');

  return (
    // An app screen like any chat (Jakob's): only messages scroll. On phones it reclaims the tab-bar padding and the footer hides; on wider screens the footer is below the fold
    <div
      data-fullscreen
      className="mx-auto -mb-10 flex h-[calc(100dvh-10rem)] min-h-80 w-full max-w-7xl flex-col gap-3 sm:h-[calc(100dvh-10.5rem)] sm:gap-4 md:mb-0 md:h-[calc(100dvh-9rem)]"
    >
      <div className="flex flex-col gap-2 sm:gap-3">
        <CustomPageHeader
          title="Assistant"
          status={
            <>
              <span className="sm:hidden">
                Answers can be wrong. Check before you change water or feed. Chats aren&apos;t saved.
              </span>
              <span className="hidden sm:inline">
                Reads sensors, feeding and crab logs. It suggests; you confirm. Chats aren&apos;t saved.
              </span>
            </>
          }
        />
        <div className="min-w-0 lg:hidden">
          <CustomContextChips readings={readings} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Conversation" className="flex min-h-0 min-w-0 flex-col gap-3">
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport className="[scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
                <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-0 py-2">
                  {hasThread ? (
                    messages.map((message) => (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === 'user'}
                        className={message.role === 'user' ? 'mt-6 first:mt-0' : 'mt-2'}
                      >
                        <CustomChatMessage message={message} userName={userName} />
                      </MessageScrollerItem>
                    ))
                  ) : (
                    <div className="m-auto flex max-w-md flex-col items-center gap-3 py-8 text-center">
                      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="size-5" aria-hidden />
                      </span>
                      <p className="text-lg font-semibold">Ask about tonight&apos;s water, feeding or growth</p>
                      <p className="text-sm text-muted-foreground">
                        It reads the latest readings and logs, explains why, and suggests a change. Nothing happens until
                        you confirm.
                      </p>
                    </div>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>

          <p role="status" className="sr-only">
            {isStreaming && 'The assistant is answering.'}
            {!isStreaming && lastAnswer?.status === 'done' && 'The answer is ready.'}
          </p>

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {!hasThread && (
              <CustomSuggestionChips
                questions={suggestions}
                isDisabled={isStreaming}
                onPick={send}
                className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0 sm:[mask-image:none]"
              />
            )}
            <CustomChatComposer isStreaming={isStreaming} onSend={send} onStop={stop} />
          </div>
        </section>

        <CustomAssistantContext readings={readings} />
      </div>
    </div>
  );
};

export default CustomAssistant;
