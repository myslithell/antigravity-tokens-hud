(() => {
  window.__AGY_CLEANUP__ = function() {
    const w = document.getElementById("antigravity-token-widget");
    if (w) w.remove();
    const p = document.getElementById("agy-hud-popover");
    if (p) p.remove();
  };

  if (window.__AGY_ENABLED__ === false) {
    window.__AGY_CLEANUP__();
    return;
  }

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

  function getActiveProjectName() {
    try {
      const title = document.title || "";
      const parts = title.split(" - ");
      if (parts.length >= 2 && parts[1]) {
        const proj = parts[1].trim();
        if (proj && proj !== "Antigravity") return proj;
      }
      const sel = document.querySelector("[data-selected=\"true\"]");
      if (sel && sel.innerText) return sel.innerText.trim();
    } catch (_) {}
    return "MODELADO 3D";
  }

  function fmtK(n) {
    if (!n || n <= 0) return "0";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return Math.round(n / 1000) + "k";
    return n + "";
  }

  const HUD_VERSION = "v1.1.1";
  const GITHUB_REPO_URL = "https://github.com/Collazos022/antigravity-tokens-hud";

  const I18N = {
    es: {
      code: "es",
      name: "Español",
      title5h: "Límite 5h",
      titleWeekly: "Semanal",
      now: "ahora",
      d: "d",
      h: "h",
      m: "m",
      pluginName: "Antigravity Tokens HUD",
      versionStatus: "Actualizado: 28 oct 2026 • Al día ✓",
      description: "Monitor en tiempo real de consumo de tokens y cuotas oficiales de Antigravity.",
      switchHint: "💡 Clic para alternar idioma (Siguiente: English)"
    },
    en: {
      code: "en",
      name: "English",
      title5h: "5-Hour",
      titleWeekly: "Weekly",
      now: "now",
      d: "d",
      h: "h",
      m: "m",
      pluginName: "Antigravity Tokens HUD",
      versionStatus: "Updated: Oct 28, 2026 • Up to date ✓",
      description: "Real-time session token usage and official Antigravity quota monitor.",
      switchHint: "💡 Click widget to cycle language (Next: Русский)"
    },
    ru: {
      code: "ru",
      name: "Русский",
      title5h: "5-часовой",
      titleWeekly: "Недельный",
      now: "сейчас",
      d: "д",
      h: "ч",
      m: "м",
      pluginName: "Antigravity Tokens HUD",
      versionStatus: "Обновлено: 26 окт 2026 • Актуально ✓",
      description: "Мониторинг токенов сессий и официальных квот Antigravity в реальном времени.",
      switchHint: "💡 Кликните для смены языка (Далее: Français)"
    },
    fr: {
      code: "fr",
      name: "Français",
      title5h: "Limite 5h",
      titleWeekly: "Hebdo",
      now: "maintenant",
      d: "j",
      h: "h",
      m: "min",
      pluginName: "Antigravity Tokens HUD",
      versionStatus: "Mis à jour: 26 oct 2026 • À jour ✓",
      description: "Moniteur en temps réel de contexte de session et quotas officiels Antigravity.",
      switchHint: "💡 Cliquer pour changer de langue (Suivant: 中文)"
    },
    zh: {
      code: "zh",
      name: "中文",
      title5h: "5小时限额",
      titleWeekly: "每周限额",
      now: "现在",
      d: "天",
      h: "时",
      m: "分",
      pluginName: "Antigravity Tokens HUD",
      versionStatus: "更新于: 2026年10月26日 • 已是最新 ✓",
      description: "实时会话上下文大小与官方 Antigravity 模型配额监视器。",
      switchHint: "💡 点击组件切换语言 (下一个: Español)"
    }
  };

  const LANG_CYCLE = ["es", "en", "ru", "fr", "zh"];

  function getSystemLanguage() {
    try {
      const navLang = (navigator.language || navigator.userLanguage || "es").toLowerCase();
      if (navLang.startsWith("es")) return "es";
      if (navLang.startsWith("ru")) return "ru";
      if (navLang.startsWith("fr")) return "fr";
      if (navLang.startsWith("zh")) return "zh";
      if (navLang.startsWith("en")) return "en";
    } catch (_) {}
    return "es";
  }

  function formatResetTime(seconds, langCode) {
    if (!seconds) return "";
    const sec = parseInt(seconds, 10);
    if (isNaN(sec)) return "";
    const diff = sec - Math.floor(Date.now() / 1000);
    const i18n = I18N[langCode] || I18N.es;
    if (diff <= 0) return i18n.now;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (days > 0) return `${days}${i18n.d} ${hours}${i18n.h}`;
    if (hours > 0) return `${hours}${i18n.h} ${mins}${i18n.m}`;
    return `${mins}${i18n.m}`;
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

  let lastUpdateTime = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  window.__AGY_RENDER__ = async function() {
    if (window.__AGY_ENABLED__ === false) {
      if (window.__AGY_CLEANUP__) window.__AGY_CLEANUP__();
      return;
    }
    const data = window.__AGY_DATA__;
    if (!data) return;

    let container = document.getElementById("antigravity-token-widget");
    const settingsBtn = Array.from(document.querySelectorAll("button")).find(b =>
      b.textContent && (b.textContent.includes("Settings") || b.textContent.includes("Настройки") || b.textContent.includes("Configuración"))
    );
    if (!settingsBtn || !settingsBtn.parentElement) return;

    // Language resolution: localStorage > System language (defaults to Español)
    let currentLang = "es";
    try {
      currentLang = localStorage.getItem("agy_hud_lang") || getSystemLanguage();
    } catch (_) {
      currentLang = getSystemLanguage();
    }
    if (!I18N[currentLang]) currentLang = "es";
    const t = I18N[currentLang];

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
    } else if (!container.isConnected || container.parentElement !== settingsBtn.parentElement) {
      settingsBtn.parentElement.insertBefore(container, settingsBtn);
    }

    container.style.cursor = "pointer";
    container.onclick = (e) => {
      e.stopPropagation();
      const current = localStorage.getItem("agy_hud_lang") || getSystemLanguage();
      const currentIndex = LANG_CYCLE.indexOf(current);
      const nextLang = LANG_CYCLE[(currentIndex + 1) % LANG_CYCLE.length];
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
        fiveHourReset = formatResetTime(hBucket.resetTime?.seconds, currentLang);
      }
      if (wBucket?.remaining?.value != null) {
        weeklyPct = Math.round(wBucket.remaining.value * 100);
        weeklyReset = formatResetTime(wBucket.resetTime?.seconds, currentLang);
      }
    }

    // Remueve el tooltip nativo de Windows
    container.removeAttribute("title");

    // -------------------------------------------------------------
    // TOOLTIP ESTILIZADO IDÉNTICO A LA INTERFAZ DE ANTIGRAVITY
    // -------------------------------------------------------------
    let tooltipEl = document.getElementById("antigravity-token-tooltip");
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = "antigravity-token-tooltip";
      tooltipEl.style.cssText = [
        "position: fixed",
        "z-index: 9999999",
        "background: rgba(28, 28, 30, 0.98)",
        "backdrop-filter: blur(20px)",
        "-webkit-backdrop-filter: blur(20px)",
        "border: 1px solid rgba(255, 255, 255, 0.08)",
        "border-radius: 12px",
        "padding: 10px 12px",
        "box-shadow: 0 10px 32px rgba(0, 0, 0, 0.65)",
        "color: #e2e8f0",
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        "font-size: 11.5px",
        "line-height: 1.35",
        "opacity: 0",
        "transform: translateY(4px)",
        "transition: opacity 0.16s ease, transform 0.16s ease",
        "pointer-events: none",
        "box-sizing: border-box",
        "user-select: none"
      ].join("; ");
      document.body.appendChild(tooltipEl);
    }

    tooltipEl.innerHTML = `
      <!-- 1. Nombre del Plugin (En negrita) y Versión contigua más pequeña -->
      <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 5px; flex-wrap: wrap;">
        <span style="font-size: 12px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px;">
          ${t.pluginName}
        </span>
        <span style="font-size: 9.5px; font-weight: 600; background: rgba(56, 189, 248, 0.14); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 0.5px 5px; border-radius: 9999px; letter-spacing: 0.2px;">
          ${HUD_VERSION}
        </span>
      </div>

      <!-- 2. Fecha de Actualización y verificación de nueva versión -->
      <div style="display: flex; align-items: center; gap: 6px; color: #34d399; font-size: 10.5px; font-weight: 500; margin-bottom: 6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <circle cx="12" cy="12" r="10"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span>${t.versionStatus}</span>
      </div>

      <!-- 3. Breve descripción -->
      <div style="color: #94a3b8; font-size: 11px; line-height: 1.35; margin-bottom: 8px;">
        ${t.description}
      </div>

      <!-- 4. Repo de GitHub -->
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 7px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink: 0; color: #cbd5e1;">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        <span id="agy-gh-link" style="color: #38bdf8; font-size: 10.5px; font-weight: 500; cursor: pointer; text-decoration: underline;">
          Collazos022/antigravity-tokens-hud ↗
        </span>
      </div>

      <!-- 5. Separador tenue (-------) -->
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 6px 0 5px 0;"></div>

      <!-- 6. Indicador de cambio de idioma -->
      <div style="color: #64748b; font-size: 10px; line-height: 1.3;">
        ${t.switchHint}
        <div style="margin-top: 2px; opacity: 0.75; font-size: 9.5px;">(ES → EN → RU → FR → ZH)</div>
      </div>
    `;

    const ghLink = document.getElementById("agy-gh-link");
    if (ghLink) {
      ghLink.onclick = (e) => {
        e.stopPropagation();
        window.open(GITHUB_REPO_URL, "_blank");
      };
    }

    let hideTimer = window.__AGY_HIDE_TIMER__ || null;

    function showTooltip(target) {
      if (hideTimer) clearTimeout(hideTimer);
      const el = target || container;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      tooltipEl.style.left = rect.left + "px";
      tooltipEl.style.width = rect.width + "px";
      tooltipEl.style.bottom = (window.innerHeight - rect.top + 6) + "px";
      tooltipEl.style.opacity = "1";
      tooltipEl.style.transform = "translateY(0)";
      tooltipEl.style.pointerEvents = "auto";
    }

    function hideTooltip() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        tooltipEl.style.opacity = "0";
        tooltipEl.style.transform = "translateY(4px)";
        tooltipEl.style.pointerEvents = "none";
      }, 180);
      window.__AGY_HIDE_TIMER__ = hideTimer;
    }

    container.onmouseenter = (e) => showTooltip(e.currentTarget);
    container.onmouseleave = () => hideTooltip();
    tooltipEl.onmouseenter = () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
    tooltipEl.onmouseleave = () => hideTooltip();

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
      <div style="margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <span style="font-weight: 500; color: #94a3b8; font-size: 10px;">${t.title5h}</span>
          <span style="font-size: 9.5px; color: #94a3b8; font-weight: 500;">${fiveHourPct}% ${fiveHourReset ? `<span style="font-weight: 400; color: #64748b;">(${fiveHourReset})</span>` : ""}</span>
        </div>
        <div style="background: rgba(255,255,255,0.06); height: 3.5px; border-radius: 2px; overflow: hidden;">
          <div style="background: #64748b; width: ${fiveHourPct}%; height: 100%; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- 3. Weekly Limit Remaining -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <span style="font-weight: 500; color: #94a3b8; font-size: 10px;">${t.titleWeekly}</span>
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
