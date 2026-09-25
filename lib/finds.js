const OBVIOUS = {
  surprising: { label: "Nobody saw this coming", cls: "fear" },
  semi: { label: "Half-expected", cls: "cur" },
  known: { label: "Everyone knew this", cls: "trust" },
};

const LANE_TAGS = {
  Receipts: "rc",
  Clips: "cl",
  Build: "bd",
  Platform: "off",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

// Anything reaching here came from a web page by way of the model, so a
// javascript: or data: href is a real possibility, not a hypothetical one.
export function safeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function text(value, maxLength) {
  const cleaned = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) return cleaned;

  // Cut on a word boundary so a clipped sentence doesn't end mid-word.
  const clipped = cleaned.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");
  const body = lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${body.replace(/[,;:.\s]+$/, "")}…`;
}

export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""));
}

export function sanitizeFind(raw, fallbackDate) {
  if (!raw || typeof raw !== "object") return null;

  const headline = text(raw.headline, 140);
  const why = text(raw.why, 600);
  if (!headline || !why) return null;

  const sources = (Array.isArray(raw.sources) ? raw.sources : [])
    .map((source) => {
      const url = safeUrl(source?.url);
      if (!url) return null;
      return { title: text(source?.title, 90) || new URL(url).hostname, url };
    })
    .filter(Boolean)
    .slice(0, 4);

  if (!sources.length) return null;

  const trust = Number(raw.trust);
  const discovered = isIsoDate(raw.discovered) ? raw.discovered : fallbackDate;

  return {
    id: slugify(raw.id) || slugify(headline),
    discovered,
    headline,
    platform: text(raw.platform, 40) || "Shorts",
    lane: Object.hasOwn(LANE_TAGS, raw.lane) ? raw.lane : "Platform",
    stat: text(raw.stat, 160),
    statContext: text(raw.statContext, 220),
    obvious: Object.hasOwn(OBVIOUS, raw.obvious) ? raw.obvious : "semi",
    why,
    move: text(raw.move, 400),
    sources,
    trust: trust >= 1 && trust <= 3 ? Math.round(trust) : 1,
  };
}

export function formatDate(iso) {
  const [year, month, day] = String(iso).split("-").map(Number);
  if (!year || !month || !day) return String(iso);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function renderTrust(level) {
  const dots = [1, 2, 3]
    .map((n) => `<i${n <= level ? ' class="on"' : ""}></i>`)
    .join("");
  return `<span class="trust" aria-label="Trust: ${level} of 3">${dots}</span>`;
}

function renderFind(find) {
  const obvious = OBVIOUS[find.obvious];
  const laneTag = LANE_TAGS[find.lane];

  const sources = find.sources
    .map(
      (source) =>
        `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(source.title)}</a>`
    )
    .join(" · ");

  const stat = find.stat
    ? `<div class="find-stat"><b>${escapeHtml(find.stat)}</b>${
        find.statContext ? `<span>${escapeHtml(find.statContext)}</span>` : ""
      }</div>`
    : "";

  const move = find.move
    ? `<p class="find-line"><b>Your move</b> ${escapeHtml(find.move)}</p>`
    : "";

  return `<article class="find" data-found="${escapeHtml(find.discovered)}">
      <header class="find-head">
        <span class="find-when" data-when="${escapeHtml(find.discovered)}"><time datetime="${escapeHtml(find.discovered)}">${escapeHtml(formatDate(find.discovered))}</time></span>
        <span class="tag ${laneTag}">${escapeHtml(find.platform)}</span>
        <span class="pill ${obvious.cls}">${escapeHtml(obvious.label)}</span>
      </header>
      <h3 class="find-title">${escapeHtml(find.headline)}</h3>
      ${stat}
      <p class="find-line"><b>Why it happened</b> ${escapeHtml(find.why)}</p>
      ${move}
      <footer class="find-foot">${renderTrust(find.trust)}<span class="find-src">${sources}</span></footer>
    </article>`;
}

export function renderFindsSection(finds) {
  const sorted = [...finds].sort((a, b) =>
    a.discovered === b.discovered ? 0 : a.discovered < b.discovered ? 1 : -1
  );

  const body = sorted.length
    ? `<div class="finds">${sorted.map(renderFind).join("")}</div>`
    : `<p class="muted">Nothing found yet. The next scheduled run will fill this in.</p>`;

  return `<section class="ch" id="finds">
  <div class="wrap">
    <h2><span class="live-badge">Live</span>Fresh finds</h2>
    <p>This part of the guide writes itself. A scheduled job reads what changed across Shorts, Reels, TikTok, X and LinkedIn, then files each thing below with the number behind it, whether anyone saw it coming, and why it happened.</p>
    <div class="callout amber">
      <p><b>Read these differently from the rest of the guide.</b> Everything above was written and checked by hand. Everything below was found by an automated research pass, so the source link is the receipt. Check it before you put a number on screen.</p>
    </div>
  </div>
  <div class="wide">
    ${body}
  </div>
</section>`;
}
