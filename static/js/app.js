/* =============================================
   BigQuery Release Notes — app.js
   ============================================= */

(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────
  const refreshBtn    = document.getElementById("refresh-btn");
  const refreshIcon   = document.getElementById("refresh-icon");
  const spinner       = document.getElementById("spinner");
  const refreshLabel  = document.getElementById("refresh-label");

  const feedMeta      = document.getElementById("feed-meta");
  const entryCount    = document.getElementById("entry-count");
  const lastUpdated   = document.getElementById("last-updated");

  const filterBar     = document.getElementById("filter-bar");
  const searchInput   = document.getElementById("search-input");
  const categoryPills = document.getElementById("category-pills");

  const emptyState    = document.getElementById("empty-state");
  const errorState    = document.getElementById("error-state");
  const errorMsg      = document.getElementById("error-msg");
  const entriesGrid   = document.getElementById("entries-grid");

  const tweetModal    = document.getElementById("tweet-modal");
  const modalClose    = document.getElementById("modal-close");
  const modalCancel   = document.getElementById("modal-cancel");
  const tweetSubmit   = document.getElementById("tweet-submit");
  const tweetTextarea = document.getElementById("tweet-textarea");
  const charCount     = document.getElementById("char-count");
  const charCounter   = document.querySelector(".char-counter");
  const modalEntryDate = document.getElementById("modal-entry-date");

  // ── State ─────────────────────────────────────
  let allEntries  = [];
  let activeFilter = "All";
  let allCategories = [];
  let currentTweetEntry = null;

  // ── Utility ───────────────────────────────────
  function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function stripHTML(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  function timeAgo(isoString) {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now - d;
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    } catch {
      return "";
    }
  }

  function getBadgeClass(category) {
    const lower = category.toLowerCase();
    if (lower.includes("feature"))      return "badge-feature";
    if (lower.includes("change"))       return "badge-change";
    if (lower.includes("fix"))          return "badge-fix";
    if (lower.includes("deprecat"))     return "badge-deprecation";
    if (lower.includes("breaking"))     return "badge-breaking";
    if (lower.includes("announc"))      return "badge-announcement";
    return "badge-default";
  }

  function getPillClass(category) {
    const lower = category.toLowerCase();
    if (lower.includes("feature"))  return "pill-feature";
    if (lower.includes("change"))   return "pill-change";
    if (lower.includes("fix"))      return "pill-fix";
    if (lower.includes("deprecat")) return "pill-deprecation";
    if (lower.includes("announc"))  return "pill-announcement";
    return "";
  }

  // ── Refresh / fetch ───────────────────────────
  function setLoading(loading) {
    refreshBtn.disabled = loading;
    refreshIcon.classList.toggle("hidden", loading);
    spinner.classList.toggle("hidden", !loading);
    refreshLabel.textContent = loading ? "Loading…" : "Refresh";
  }

  async function fetchFeed() {
    setLoading(true);
    hide(emptyState);
    hide(errorState);

    try {
      const res = await fetch("/api/feed");
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Unknown error");

      allEntries = data.entries;
      processCategories();
      renderFeedMeta();
      renderFilterPills();
      renderEntries();

      show(filterBar);
      show(feedMeta);

    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Categories & filtering ────────────────────
  function processCategories() {
    const catSet = new Set();
    allEntries.forEach(e => e.categories.forEach(c => catSet.add(c)));
    allCategories = Array.from(catSet);
  }

  function renderFilterPills() {
    const pills = ["All", ...allCategories];
    categoryPills.innerHTML = pills.map(cat => {
      const cls = cat === "All" ? "" : getPillClass(cat);
      const isActive = cat === activeFilter;
      return `<button class="pill ${cls} ${isActive ? "active" : ""}" data-cat="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`;
    }).join("");

    categoryPills.querySelectorAll(".pill").forEach(btn => {
      btn.addEventListener("click", () => {
        activeFilter = btn.dataset.cat;
        categoryPills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        renderEntries();
      });
    });
  }

  function getFilteredEntries() {
    let entries = allEntries;

    // Category filter
    if (activeFilter !== "All") {
      entries = entries.filter(e => e.categories.includes(activeFilter));
    }

    // Search filter
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      entries = entries.filter(e => {
        const plain = stripHTML(e.content_html).toLowerCase();
        return plain.includes(query) || e.title.toLowerCase().includes(query);
      });
    }

    return entries;
  }

  // ── Rendering ─────────────────────────────────
  function renderFeedMeta() {
    entryCount.textContent = `${allEntries.length} release notes`;
    const now = new Date();
    lastUpdated.textContent = `Updated ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  function renderEntries() {
    const entries = getFilteredEntries();

    hide(emptyState);
    hide(errorState);

    if (entries.length === 0) {
      show(emptyState);
      emptyState.querySelector(".empty-title").textContent = "No results found";
      emptyState.querySelector(".empty-sub").textContent = "Try adjusting your search or filter.";
      hide(entriesGrid);
      return;
    }

    show(entriesGrid);
    entriesGrid.innerHTML = entries.map((entry, idx) => buildCard(entry, idx)).join("");

    // Attach tweet button listeners
    entriesGrid.querySelectorAll(".tweet-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx, 10);
        openTweetModal(entries[idx]);
      });
    });
  }

  function buildCard(entry, idx) {
    const badges = entry.categories.length
      ? entry.categories.map(c => `<span class="badge ${getBadgeClass(c)}">${escapeHTML(c)}</span>`).join("")
      : '<span class="badge badge-default">Update</span>';

    const ago = timeAgo(entry.updated);

    return `
      <article class="entry-card" style="animation-delay:${idx * 40}ms">
        <div class="card-top">
          <div class="card-meta">
            <span class="card-date">${escapeHTML(entry.date)}${ago ? ` · <span style="font-weight:400;opacity:0.7">${ago}</span>` : ""}</span>
            <div class="card-badges">${badges}</div>
          </div>
          <button class="tweet-btn" data-idx="${idx}" title="Share on X (Twitter)" aria-label="Share ${escapeHTML(entry.date)} update on X">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share
          </button>
        </div>

        <div class="card-content">
          ${entry.content_html}
        </div>

        <div class="card-footer">
          <a class="card-link" href="${escapeHTML(entry.link)}" target="_blank" rel="noopener noreferrer">
            View on Google Cloud
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </article>
    `;
  }

  function showError(msg) {
    hide(emptyState);
    hide(entriesGrid);
    show(errorState);
    errorMsg.textContent = msg;
  }

  // ── Modal ─────────────────────────────────────
  function openTweetModal(entry) {
    currentTweetEntry = entry;
    modalEntryDate.textContent = entry.date;

    // Pre-populate tweet
    const plain = stripHTML(entry.content_html);
    const truncated = plain.length > 200 ? plain.slice(0, 200) + "…" : plain;
    const hashTags = " #BigQuery #GoogleCloud";
    const tweetBody = `BigQuery Update – ${entry.date}: ${truncated}${hashTags}`;
    // Leave room for the link (23 chars per Twitter URL shortener)
    const maxBody = 280 - 24;
    tweetTextarea.value = tweetBody.slice(0, maxBody);

    updateCharCount();
    show(tweetModal);
    tweetTextarea.focus();
    tweetTextarea.setSelectionRange(0, 0);
  }

  function closeTweetModal() {
    hide(tweetModal);
    currentTweetEntry = null;
  }

  function updateCharCount() {
    const len = tweetTextarea.value.length;
    charCount.textContent = len;
    charCounter.classList.remove("warn", "danger");
    if (len >= 260) charCounter.classList.add("danger");
    else if (len >= 220) charCounter.classList.add("warn");
  }

  function postTweet() {
    if (!currentTweetEntry) return;
    const text = tweetTextarea.value.trim();
    const link = currentTweetEntry.link;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
    window.open(tweetUrl, "_blank", "noopener,noreferrer,width=600,height=500");
    closeTweetModal();
  }

  // ── Helpers ───────────────────────────────────
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  // ── Event wiring ──────────────────────────────
  refreshBtn.addEventListener("click", fetchFeed);

  searchInput.addEventListener("input", () => {
    if (allEntries.length) renderEntries();
  });

  modalClose.addEventListener("click", closeTweetModal);
  modalCancel.addEventListener("click", closeTweetModal);
  tweetSubmit.addEventListener("click", postTweet);
  tweetTextarea.addEventListener("input", updateCharCount);

  // Close modal on overlay click
  tweetModal.addEventListener("click", (e) => {
    if (e.target === tweetModal) closeTweetModal();
  });

  // Close modal on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !tweetModal.classList.contains("hidden")) {
      closeTweetModal();
    }
  });

  // ── Auto-load on page ready ───────────────────
  fetchFeed();
})();
