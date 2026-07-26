const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1hCz8S0JFTFEESV7IRejWZipyB4isVDh7GKDRPH010dQ/export?format=csv&gid=0";
const FALLBACK_CSV_URL = "/data/auto-reply-sheet1.csv";

const aliasMap = new Map([
  ["0", "Main Menu"],
  ["menu", "Main Menu"],
  ["main menu", "Main Menu"],
  ["home menu", "Main Menu"],
  ["start", "Main Menu"],
  ["help", "Help"],
  ["downloads", "Downloading"],
  ["download", "Downloading"],
  ["downloading", "Downloading"],
  ["bahawalpur contacts", "Address Bahawalpur Contacts"],
  ["bahawalpur contact", "Address Bahawalpur Contacts"],
  ["bahawalpur address", "Address Bahawalpur Contacts"],
  ["islamabad contacts", "Address Islamabad Contact"],
  ["islamabad contact", "Address Islamabad Contact"],
  ["islamabad address", "Address Islamabad Contact"],
  ["timing", "Time Table"],
  ["time", "Time Table"],
  ["time table", "Time Table"],
  ["office timing", "Time Table"],
  ["office time", "Time Table"],
  ["contact", "Contact Details"],
  ["contact details", "Contact Details"],
  ["social", "Social Media"],
  ["social media", "Social Media"],
  ["other", "Chat with Adeeb"],
  ["hire me", "Chat with Adeeb"],
  ["ceo", "CEO"],
  ["chat with adeeb", "Chat with Adeeb"],
  ["exit", "Exit"],
]);

let rows = [];
let rowsByNormalizedKey = new Map();
let lastLoadedAt = 0;
const LIVE_SHEET_REFRESH_MS = 15_000;

