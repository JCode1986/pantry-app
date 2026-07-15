"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaComments,
  FaPaperPlane,
  FaQuestionCircle,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import { askSupportChatbotAction } from "@/app/actions/chatbot";

const HELP_TOPICS = [
  {
    id: "organize",
    label: "Organize inventory",
    description: "Locations, storage areas, categories, and cleanup.",
    options: [
      {
        label: "Plan a pantry, garage, or closet",
        answer:
          "Use the hierarchy from broad to specific: Location, Storage Area, Category, then Item. For a pantry, use Kitchen > Pantry > Shelf or Bin > Food type. For a garage, use Garage > Rack or Cabinet > Bin or tool group. Keep categories close to how you search later.",
        actions: [
          { href: "/locations", label: "Open locations" },
          { href: "/items", label: "Review items" },
        ],
      },
      {
        label: "Fix duplicate or messy categories",
        answer:
          "Create the destination category first, then use item selection and Move to relocate items into the cleaner category. After the old category is empty, delete or rename it. This avoids losing item details or photos.",
        actions: [
          { href: "/categories", label: "Open categories" },
          { href: "/items", label: "Select items" },
        ],
      },
    ],
  },
  {
    id: "items",
    label: "Add or move items",
    description: "Manual add, barcode, voice, photos, and bulk moves.",
    options: [
      {
        label: "Add a detailed item",
        answer:
          "Use Add Item from the app shell. Pick barcode, voice, or manual entry, then include the item name, quantity, location, storage area, category, photo, and expiration date when relevant.",
        actions: [{ href: "/items", label: "Open items" }],
      },
      {
        label: "Move several items safely",
        answer:
          "Enter selection mode on an item list or detail page, choose the items, then use Move. Pick the new location, storage area, and category. The move preserves item details and photos; only the storage path changes.",
        actions: [{ href: "/items", label: "Select items" }],
      },
      {
        label: "Use voice quick add",
        answer:
          'Open Add Item, choose voice, and speak one complete sentence without long pauses. Example: "Add two cans of black beans in the kitchen pantry canned goods category expiring March 12 2027."',
        actions: [{ href: "/items", label: "Open items" }],
      },
    ],
  },
  {
    id: "find",
    label: "Search and find things",
    description: "Search by item, place, category, or detail.",
    options: [
      {
        label: "Find one item fast",
        answer:
          "Use global search from the app shell or search inside Items, Locations, Areas, and Categories. Search by item name first, then narrow by location or category if the list is large.",
        actions: [{ href: "/items", label: "Search items" }],
      },
      {
        label: "Find everything in a place",
        answer:
          "Open Locations, choose the location, then drill into storage areas and categories. This works well for shelves, bins, cabinets, and rooms where you want a full inventory view.",
        actions: [{ href: "/locations", label: "Open locations" }],
      },
    ],
  },
  {
    id: "attention",
    label: "Low stock and expiration",
    description: "Expired items, expiring soon, restocking, and shopping.",
    options: [
      {
        label: "Track low stock, expired items, and shopping together",
        answer:
          "Use item quantity for low-stock tracking, expiration dates for expired and expiring-soon attention, and the shopping list for restocking. The dashboard summarizes these signals so you can decide what to use, move, or buy.",
        actions: [
          { href: "/dashboard", label: "Open dashboard" },
          { href: "/shopping-list", label: "Open shopping list" },
        ],
      },
      {
        label: "Move an item to the shopping list",
        answer:
          "From Items or an item detail context, use the shopping-list action when something needs to be bought again. Shopping list entries can keep useful item details and photos when available.",
        actions: [
          { href: "/items", label: "Open items" },
          { href: "/shopping-list", label: "Open shopping list" },
        ],
      },
    ],
  },
  {
    id: "sharing",
    label: "Household sharing",
    description: "Invites, roles, viewers, editors, and owners.",
    options: [
      {
        label: "Choose viewer vs editor",
        answer:
          "Use Viewer for people who only need to search and browse. Use Editor for people who should add, move, update, and organize items. Owners manage billing, invites, and member access.",
        actions: [{ href: "/profile", label: "Open profile" }],
      },
      {
        label: "Invite or remove someone",
        answer:
          "Go to Profile, then Family sharing. Owners on the Family plan can invite people by email, resend or revoke pending invites, update member roles, and remove household members.",
        actions: [{ href: "/profile", label: "Manage sharing" }],
      },
    ],
  },
  {
    id: "account",
    label: "Billing and account",
    description: "Plans, password, profile, appearance, and subscription.",
    options: [
      {
        label: "Pick the right plan",
        answer:
          "Free is best for trying a small inventory. Plus is for one household manager with unlimited inventory. Family is for shared households with multiple members and roles.",
        actions: [{ href: "/profile", label: "Open billing" }],
      },
      {
        label: "Change password or profile settings",
        answer:
          "Open Profile to update your display name, password, appearance preferences, household sharing, and billing settings.",
        actions: [{ href: "/profile", label: "Open profile" }],
      },
    ],
  },
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

function createGuidedMessage(option) {
  return {
    ...createMessage("assistant", option.answer),
    actions: option.actions ?? [],
  };
}

export default function SupportChatbot({
  defaultOpen = false,
  variant = "floating",
  className = "",
}) {
  const isPage = variant === "page";
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const selectedTopic = HELP_TOPICS.find((topic) => topic.id === selectedTopicId);
  const showGuidedHelp = messages.length === INITIAL_MESSAGES.length && !isSending;

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
    if (!isOpen && !isPage) return;

    const frameId = window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, isPage, messages]);

  useEffect(() => {
    if (!isOpen && !isPage) return;

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, isPage]);

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

  const handleGuidedAnswer = (option) => {
    setMessages((current) => [
      ...current,
      createMessage("user", option.label),
      createGuidedMessage(option),
    ]);
    setSelectedTopicId(null);
    setError("");
  };

  const chatPanel = (
    <section
      className={
        isPage
          ? "flex min-h-[calc(100svh-var(--wherekeep-mobile-topbar-height,4rem)-var(--wherekeep-mobile-bottombar-height,5.5rem))] flex-col overflow-hidden bg-white md:min-h-[calc(100vh-var(--wherekeep-desktop-commandbar-height,0px))] md:rounded-2xl md:border md:border-gray-200 md:shadow-sm"
          : "fixed inset-x-3 bottom-[6.25rem] flex max-h-[min(72svh,560px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:h-[560px] md:w-[390px]"
      }
    >
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
            {isPage ? (
              <Link
                href="/dashboard"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
                aria-label="Close help chat"
              >
                <FaTimes className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
                aria-label="Close help chat"
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            )}
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
                    {message.actions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.actions.map((action) => (
                          <Link
                            key={`${message.id}-${action.href}-${action.label}`}
                            href={action.href}
                            className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-xs font-semibold text-[var(--stocksense-brand)] transition hover:brightness-95"
                          >
                            {action.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {showGuidedHelp ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                {selectedTopic ? (
                  <>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-950">
                          {selectedTopic.label}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-gray-600">
                          {selectedTopic.description}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTopicId(null)}
                        className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600"
                      >
                        Back
                      </button>
                    </div>
                    <div className="grid gap-2">
                      {selectedTopic.options.map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => handleGuidedAnswer(option)}
                          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-left text-sm font-semibold leading-5 text-gray-800 transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-gray-950">
                        Choose a topic
                      </div>
                      <div className="mt-1 text-xs leading-5 text-gray-600">
                        Pick the closest match, or type a custom question below.
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {HELP_TOPICS.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => setSelectedTopicId(topic.id)}
                          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-left transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]"
                        >
                          <span className="block text-sm font-semibold text-gray-900">
                            {topic.label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-gray-600">
                            {topic.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}

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
  );

  if (isPage) {
    return chatPanel;
  }

  return (
    <div className={`fixed bottom-[6.25rem] right-4 z-[60] md:bottom-6 lg:right-6 ${className}`}>
      {isOpen ? (
        chatPanel
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
