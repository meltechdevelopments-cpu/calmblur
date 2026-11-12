// ============================================================================
// CALMBLUR WEB + SMART TV "SOFA BUZZ" UI CONTROLLER
// ============================================================================
(function () {
  const STORAGE_KEY = "calmblur_state_v1";
  const COMMUNITY_KEY = "calmblur_community_scenes_v1";

  const state = {
    isPro: false,
    licenseKey: "",
    planLabel: "",
    lastValidatedAt: 0,
    activeCategories: ["emetophobia"],
    defaultAction: "blur_mute",
    customWords: [],
    sofaSessionsUsed: 0
  };

  let communityTitles = [];
  let sofaRunning = false;
  let sofaStartedWallMs = 0;
  let sofaElapsedSec = 0;
  let sofaTickTimer = null;
  let lastBuzzedCueKey = "";
  let wakeLockSentinel = null;
  let audioCtx = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(state, parsed);
      }
      const rawComm = localStorage.getItem(COMMUNITY_KEY);
      if (rawComm) {
        communityTitles = JSON.parse(rawComm) || [];
      }
    } catch (_) {}

    if (!state.isPro && state.activeCategories.length > CALMBLUR_CONFIG.freeTriggersAllowed) {
      state.activeCategories = [state.activeCategories[0] || "emetophobia"];
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  // Soft calming chime via Web Audio API (no external mp3 required!)
  function playGentleChime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const now = audioCtx.currentTime;
      [523.25, 659.25].forEach(function (freq, idx) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.48);
      });
    } catch (_) {}
  }

  function triggerPhoneAlert() {
    if (navigator.vibrate) {
      try {
        navigator.vibrate([260, 120, 260]);
      } catch (_) {}
    }
    playGentleChime();
  }

  async function requestPhoneWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockSentinel = await navigator.wakeLock.request("screen");
    } catch (_) {}
  }

  function releasePhoneWakeLock() {
    if (wakeLockSentinel) {
      try { wakeLockSentinel.release(); } catch (_) {}
      wakeLockSentinel = null;
    }
  }

  // Re-verify Polar subscription every 24h so cancelled subscriptions auto-step back cleanly
  async function autoVerifySubscriptionIfDue() {
    if (!state.licenseKey || !state.isPro) return;
    const age = Date.now() - (state.lastValidatedAt || 0);
    if (age < CALMBLUR_CONFIG.recheckIntervalMs) return;

    const res = await CALMBLUR_CONFIG.validatePolarKey(state.licenseKey);
    if (res.valid) {
      state.lastValidatedAt = Date.now();
      saveState();
    } else if (res.revoked) {
      state.isPro = false;
      state.licenseKey = "";
      state.planLabel = "";
      state.activeCategories = [state.activeCategories[0] || "emetophobia"];
      state.customWords = [];
      saveState();
      renderHeaderAndShields();
    }
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  }

  function syncCheckoutLinks() {
    const mBtn = document.getElementById("buyMonthlyBtn");
    const yBtn = document.getElementById("buyYearlyBtn");
    const notice = document.getElementById("checkoutSetupNotice");

    const hasMonthly = Boolean(CALMBLUR_CONFIG.monthlyCheckoutUrl);
    const hasYearly = Boolean(CALMBLUR_CONFIG.yearlyCheckoutUrl);

    if (mBtn) {
      mBtn.href = hasMonthly ? CALMBLUR_CONFIG.monthlyCheckoutUrl : "#";
      mBtn.onclick = function (e) {
        if (!CALMBLUR_CONFIG.monthlyCheckoutUrl) {
          e.preventDefault();
          if (notice) notice.classList.remove("hidden");
        }
      };
    }
    if (yBtn) {
      yBtn.href = hasYearly ? CALMBLUR_CONFIG.yearlyCheckoutUrl : "#";
      yBtn.onclick = function (e) {
        if (!CALMBLUR_CONFIG.yearlyCheckoutUrl) {
          e.preventDefault();
          if (notice) notice.classList.remove("hidden");
        }
      };
    }

    if (CALMBLUR_CONFIG.firefoxAmoStoreUrl) {
      const ff = document.getElementById("downloadFirefoxBtn");
      if (ff) {
        ff.href = CALMBLUR_CONFIG.firefoxAmoStoreUrl;
        ff.removeAttribute("download");
        ff.target = "_blank";
      }
    }
    if (CALMBLUR_CONFIG.chromeStoreUrl) {
      const ch = document.getElementById("downloadChromeBtn");
      if (ch) {
        ch.href = CALMBLUR_CONFIG.chromeStoreUrl;
        ch.removeAttribute("download");
        ch.target = "_blank";
      }
    }
  }

  function renderHeaderAndShields() {
    const pill = document.getElementById("planStatusPill");
    const upBtn = document.getElementById("openUpgradeModalBtn");
    const hint = document.getElementById("shieldCountHint");

    if (state.isPro) {
      pill.textContent = "✨ Pass Active · All 10 Shields";
      pill.classList.add("pro");
      upBtn.classList.add("hidden");
      hint.textContent = "(All 10 trigger shields + custom words unlocked)";
    } else {
      pill.textContent = "Free · 1 Shield Active";
      pill.classList.remove("pro");
      upBtn.classList.remove("hidden");
      hint.textContent = "(Pick any 1 free — unlock all 10 + custom words with Pass)";
    }

    const select = document.getElementById("defaultActionSelect");
    if (select) select.value = state.defaultAction;

    // Render trigger chips
    const grid = document.getElementById("triggerChipsGrid");
    grid.textContent = "";
    CALMBLUR_ENGINE.TRIGGER_CATEGORIES.forEach(function (cat) {
      const btn = document.createElement("button");
      btn.type = "button";
      const isActive = state.activeCategories.indexOf(cat.id) !== -1;
      btn.className = "trigger-chip" + (isActive ? " active" : "");
      btn.textContent = cat.emoji + " " + cat.label;
      btn.title = cat.description;
      btn.addEventListener("click", function () {
        if (isActive) {
          if (state.activeCategories.length > 1) {
            state.activeCategories = state.activeCategories.filter(function (id) { return id !== cat.id; });
          }
        } else {
          if (state.isPro) {
            state.activeCategories.push(cat.id);
          } else {
            // Free tier: let user switch their 1 free slot OR prompt upgrade if they click while already holding 1
            if (state.activeCategories.length >= CALMBLUR_CONFIG.freeTriggersAllowed) {
              // Switch their 1 free shield AND gently show a toast/upgrade option if they want multiple
              state.activeCategories = [cat.id];
              openModal("upgradeModal");
            } else {
              state.activeCategories = [cat.id];
            }
          }
        }
        saveState();
        renderHeaderAndShields();
        renderSofaScenePreview();
      });
      grid.appendChild(btn);
    });

    // Render custom words
    const cwWrap = document.getElementById("customWordsList");
    cwWrap.textContent = "";
    state.customWords.forEach(function (word) {
      const tag = document.createElement("span");
      tag.className = "custom-tag";
      tag.textContent = word + " ";
      const x = document.createElement("button");
      x.type = "button";
      x.textContent = "✕";
      x.addEventListener("click", function () {
        state.customWords = state.customWords.filter(function (w) { return w !== word; });
        saveState();
        renderHeaderAndShields();
      });
      tag.appendChild(x);
      cwWrap.appendChild(tag);
    });
  }

  function getAllTitles() {
    return communityTitles.concat(CALMBLUR_ENGINE.CURATED_TITLES);
  }

  function getSelectedSofaTitle() {
    const sel = document.getElementById("sofaTitleSelect");
    const id = sel ? sel.value : "";
    const all = getAllTitles();
    for (let i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return all[0] || null;
  }

  function populateSofaDropdown(selectedId) {
    const sel = document.getElementById("sofaTitleSelect");
    if (!sel) return;
    sel.textContent = "";
    getAllTitles().forEach(function (t) {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = (t.safeOverall ? "✅ " : "🛡️ ") + t.title + " (" + t.platform + ")";
      sel.appendChild(opt);
    });
    if (selectedId) sel.value = selectedId;
  }

  function renderSofaScenePreview() {
    const box = document.getElementById("sofaScenesSummary");
    const titleObj = getSelectedSofaTitle();
    if (!box || !titleObj) return;
    box.textContent = "";

    const heading = document.createElement("div");
    heading.style.fontWeight = "700";

    if (titleObj.safeOverall || titleObj.scenes.length === 0) {
      heading.textContent = "✅ Verified Comfort Pick — Zero logged phobia/trauma scenes in " + titleObj.title + ".";
      box.appendChild(heading);
      return;
    }

    heading.textContent = "Logged Trigger Windows for " + titleObj.title + " (" + titleObj.scenes.length + "):";
    box.appendChild(heading);

    titleObj.scenes.forEach(function (sc) {
      const cat = CALMBLUR_ENGINE.getCategory(sc.category);
      const row = document.createElement("div");
      row.className = "scene-row-item";

      const left = document.createElement("span");
      left.textContent = (cat ? cat.emoji + " " + cat.shortLabel : sc.category) + " · " + sc.cue;

      const right = document.createElement("strong");
      if (state.isPro || state.sofaSessionsUsed < CALMBLUR_CONFIG.freeSofaSessionsAllowed) {
        right.textContent = sc.start + " → " + sc.end;
      } else {
        right.textContent = "🔒 Pass Unlocks Exact Skip Times";
      }

      row.appendChild(left);
      row.appendChild(right);
      box.appendChild(row);
    });
  }

  function updateSofaTick() {
    if (sofaRunning) {
      sofaElapsedSec = Math.max(0, (Date.now() - sofaStartedWallMs) / 1000);
    }

    const formatted = CALMBLUR_ENGINE.formatTimestamp(sofaElapsedSec);
    document.getElementById("sofaTimerDisplay").textContent = formatted;
    document.getElementById("nightDimClockText").textContent = formatted;

    const titleObj = getSelectedSofaTitle();
    const liveBox = document.getElementById("sofaLiveBox");
    const badge = document.getElementById("sofaStateBadge");
    const msg = document.getElementById("sofaMainMessage");
    const skipHint = document.getElementById("sofaSkipHint");
    const dimOverlay = document.getElementById("nightDimOverlay");
    const dimStatus = document.getElementById("nightDimStatusText");
    const dimNext = document.getElementById("nightDimNextText");

    const activeFilter = state.isPro ? null : state.activeCategories;
    const evalRes = CALMBLUR_ENGINE.evaluatePlaybackSecond(titleObj, sofaElapsedSec, activeFilter, 15);

    liveBox.className = "sofa-live-box";
    dimOverlay.classList.remove("alerting");

    if (evalRes.state === "heads_up") {
      liveBox.classList.add("state-headsup");
      dimOverlay.classList.add("alerting");
      const cueKey = titleObj.id + ":" + evalRes.scene.start + ":headsup";
      if (sofaRunning && lastBuzzedCueKey !== cueKey) {
        lastBuzzedCueKey = cueKey;
        triggerPhoneAlert();
      }
      const label = evalRes.category ? evalRes.category.emoji + " " + evalRes.category.label : "Trigger";
      badge.textContent = "⚠️ 15s HEADS-UP · " + evalRes.secondsUntil + "s";
      msg.textContent = label + " in " + evalRes.secondsUntil + "s — Cue: " + evalRes.scene.cue;
      skipHint.textContent = "Safe to resume at " + evalRes.scene.end + " (" + evalRes.scene.note + ")";
      skipHint.classList.remove("hidden");
      dimStatus.textContent = "⚠️ HEADS-UP IN " + evalRes.secondsUntil + "s (" + label + ")";
      dimNext.textContent = "Look away or mute TV until " + evalRes.scene.end;
    } else if (evalRes.state === "active") {
      liveBox.classList.add("state-active");
      dimOverlay.classList.add("alerting");
      const label = evalRes.category ? evalRes.category.emoji + " " + evalRes.category.label : "Scene";
      badge.textContent = "🛡️ SCENE HAPPENING NOW (" + evalRes.secondsRemaining + "s left)";
      msg.textContent = label + " active right now — keep muted / look away.";
      skipHint.textContent = "All clear in " + evalRes.secondsRemaining + " seconds (at " + evalRes.scene.end + ").";
      skipHint.classList.remove("hidden");
      dimStatus.textContent = "🛡️ SHIELD NOW · Clear in " + evalRes.secondsRemaining + "s";
      dimNext.textContent = "Safe again at " + evalRes.scene.end;
    } else {
      liveBox.classList.add(sofaRunning ? "state-clear" : "state-idle");
      badge.textContent = sofaRunning ? "✅ Watching Safely" : "Ready to Sync";
      skipHint.classList.add("hidden");
      if (evalRes.nextScene) {
        const minsAway = Math.max(1, Math.round(evalRes.nextScene.secondsUntil / 60));
        msg.textContent = sofaRunning
          ? "All clear right now. Next alert at " + evalRes.nextScene.scene.start + " (~" + minsAway + " min away)."
          : "Tap Sync With TV when your show starts. First alert at " + evalRes.nextScene.scene.start + ".";
        dimStatus.textContent = "🌙 Sofa Buzz Active · All Clear";
        dimNext.textContent = "Next 15s buzz at " + evalRes.nextScene.scene.start;
      } else {
        msg.textContent = sofaRunning
          ? "All clear for the rest of " + (titleObj ? titleObj.title : "this title") + "!"
          : "Press Play on your TV remote and tap Sync With TV below.";
        dimStatus.textContent = "🌙 Sofa Buzz Active · Clear";
        dimNext.textContent = "Zero remaining trigger alerts.";
      }
    }
  }

  function toggleSofaTimer() {
    const btn = document.getElementById("sofaPlayPauseBtn");
    if (!sofaRunning) {
      if (!state.isPro && state.sofaSessionsUsed >= CALMBLUR_CONFIG.freeSofaSessionsAllowed) {
        openModal("upgradeModal");
        return;
      }
      if (sofaElapsedSec === 0) {
        const startInput = document.getElementById("sofaStartOffsetInput").value;
        sofaElapsedSec = CALMBLUR_ENGINE.parseTimestamp(startInput);
        state.sofaSessionsUsed += 1;
        saveState();
      }
      sofaStartedWallMs = Date.now() - sofaElapsedSec * 1000;
      sofaRunning = true;
      btn.textContent = "⏸ Pause TV Timer";
      requestPhoneWakeLock();
      playGentleChime();
      sofaTickTimer = setInterval(updateSofaTick, 400);
      updateSofaTick();
    } else {
      sofaRunning = false;
      clearInterval(sofaTickTimer);
      releasePhoneWakeLock();
      btn.textContent = "▶ Resume TV Timer";
      updateSofaTick();
    }
  }

  // Tab 2: 24-Second Interactive Cinema Auto-Blur Demo
  let demoInterval = null;
  function runInteractiveDemo() {
    if (demoInterval) clearInterval(demoInterval);
    const surface = document.getElementById("demoVideoSurface");
    const banner = document.getElementById("demoShieldBanner");
    const bTitle = document.getElementById("demoShieldTitle");
    const bSub = document.getElementById("demoShieldSub");
    const capBar = document.getElementById("demoCaptionBar");
    const prog = document.getElementById("demoProgressBar");
    const label = document.getElementById("demoSceneVisualLabel");
    const btn = document.getElementById("demoStartBtn");

    const script = [
      { at: 0, dur: 4, scene: "🚗 Late-Night Drive · Calm Dialogue", caption: "“Are you sure this shortcut gets us back before midnight?”", shield: null },
      { at: 4, dur: 3, scene: "🚗 Passenger Looks Pale", caption: "“Pull the car over... I think I'm going to be sick.”", shield: { title: "🛡️ CalmBlur Active · Vomit Warning Shielded", sub: "Video frost-blurred & audio muted automatically via [CC] cue" } },
      { at: 7, dur: 5, scene: "🌫️ Roadside Trigger Moment (Hidden!)", caption: "[retching and gagging loudly] — (Plot note: Passenger steps outside car)", shield: { title: "🛡️ CalmBlur Active · [retching] Cue Blocked", sub: "Screen blurred + sound muted · Safe dialogue kept visible" } },
      { at: 12, dur: 4, scene: "🚗 Back on the Road · Crystal Clear", caption: "“Okay, breathe... drink a sip of water, we're five minutes from home.”", shield: null },
      { at: 16, dur: 4, scene: "🍿 Diner Booth · Misophonia Cue", caption: "[chewing crisps and slurping loudly]", shield: { title: "🔇 Misophonia Mute · [chewing & slurping] Muted", sub: "Audio muted cleanly for 4s — zero rage spike!" }, muteOnly: true },
      { at: 20, dur: 4, scene: "✅ Diner Booth · Safe & Relaxed", caption: "“See? Zero panic spikes, and you didn't miss a second of the story.”", shield: null }
    ];

    const startMs = Date.now();
    btn.textContent = "🔄 Restart 24s Demo";

    demoInterval = setInterval(function () {
      const sec = (Date.now() - startMs) / 1000;
      if (sec >= 24) {
        clearInterval(demoInterval);
        surface.classList.remove("blurred");
        banner.classList.add("hidden");
        prog.style.width = "100%";
        btn.textContent = "▶ Play 24s Live Demo Again";
        return;
      }
      prog.style.width = Math.min(100, (sec / 24) * 100).toFixed(1) + "%";
      for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (sec >= step.at && sec < step.at + step.dur) {
          label.textContent = step.scene;
          capBar.textContent = step.caption;
          if (step.shield) {
            bTitle.textContent = step.shield.title;
            bSub.textContent = step.shield.sub;
            banner.classList.remove("hidden");
            if (step.muteOnly) {
              surface.classList.remove("blurred");
            } else {
              surface.classList.add("blurred");
            }
          } else {
            surface.classList.remove("blurred");
            banner.classList.add("hidden");
          }
          break;
        }
      }
    }, 150);
  }

  // Tab 3: Search & Filter Titles
  let currentQuickFilter = "";
  function renderSearchResults() {
    const qInput = document.getElementById("titleSearchInput");
    const rawQuery = (qInput ? qInput.value : "").trim();
    const effectiveQuery = rawQuery || currentQuickFilter;
    const results = CALMBLUR_ENGINE.searchTitles(effectiveQuery, communityTitles);

    const container = document.getElementById("titlesListContainer");
    container.textContent = "";

    results.forEach(function (item) {
      const card = document.createElement("div");
      card.className = "title-card";

      const top = document.createElement("div");
      top.className = "title-card-top";

      const name = document.createElement("div");
      name.className = "title-name";
      name.textContent = item.title;

      const plat = document.createElement("span");
      plat.className = "platform-tag";
      plat.textContent = item.platform;

      top.appendChild(name);
      top.appendChild(plat);
      card.appendChild(top);

      const mid = document.createElement("div");
      if (item.safeOverall || item.scenes.length === 0) {
        const safe = document.createElement("span");
        safe.className = "safe-pill";
        safe.textContent = "✅ 100% Safe Comfort Pick";
        mid.appendChild(safe);
      } else {
        const list = document.createElement("div");
        list.className = "scene-mini-list";
        item.scenes.forEach(function (sc) {
          const cat = CALMBLUR_ENGINE.getCategory(sc.category);
          const line = document.createElement("div");
          const timeText = state.isPro ? " (" + sc.start + "–" + sc.end + ")" : " (Sync in Sofa Buzz)";
          line.textContent = (cat ? cat.emoji + " " + cat.shortLabel : sc.category) + timeText + " — " + sc.cue;
          list.appendChild(line);
        });
        mid.appendChild(list);
      }
      card.appendChild(mid);

      const openSofaBtn = document.createElement("button");
      openSofaBtn.type = "button";
      openSofaBtn.className = "btn-secondary btn-sm";
      openSofaBtn.textContent = "📱 Load in Smart TV Sofa Buzz";
      openSofaBtn.addEventListener("click", function () {
        populateSofaDropdown(item.id);
        sofaRunning = false;
        clearInterval(sofaTickTimer);
        sofaElapsedSec = 0;
        document.getElementById("sofaPlayPauseBtn").textContent = "▶ Sync With TV (Start)";
        renderSofaScenePreview();
        updateSofaTick();
        switchTab("sofa");
      });
      card.appendChild(openSofaBtn);

      container.appendChild(card);
    });
  }

  function switchTab(tabName) {
    document.querySelectorAll(".mode-tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });
    ["sofa", "demo", "search"].forEach(function (name) {
      const panel = document.getElementById("tab-" + name);
      if (panel) panel.classList.toggle("hidden", name !== tabName);
    });
  }

  function initEvents() {
    document.querySelectorAll(".mode-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-tab"));
      });
    });

    document.getElementById("defaultActionSelect").addEventListener("change", function (e) {
      if (!state.isPro && e.target.value !== "blur_mute") {
        e.target.value = "blur_mute";
        openModal("upgradeModal");
        return;
      }
      state.defaultAction = e.target.value;
      saveState();
    });

    document.getElementById("addCustomWordBtn").addEventListener("click", function () {
      const inp = document.getElementById("customWordInput");
      const val = String(inp.value || "").trim().toLowerCase();
      if (!val) return;
      if (!state.isPro) {
        openModal("upgradeModal");
        return;
      }
      if (state.customWords.indexOf(val) === -1) {
        state.customWords.push(val);
        saveState();
        renderHeaderAndShields();
      }
      inp.value = "";
    });

    // Sofa TV controls
    document.getElementById("sofaTitleSelect").addEventListener("change", function () {
      sofaRunning = false;
      clearInterval(sofaTickTimer);
      sofaElapsedSec = 0;
      document.getElementById("sofaPlayPauseBtn").textContent = "▶ Sync With TV (Start)";
      renderSofaScenePreview();
      updateSofaTick();
    });

    document.getElementById("sofaPlayPauseBtn").addEventListener("click", toggleSofaTimer);
    document.getElementById("sofaBack10Btn").addEventListener("click", function () {
      sofaElapsedSec = Math.max(0, sofaElapsedSec - 10);
      sofaStartedWallMs = Date.now() - sofaElapsedSec * 1000;
      updateSofaTick();
    });
    document.getElementById("sofaFwd10Btn").addEventListener("click", function () {
      sofaElapsedSec += 10;
      sofaStartedWallMs = Date.now() - sofaElapsedSec * 1000;
      updateSofaTick();
    });
    document.getElementById("sofaNightDimBtn").addEventListener("click", function () {
      document.getElementById("nightDimOverlay").classList.remove("hidden");
      requestPhoneWakeLock();
    });
    document.getElementById("exitNightDimBtn").addEventListener("click", function () {
      document.getElementById("nightDimOverlay").classList.add("hidden");
    });
    document.getElementById("sofaTestBuzzBtn").addEventListener("click", function () {
      triggerPhoneAlert();
    });

    document.getElementById("installPhoneGuideBtn").addEventListener("click", function () {
      openModal("phoneGuideModal");
    });

    // Demo
    document.getElementById("demoStartBtn").addEventListener("click", runInteractiveDemo);

    // Search & Filters
    document.getElementById("titleSearchInput").addEventListener("input", renderSearchResults);
    document.querySelectorAll(".filter-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        currentQuickFilter = chip.getAttribute("data-filter") || "";
        document.getElementById("titleSearchInput").value = "";
        renderSearchResults();
      });
    });

    // Populate community category dropdown
    const newCatSel = document.getElementById("newSceneCategory");
    CALMBLUR_ENGINE.TRIGGER_CATEGORIES.forEach(function (c) {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.emoji + " " + c.label;
      newCatSel.appendChild(o);
    });

    document.getElementById("addSceneForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const title = document.getElementById("newSceneTitle").value.trim();
      const platform = document.getElementById("newScenePlatform").value.trim() || "Streaming";
      const category = document.getElementById("newSceneCategory").value;
      const start = document.getElementById("newSceneStart").value.trim();
      const end = document.getElementById("newSceneEnd").value.trim();
      const cue = document.getElementById("newSceneCue").value.trim() || "Community tagged cue";
      if (!title || !start || !end) return;

      const newEntry = {
        id: "comm-" + Date.now(),
        title: title,
        platform: platform,
        year: 2026,
        runtimeMin: 60,
        safeOverall: false,
        scenes: [{ category: category, start: start, end: end, cue: cue, note: "Saved on your device" }]
      };
      communityTitles.unshift(newEntry);
      try { localStorage.setItem(COMMUNITY_KEY, JSON.stringify(communityTitles)); } catch (_) {}
      e.target.reset();
      populateSofaDropdown(newEntry.id);
      renderSofaScenePreview();
      renderSearchResults();
      switchTab("sofa");
    });

    // Modals & License Key activation
    document.getElementById("openUpgradeModalBtn").addEventListener("click", function () {
      openModal("upgradeModal");
    });
    document.getElementById("openKeyModalBtn").addEventListener("click", function () {
      openModal("keyModal");
    });
    document.getElementById("switchToKeyModalBtn").addEventListener("click", function () {
      closeModal("upgradeModal");
      openModal("keyModal");
    });

    document.querySelectorAll(".modal-close").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeModal(btn.getAttribute("data-close"));
      });
    });

    document.getElementById("verifyKeyBtn").addEventListener("click", async function () {
      const input = document.getElementById("licenseKeyInput");
      const fb = document.getElementById("licenseKeyFeedback");
      const btn = document.getElementById("verifyKeyBtn");
      fb.classList.remove("hidden");
      fb.textContent = "Checking your subscription key with Polar...";
      btn.disabled = true;

      const res = await CALMBLUR_CONFIG.validatePolarKey(input.value);
      btn.disabled = false;

      if (res.valid) {
        state.isPro = true;
        state.licenseKey = input.value.trim();
        state.planLabel = res.plan;
        state.lastValidatedAt = Date.now();
        state.activeCategories = CALMBLUR_ENGINE.TRIGGER_CATEGORIES.map(function (c) { return c.id; });
        saveState();
        renderHeaderAndShields();
        renderSofaScenePreview();
        renderSearchResults();
        fb.textContent = "✅ Pass Activated! All 10 trigger shields & unlimited Sofa TV Buzz unlocked.";
        setTimeout(function () { closeModal("keyModal"); }, 1100);
      } else {
        fb.textContent = "❌ " + (res.error || "Invalid Pass key.");
      }
    });

    // Auto-open license modal when Polar redirects back with ?purchased=1
    if (window.location.search.indexOf("purchased=1") !== -1) {
      openModal("keyModal");
    }
  }

  async function boot() {
    loadState();
    await CALMBLUR_CONFIG.loadRemoteConfig();
    syncCheckoutLinks();
    populateSofaDropdown();
    renderHeaderAndShields();
    renderSofaScenePreview();
    updateSofaTick();
    renderSearchResults();
    initEvents();
    autoVerifySubscriptionIfDue();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