export async function getAnswer(userMessage, name = "Visitor") {
  await loadRows();

  const message = String(userMessage || "").trim();
  const visitorName = String(name || "Visitor").trim();
  let row = null;

  if (!message) {
    row = getByKey("Main Menu") || rows[0];
  } else {
    row = findBestRow(message);
  }

  // Fallback if still no row
  if (!row) {
    return null;
  }

  const answerText = String(row.clean_answer || row.answer || "")
    .replaceAll("{name}", visitorName);

  const options = extractButtonsFromAnswer(answerText);
  
  // Remove quotes from the final answer text so they don't show up in the chat bubble
  const finalAnswer = answerText.replace(/["""'']/g, '');

  return {
    answer: finalAnswer,
    matched_key: row.key,
    options: options
  };
}

async function loadRows() {
  // Keep a very short cache so live Google Sheet edits appear almost immediately.
  if (rows.length > 0 && (Date.now() - lastLoadedAt < LIVE_SHEET_REFRESH_MS)) {
    return;
  }

  // Try Google Sheet first
  try {
    const text = await downloadCsvText(GOOGLE_SHEET_CSV_URL);
    const parsedRows = parseCsvText(text);
    if (parsedRows.length) {
      rows = parsedRows;
      rowsByNormalizedKey = new Map(rows.map((row) => [normalize(row.key), row]));
      lastLoadedAt = Date.now();
      console.log("[Chatbot] Loaded", parsedRows.length, "rows from Google Sheet");
      return;
    }
  } catch (error) {
    console.warn("[Chatbot] Google Sheet fetch failed, trying local fallback:", error.message);
  }

  // Fallback to local CSV
  try {
    const text = await downloadCsvText(FALLBACK_CSV_URL);
    const parsedRows = parseCsvText(text);
    if (parsedRows.length) {
      rows = parsedRows;
      rowsByNormalizedKey = new Map(rows.map((row) => [normalize(row.key), row]));
      lastLoadedAt = Date.now();
      console.log("[Chatbot] Loaded", parsedRows.length, "rows from local CSV fallback");
      return;
    }
  } catch (error) {
    console.error("[Chatbot] Both Google Sheet and local CSV failed:", error);
    throw error;
  }
}


async function downloadCsvText(url) {
  const response = await fetch(addCacheBuster(url), {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`CSV request failed: ${response.status}`);

  const buffer = await response.arrayBuffer();
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer).trim();
  const head = text.slice(0, 300).toLowerCase();

  if (head.includes("<html") || head.includes("<!doctype html")) {
    throw new Error("CSV URL returned HTML. Make Google Sheet public or publish Sheet1 to web.");
  }

  return text;
}

function parseCsvText(text) {
  const csvRows = parseCsv(text);
  const parsedRows = [];

  csvRows.forEach((row) => {
    if (!row || row.length < 2) return;

    const key = fixTextEncoding(String(row[0] || "")).replace("\ufeff", "").trim();
    const answer = fixTextEncoding(String(row[1] || "")).trim();
    if (!key || !answer) return;

    const keyLower = key.toLowerCase();
    const answerLower = answer.toLowerCase();
    if (["keyword", "question", "query", "intent"].includes(keyLower) && ["answer", "response", "reply"].includes(answerLower)) return;

    parsedRows.push({
      key,
      answer,
      clean_answer: cleanAnswer(answer),
      search_text: buildSearchText(key, answer),
    });
  });

  return parsedRows;
}

function parseCsv(text) {
  const output = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => String(cell).trim() !== "")) output.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) output.push(row);

  return output;
}

function findBestRow(message) {
  const msg = normalize(message);

  const aliasTarget = aliasMap.get(msg);
  if (aliasTarget) {
    const aliasRow = getByKey(aliasTarget);
    if (aliasRow) return aliasRow;
  }

  const exact = rowsByNormalizedKey.get(msg);
  if (exact) return exact;

  for (const [alias, target] of aliasMap.entries()) {
    if (msg.includes(alias) && alias.length >= 4) {
      const row = getByKey(target);
      if (row) return row;
    }
  }

  return null;
}

function getByKey(key) {
  return rowsByNormalizedKey.get(normalize(key)) || null;
}

function extractButtonsFromAnswer(answerText) {
  const text = String(answerText || "");
  const options = [];
  const seen = new Set();

  const addOption = (raw) => {
    let label = fixTextEncoding(String(raw || ""))
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, "")
      .replace(/[“”‘’]/g, "")
      .replace(/^[\s:;,.\-–—|]+|[\s:;,.\-–—|]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!label) return;
    if (label.length > 80) return;
    if (/^\d{2,}$/.test(label)) return;

    const normalized = normalize(label);
    if (!normalized || seen.has(normalized)) return;

    seen.add(normalized);
    options.push({ label, value: resolveButtonValue(label) });
  };

  const patterns = [
    /"([^"\n]{1,80})"/g,
    /''([^'\n]{1,80})''/g,
    /“([^”\n]{1,80})”/g,
    /‘([^’\n]{1,80})’/g,
    /“([^”\n]{1,80})”/g,
    /‘([^’\n]{1,80})’/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) addOption(match[1]);
  });

  text.split(/\r?\n/).forEach((line) => {
    const cleaned = line.replace(/[📱💻🌐💰📲📘▶️🛠️❓💬📥🎨🗺️🤖📊🧑🏢📞🎓📚🖌️🎬📐📝🏗️🌍📄📽️📖✨⬇️🤔]/g, "").trim();
    // Live-sheet rows are sometimes saved with only the opening quote marker,
    // for example: "''Graphic Designing". They are still intended as buttons.
    const openingOnly = cleaned.match(/^(?:''|"|“|‘)\s*(.{1,80}?)(?:''|"|”|’)?$/u);
    if (openingOnly) addOption(openingOnly[1]);

    const dangling = cleaned.match(/^(.{2,80}?)(?:''|"|”|’)$/u);
    if (dangling) addOption(dangling[1]);

    if (/^chat with adeeb$/i.test(cleaned)) addOption("Chat with Adeeb");
  });

  let regularOptions = [];
  let mainMenuOption = null;
  let exitOption = null;

  options.slice(0, 14).forEach(opt => {
    const lbl = opt.label.toLowerCase();
    if (lbl === 'main menu') {
      mainMenuOption = opt;
    } else if (lbl === 'exit') {
      exitOption = opt;
    } else {
      regularOptions.push(opt);
    }
  });

  const finalOptions = [...regularOptions];
  if (mainMenuOption) finalOptions.push(mainMenuOption);
  if (exitOption) finalOptions.push(exitOption);

  return finalOptions;
}

function resolveButtonValue(label) {
  const normalized = normalize(label);
  const alias = aliasMap.get(normalized);
  if (alias) return alias;

  const exactRow = rowsByNormalizedKey.get(normalized);
  if (exactRow) return exactRow.key.trim();

  if (isUrl(label)) return label;
  return label;
}

function tokenSetScore(query, candidate) {
  const qTokens = uniqueTokens(query);
  const cTokens = uniqueTokens(candidate);
  if (!qTokens.length || !cTokens.length) return 0;

  const candidateText = cTokens.join(" ");
  const queryText = qTokens.join(" ");

  if (candidateText === queryText) return 100;
  if (candidateText.includes(queryText)) return 96;

  let intersection = 0;
  qTokens.forEach((token) => {
    if (cTokens.includes(token)) intersection += 1;
  });

  const precision = intersection / qTokens.length;
  const recall = intersection / cTokens.length;
  const dice = (2 * intersection) / (qTokens.length + cTokens.length);
  let score = Math.max(precision * 100, dice * 100, recall * 100);

  if (score < 55) {
    let partialHits = 0;
    qTokens.forEach((q) => {
      if (q.length >= 4 && cTokens.some((c) => c.includes(q) || q.includes(c))) partialHits += 1;
    });
    score = Math.max(score, (partialHits / qTokens.length) * 78);
  }

  return Math.round(score);
}

function uniqueTokens(text) {
  return [...new Set(normalize(text).split(" ").filter(Boolean))];
}

function fixTextEncoding(value) {
  let text = String(value || "");
  if (!/[ðÃÂâ]/.test(text)) return text;

  try {
    const cp1252 = {
      "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85,
      "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8A,
      "‹": 0x8B, "Œ": 0x8C, "Ž": 0x8E, "‘": 0x91, "’": 0x92,
      "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
      "˜": 0x98, "™": 0x99, "š": 0x9A, "›": 0x9B, "œ": 0x9C,
      "ž": 0x9E, "Ÿ": 0x9F,
    };

    const bytes = [];
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (cp1252[ch] !== undefined) bytes.push(cp1252[ch]);
      else if (code <= 255) bytes.push(code);
      else {
        bytes.length = 0;
        break;
      }
    }

    if (bytes.length) {
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
      if (decoded && (decoded.match(/\ufffd/g) || []).length <= (text.match(/\ufffd/g) || []).length) text = decoded;
    }
  } catch (error) {
    // Keep original if repair fails.
  }

  return text.replace(/\ufffd/g, "");
}

function normalize(text) {
  return fixTextEncoding(String(text || ""))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAnswer(answer) {
  return fixTextEncoding(String(answer || ""))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replaceAll("```", "")
    .replaceAll("`", "")
    .replaceAll("*", "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSearchText(key, answer) {
  const clean = cleanAnswer(answer);
  return normalize(`${key} ${clean.slice(0, 1500)}`);
}

export function isUrl(value) {
  return /^(https?:\/\/|www\.)/i.test(String(value || "").trim());
}

export function openExternalUrl(value) {
  const url = String(value || "").trim();
  if (!url) return;
  const href = url.startsWith("www.") ? `https://${url}` : url;
  window.open(href, "_blank", "noopener,noreferrer");
}

function addCacheBuster(url) {
  const separator = String(url).includes("?") ? "&" : "?";
  return `${url}${separator}_ts=${Date.now()}`;
}
