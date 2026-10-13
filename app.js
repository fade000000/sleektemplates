/* sleektemplates: renders the template list (index.html) and each guide (template.html).
   Templates live in templates.json; guides live in guides/<id>.md */

(() => {
  const $ = (s, r = document) => r.querySelector(s);

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const VOICE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

  /* Channel strings look like "t:welcome" (text) or "v:Discord Members: 0" (voice). */
  function channelRow(raw, i) {
    const [type, ...rest] = raw.split(":");
    const name = rest.join(":");
    const glyph = type === "v" ? VOICE_ICON : '<span class="glyph" aria-hidden="true">#</span>';
    return `<li class="ch" style="--i:${i}">${glyph}<span>${esc(name)}</span></li>`;
  }

  function railHTML(categories) {
    let i = 0;
    return categories
      .map(
        (cat) =>
          `<div class="cat"><p class="cat-name">${esc(cat.name)}</p><ul>${cat.channels
            .map((c) => channelRow(c, i++))
            .join("")}</ul></div>`
      )
      .join("");
  }

  /* Keep only the first `max` channels across categories (for card previews). */
  function limit(categories, max) {
    let left = max;
    const out = [];
    for (const cat of categories) {
      if (left <= 0) break;
      out.push({ name: cat.name, channels: cat.channels.slice(0, left) });
      left -= cat.channels.length;
    }
    return out;
  }

  async function loadTemplates() {
    const res = await fetch("templates.json");
    if (!res.ok) throw new Error("templates.json returned " + res.status);
    return res.json();
  }

  const LOAD_ERROR =
    '<p class="state">Couldn\'t load templates.json. If you opened this file straight from your computer, ' +
    "deploy it to GitHub Pages or run a local server (for example <code>python3 -m http.server</code>).</p>";

  /* ---------------- Home ---------------- */

  async function home() {
    const grid = $("#grid");
    let list;
    try {
      list = await loadTemplates();
    } catch (e) {
      grid.innerHTML = LOAD_ERROR;
      $("#preview-title").textContent = "sleektemplates";
      return;
    }

    // Hero preview uses the first template in the list
    if (list[0]) {
      $("#preview-title").textContent = list[0].name;
      $("#preview-rail").innerHTML = railHTML(list[0].channels);
    }

    const state = { q: "", tag: "All" };
    const tags = ["All", ...new Set(list.flatMap((t) => t.tags || []))];

    const chips = $("#chips");
    chips.innerHTML = tags
      .map((t) => `<li><button class="chip" type="button" data-tag="${esc(t)}" aria-pressed="${t === "All"}">${esc(t)}</button></li>`)
      .join("");

    const card = (t) => `
      <a class="card" href="template.html?t=${encodeURIComponent(t.id)}">
        <div class="peek" aria-hidden="true">${railHTML(limit(t.channels, 5))}</div>
        <div class="card-body">
          <h3>${esc(t.name)}</h3>
          <p>${esc(t.tagline)}</p>
          <ul class="tags">${(t.tags || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="meta"><span>${esc(t.setup)} setup</span><span>${t.bots.length} ${t.bots.length === 1 ? "bot" : "bots"}</span></div>
        </div>
      </a>`;

    function render() {
      const q = state.q.trim().toLowerCase();
      const shown = list.filter((t) => {
        const tagOk = state.tag === "All" || (t.tags || []).includes(state.tag);
        const text = [t.name, t.tagline, ...(t.tags || []), ...(t.bots || [])].join(" ").toLowerCase();
        return tagOk && (!q || text.includes(q));
      });

      $("#count").textContent = `${shown.length} ${shown.length === 1 ? "template" : "templates"}`;

      grid.innerHTML = shown.length
        ? shown.map(card).join("")
        : `<div class="state">Nothing matches that search. Clear it or pick another tag.<br><button class="btn" id="reset" type="button">Clear filters</button></div>`;

      const reset = $("#reset");
      if (reset)
        reset.addEventListener("click", () => {
          state.q = "";
          state.tag = "All";
          $("#search").value = "";
          syncChips();
          render();
        });
    }

    function syncChips() {
      chips.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tag === state.tag)));
    }

    chips.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      state.tag = b.dataset.tag;
      syncChips();
      render();
    });

    $("#search").addEventListener("input", (e) => {
      state.q = e.target.value;
      render();
    });

    render();
  }

  /* ---------------- Guide ---------------- */

  async function guide() {
    const root = $("#guide-root");
    const id = new URLSearchParams(location.search).get("t");

    let list;
    try {
      list = await loadTemplates();
    } catch (e) {
      root.innerHTML = LOAD_ERROR;
      return;
    }

    const t = list.find((x) => x.id === id);
    if (!t) {
      root.innerHTML = `<div class="state">That template doesn't exist (or its link has changed).<br><a class="btn" href="./#templates">Browse all templates</a></div>`;
      return;
    }

    document.title = `${t.name} · sleektemplates`;

    let md;
    try {
      const res = await fetch(`guides/${encodeURIComponent(t.id)}.md`);
      if (!res.ok) throw new Error(res.status);
      md = await res.text();
    } catch (e) {
      root.innerHTML = `<div class="state">This template's guide file (guides/${esc(t.id)}.md) is missing.<br><a class="btn" href="./#templates">Back to templates</a></div>`;
      return;
    }

    // The page header already shows the title, so drop the guide's own H1.
    const body = md.replace(/^\s*#\s+.*\n/, "");

    const facts = [
      ["Setup time", t.setup],
      ["Bots", t.bots.join(", ")],
      t.author ? ["By", t.author] : null,
    ]
      .filter(Boolean)
      .map(([k, v]) => `<li>${esc(k)}: <b>${esc(v)}</b></li>`)
      .join("");

    root.innerHTML = `
      <a class="back" href="./#templates">All templates</a>
      <header class="guide-head">
        <h1>${esc(t.name)}</h1>
        <p class="lede">${esc(t.tagline)}</p>
        <div class="guide-actions">
          <a class="btn primary" href="${esc(t.discordUrl)}" target="_blank" rel="noopener">Use this template</a>
          <button class="btn" id="copy" type="button" aria-live="polite">Copy guide as Markdown</button>
          <a class="btn" href="guides/${esc(t.id)}.md" target="_blank" rel="noopener">View raw .md</a>
        </div>
        <ul class="facts">${facts}</ul>
      </header>
      <div class="guide-layout">
        <article class="prose" id="prose"></article>
        <aside class="toc" aria-label="On this page"><p>On this page</p><ul id="toc"></ul></aside>
      </div>`;

    const prose = $("#prose");
    prose.innerHTML = window.marked.parse(body, { gfm: true });

    // External links open in a new tab
    prose.querySelectorAll("a[href^='http']").forEach((a) => {
      a.target = "_blank";
      a.rel = "noopener";
    });

    // Table of contents from H2s
    const heads = [...prose.querySelectorAll("h2")];
    heads.forEach((h) => (h.id = slug(h.textContent)));
    $("#toc").innerHTML = heads.map((h) => `<li><a href="#${h.id}">${esc(h.textContent)}</a></li>`).join("");

    if ("IntersectionObserver" in window && heads.length) {
      const links = new Map(heads.map((h) => [h.id, $(`#toc a[href="#${h.id}"]`)]));
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              links.forEach((a) => a.classList.remove("active"));
              links.get(en.target.id).classList.add("active");
            }
          });
        },
        { rootMargin: "0px 0px -70% 0px" }
      );
      heads.forEach((h) => io.observe(h));
    }

    // Copy markdown
    const copy = $("#copy");
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(md);
        copy.textContent = "Copied";
      } catch (e) {
        copy.textContent = "Copy failed. Use View raw .md";
      }
      setTimeout(() => (copy.textContent = "Copy guide as Markdown"), 2000);
    });
  }

  const page = document.body.dataset.page;
  if (page === "home") home();
  if (page === "guide") guide();
})();
