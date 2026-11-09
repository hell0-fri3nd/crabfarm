'use client';

import { Bot } from 'lucide-react';

import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import { toInitials } from '@/lib/format';

import CustomActionProposal from './custom-action-proposal';
import CustomSourceChip from './custom-source-chip';
import { revealReply } from '../lib/reveal-reply';

import type { ChatMessage } from '../types/assistant';

type CustomChatMessageProps = {
  message: ChatMessage;
  userName: string;
};

const CustomChatMessage = ({ message, userName }: CustomChatMessageProps) => {
  if (message.role === 'user' || !message.reply) {
    return (
      <Message align="end">
        <MessageAvatar className="hidden size-7 bg-primary/15 text-xs font-bold text-primary sm:flex">{toInitials(userName)}</MessageAvatar>
        <MessageContent>
          <Bubble align="end" className="max-w-[85%] sm:max-w-[80%]">
            <BubbleContent className="px-4 py-3 text-base md:py-2.5 md:text-sm">{message.text}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  const { reply, status, shown_words } = message;
  const { intro, steps } = revealReply(reply, shown_words);
  const isDone = status === 'done';

  return (
    <Message aria-busy={status === 'streaming'}>
      <MessageAvatar className="hidden size-7 self-start bg-primary/10 text-primary sm:flex">
        <Bot className="size-4" aria-hidden />
      </MessageAvatar>
      <MessageContent className="gap-2">
        <Bubble variant="ghost" className="max-w-full">
          <BubbleContent className="flex max-w-[72ch] flex-col gap-3 text-base leading-relaxed md:text-sm md:leading-6">
            {shown_words === 0 ? (
              <span className="text-muted-foreground motion-safe:animate-pulse">Reading the logs…</span>
            ) : (
              <p>{intro}</p>
            )}
            {steps.length > 0 && (
              <ol className="flex list-decimal flex-col gap-2 pl-5 marker:text-muted-foreground">
                {steps.map((step, index) => (
                  <li key={reply.steps[index]}>{step}</li>
                ))}
              </ol>
            )}
            {status === 'stopped' && (
              <p className="text-sm text-muted-foreground">Stopped. Ask again to get the full answer.</p>
            )}
          </BubbleContent>
        </Bubble>

        {isDone && reply.sources.length > 0 && (
          <ul aria-label="Sources" className="flex flex-wrap gap-2">
            {reply.sources.map(({ id, label }) => (
              <CustomSourceChip key={id} label={label} />
            ))}
          </ul>
        )}

        {isDone && reply.proposal && <CustomActionProposal proposal={reply.proposal} />}
      </MessageContent>
    </Message>
  );
};

export default CustomChatMessage;
