(() => {
  function getActiveConvId() {
    try {
      // 1. TanStack Router state (official router of Antigravity 2.0)
      if (window.__TSR_ROUTER__?.state) {
        const matches = window.__TSR_ROUTER__.state.matches || [];
        for (let i = matches.length - 1; i >= 0; i--) {
          const cid = matches[i]?.params?.cascadeId;
          if (cid) return cid;
        }
        const pathname = window.__TSR_ROUTER__.state.location?.pathname || "";
        const parts = pathname.split("/");
        const idx = parts.indexOf("c");
        if (idx !== -1 && parts[idx + 1]) {
          return parts[idx + 1];
        }
      }

      // 2. Main chat view container in DOM
      const mainChat = document.querySelector("div:not([data-testid=\"conversation-row-sidebar\"])[data-cascade-id]");
      if (mainChat) {
        const id = mainChat.getAttribute("data-cascade-id");
        if (id) return id;
      }

      // 3. Currently selected row in sidebar
      const selRow = document.querySelector("[data-selected=\"true\"][data-cascade-id]") || document.querySelector("[data-selected=\"true\"]");
      if (selRow) {
        const id = selRow.getAttribute("data-cascade-id");
        if (id) return id;
      }

      // 4. Check window.location.pathname (/c/<id>)
      const parts = window.location.pathname.split("/");
      const idx = parts.indexOf("c");
      if (idx !== -1 && parts[idx + 1]) {
        return parts[idx + 1];
      }

      // 5. Any element with data-cascade-id inside main/chat area
      const anyChat = document.querySelector("[data-cascade-id]");
      if (anyChat) {
        const id = anyChat.getAttribute("data-cascade-id");
        if (id) return id;
      }
    } catch (_) {}
    return null;
  }

  function getActiveModelName() {
    try {
      const btns = Array.from(document.querySelectorAll("button"));
      const modelBtn = btns.find(b => b.textContent && (b.textContent.includes("Gemini") || b.textContent.includes("Claude") || b.textContent.includes("GPT")));
      if (modelBtn) {
        const txt = modelBtn.innerText.replace(/\s+/g, " ").trim();
        const m = txt.match(/(Gemini\s+[\d.]+\s+\w+|Claude\s+[\w\s.]+|GPT-[\w\s.]+)/i);
        if (m) return m[1].toLowerCase().replace(/\s+/g, "-");
        return txt.split(" ")[0].toLowerCase();
      }
    } catch (_) {}
    return "gemini-3.8-flash";
  }

  function fmtK(n) {
    if (!n || n <= 0) return "0";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return Math.round(n / 1000) + "k";
    return n + "";
  }

  function formatResetTime(seconds, isRu) {
    if (!seconds) return "";
    const sec = parseInt(seconds, 10);
    if (isNaN(sec)) return "";
    const diff = sec - Math.floor(Date.now() / 1000);
    if (diff <= 0) return isRu ? "сейчас" : "now";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (days > 0) return isRu ? `${days}д ${hours}ч` : `${days}d ${hours}h`;
    if (hours > 0) return isRu ? `${hours}ч ${mins}м` : `${hours}h ${mins}m`;
    return isRu ? `${mins}м` : `${mins}m`;
  }

  async function fetchOfficialQuotas() {
    try {
      const btn = document.querySelector("button");
      if (!btn) return null;
      const fk = Object.keys(btn).find(k => k.startsWith("__reactFiber"));
      if (!fk) return null;
      let cur = btn[fk];
      let client = null;
      while (cur) {
        if (cur.memoizedProps?.value?.retrieveUserQuotaSummary) {
          client = cur.memoizedProps.value;
          break;
        }
        cur = cur.return;
      }
      if (!client) return null;
      const res = await Promise.race([
        client.retrieveUserQuotaSummary({}),
        new Promise(r => setTimeout(() => r(null), 2000))
      ]);
      return res?.response?.groups || null;
    } catch (e) {
      return null;
    }
  }

  let cachedQuotas = null;
  let lastQuotaFetch = 0;

  async function getQuotas() {
    const now = Date.now();
    if (!cachedQuotas || now - lastQuotaFetch > 4000) {
      lastQuotaFetch = now;
      const q = await fetchOfficialQuotas();
      if (q) cachedQuotas = q;
    }
    return cachedQuotas;
  }

  window.__AGY_RENDER__ = async function() {
    const data = window.__AGY_DATA__;
    if (!data) return;

    let container = document.getElementById("antigravity-token-widget");
    const settingsBtn = Array.from(document.querySelectorAll("button")).find(b =>
      b.textContent && (b.textContent.includes("Settings") || b.textContent.includes("Настройки"))
    );
    if (!settingsBtn) return;

    // Language resolution: localStorage > window.__AGY_LANG__ > default 'en'
    let currentLang = "en";
    try {
      currentLang = localStorage.getItem("agy_hud_lang") || window.__AGY_LANG__ || "en";
    } catch (_) {
      currentLang = window.__AGY_LANG__ || "en";
    }
    const isRu = currentLang === "ru";

    if (!container) {
      container = document.createElement("div");
      container.id = "antigravity-token-widget";
      container.style.cssText = [
        "padding: 8px 10px",
        "margin: 4px 8px 8px 8px",
        "border-radius: 8px",
        "background: rgba(255, 255, 255, 0.035)",
        "border: 1px solid rgba(255, 255, 255, 0.07)",
        "font-family: ui-monospace, SFMono-Regular, Menlo, monospace",
        "font-size: 11px",
        "line-height: 1.3",
        "color: rgba(255, 255, 255, 0.85)",
        "user-select: none",
        "cursor: pointer",
        "transition: border-color 0.2s ease, background 0.2s ease"
      ].join("; ");

      container.onmouseenter = () => {
        container.style.borderColor = "rgba(255, 255, 255, 0.15)";
        container.style.background = "rgba(255, 255, 255, 0.05)";
      };
      container.onmouseleave = () => {
        container.style.borderColor = "rgba(255, 255, 255, 0.07)";
        container.style.background = "rgba(255, 255, 255, 0.035)";
      };

      settingsBtn.parentElement.insertBefore(container, settingsBtn);
    }

    container.style.cursor = "pointer";
    container.onclick = (e) => {
      e.stopPropagation();
      const current = localStorage.getItem("agy_hud_lang") || window.__AGY_LANG__ || "en";
      const nextLang = current === "ru" ? "en" : "ru";
      try {
        localStorage.setItem("agy_hud_lang", nextLang);
      } catch (_) {}
      if (window.__AGY_RENDER__) window.__AGY_RENDER__();
    };

    // 1. Session Context from SQLite
    const activeId = getActiveConvId();
    let session = null;
    if (data.sessions && activeId && data.sessions[activeId]) {
      session = data.sessions[activeId];
    } else if (activeId && data.current_session && data.current_session.session_id === activeId) {
      session = data.current_session;
    } else if (!activeId && data.current_session) {
      session = data.current_session;
    } else {
      session = {
        session_id: activeId || "new",
        context_size: 0,
        max_context: 1000000,
        context_percent: 0.0
      };
    }

    const pct = (session.context_percent != null) ? session.context_percent : 0.0;
    const barWidth = Math.min(100, Math.max(0, pct));
    const ctxK = fmtK(session.context_size || 0);
    const maxK = ((session.max_context || 1000000) >= 1000000) ? "1M" : fmtK(session.max_context);
    const modelName = getActiveModelName();

    // 2. Official Quota Summary from Antigravity Backend
    const quotaGroups = await getQuotas();
    let fiveHourPct = 100;
    let fiveHourReset = "";
    let weeklyPct = 100;
    let weeklyReset = "";

    if (quotaGroups && quotaGroups.length > 0) {
      const geminiGroup = quotaGroups.find(g => g.displayName?.includes("Gemini")) || quotaGroups[0];
      const hBucket = geminiGroup?.buckets?.find(b => b.window === "5h" || b.bucketId?.includes("5h"));
      const wBucket = geminiGroup?.buckets?.find(b => b.window === "weekly" || b.bucketId?.includes("weekly"));

      if (hBucket?.remaining?.value != null) {
        fiveHourPct = Math.round(hBucket.remaining.value * 100);
        fiveHourReset = formatResetTime(hBucket.resetTime?.seconds, isRu);
      }
      if (wBucket?.remaining?.value != null) {
        weeklyPct = Math.round(wBucket.remaining.value * 100);
        weeklyReset = formatResetTime(wBucket.resetTime?.seconds, isRu);
      }
    }

    const title5h = isRu ? "5-часовой" : "5-Hour";
    const titleWeekly = isRu ? "Недельный" : "Weekly";
    const tip5h = isRu
      ? `Остаток 5-часового лимита: ${fiveHourPct}%${fiveHourReset ? ` (сброс через ${fiveHourReset})` : ""}`
      : `5-Hour limit remaining: ${fiveHourPct}%${fiveHourReset ? ` (reset in ${fiveHourReset})` : ""}`;
    const tipWeekly = isRu
      ? `Остаток недельного лимита: ${weeklyPct}%${weeklyReset ? ` (сброс через ${weeklyReset})` : ""}`
      : `Weekly limit remaining: ${weeklyPct}%${weeklyReset ? ` (reset in ${weeklyReset})` : ""}`;
    const switchHint = isRu ? "Нажмите для переключения на English" : "Click to switch to Russian";

    container.title = `${tip5h}\n${tipWeekly}\n(${switchHint})`;

    container.innerHTML = `
      <!-- 1. Model & Context (Наполняется слева направо) -->
      <div style="margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <span style="font-weight: 600; color: #f1f5f9; font-size: 10.5px;">${modelName}</span>
          <span style="font-size: 10px; color: #10b981; font-weight: 600;">${pct.toFixed(1)}% <span style="font-weight: 400; color: #94a3b8;">(${ctxK}/${maxK})</span></span>
        </div>
        <div style="background: rgba(255,255,255,0.08); height: 4px; border-radius: 2px; overflow: hidden;">
          <div style="background: #10b981; width: ${barWidth}%; height: 100%; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- 2. 5-Hour Limit Remaining (Уменьшается справа налево) -->
      <div style="margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <span style="font-weight: 500; color: #94a3b8; font-size: 10px;">${title5h}</span>
          <span style="font-size: 9.5px; color: #94a3b8; font-weight: 500;">${fiveHourPct}% ${fiveHourReset ? `<span style="font-weight: 400; color: #64748b;">(${fiveHourReset})</span>` : ""}</span>
        </div>
        <div style="background: rgba(255,255,255,0.06); height: 3.5px; border-radius: 2px; overflow: hidden;">
          <div style="background: #64748b; width: ${fiveHourPct}%; height: 100%; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- 3. Weekly Limit Remaining (Уменьшается справа налево) -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <span style="font-weight: 500; color: #94a3b8; font-size: 10px;">${titleWeekly}</span>
          <span style="font-size: 9.5px; color: #94a3b8; font-weight: 500;">${weeklyPct}% ${weeklyReset ? `<span style="font-weight: 400; color: #64748b;">(${weeklyReset})</span>` : ""}</span>
        </div>
        <div style="background: rgba(255,255,255,0.06); height: 3.5px; border-radius: 2px; overflow: hidden;">
          <div style="background: #64748b; width: ${weeklyPct}%; height: 100%; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  };

  if (!window.__AGY_LISTENER_SET__) {
    window.__AGY_LISTENER_SET__ = true;
    let lastId = null;
    let lastPath = window.location.pathname;

    if (window.__TSR_ROUTER__ && typeof window.__TSR_ROUTER__.subscribe === "function") {
      try {
        window.__TSR_ROUTER__.subscribe(() => {
          if (window.__AGY_RENDER__) window.__AGY_RENDER__();
        });
      } catch (_) {}
    }

    setInterval(() => {
      const currentId = getActiveConvId();
      const currentPath = window.location.pathname;
      if (currentId !== lastId || currentPath !== lastPath) {
        lastId = currentId;
        lastPath = currentPath;
        if (window.__AGY_RENDER__) window.__AGY_RENDER__();
      }
    }, 100);
  }

  if (window.__AGY_RENDER__) {
    window.__AGY_RENDER__();
  }
})();
