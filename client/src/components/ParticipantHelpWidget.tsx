import type { Message } from "@/components/AIChatBox";
import { Bot, MessageCircleQuestion, X } from "lucide-react";
import { lazy, Suspense, useState } from "react";

const AIChatBox = lazy(() => import("@/components/AIChatBox").then((module) => ({ default: module.AIChatBox })));

const suggestedPrompts = [
  "What is the registration fee?",
  "How many members can be in a squad?",
  "How does UTR verification work?",
  "How can I find transport details?",
];

export function ParticipantHelpWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);

  const sendMessage = async (content: string) => {
    setMessages((current) => [...current, { role: "user", content }]);
    setPending(true);
    try {
      const response = await fetch("/api/participant-help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const body = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !body.answer) {
        throw new Error(body.error || "The help assistant is temporarily unavailable.");
      }
      setMessages((current) => [...current, { role: "assistant", content: body.answer ?? "The help assistant is temporarily unavailable." }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: error instanceof Error ? error.message : "The help assistant is temporarily unavailable." },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <aside className={`participant-help ${open ? "is-help-open" : ""}`} aria-label="Participant clarification assistant">
      {open && (
        <div className="participant-help-panel" role="dialog" aria-modal="false" aria-labelledby="participant-help-title">
          <header>
            <div>
              <span>AI PARTICIPANT HELP</span>
              <h2 id="participant-help-title">CLEAR THE <i>STATIC.</i></h2>
            </div>
            <button type="button" aria-label="Close participant help" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </header>
          <p className="participant-help-note">
            Ask about InnoHack-26 registration, travel, domains, fees, or guidelines. For final confirmation, use the verified coordinator call actions.
          </p>
          <Suspense fallback={<div className="participant-help-loading">OPENING PARTICIPANT HELP…</div>}>
            <AIChatBox
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={pending}
              height="360px"
              className="participant-help-chat"
              placeholder="Ask an InnoHack-26 question…"
              emptyStateMessage="Ask for participant guidance."
              suggestedPrompts={suggestedPrompts}
            />
          </Suspense>
        </div>
      )}
      <button
        type="button"
        className="participant-help-trigger"
        aria-label={open ? "Participant help open" : "Open AI participant help"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bot size={22} />
        <span>ASK AI</span>
        <MessageCircleQuestion size={15} />
      </button>
    </aside>
  );
}
