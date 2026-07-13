"use server";

import { getVerifiedSession } from "@/lib/verifiedSession";

const MAX_CHAT_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 1200;

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

  if (text.includes("invite") || text.includes("family") || text.includes("member")) {
    return "Go to Profile, then Family sharing. Owners on the Family plan can invite people by email, resend pending invites, revoke invites, and remove household members.";
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
    return "Open Profile, then Billing. From there you can view the current plan, upgrade, or open the billing portal when a Stripe customer exists.";
  }

  if (text.includes("password") || text.includes("login") || text.includes("account")) {
    return "Open Profile for account settings. You can update your password, display name, appearance, billing, and household sharing settings there.";
  }

  return "I can help with WhereKeep questions about items, locations, storage areas, categories, search, bulk selection, invites, billing, and profile settings. What are you trying to do?";
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
      instructions:
        'You are the WhereKeep in-app support assistant. Help users understand how to use WhereKeep for household inventory: items, locations, storage areas, categories, search, bulk actions, invites, profile settings, billing, and account security. Keep answers concise and actionable. Do not claim to directly inspect or change the user\'s inventory. If the user asks about voice quick add, tell them to use Add Item, choose the voice option, and speak the full item in one smooth sentence with no long pauses. Give this example or one like it: "Add two cans of black beans in the kitchen pantry canned goods category expiring March 12 2027." If the user needs an app action, tell them where to go in the UI.',
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
