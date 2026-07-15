"use server";

import { getVerifiedSession } from "@/lib/verifiedSession";

const MAX_CHAT_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 1200;

const SUPPORT_TOPICS = [
  "Organizing a pantry, garage, closet, or document box into locations, storage areas, categories, and items.",
  "Choosing owner, editor, or viewer roles for a shared household.",
  "Moving multiple items between categories, storage areas, or locations while preserving item details and photos.",
  "Using expiration dates, low-stock quantities, shopping list status, and dashboard attention cards together.",
  "Using barcode entry, photo upload, manual add, or voice quick add for complex items.",
  "Recovering from duplicate locations, messy categories, or an item saved in the wrong place.",
  "Understanding Free, Plus, and Family plan limits before upgrading.",
  "Changing profile, password, appearance, billing, or household sharing settings.",
];

const COMPLEX_QUESTION_EXAMPLES = [
  "How should I organize a pantry that has shelves, bins, and expiration dates?",
  "What happens if I invite someone as a viewer instead of an editor?",
  "How do I move several items to a new location without losing photos?",
  "Can I track low stock, expired items, and shopping needs together?",
  "What should I say when using voice quick add for a detailed item?",
  "How do I clean up duplicate categories without losing where items are stored?",
  "Which plan do I need if two adults manage inventory and kids only need to search?",
  "How should I track seasonal garage bins that move between shelves?",
];

function normalizeChatMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .slice(-MAX_CHAT_MESSAGES)
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content:
        typeof message?.content === "string"
          ? message.content.trim().slice(0, MAX_MESSAGE_LENGTH)
          : "",
    }))
    .filter((message) => message.content);
}

function getOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text.trim();

  const chunks = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }

  return chunks.join("\n").trim();
}

function localHelpAnswer(question) {
  const text = question.toLowerCase();

  if (
    text.includes("organize") ||
    text.includes("pantry") ||
    text.includes("garage") ||
    text.includes("shelf") ||
    text.includes("bin") ||
    text.includes("closet") ||
    text.includes("document")
  ) {
    return "Use WhereKeep's hierarchy from broad to specific: Location, Storage Area, Category, then Item. For example: Kitchen > Pantry > Shelf 2 > Pasta, or Garage > Storage Rack > Holiday Bin > Extension cords. Use expiration dates on items that can go stale, and use categories for the way you actually search later.";
  }

  if (text.includes("invite") || text.includes("family") || text.includes("member")) {
    return "Go to Profile, then Family sharing. Owners on the Family plan can invite people by email, resend pending invites, revoke invites, and remove household members.";
  }

  if (text.includes("viewer") || text.includes("editor") || text.includes("owner") || text.includes("role")) {
    return "Owners manage billing, invites, and member access. Editors can organize and update household inventory. Viewers can search and browse without changing inventory, which is useful for kids, guests, or anyone who only needs lookup access.";
  }

  if (text.includes("move") || text.includes("bulk") || text.includes("several") || text.includes("multiple")) {
    return "Use selection mode on item lists or category/detail pages, choose the items, then use Move. Pick the destination location, storage area, and category. Item details and photos are preserved when items are moved; only the storage path changes.";
  }

  if (
    text.includes("low stock") ||
    text.includes("expired") ||
    text.includes("expiration") ||
    text.includes("shopping") ||
    text.includes("restock")
  ) {
    return "Use item quantity for low-stock tracking, expiration dates for expired or expiring-soon attention, and the shopping list for restocking. The dashboard highlights attention items so you can see what is expired, expiring soon, low stock, or needed on the shopping list.";
  }

  if (text.includes("search") || text.includes("find")) {
    return "Use the search field at the top of Items, Locations, Areas, Categories, or detail pages. Clear the search input to restore the full list.";
  }

  if (text.includes("voice") || text.includes("speak") || text.includes("talk")) {
    return 'Use Add Item, choose the voice option, then say the full item in one smooth sentence with no long pauses. Example: "Add two cans of black beans in the kitchen pantry canned goods category expiring March 12 2027." Include the item name, quantity, location, storage area, category, and expiration date when you know them.';
  }

  if (text.includes("item") || text.includes("add") || text.includes("barcode")) {
    return "Use Add Item from the navigation. You can enter item details manually, scan a barcode, upload an image, or use quick add when it is configured.";
  }

  if (text.includes("billing") || text.includes("plan") || text.includes("subscription")) {
    return "Open Profile, then Billing. Free is best for trying a small inventory, Plus is for one household manager with unlimited inventory, and Family is for shared households with multiple members and roles. From Billing you can view the current plan, upgrade, or open the Stripe billing portal when a Stripe customer exists.";
  }

  if (text.includes("password") || text.includes("login") || text.includes("account")) {
    return "Open Profile for account settings. You can update your password, display name, appearance, billing, and household sharing settings there.";
  }

  return `I can help with WhereKeep questions like: ${COMPLEX_QUESTION_EXAMPLES.slice(0, 4).join(" ")} What are you trying to do?`;
}

export async function askSupportChatbotAction(messages) {
  const { user, error: sessionError } = await getVerifiedSession();

  if (sessionError || !user?.id) {
    return {
      data: null,
      error: sessionError || "Your session has expired. Please log in again.",
    };
  }

  const normalizedMessages = normalizeChatMessages(messages);
  const latestUserMessage = [...normalizedMessages]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage?.content) {
    return {
      data: null,
      error: "Ask a question first.",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      data: {
        answer: localHelpAnswer(latestUserMessage.content),
        source: "local",
      },
      error: null,
    };
  }

  const model =
    process.env.OPENAI_CHATBOT_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: `You are the WhereKeep in-app support assistant. Help users understand how to use WhereKeep for household inventory: items, locations, storage areas, categories, search, bulk actions, invites, profile settings, billing, and account security.

Keep answers concise and actionable. Do not claim to directly inspect or change the user's inventory. If the user needs an app action, tell them where to go in the UI.

Support topics you should be ready for:
${SUPPORT_TOPICS.map((topic) => `- ${topic}`).join("\n")}

Examples of complex user questions:
${COMPLEX_QUESTION_EXAMPLES.map((question) => `- ${question}`).join("\n")}

If the user asks about voice quick add, tell them to use Add Item, choose the voice option, and speak the full item in one smooth sentence with no long pauses. Give this example or one like it: "Add two cans of black beans in the kitchen pantry canned goods category expiring March 12 2027."`,
      input: normalizedMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      max_output_tokens: 450,
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    console.error("askSupportChatbotAction error:", payload?.error ?? response.statusText);
    return {
      data: {
        answer: localHelpAnswer(latestUserMessage.content),
        source: "local",
      },
      error: null,
    };
  }

  const answer = getOutputText(payload);

  return {
    data: {
      answer: answer || localHelpAnswer(latestUserMessage.content),
      source: answer ? "ai" : "local",
    },
    error: null,
  };
}
