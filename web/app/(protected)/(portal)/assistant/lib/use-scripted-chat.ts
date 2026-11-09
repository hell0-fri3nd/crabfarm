import { useEffect, useState } from 'react';

import { getScriptedReply, toReplyWords } from './preview-assistant';
import { chatPromptSchema } from '../types/assistant';

import type { ChatMessage } from '../types/assistant';

const TICK_MS = 45;
const WORDS_PER_TICK = 2;

const advance = (message: ChatMessage): ChatMessage => {
  if (!message.reply) return message;
  const total = toReplyWords(message.reply).length;
  const shownWords = Math.min(message.shown_words + WORDS_PER_TICK, total);
  return { ...message, shown_words: shownWords, status: shownWords >= total ? 'done' : 'streaming' };
};

export const useScriptedChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const streamingId = messages.find(({ status }) => status === 'streaming')?.id ?? null;

  useEffect(() => {
    if (!streamingId) return;
    const timer = window.setInterval(() => {
      setMessages((current) => current.map((message) => (message.id === streamingId ? advance(message) : message)));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [streamingId]);

  const send = (prompt: string) => {
    const parsed = chatPromptSchema.safeParse(prompt);
    if (!parsed.success || streamingId) return parsed.success;

    const question: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: parsed.data,
      reply: null,
      shown_words: 0,
      status: 'done',
    };
    const answer: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: '',
      reply: getScriptedReply(parsed.data),
      shown_words: 0,
      status: 'streaming',
    };
    setMessages((current) => [...current, question, answer]);
    return true;
  };

  const stop = () =>
    setMessages((current) =>
      current.map((message) => (message.status === 'streaming' ? { ...message, status: 'stopped' } : message)),
    );

  return { messages, isStreaming: streamingId !== null, send, stop };
};
