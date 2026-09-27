"use client";

import { BotIcon, XIcon } from "lucide-react";

import { Thread } from "~/components/thread";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent } from "~/components/ui/sheet";
import { cn } from "~/lib/utils";

type AssistantModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const AssistantTrigger = ({ open, onOpenChange }: AssistantModalProps) => {
  return (
    <Button
      type="button"
      size="icon"
      onClick={() => onOpenChange(!open)}
      aria-label={open ? "Close Assistant" : "Open Assistant"}
      className={cn(
        "fixed end-6 z-50 rounded-full shadow-lg",
        "bottom-6 md:bottom-8 size-16",
        "transition-transform duration-200 ease-out",
        "hover:scale-105 active:scale-95",
        "motion-reduce:transition-none",
      )}
    >
      <BotIcon className="size-8" />
      <span className="sr-only">
        {open ? "Close Assistant" : "Open Assistant"}
      </span>
    </Button>
  );
};

export const AssistantModal = ({ open, onOpenChange }: AssistantModalProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex w-full flex-col gap-0 p-0",
          "sm:max-w-lg md:max-w-lg lg:max-w-xl",
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-sidebar/50 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BotIcon className="size-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-semibold leading-tight text-foreground">
                Crab Assistant
              </h2>
              <p className="text-sm leading-tight text-muted-foreground">
                How can I help you today?
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close Assistant"
            className="size-9 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-5" />
          </Button>
        </header>

        {/* Thread content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Thread />
        </div>
      </SheetContent>
    </Sheet>
  );
};