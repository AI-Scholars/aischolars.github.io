const SITE_BASE = window.AI_SCHOLAR_BASE || (location.pathname.startsWith("/aischolars.github.io") ? "/aischolars.github.io" : "");
const DATA_ROOT = `${SITE_BASE}/data`;
const DEFAULT_SORT = "hIndex";

const app = document.querySelector("#app");

const state = {
  scholars: [],
  stats: null,
  detailCache: new Map(),
  search: "",
  sortBy: DEFAULT_SORT,
  proposalFilter: "all",
  ideaFilter: "all",
  showAllProposals: false,
  showAllIdeas: false,
  expandedProposals: new Set(),
};

const dimensionTheme = {
  "Future Work": ["#e7f0f2", "#245b73", "#bdd1d7"],
  "Assumption Challenge": ["#f5ead2", "#966722", "#dcc38b"],
  "Method Transfer": ["#e5f2ec", "#26725f", "#b5d9cc"],
  "Scaling & Dual": ["#f0e6ef", "#6b4167", "#d8bdd6"],
  Analogy: ["#e6f1ed", "#2f715f", "#bfd8d0"],
  Adversarial: ["#f5e3df", "#9b3f3f", "#e0b7af"],
  Fusion: ["#f4e6d6", "#955f28", "#dfc09c"],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function initials(name) {
  return String(name || "AI")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function colorForName(name) {
  const colors = ["#245b73", "#26725f", "#6b4167", "#966722", "#9b3f3f", "#405f8f"];
  const code = Array.from(String(name || "")).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[code % colors.length];
}

function dimensionStyle(dimension) {
  const [bg, text, border] = dimensionTheme[dimension] || ["#f3f0e8", "#5f5a52", "#ded5c4"];
  return `--dim-bg:${bg};--dim-text:${text};--dim-border:${border}`;
}

function scholarBySlug(slug) {
  return state.scholars.find((scholar) => scholar.slug === slug);
}

function sitePath(path) {
  if (path === "/") return `${SITE_BASE}/` || "/";
  return `${SITE_BASE}${path}`;
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

async function init() {
  try {
    const [scholars, stats] = await Promise.all([
      loadJson(`${DATA_ROOT}/scholars-index.json`),
      loadJson(`${DATA_ROOT}/stats.json`),
    ]);
    state.scholars = scholars;
    state.stats = stats;
    bindGlobalNavigation();
    render();
  } catch (error) {
    app.innerHTML = `
      <section class="empty-state">
        <div>
          <h1>Data failed to load</h1>
          <p>${escapeHtml(error.message)}</p>
        </div>
      </section>
    `;
  }
}

function bindGlobalNavigation() {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.setAttribute("href", sitePath(link.dataset.route));
  });

  document.querySelectorAll("[data-static-path]").forEach((link) => {
    link.setAttribute("href", sitePath(link.dataset.staticPath));
  });

  document.body.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    const route = link.dataset.route;
    if (!route) return;
    event.preventDefault();
    navigate(route);
  });

  window.addEventListener("popstate", render);
}

