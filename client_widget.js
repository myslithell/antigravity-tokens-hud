(() => {
  const isRu = typeof navigator !== "undefined" && navigator.language && navigator.language.startsWith("ru");

  function getActiveConvId() {
    try {
      const parts = window.location.pathname.split("/");
      const idx = parts.indexOf("c");
      if (idx !== -1 && parts[idx + 1]) {
        return parts[idx + 1];
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

  function formatResetTime(seconds) {
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
      const res = await client.retrieveUserQuotaSummary({});
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
        "cursor: default",
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

    // 1. Session Context from SQLite
    const activeId = getActiveConvId();
    let session = null;
    if (data.sessions && activeId && data.sessions[activeId]) {
      session = data.sessions[activeId];
    } else if (activeId && data.current_session && data.current_session.session_id === activeId) {
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
        fiveHourReset = formatResetTime(hBucket.resetTime?.seconds);
      }
      if (wBucket?.remaining?.value != null) {
        weeklyPct = Math.round(wBucket.remaining.value * 100);
        weeklyReset = formatResetTime(wBucket.resetTime?.seconds);
      }
    }

    const title5h = isRu ? "5-часовой" : "5-Hour";
    const titleWeekly = isRu ? "Недельный" : "Weekly";
    const tip5h = isRu ? `Остаток 5-часового лимита: ${fiveHourPct}%` : `5-Hour limit remaining: ${fiveHourPct}%`;
    const tipWeekly = isRu ? `Остаток недельного лимита: ${weeklyPct}%` : `Weekly limit remaining: ${weeklyPct}%`;

    container.innerHTML = `
      <!-- 1. Model & Context -->
      <div style="margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <span style="font-weight: 600; color: #f1f5f9; font-size: 10.5px;">${modelName}</span>
          <span style="font-size: 10px; color: #10b981; font-weight: 600;">${pct.toFixed(1)}% <span style="font-weight: 400; color: #94a3b8;">(${ctxK}/${maxK})</span></span>
        </div>
        <div style="background: rgba(255,255,255,0.08); height: 4px; border-radius: 2px; overflow: hidden;">
          <div style="background: #10b981; width: ${barWidth}%; height: 100%; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- 2. 5-Hour Limit Remaining -->
      <div style="margin-bottom: 6px;" title="${tip5h}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <span style="font-weight: 500; color: #94a3b8; font-size: 10px;">${title5h}</span>
          <span style="font-size: 9.5px; color: #94a3b8; font-weight: 500;">${fiveHourPct}% ${fiveHourReset ? `<span style="font-weight: 400; color: #64748b;">(${fiveHourReset})</span>` : ""}</span>
        </div>
        <div style="background: rgba(255,255,255,0.06); height: 3.5px; border-radius: 2px; overflow: hidden;">
          <div style="background: #64748b; width: ${fiveHourPct}%; height: 100%; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- 3. Weekly Limit Remaining -->
      <div title="${tipWeekly}">
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
    let lastPath = window.location.pathname;
    setInterval(() => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        if (window.__AGY_RENDER__) window.__AGY_RENDER__();
      }
    }, 150);
  }

  if (window.__AGY_RENDER__) {
    window.__AGY_RENDER__();
  }
})();
