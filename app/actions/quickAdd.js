'use server';

import { getVerifiedSession } from '@/lib/verifiedSession';
import {
  canEditHouseholdInventory,
  getHouseholdForUser,
  hasHouseholdInviteMetadata,
} from '@/utils/households';
import { normalizeBarcode, normalizeName } from '@/utils/pantry/validation';

function validationError(message) {
  return { data: null, error: message };
}

function allowedProductImageUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:') return null;
    if (host === 'images.openfoodfacts.org' || host.endsWith('.openfoodfacts.org')) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

async function requireInventoryEditor() {
  const { user } = await getVerifiedSession();
  if (!user?.id) {
    return { error: 'Your session has expired. Please log in again.' };
  }

  const { member } = await getHouseholdForUser({
    userId: user.id,
    email: user.email,
    createIfMissing: !hasHouseholdInviteMetadata(user),
  });

  if (!canEditHouseholdInventory(member)) {
    return { error: 'You have view-only access to this household inventory.' };
  }

  return { error: null };
}

const QUICK_ADD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    itemName: {
      type: 'string',
      description: 'A concise item name suitable for an inventory list.',
    },
    quantity: {
      type: ['integer', 'null'],
      description: 'Count of identical items. Use 1 when unsure.',
    },
    expirationDate: {
      type: ['string', 'null'],
      description: 'Expiration, best-by, or use-by date in YYYY-MM-DD format when visible or stated.',
    },
    barcode: {
      type: ['string', 'null'],
      description: 'Barcode value when visible or stated.',
    },
    locationName: {
      type: ['string', 'null'],
      description: 'Named location if the user stated one, such as Kitchen or Garage.',
    },
    storageAreaName: {
      type: ['string', 'null'],
      description: 'Named storage area if the user stated one, such as Pantry or Fridge.',
    },
    categoryName: {
      type: ['string', 'null'],
      description: 'Named category if the user stated one, such as Snacks or Canned Goods.',
    },
    confidence: {
      type: 'number',
      description: 'Confidence from 0 to 1 that the item details are correct.',
    },
  },
  required: [
    'itemName',
    'quantity',
    'expirationDate',
    'barcode',
    'locationName',
    'storageAreaName',
    'categoryName',
    'confidence',
  ],
};

function normalizeQuickAddDate(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}

function normalizeOptionalQuickAddName(value) {
  const normalized = normalizeName(value).slice(0, 120);
  return normalized || null;
}

function normalizeQuickAddFields(fields) {
  const hasQuantity = fields?.quantity !== null && fields?.quantity !== undefined;
  const quantityValue = hasQuantity && Number.isFinite(Number(fields.quantity))
    ? Math.max(0, Math.min(9999, Math.round(Number(fields.quantity))))
    : 1;

  return {
    itemName: normalizeName(fields?.itemName).slice(0, 120),
    quantity: quantityValue,
    expirationDate: normalizeQuickAddDate(fields?.expirationDate),
    barcode: normalizeBarcode(fields?.barcode) || null,
    locationName: normalizeOptionalQuickAddName(fields?.locationName),
    storageAreaName: normalizeOptionalQuickAddName(fields?.storageAreaName),
    categoryName: normalizeOptionalQuickAddName(fields?.categoryName),
    confidence: Math.max(0, Math.min(1, Number(fields?.confidence) || 0)),
  };
}

function getOpenAIOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;

  const chunks = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }

  return chunks.join('\n').trim();
}

function parseQuickAddJson(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function runOpenAIQuickAdd({ content }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return validationError('AI quick add needs OPENAI_API_KEY in .env.local.');
  }

  const model =
    process.env.OPENAI_QUICK_ADD_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions:
        'You extract pantry and household inventory item details for WhereKeep. Return only fields that are visible or explicitly stated. Use null for unknown optional fields. Do not invent storage locations.',
      input: [
        {
          role: 'user',
          content,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'wherekeep_quick_add',
          schema: QUICK_ADD_SCHEMA,
          strict: true,
        },
      },
      max_output_tokens: 500,
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    console.error('runOpenAIQuickAdd error:', payload?.error ?? response.statusText);
    return validationError(
      response.status === 401
        ? 'AI quick add is not configured correctly.'
        : 'AI quick add is unavailable right now.'
    );
  }

  const parsed = parseQuickAddJson(getOpenAIOutputText(payload));
  const data = normalizeQuickAddFields(parsed);
  if (!data.itemName) {
    return validationError('Could not find an item name in that voice note.');
  }

  return { data, error: null };
}

