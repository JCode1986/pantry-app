"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaComments,
  FaPaperPlane,
  FaQuestionCircle,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import { askSupportChatbotAction } from "@/app/actions/chatbot";

const STARTER_PROMPTS = [
  "How do I add an item?",
  "How do I invite someone?",
  "How does search work?",
];

const INITIAL_MESSAGES = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Ask me about WhereKeep items, locations, categories, search, invites, billing, or account settings.",
  },
];

function createMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const chatHistory = useMemo(
    () =>
      messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages]
  );

  useEffect(() => {
    if (!isOpen) return;

    const frameId = window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  const sendMessage = async (content) => {
    const question = content.trim();
    if (!question || isSending) return;

    const userMessage = createMessage("user", question);
    const nextHistory = [...chatHistory, { role: "user", content: question }];

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const result = await askSupportChatbotAction(nextHistory);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          result?.data?.answer || "I could not answer that right now."
        ),
      ]);
    } catch (err) {
      setError(err?.message || "Chat is unavailable right now.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(draft);
  };

  return (
    <div className="fixed bottom-[6.25rem] right-4 z-[60] md:bottom-6 lg:right-6">
      {isOpen ? (
        <section className="fixed inset-x-3 bottom-[6.25rem] flex max-h-[min(72svh,560px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:h-[560px] md:w-[390px]">
          <header className="flex shrink-0 items-center gap-3 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 py-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--stocksense-brand)] shadow-sm">
              <FaQuestionCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-gray-950">WhereKeep help</h2>
              <p className="truncate text-xs text-gray-600">
                Ask a question about using the app.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
              aria-label="Close help chat"
            >
              <FaTimes className="h-3.5 w-3.5" />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4"
          >
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5 shadow-sm ${
                      isUser
                        ? "bg-[var(--stocksense-brand)] text-white"
                        : "border border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}

            {isSending ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
                  <FaSpinner className="h-3.5 w-3.5 animate-spin text-[var(--stocksense-brand)]" />
                  Thinking
                </div>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {messages.length === INITIAL_MESSAGES.length ? (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="shrink-0 rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--stocksense-brand)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            {error ? (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <label className="sr-only" htmlFor="wherekeep-support-chat-input">
                Ask WhereKeep help
              </label>
              <textarea
                id="wherekeep-support-chat-input"
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(draft);
                  }
                }}
                rows={1}
                placeholder="Ask a question"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[var(--stocksense-brand)] focus:ring-2 focus:ring-[var(--stocksense-brand-border)]"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand)] text-white shadow-sm transition hover:brightness-95 disabled:opacity-50"
                aria-label="Send question"
              >
                {isSending ? (
                  <FaSpinner className="h-4 w-4 animate-spin" />
                ) : (
                  <FaPaperPlane className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--stocksense-brand)] text-white shadow-xl transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)] focus:ring-offset-2"
          aria-label="Open help chat"
        >
          <FaComments className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
