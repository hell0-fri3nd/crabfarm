"use client";

import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  type ChatModelRunOptions,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useLocalRuntime } from "@assistant-ui/core/react";
import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AssistantModal,
  AssistantTrigger,
} from "~/components/assistant-modal";
import {
  loadChatHistory,
  sendChatMessage,
  setOpen,
} from "~/store/chat-slice";
import type { AppDispatch, RootState } from "~/store/store";

type RunMessages = ChatModelRunOptions["messages"];

function getLastUserText(messages: readonly RunMessages[number][]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    for (const part of msg.content) {
      if (part.type === "text" && part.text) return part.text;
    }
  }
  return "";
}

type AssistantModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ChatRuntime = ({ open, onOpenChange }: AssistantModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const history = useSelector(
    (state: RootState) => state.chat.history,
  ) as ThreadMessageLike[];

  const sessionAdapter = useMemo<ChatModelAdapter>(
    () => ({
      async run({ messages }: ChatModelRunOptions) {
        const text = getLastUserText(messages);

        const result = await dispatch(sendChatMessage(text)).unwrap();

        return {
          content: [
            { type: "text", text: result.assistant_message.content },
          ],
        };
      },
    }),
    [dispatch],
  );

  const runtime = useLocalRuntime(sessionAdapter, {
    initialMessages: history,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantModal open={open} onOpenChange={onOpenChange} />
    </AssistantRuntimeProvider>
  );
};

export function Assistant() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector((state: RootState) => state.chat.open);
  const version = useSelector((state: RootState) => state.chat.version);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      dispatch(setOpen(next));
      // Load latest chat messages every time the chatbot is opened.
      if (next) {
        void dispatch(loadChatHistory());
      }
    },
    [dispatch],
  );

  // Changing the key recreates the runtime so freshly-loaded history (bumped
  // version) seeds the thread each time the chatbot is opened.
  return (
    <>
      <AssistantTrigger open={open} onOpenChange={handleOpenChange} />
      <ChatRuntime
        key={`${open}-${version}`}
        open={open}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}