function navigate(path) {
  window.history.pushState({}, "", sitePath(path));
  state.proposalFilter = "all";
  state.ideaFilter = "all";
  state.showAllProposals = false;
  state.showAllIdeas = false;
  state.expandedProposals.clear();
  render();
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentRoute() {
  let path = window.location.pathname;
  if (SITE_BASE && path.startsWith(SITE_BASE)) {
    path = path.slice(SITE_BASE.length) || "/";
  }
  path = path.replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/";
  if (path === "/" || path === "/404.html") return { name: "home" };
  if (path === "/scholars") return { name: "scholars" };
  const match = path.match(/^\/scholar\/([^/]+)$/);
  if (match) return { name: "scholar", slug: decodeURIComponent(match[1]) };
  return { name: "not-found" };
}

function render() {
  const route = currentRoute();
  if (route.name === "home") renderHome();
  if (route.name === "scholars") renderScholars();
  if (route.name === "scholar") renderScholar(route.slug);
  if (route.name === "not-found") renderNotFound();
}

function renderHome() {
  const featured = state.scholars.slice(0, 8);
  app.innerHTML = `
    <section class="hero">
      <div>
        <span class="eyebrow">Research Preview</span>
        <h1>AI Scholar</h1>
        <p class="lead">
          Learning the scientific taste of elite researchers to predict future discovery trajectories.
        </p>
        <div class="hero-actions">
          <a class="btn primary" href="${sitePath("/scholars")}" data-link data-route="/scholars">Explore scholars</a>
          <a class="btn" href="#method">View method</a>
        </div>
      </div>
      <aside class="signal-panel" aria-label="Scholar dataset map">
        <div class="signal-header">
          <span>Public dataset</span>
          <span>${formatNumber(state.stats.totalProposals)} predictions</span>
        </div>
        ${renderTrajectoryMap(state.scholars.slice(0, 36))}
        <div class="metric-grid">
          ${metric(state.stats.totalScholars, "scholars")}
          ${metric(state.stats.totalIdeas, "seed ideas")}
          ${metric(state.stats.totalProposals, "predictions")}
        </div>
      </aside>
    </section>

    <section class="section">
      <div class="section-heading">
        <div>
          <h2>Featured Scholars</h2>
          <p>Browse generated future research directions for leading scientists.</p>
        </div>
        <a class="ghost-btn" href="${sitePath("/scholars")}" data-link data-route="/scholars">View all ${state.stats.totalScholars}</a>
      </div>
      <div class="grid scholar-grid">
        ${featured.map(renderScholarCard).join("")}
      </div>
    </section>

    <section class="section" id="method">
      <div class="section-heading">
        <div>
          <h2>How It Works</h2>
          <p>A five-stage pipeline turns publication history into scholar-specific predictions.</p>
        </div>
      </div>
      <div class="grid step-grid">
        ${[
          ["01", "Collect", "Gather publication histories and citation metadata."],
          ["02", "Extract", "Convert papers into structured research signals."],
          ["03", "Profile", "Learn recurring methods, assumptions, and intellectual taste."],
          ["04", "Generate", "Create seed ideas across multiple creative dimensions."],
          ["05", "Predict", "Expand selected seeds into concrete research proposals."],
        ].map(renderStep).join("")}
      </div>
    </section>
  `;
}

function metric(value, label) {
  return `<div class="metric"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function renderTrajectoryMap(items) {
  const maxH = Math.max(...items.map((item) => item.hIndex || 0), 1);
  const maxP = Math.max(...items.map((item) => item.proposalCount || 0), 1);
  const dots = items.map((item) => {
    const x = 8 + ((item.proposalCount || 0) / maxP) * 82;
    const y = 14 + ((item.hIndex || 0) / maxH) * 74;
    const size = 10 + Math.min(18, Math.sqrt(item.citationCount || 0) / 58);
    return `
      <span
        class="plot-dot"
        title="${escapeHtml(item.name)}"
        style="left:${x.toFixed(2)}%;bottom:${y.toFixed(2)}%;--dot-size:${size.toFixed(1)}px;--dot-color:${colorForName(item.name)}"
      ></span>
    `;
  }).join("");

  return `
    <div class="trajectory-map">
      <span class="axis-label axis-y">h-index</span>
      <span class="axis-label axis-x">prediction count</span>
      ${dots}
    </div>
  `;
}

function renderStep([num, title, text]) {
  return `
    <article class="step-card">
      <span class="step-num">${num}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
}

function renderScholarCard(scholar) {
  const affiliation = scholar.affiliations?.[0] || "Research Institution";
  return `
    <a class="card" href="${sitePath(`/scholar/${encodeURIComponent(scholar.slug)}`)}" data-link data-route="/scholar/${escapeHtml(scholar.slug)}">
      <div class="card-row">
        <span class="avatar" style="background:${colorForName(scholar.name)}">${initials(scholar.name)}</span>
        <div style="min-width:0">
          <div class="card-title">${escapeHtml(scholar.name)}</div>
          <div class="card-subtitle">${escapeHtml(affiliation)}</div>
        </div>
      </div>
      <div class="meta-row">
        <span class="pill"><strong>${scholar.proposalCount}</strong> predictions</span>
        <span class="pill"><strong>${scholar.hIndex}</strong> h-index</span>
        <span class="pill"><strong>${formatNumber(scholar.citationCount)}</strong> citations</span>
      </div>
    </a>
  `;
}

function renderScholars() {
  const filtered = filteredScholars();
  app.innerHTML = `
    <section class="section">
      <div class="section-heading">
        <div>
          <span class="eyebrow">Scholar Explorer</span>
          <h1>All Scholars</h1>
          <p class="lead">Search ${state.scholars.length} public profiles and open generated predictions on demand.</p>
        </div>
      </div>
      <div class="toolbar">
        <label class="search-box">
          <span class="sr-only">Search scholars</span>
          <input id="search" type="search" value="${escapeHtml(state.search)}" placeholder="Search by name or affiliation">
        </label>
        <div class="sort-group" aria-label="Sort scholars">
          ${sortButton("hIndex", "h-index")}
          ${sortButton("proposalCount", "predictions")}
          ${sortButton("citationCount", "citations")}
          ${sortButton("name", "name")}
        </div>
      </div>
      <p class="card-subtitle" style="margin-bottom:16px">${filtered.length} scholars shown</p>
      <div class="grid scholar-grid">
        ${filtered.map(renderScholarCard).join("") || empty("No scholars match this search.")}
      </div>
    </section>
  `;

  document.querySelector("#search").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderScholars();
    document.querySelector("#search")?.focus();
  });

  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sortBy = button.dataset.sort;
      renderScholars();
    });
  });
}