function parseQuickAddTextLocally(transcript) {
  const text = normalizeName(transcript).slice(0, 500);
  if (!text) return null;

  const numberWords = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const quantityMatch = text.match(/\b(\d{1,4})\b/);
  const wordQuantityMatch = text.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i
  );
  const quantity = quantityMatch
    ? Number(quantityMatch[1])
    : numberWords[wordQuantityMatch?.[1]?.toLowerCase()] ?? 1;
  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);

  let itemName = text
    .replace(/^(please\s+)?(add|put|create|save|log|inventory)\s+/i, '')
    .replace(/\b(to|in|into|inside|under)\b[\s\S]*$/i, '')
    .replace(/\b(expiration|expires|expire|best by|use by)\b[\s\S]*$/i, '')
    .trim();

  itemName = itemName
    .replace(/^\d{1,4}\s+/i, '')
    .replace(
      /^(one|two|three|four|five|six|seven|eight|nine|ten)\s+/i,
      ''
    )
    .replace(
      /^(items?|packs?|boxes?|bags?|cans?|bottles?|jars?|cartons?|pounds?|ounces?|lbs?|oz|kg|grams?|g)\s+(of\s+)?/i,
      ''
    )
    .trim();

  return normalizeQuickAddFields({
    itemName,
    quantity,
    expirationDate: dateMatch?.[1] ?? null,
    barcode: null,
    locationName: null,
    storageAreaName: null,
    categoryName: null,
    confidence: 0.45,
  });
}

export async function lookupProductByBarcode(barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (normalizedBarcode.length < 4) {
    return validationError('Enter a valid barcode.');
  }

  try {
    const endpoint = new URL(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedBarcode)}.json`
    );
    endpoint.searchParams.set(
      'fields',
      'code,product_name,product_name_en,generic_name,brands,image_front_url,image_url'
    );

    const response = await fetch(endpoint.toString(), {
      headers: {
        'User-Agent': 'WhereKeep barcode lookup (contact: support@wherekeep.app)',
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return validationError('Could not look up that barcode right now.');
    }

    const payload = await response.json();
    const product = payload?.product;

    if (payload?.status !== 1 || !product) {
      return {
        data: {
          barcode: normalizedBarcode,
          found: false,
          name: '',
          brand: '',
          imageUrl: null,
        },
        error: null,
      };
    }

    const name =
      normalizeName(product.product_name_en) ||
      normalizeName(product.product_name) ||
      normalizeName(product.generic_name);
    const brand = normalizeName(product.brands);
    const imageUrl =
      allowedProductImageUrl(product.image_front_url) ||
      allowedProductImageUrl(product.image_url);

    return {
      data: {
        barcode: normalizeBarcode(product.code) || normalizedBarcode,
        found: Boolean(name || imageUrl),
        name,
        brand,
        imageUrl,
      },
      error: null,
    };
  } catch (err) {
    console.error('lookupProductByBarcode error:', err);
    return validationError('Product lookup is unavailable right now.');
  }
}

export async function parseQuickAddVoiceText(transcript) {
  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const text = normalizeName(transcript).slice(0, 500);
  if (!text) return validationError('Tell WhereKeep what to add.');

  if (!process.env.OPENAI_API_KEY) {
    const data = parseQuickAddTextLocally(text);
    if (!data?.itemName) {
      return validationError('Could not find an item name in that voice note.');
    }
    return {
      data: {
        ...data,
        usedAi: false,
      },
      error: null,
    };
  }

  try {
    const result = await runOpenAIQuickAdd({
      content: [
        {
          type: 'input_text',
          text: `Parse this voice note into one inventory item. The user may include quantity, expiration date, barcode, location, storage area, or category. Voice note: "${text}"`,
        },
      ],
    });

    return result?.data
      ? {
          data: {
            ...result.data,
            usedAi: true,
          },
          error: null,
        }
      : result;
  } catch (err) {
    console.error('parseQuickAddVoiceText error:', err);
    const fallback = parseQuickAddTextLocally(text);
    if (fallback?.itemName) {
      return {
        data: {
          ...fallback,
          usedAi: false,
        },
        error: null,
      };
    }
    return validationError('Voice quick add is unavailable right now.');
  }
}