function filteredScholars() {
  const query = state.search.trim().toLowerCase();
  return state.scholars
    .filter((scholar) => {
      if (!query) return true;
      return (
        scholar.name.toLowerCase().includes(query) ||
        (scholar.affiliations || []).some((affiliation) => affiliation.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (state.sortBy === "name") return a.name.localeCompare(b.name);
      return Number(b[state.sortBy] || 0) - Number(a[state.sortBy] || 0);
    });
}

function sortButton(key, label) {
  const active = state.sortBy === key ? " active" : "";
  return `<button class="sort-btn${active}" type="button" data-sort="${key}">${escapeHtml(label)}</button>`;
}

async function renderScholar(slug) {
  const scholar = scholarBySlug(slug);
  if (!scholar) {
    renderNotFound();
    return;
  }

  const cached = state.detailCache.get(slug);
  app.innerHTML = renderScholarShell(scholar, cached);
  if (cached) {
    bindDetailControls(cached);
    return;
  }

  try {
    const detail = await loadJson(`${DATA_ROOT}/scholars/${encodeURIComponent(slug)}.json`);
    state.detailCache.set(slug, detail);
    app.innerHTML = renderScholarShell(scholar, detail);
    bindDetailControls(detail);
  } catch (error) {
    app.querySelector("#detail-content").innerHTML = empty(`Could not load profile data: ${error.message}`);
  }
}

function renderScholarShell(indexRecord, detail) {
  const scholar = detail || indexRecord;
  const affiliation = scholar.affiliations?.[0] || "Research Institution";
  const dimensions = countBy((detail?.proposals || []), "dimension");
  return `
    <section class="profile-hero">
      <span class="avatar large" style="background:${colorForName(scholar.name)}">${initials(scholar.name)}</span>
      <div>
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="${sitePath("/")}" data-link data-route="/">AI Scholar</a><span>/</span>
          <a href="${sitePath("/scholars")}" data-link data-route="/scholars">Scholars</a><span>/</span>
          <span>${escapeHtml(scholar.name)}</span>
        </nav>
        <h1>${escapeHtml(scholar.name)}</h1>
        <p class="profile-meta">${escapeHtml(affiliation)}</p>
        <div class="meta-row">
          <span class="pill"><strong>${scholar.hIndex}</strong> h-index</span>
          <span class="pill"><strong>${formatNumber(scholar.citationCount)}</strong> citations</span>
          <span class="pill"><strong>${scholar.paperCount}</strong> papers</span>
          <span class="pill"><strong>${scholar.proposalCount}</strong> predictions</span>
          <span class="pill"><strong>${scholar.ideaCount}</strong> ideas</span>
        </div>
        <div class="dimension-strip">
          ${Object.entries(dimensions).map(([dimension, count]) => `
            <span class="chip dimension" style="${dimensionStyle(dimension)}">${escapeHtml(dimension)} ${count}</span>
          `).join("")}
        </div>
      </div>
    </section>
    <div id="detail-content">
      ${detail ? renderDetailSections(detail) : `
        <section class="loading-screen" aria-live="polite">
          <div class="loading-mark">${initials(scholar.name)}</div>
          <p>Loading ${escapeHtml(scholar.name)} profile...</p>
        </section>
      `}
    </div>
  `;
}

function renderDetailSections(scholar) {
  return `
    <section class="section">
      <div class="section-heading">
        <div>
          <h2>Predicted Research Directions</h2>
          <p>${scholar.proposals.length} generated proposals based on this scholar's publication history.</p>
        </div>
      </div>
      ${renderProposalSection(scholar.proposals)}
    </section>
    ${scholar.ideas?.length ? `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Seed Research Ideas</h2>
            <p>${scholar.ideas.length} raw directions selected before proposal expansion.</p>
          </div>
        </div>
        ${renderIdeaSection(scholar.ideas)}
      </section>
    ` : ""}
    ${scholar.papers?.length ? `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Notable Publications</h2>
            <p>Top papers by citation count.</p>
          </div>
        </div>
        <div class="paper-list">
          ${scholar.papers.slice(0, 18).map(renderPaper).join("")}
        </div>
      </section>
    ` : ""}
  `;
}

function renderProposalSection(proposals) {
  const dimensions = countBy(proposals, "dimension");
  const filtered = state.proposalFilter === "all"
    ? proposals
    : proposals.filter((proposal) => proposal.dimension === state.proposalFilter);
  const visible = state.showAllProposals ? filtered : filtered.slice(0, 8);
  return `
    <div class="proposal-controls">
      <div class="tabs">
        ${tab("proposal", "all", `All (${proposals.length})`, state.proposalFilter)}
        ${Object.entries(dimensions).map(([dimension, count]) => tab("proposal", dimension, `${dimension} (${count})`, state.proposalFilter)).join("")}
      </div>
    </div>
    <div class="proposal-list">
      ${visible.map(renderProposal).join("") || empty("No proposals in this dimension.")}
    </div>
    ${!state.showAllProposals && filtered.length > visible.length ? `
      <div class="hero-actions">
        <button class="ghost-btn" type="button" data-show-proposals>Show all ${filtered.length} predictions</button>
      </div>
    ` : ""}
  `;
}

function renderProposal(proposal, index) {
  const proposalKey = `${proposal.id}::${index}`;
  const isOpen = state.expandedProposals.has(proposalKey);
  return `
    <article class="proposal-card${isOpen ? " open" : ""}">
      <button class="proposal-toggle" type="button" data-proposal="${escapeHtml(proposalKey)}">
        <span class="index-num">${String(index + 1).padStart(2, "0")}</span>
        <span>
          <span class="proposal-title">${escapeHtml(proposal.title)}</span>
          <p class="proposal-summary clamp">${escapeHtml(proposal.motivation)}</p>
          <span class="chip dimension" style="${dimensionStyle(proposal.dimension)}">${escapeHtml(proposal.dimension)}</span>
        </span>
        <span class="chevron">⌄</span>
      </button>
      <div class="proposal-body">
        ${detailBlock("Hypothesis", proposal.hypothesis)}
        ${detailBlock("Method", proposal.method)}
        ${detailBlock("Contribution", proposal.contribution)}
        ${detailBlock("Novelty", proposal.novelty)}
      </div>
    </article>
  `;
}

function detailBlock(label, text) {
  if (!text) return "";
  return `<div class="detail-block"><h4>${escapeHtml(label)}</h4><p>${escapeHtml(text)}</p></div>`;
}

function renderIdeaSection(ideas) {
  const dimensions = countBy(ideas, "dimension");
  const filtered = state.ideaFilter === "all"
    ? ideas
    : ideas.filter((idea) => idea.dimension === state.ideaFilter);
  const visible = state.showAllIdeas ? filtered : filtered.slice(0, 12);
  return `
    <div class="proposal-controls">
      <div class="tabs">
        ${tab("idea", "all", `All (${ideas.length})`, state.ideaFilter)}
        ${Object.entries(dimensions).map(([dimension, count]) => tab("idea", dimension, `${dimension} (${count})`, state.ideaFilter)).join("")}
      </div>
    </div>
    <div class="grid idea-grid">
      ${visible.map(renderIdea).join("") || empty("No ideas in this dimension.")}
    </div>
    ${!state.showAllIdeas && filtered.length > visible.length ? `
      <div class="hero-actions">
        <button class="ghost-btn" type="button" data-show-ideas>Show all ${filtered.length} ideas</button>
      </div>
    ` : ""}
  `;
}

function renderIdea(idea) {
  return `
    <article class="idea-card">
      <h3>${escapeHtml(idea.title)}</h3>
      <p class="clamp">${escapeHtml(idea.description)}</p>
      <div class="meta-row">
        <span class="chip dimension" style="${dimensionStyle(idea.dimension)}">${escapeHtml(idea.dimension)}</span>
        ${idea.sourceYear ? `<span class="pill">${idea.sourceYear}</span>` : ""}
      </div>
    </article>
  `;
}

function renderPaper(paper, index) {
  const meta = [paper.year, paper.venue].filter(Boolean).join(" · ");
  return `
    <article class="paper-row">
      <span class="index-num">${String(index + 1).padStart(2, "0")}</span>
      <div style="min-width:0">
        <div class="paper-title">${escapeHtml(paper.title)}</div>
        <div class="paper-meta">${escapeHtml(meta)}</div>
      </div>
      <span class="pill"><strong>${formatNumber(paper.citations)}</strong> citations</span>
    </article>
  `;
}

function tab(kind, value, label, activeValue) {
  const active = value === activeValue ? " active" : "";
  return `<button class="tab${active}" type="button" data-${kind}-filter="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

function bindDetailControls(detail) {
  document.querySelectorAll("[data-proposal-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.proposalFilter = button.dataset.proposalFilter;
      state.showAllProposals = false;
      app.innerHTML = renderScholarShell(detail, detail);
      bindDetailControls(detail);
    });
  });

  document.querySelectorAll("[data-idea-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ideaFilter = button.dataset.ideaFilter;
      state.showAllIdeas = false;
      app.innerHTML = renderScholarShell(detail, detail);
      bindDetailControls(detail);
    });
  });

  document.querySelectorAll("[data-proposal]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.proposal;
      if (state.expandedProposals.has(id)) state.expandedProposals.delete(id);
      else state.expandedProposals.add(id);
      app.innerHTML = renderScholarShell(detail, detail);
      bindDetailControls(detail);
    });
  });

  document.querySelector("[data-show-proposals]")?.addEventListener("click", () => {
    state.showAllProposals = true;
    app.innerHTML = renderScholarShell(detail, detail);
    bindDetailControls(detail);
  });

  document.querySelector("[data-show-ideas]")?.addEventListener("click", () => {
    state.showAllIdeas = true;
    app.innerHTML = renderScholarShell(detail, detail);
    bindDetailControls(detail);
  });
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "Research Direction";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function renderNotFound() {
  app.innerHTML = `
    <section class="empty-state">
      <div>
        <h1>Page not found</h1>
        <p>This route is not part of the AI Scholar public site.</p>
        <div class="hero-actions" style="justify-content:center">
          <a class="btn primary" href="${sitePath("/")}" data-link data-route="/">Go home</a>
          <a class="btn" href="${sitePath("/scholars")}" data-link data-route="/scholars">Browse scholars</a>
        </div>
      </div>
    </section>
  `;
}

function empty(message) {
  return `<div class="empty-state"><p>${escapeHtml(message)}</p></div>`;
}

init();
