(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/content/constants.js
  var UI_IDS, DEFAULT_CONTENT_MAP;
  var init_constants = __esm({
    "src/content/constants.js"() {
      UI_IDS = {
        overlayRoot: "eds-inspector-overlay-root"
      };
      DEFAULT_CONTENT_MAP = [
        // Headings: h1-h6
        { selector: "h1", name: "heading (h1)", category: "heading" },
        { selector: "h2", name: "heading (h2)", category: "heading" },
        { selector: "h3", name: "heading (h3)", category: "heading" },
        { selector: "h4", name: "heading (h4)", category: "heading" },
        { selector: "h5", name: "heading (h5)", category: "heading" },
        { selector: "h6", name: "heading (h6)", category: "heading" },
        // Text: p
        { selector: "p", name: "text", category: "text" },
        // Images: picture, img
        { selector: "picture", name: "image", category: "image" },
        { selector: "img", name: "image", category: "image" },
        // Lists: ul, ol
        { selector: "ul", name: "list (unordered)", category: "list" },
        { selector: "ol", name: "list (ordered)", category: "list" },
        // Code: pre, code
        { selector: "pre", name: "code", category: "code" },
        { selector: "code", name: "code", category: "code" },
        // Other semantic elements
        { selector: "table", name: "table", category: "table" },
        { selector: "blockquote", name: "blockquote", category: "quote" },
        { selector: "video", name: "video", category: "media" }
      ];
    }
  });

  // src/content/state.js
  var state;
  var init_state = __esm({
    "src/content/state.js"() {
      state = {
        sections: [],
        blocks: [],
        overlays: [],
        overlaysEnabled: { sections: true, blocks: true, defaultContent: true },
        overlaysVisible: true,
        // オーバーレイ全体の表示状態
        selectedBlockId: null,
        codeBasePath: null,
        mediaBasePath: null,
        codeTree: null,
        mediaFiles: null,
        ssrDocuments: /* @__PURE__ */ new Map(),
        // 複数のSSRドキュメント（URL -> Documentオブジェクト）
        htmlDocuments: /* @__PURE__ */ new Map(),
        // 生のHTML文字列（URL -> HTML文字列）
        mainDocumentUrl: null,
        // メインドキュメントのURL
        icons: [],
        // アイコンの一覧
        jsonFiles: null,
        // JSONファイルの一覧
        scriptFiles: null,
        // JSファイルの一覧（/blocks/*.js以外）
        isAnalyzed: false
        // 解析済みかどうかのフラグ
      };
    }
  });

  // src/content/overlay/manager.js
  function createOverlayRoot() {
    let root = document.getElementById(UI_IDS.overlayRoot);
    if (root) return root;
    root = document.createElement("div");
    root.id = UI_IDS.overlayRoot;
    root.style.position = "absolute";
    root.style.top = "0";
    root.style.left = "0";
    root.style.width = "100%";
    root.style.height = `${document.documentElement.scrollHeight}px`;
    root.style.pointerEvents = "none";
    root.style.zIndex = "2147483646";
    document.body.appendChild(root);
    return root;
  }
  function ensureOverlayRootSizing(root) {
    if (!root) return;
    const doc = document.documentElement;
    const body = document.body || { scrollHeight: 0, scrollWidth: 0 };
    const height = Math.max(doc.scrollHeight, doc.clientHeight, body.scrollHeight, body.clientHeight || 0);
    const width = Math.max(doc.scrollWidth, doc.clientWidth, body.scrollWidth, body.clientWidth || 0);
    root.style.height = `${height}px`;
    root.style.width = `${width}px`;
  }
  async function checkExtensionAvailable2() {
    const now = Date.now();
    if (now - lastExtensionCheck < EXTENSION_CHECK_INTERVAL) {
      return extensionAvailable;
    }
    lastExtensionCheck = now;
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "ping" }, (response2) => {
          if (chrome.runtime.lastError) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
        setTimeout(() => resolve(false), 200);
      });
      extensionAvailable = response;
      return extensionAvailable;
    } catch (e) {
      extensionAvailable = false;
      return false;
    }
  }
  async function refreshOverlayPositions() {
    const root = document.getElementById(UI_IDS.overlayRoot);
    if (!root) {
      console.warn("[EDS Inspector] Overlay root not found");
      return;
    }
    ensureOverlayRootSizing(root);
    const extensionAvailable2 = await checkExtensionAvailable2();
    if (!extensionAvailable2) {
      console.log("[EDS Inspector] Extension not available, hiding overlays");
      root.style.display = "none";
      state.overlaysVisible = false;
      return;
    }
    if (!state.overlaysVisible) {
      console.log("[EDS Inspector] Overlays not visible, hiding root. State:", {
        overlaysVisible: state.overlaysVisible,
        overlaysEnabled: state.overlaysEnabled,
        overlaysCount: state.overlays.length
      });
      root.style.display = "none";
      return;
    }
    if (state.overlays.length === 0) {
      console.log("[EDS Inspector] No overlays to display");
      return;
    }
    root.style.display = "block";
    const viewportOffset = { x: window.scrollX, y: window.scrollY };
    let displayedCount = 0;
    let defaultContentDisplayedCount = 0;
    state.overlays.forEach((overlay) => {
      const { element, target } = overlay;
      if (!target || !element) {
        console.warn("[EDS Inspector] Invalid overlay:", overlay);
        return;
      }
      const rect = target.getBoundingClientRect();
      element.style.transform = `translate(${rect.left + viewportOffset.x}px, ${rect.top + viewportOffset.y}px)`;
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      let enabled = false;
      if (overlay.item.id.startsWith("section-")) {
        enabled = state.overlaysEnabled.sections;
      } else {
        const isDefaultContent = overlay.item.category && overlay.item.category !== "block" && overlay.item.category !== "button" && overlay.item.category !== "icon";
        if (isDefaultContent) {
          enabled = state.overlaysEnabled.defaultContent;
          if (!enabled) {
            console.log("[EDS Inspector] Default Content overlay disabled:", {
              id: overlay.item.id,
              name: overlay.item.name,
              category: overlay.item.category,
              overlaysEnabled: state.overlaysEnabled,
              visible: overlay.visible
            });
          }
        } else {
          enabled = state.overlaysEnabled.blocks;
        }
      }
      const shouldDisplay = overlay.visible && enabled;
      element.style.display = shouldDisplay ? "block" : "none";
      if (shouldDisplay) {
        displayedCount++;
        const isDefaultContent = overlay.item.category && overlay.item.category !== "block" && overlay.item.category !== "button" && overlay.item.category !== "icon";
        if (isDefaultContent) {
          defaultContentDisplayedCount++;
        }
      }
    });
    const defaultContentOverlays = state.overlays.filter((o) => {
      const cat = o.item.category;
      return cat && cat !== "block" && cat !== "button" && cat !== "icon";
    });
    console.log("[EDS Inspector] Refreshed overlay positions:", {
      totalOverlays: state.overlays.length,
      defaultContentOverlays: defaultContentOverlays.length,
      displayedCount,
      defaultContentDisplayedCount,
      overlaysVisible: state.overlaysVisible,
      overlaysEnabled: state.overlaysEnabled,
      defaultContentDetails: defaultContentOverlays.map((o) => ({
        id: o.item.id,
        name: o.item.name,
        category: o.item.category,
        visible: o.visible,
        enabled: state.overlaysEnabled.defaultContent
      }))
    });
    if (defaultContentDisplayedCount === 0 && defaultContentOverlays.length > 0) {
      console.warn("[EDS Inspector] No Default Content overlays displayed:", {
        defaultContentOverlaysCount: defaultContentOverlays.length,
        defaultContentDisplayedCount,
        overlaysEnabled: state.overlaysEnabled,
        defaultContentOverlays: defaultContentOverlays.map((o) => ({
          id: o.item.id,
          name: o.item.name,
          category: o.item.category,
          visible: o.visible,
          enabled: state.overlaysEnabled.defaultContent
        }))
      });
    }
  }
  async function toggleOverlays() {
    state.overlaysVisible = !state.overlaysVisible;
    await refreshOverlayPositions();
    console.log("[EDS Inspector] Overlays toggled, visible:", state.overlaysVisible);
  }
  function setHighlight(id) {
    state.overlays.forEach((overlay) => {
      overlay.element.classList.toggle("is-highlighted", overlay.item.id === id);
    });
  }
  function destroy() {
    const overlay = document.getElementById(UI_IDS.overlayRoot);
    if (overlay) overlay.remove();
    state.overlays = [];
  }
  function attachGlobalListeners() {
    window.addEventListener("scroll", () => {
      refreshOverlayPositions().catch(console.error);
    }, true);
    window.addEventListener("resize", () => {
      refreshOverlayPositions().catch(console.error);
    }, true);
    const resizeObserver = new ResizeObserver(() => {
      refreshOverlayPositions().catch(console.error);
    });
    resizeObserver.observe(document.documentElement);
  }
  var lastExtensionCheck, extensionAvailable, EXTENSION_CHECK_INTERVAL;
  var init_manager = __esm({
    "src/content/overlay/manager.js"() {
      init_constants();
      init_state();
      lastExtensionCheck = 0;
      extensionAvailable = false;
      EXTENSION_CHECK_INTERVAL = 1e3;
    }
  });

  // src/content/utils/config.js
  async function resolveConfig() {
    const maybe = window.hlx || window.hlxRUM || {};
    state.codeBasePath = maybe.codeBasePath || null;
    state.mediaBasePath = maybe.mediaBasePath || null;
    if (state.codeBasePath && state.mediaBasePath) return;
    const candidates = ["/.helix/config.json", "/helix-config.json"];
    for (const path of candidates) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          const json = await res.json();
          state.codeBasePath = state.codeBasePath || json.codeBasePath;
          state.mediaBasePath = state.mediaBasePath || json.mediaBasePath;
          break;
        }
      } catch (e) {
      }
    }
  }
  async function parseSSRDocuments(htmlDocuments) {
    const ssrDocuments = /* @__PURE__ */ new Map();
    const parser = new DOMParser();
    const mainUrl = window.location.href.split("?")[0];
    try {
      const res = await fetch(mainUrl, { credentials: "include" });
      if (res.ok) {
        const html = await res.text();
        if (!htmlDocuments.has(mainUrl)) {
          htmlDocuments.set(mainUrl, html);
        }
        const doc = parser.parseFromString(html, "text/html");
        ssrDocuments.set(mainUrl, doc);
        console.log("[EDS Inspector] Parsed main SSR document:", mainUrl);
      }
    } catch (err) {
      console.warn("[EDS Inspector] Failed to fetch main SSR markup", err);
    }
    for (const [url, html] of htmlDocuments.entries()) {
      if (html && url !== mainUrl) {
        try {
          const doc = parser.parseFromString(html, "text/html");
          ssrDocuments.set(url, doc);
          console.log("[EDS Inspector] Parsed SSR document:", url);
        } catch (err) {
          console.warn("[EDS Inspector] Failed to parse SSR document:", url, err);
        }
      }
    }
    return ssrDocuments;
  }
  var init_config = __esm({
    "src/content/utils/config.js"() {
      init_state();
    }
  });

  // src/content/collectors/resources.js
  function collectBlockResourceNames() {
    const blockNames = /* @__PURE__ */ new Set();
    const addFromUrl = (urlString) => {
      try {
        const { pathname } = new URL(urlString, window.location.href);
        const match = pathname.match(/\/blocks\/([^/]+)\//);
        if (match && match[1]) {
          blockNames.add(match[1]);
          console.log("[EDS Inspector] Found block resource:", match[1], "from URL:", urlString);
        }
      } catch (e) {
      }
    };
    performance.getEntriesByType("resource").forEach((entry) => {
      addFromUrl(entry.name);
    });
    document.querySelectorAll('link[href*="/blocks/"], script[src*="/blocks/"]').forEach((el) => {
      const url = el.getAttribute("href") || el.getAttribute("src");
      if (url) addFromUrl(url);
    });
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name) addFromUrl(entry.name);
        });
      });
      observer.observe({ entryTypes: ["resource"] });
    } catch (e) {
    }
    console.log("[EDS Inspector] Collected block names:", Array.from(blockNames));
    return blockNames;
  }
  function collectIconNames() {
    const iconMap = /* @__PURE__ */ new Map();
    const addFromUrl = (urlString) => {
      try {
        const { pathname, origin } = new URL(urlString, window.location.href);
        if (!pathname.startsWith("/icons/")) {
          return;
        }
        const match = pathname.match(/^\/icons\/([^/]+)/);
        if (match && match[1]) {
          let iconName = match[1].replace(/\.(svg|png|jpg|jpeg|gif|webp)$/i, "");
          if (iconName.startsWith("icon-")) {
            iconName = iconName.replace(/^icon-/, "");
          }
          const fullUrl = `${origin}${pathname}`;
          iconMap.set(iconName, fullUrl);
          console.log("[EDS Inspector] Found icon resource:", iconName, "from URL:", urlString);
        }
      } catch (e) {
      }
    };
    performance.getEntriesByType("resource").forEach((entry) => {
      addFromUrl(entry.name);
    });
    document.querySelectorAll('link[href*="/icons/"], script[src*="/icons/"], img[src*="/icons/"]').forEach((el) => {
      const url = el.getAttribute("href") || el.getAttribute("src");
      if (url) addFromUrl(url);
    });
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name) addFromUrl(entry.name);
        });
      });
      observer.observe({ entryTypes: ["resource"] });
    } catch (e) {
    }
    console.log("[EDS Inspector] Collected icon names:", Array.from(iconMap.keys()));
    return iconMap;
  }
  function collectMediaFiles() {
    const mediaMap = /* @__PURE__ */ new Map();
    const mediaFilePattern = /^media_[0-9a-fA-F]{10,}\.[a-zA-Z0-9]+$/;
    const addFromUrl = (urlString) => {
      try {
        if (!urlString || typeof urlString !== "string") return;
        if (!urlString.includes("media_")) return;
        let url;
        try {
          url = new URL(urlString);
        } catch (e) {
          url = new URL(urlString, window.location.href);
        }
        const { pathname, origin } = url;
        const pathParts = pathname.split("/").filter((p) => p);
        let fileName = pathParts[pathParts.length - 1];
        if (!fileName) return;
        fileName = fileName.split("?")[0];
        if (mediaFilePattern.test(fileName)) {
          const urlWithoutQuery = `${origin}${pathname}`;
          mediaMap.set(fileName, urlWithoutQuery);
          console.log("[EDS Inspector] \u2713 Found media file:", fileName);
        } else {
          if (fileName.startsWith("media_")) {
            console.log("[EDS Inspector] \u2717 Media file pattern mismatch:", fileName);
            console.log("[EDS Inspector]   Pattern:", mediaFilePattern.toString());
            console.log("[EDS Inspector]   Full URL:", urlString);
            console.log("[EDS Inspector]   Pathname:", pathname);
          }
        }
      } catch (e) {
        if (urlString.includes("media_")) {
          console.warn("[EDS Inspector] Error parsing URL:", urlString, e);
        }
      }
    };
    const resources = performance.getEntriesByType("resource");
    console.log("[EDS Inspector] Checking", resources.length, "network resources for media files...");
    let mediaCount = 0;
    resources.forEach((entry) => {
      if (entry.name && entry.name.includes("media_")) {
        mediaCount++;
        addFromUrl(entry.name);
      }
    });
    console.log("[EDS Inspector] Found", mediaCount, 'resources containing "media_"');
    const mediaSelectors = [
      'img[src*="media_"]',
      'img[data-src*="media_"]',
      'video[src*="media_"]',
      'video[data-src*="media_"]',
      'source[src*="media_"]',
      'source[srcset*="media_"]',
      'picture source[srcset*="media_"]'
    ];
    const mediaElements = document.querySelectorAll(mediaSelectors.join(", "));
    console.log("[EDS Inspector] Checking", mediaElements.length, "DOM elements for media files...");
    mediaElements.forEach((el) => {
      const url = el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("srcset");
      if (url) {
        const firstUrl = url.split(",")[0].trim().split(" ")[0];
        addFromUrl(firstUrl);
      }
    });
    const collectedFiles = Array.from(mediaMap.keys());
    console.log("[EDS Inspector] Collected media files:", collectedFiles.length, "files:", collectedFiles);
    return mediaMap;
  }
  var init_resources = __esm({
    "src/content/collectors/resources.js"() {
    }
  });

  // src/content/collectors/html-documents.js
  async function collectHtmlDocuments() {
    const htmlDocuments = /* @__PURE__ */ new Map();
    console.log("[EDS Inspector HTML] Starting collection of .plain.html documents");
    const resources = performance.getEntriesByType("resource");
    console.log("[EDS Inspector HTML] Total resources:", resources.length);
    const htmlCandidates = resources.filter((r) => r.name && r.name.includes(".plain.html"));
    console.log("[EDS Inspector HTML] Resources containing .plain.html:", htmlCandidates.length);
    htmlCandidates.forEach((entry) => {
      try {
        const url = new URL(entry.name, window.location.href);
        if (url.origin === window.location.origin) {
          const normalizedUrl = url.href.split("?")[0];
          htmlDocuments.set(normalizedUrl, null);
          console.log("[EDS Inspector HTML] Found .plain.html:", normalizedUrl);
        }
      } catch (e) {
      }
    });
    const mainUrl = window.location.href.split("?")[0];
    htmlDocuments.set(mainUrl, null);
    const fetchPromises = Array.from(htmlDocuments.keys()).map((url) => fetchHtmlDocument(url, htmlDocuments));
    await Promise.all(fetchPromises);
    console.log("[EDS Inspector HTML] Collected HTML documents:", htmlDocuments.size);
    return htmlDocuments;
  }
  async function fetchHtmlDocument(url, htmlDocuments) {
    try {
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const html = await response.text();
        htmlDocuments.set(url, html);
        console.log("[EDS Inspector HTML] Fetched HTML document:", url, "length:", html.length);
        return html;
      } else {
        console.warn("[EDS Inspector HTML] Failed to fetch HTML:", url, response.status);
        return null;
      }
    } catch (e) {
      console.warn("[EDS Inspector HTML] Error fetching HTML:", url, e);
      return null;
    }
  }
  var init_html_documents = __esm({
    "src/content/collectors/html-documents.js"() {
    }
  });

  // src/content/collectors/json.js
  function collectJsonFiles() {
    const jsonFiles = /* @__PURE__ */ new Map();
    const mainOrigin = window.location.origin;
    console.log("[EDS Inspector JSON] Starting collection, origin:", mainOrigin);
    const resources = performance.getEntriesByType("resource");
    console.log("[EDS Inspector JSON] Total resources:", resources.length);
    const jsonCandidates = resources.filter((r) => r.name && r.name.includes(".json"));
    console.log("[EDS Inspector JSON] Resources containing .json:", jsonCandidates.length);
    jsonCandidates.forEach((r) => {
      console.log("[EDS Inspector JSON] Candidate:", r.name);
    });
    resources.forEach((entry) => {
      const urlString = entry.name;
      if (!urlString || typeof urlString !== "string") return;
      if (!urlString.includes(".json")) return;
      try {
        let url;
        try {
          url = new URL(urlString);
        } catch (e) {
          url = new URL(urlString, window.location.href);
        }
        console.log("[EDS Inspector JSON] Processing:", urlString, "-> origin:", url.origin, "pathname:", url.pathname);
        console.log("[EDS Inspector JSON] Main origin:", mainOrigin);
        const mainDomain = mainOrigin.replace(/^https?:\/\//, "").split("/")[0];
        const resourceDomain = url.origin.replace(/^https?:\/\//, "").split("/")[0];
        const mainParts = mainDomain.split(".");
        const resourceParts = resourceDomain.split(".");
        const isSameDomain = url.origin === mainOrigin || mainParts.length >= 2 && resourceParts.length >= 2 && mainParts.slice(-2).join(".") === resourceParts.slice(-2).join(".");
        if (!isSameDomain) {
          console.log("[EDS Inspector JSON] Skipping different domain:", url.origin, "vs", mainOrigin);
          return;
        }
        const pathname = url.pathname;
        const isJsonFile = pathname.endsWith(".json");
        if (isJsonFile) {
          const pathParts = pathname.split("/").filter((p) => p);
          const filename = pathParts[pathParts.length - 1] || pathname;
          const normalizedUrl = url.toString();
          jsonFiles.set(normalizedUrl, {
            url: normalizedUrl,
            pathname,
            filename
          });
          console.log("[EDS Inspector JSON] \u2713 ADDED JSON:", filename, "->", normalizedUrl);
        } else {
          console.log("[EDS Inspector JSON] Pathname does not end with .json:", pathname);
        }
      } catch (e) {
        console.error("[EDS Inspector JSON] Error processing URL:", urlString, e);
      }
    });
    const collectedFiles = Array.from(jsonFiles.values());
    console.log("[EDS Inspector JSON] \u2713 FINAL RESULT: Collected", collectedFiles.length, "JSON files");
    if (collectedFiles.length > 0) {
      collectedFiles.forEach((f) => {
        console.log("[EDS Inspector JSON] File:", f.filename, f.url);
      });
    } else {
      console.error("[EDS Inspector JSON] \u274C NO JSON FILES FOUND!");
      console.error("[EDS Inspector JSON] All .json candidates:", jsonCandidates.map((r) => r.name));
    }
    return jsonFiles;
  }
  function setupJsonInterceptor() {
  }
  var init_json = __esm({
    "src/content/collectors/json.js"() {
    }
  });

  // src/content/collectors/scripts.js
  function collectScriptFiles() {
    const scriptFiles = /* @__PURE__ */ new Map();
    const mainOrigin = window.location.origin;
    console.log("[EDS Inspector Scripts] Starting collection, origin:", mainOrigin);
    const resources = performance.getEntriesByType("resource");
    console.log("[EDS Inspector Scripts] Total resources:", resources.length);
    const jsCandidates = resources.filter((r) => r.name && r.name.includes(".js"));
    console.log("[EDS Inspector Scripts] Resources containing .js:", jsCandidates.length);
    jsCandidates.forEach((r) => {
      console.log("[EDS Inspector Scripts] Candidate:", r.name);
    });
    resources.forEach((entry) => {
      const urlString = entry.name;
      if (!urlString || typeof urlString !== "string") return;
      if (!urlString.includes(".js")) return;
      try {
        let url;
        try {
          url = new URL(urlString);
        } catch (e) {
          url = new URL(urlString, window.location.href);
        }
        const mainDomain = mainOrigin.replace(/^https?:\/\//, "").split("/")[0];
        const resourceDomain = url.origin.replace(/^https?:\/\//, "").split("/")[0];
        const mainParts = mainDomain.split(".");
        const resourceParts = resourceDomain.split(".");
        const isSameDomain = url.origin === mainOrigin || mainParts.length >= 2 && resourceParts.length >= 2 && mainParts.slice(-2).join(".") === resourceParts.slice(-2).join(".");
        if (!isSameDomain) {
          console.log("[EDS Inspector Scripts] Skipping different domain:", url.origin, "vs", mainOrigin);
          return;
        }
        console.log("[EDS Inspector Scripts] Processing:", urlString, "-> origin:", url.origin, "pathname:", url.pathname);
        console.log("[EDS Inspector Scripts] Main origin:", mainOrigin);
        const pathname = url.pathname;
        if (pathname.includes("/blocks/") && pathname.endsWith(".js")) {
          console.log("[EDS Inspector Scripts] Skipping block JS:", pathname);
          return;
        }
        if (pathname.endsWith(".js")) {
          const pathParts = pathname.split("/").filter((p) => p);
          const filename = pathParts[pathParts.length - 1] || pathname;
          const normalizedUrl = url.toString();
          scriptFiles.set(normalizedUrl, {
            url: normalizedUrl,
            pathname,
            filename
          });
          console.log("[EDS Inspector Scripts] \u2713 Found script:", filename, "->", normalizedUrl);
        }
      } catch (e) {
        console.warn("[EDS Inspector Scripts] Error processing URL:", urlString, e);
      }
    });
    const collectedFiles = Array.from(scriptFiles.values());
    console.log("[EDS Inspector Scripts] \u2713 FINAL RESULT: Collected", collectedFiles.length, "script files");
    if (collectedFiles.length > 0) {
      collectedFiles.forEach((f) => {
        console.log("[EDS Inspector Scripts] File:", f.filename, f.url);
      });
    } else {
      console.error("[EDS Inspector Scripts] \u274C NO SCRIPT FILES FOUND!");
      console.error("[EDS Inspector Scripts] All .js candidates:", jsCandidates.map((r) => r.name));
    }
    return scriptFiles;
  }
  var init_scripts = __esm({
    "src/content/collectors/scripts.js"() {
    }
  });

  // src/content/utils/dom.js
  function computeElementPath(el, root) {
    const path = [];
    let current = el;
    while (current && current !== root) {
      const parent = current.parentElement;
      if (!parent) break;
      const idx = Array.from(parent.children).indexOf(current);
      path.unshift(idx);
      current = parent;
    }
    return path;
  }
  function findElementByPath(root, path) {
    let current = root;
    for (const idx of path) {
      if (!current || !current.children || !current.children[idx]) return null;
      current = current.children[idx];
    }
    return current;
  }
  function formatHtmlSnippet(el) {
    if (!el || !(el instanceof HTMLElement)) return "";
    return el.outerHTML;
  }
  var init_dom = __esm({
    "src/content/utils/dom.js"() {
    }
  });

  // src/content/detectors/sections.js
  function detectSections(ssrDocuments, mainSSR, mainLive) {
    const sections = [];
    const seenElements = /* @__PURE__ */ new Set();
    console.log("[EDS Inspector] Detecting sections...");
    console.log("[EDS Inspector] SSR documents count:", ssrDocuments.size);
    console.log("[EDS Inspector] SSR main children:", Array.from(mainSSR.children).map((c) => c.tagName));
    console.log("[EDS Inspector] Live main children:", Array.from(mainLive.children).map((c) => c.tagName));
    const ssrChildren = Array.from(mainSSR.children);
    const liveChildren = Array.from(mainLive.children);
    ssrChildren.forEach((ssrChild, index) => {
      if (!(ssrChild instanceof HTMLElement)) return;
      let liveElement = liveChildren[index];
      if (!liveElement || liveElement.tagName !== ssrChild.tagName) {
        const path = computeElementPath(ssrChild, mainSSR);
        liveElement = findElementByPath(mainLive, path);
      }
      if (!liveElement) {
        console.warn("[EDS Inspector] Could not find live element for section at index:", index);
        return;
      }
      if (seenElements.has(liveElement)) return;
      seenElements.add(liveElement);
      let sectionLabel = null;
      const sectionMetadata = ssrChild.querySelector(".section-metadata");
      if (sectionMetadata) {
        const metadataContainer = sectionMetadata.querySelector("div > div");
        if (metadataContainer) {
          const metadataCells = Array.from(metadataContainer.children);
          if (metadataCells.length >= 2) {
            const secondCell = metadataCells[1];
            const labelText = secondCell.textContent.trim();
            if (labelText) {
              sectionLabel = labelText;
            }
          }
        }
      }
      sections.push({
        id: `section-${sections.length}`,
        element: liveElement,
        label: sectionLabel
        // nullの場合は名前部分を省略
      });
      console.log("[EDS Inspector] Detected section:", sectionLabel, "element:", liveElement);
    });
    const sectionElements = mainSSR.querySelectorAll("section");
    sectionElements.forEach((ssrSection) => {
      if (!(ssrSection instanceof HTMLElement)) return;
      if (ssrSection.parentElement === mainSSR) return;
      const path = computeElementPath(ssrSection, mainSSR);
      const liveSection = findElementByPath(mainLive, path);
      if (!liveSection) return;
      if (seenElements.has(liveSection)) return;
      let parent = liveSection.parentElement;
      let isChildOfDetectedSection = false;
      while (parent && parent !== mainLive) {
        if (seenElements.has(parent)) {
          isChildOfDetectedSection = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (isChildOfDetectedSection) return;
      seenElements.add(liveSection);
      const label = ssrSection.getAttribute("data-section-id") || ssrSection.className || ssrSection.id || `section-${sections.length + 1}`;
      sections.push({
        id: `section-${sections.length}`,
        element: liveSection,
        label
      });
      console.log("[EDS Inspector] Detected nested section:", label);
    });
    console.log("[EDS Inspector] Detected sections:", sections.map((s) => ({ label: s.label, tagName: s.element.tagName })));
    return sections;
  }
  var init_sections = __esm({
    "src/content/detectors/sections.js"() {
      init_dom();
    }
  });

  // src/content/detectors/blocks.js
  function escapeCSS(className) {
    if (typeof CSS !== "undefined" && CSS.escape) {
      return CSS.escape(className);
    }
    return className.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
  }
  function detectBlocks(ssrDocuments, mainSSR, mainLive, blockResources) {
    const blocks = [];
    const seenElements = /* @__PURE__ */ new Set();
    console.log("[EDS Inspector] Block resources from network:", Array.from(blockResources));
    console.log("[EDS Inspector] SSR documents count:", ssrDocuments.size);
    console.log("[EDS Inspector] SSR main element:", mainSSR);
    console.log("[EDS Inspector] Live main element:", mainLive);
    detectBlocksFromResources(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements);
    detectBlocksFromSSR(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements);
    detectDefaultContent(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements);
    detectButtons(ssrDocuments, mainSSR, mainLive, blocks, seenElements);
    const defaultContentBlocks = blocks.filter((b) => {
      const cat = b.category;
      return cat && cat !== "block" && cat !== "button" && cat !== "icon";
    });
    console.log("[EDS Inspector] Detected blocks:", {
      total: blocks.length,
      defaultContent: defaultContentBlocks.length,
      blocks: blocks.map((b) => ({
        name: b.name,
        tagName: b.tagName,
        category: b.category,
        classes: b.classes
      }))
    });
    return blocks;
  }
  function isBlockRootElement(element, blockName) {
    if (!element || !element.parentElement) return true;
    if ((blockName === "header" || blockName === "footer") && element.tagName.toLowerCase() === blockName) {
      return true;
    }
    let parent = element.parentElement;
    while (parent) {
      const parentClasses = Array.from(parent.classList || []);
      if (parentClasses.includes(blockName)) {
        return false;
      }
      if ((blockName === "header" || blockName === "footer") && parent.tagName.toLowerCase() === blockName) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  }
  function detectBlocksFromResources(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements) {
    blockResources.forEach((blockName) => {
      if (blockName === "icon" || blockName.startsWith("icon-")) return;
      if (blockName === "section") return;
      let liveElements = [];
      try {
        if (blockName === "header" || blockName === "footer") {
          const tagElements = document.querySelectorAll(blockName);
          liveElements = Array.from(tagElements);
          console.log("[EDS Inspector] Block", blockName, "found by tag name:", liveElements.length);
        } else {
          liveElements = Array.from(mainLive.querySelectorAll(`.${escapeCSS(blockName)}`));
          if (liveElements.length === 0) {
            liveElements = Array.from(document.querySelectorAll(`.${escapeCSS(blockName)}`));
            if (liveElements.length > 0) {
              console.log("[EDS Inspector] Block", blockName, "found outside main:", liveElements.length);
            }
          }
        }
        liveElements.forEach((liveElement) => {
          if (!(liveElement instanceof HTMLElement)) return;
          if (blockName === "header" || blockName === "footer") {
            if (liveElement.tagName.toLowerCase() !== blockName) {
              return;
            }
          } else {
            const classList = Array.from(liveElement.classList);
            if (!classList.includes(blockName)) return;
          }
          const isOutsideMain = !mainLive.contains(liveElement);
          if (!isBlockRootElement(liveElement, blockName)) {
            return;
          }
          if (seenElements.has(liveElement)) return;
          if (isInsideBlock(liveElement, mainLive, blockResources, blockName)) {
            return;
          }
          let ssrElement = null;
          if (ssrDocuments.size > 0) {
            try {
              if (blockName === "fragment") {
                const dataPath = liveElement.getAttribute("data-path");
                if (dataPath) {
                  for (const [url, ssrDoc] of ssrDocuments.entries()) {
                    const mainSSRInDoc = ssrDoc.querySelector("main") || ssrDoc;
                    const fragmentLinks = Array.from(mainSSRInDoc.querySelectorAll('a[href*="/fragments/"]'));
                    const matchingLink = fragmentLinks.find((link) => {
                      const href = link.getAttribute("href");
                      if (!href) return false;
                      const fragmentsMatch = href.match(/\/fragments\/(.+)/);
                      if (!fragmentsMatch) return false;
                      const fragmentPath = "/fragments/" + fragmentsMatch[1].split(/[?#]/)[0];
                      return fragmentPath === dataPath;
                    });
                    if (matchingLink) {
                      ssrElement = matchingLink.parentElement;
                      console.log("[EDS Inspector] Found fragment SSR element for", dataPath, "in", url, ssrElement, "tag:", ssrElement.tagName.toLowerCase());
                      break;
                    }
                  }
                }
              } else {
                let allLiveElements = [];
                if (blockName === "header" || blockName === "footer") {
                  allLiveElements = Array.from(document.querySelectorAll(blockName));
                } else {
                  allLiveElements = Array.from(document.querySelectorAll(`.${escapeCSS(blockName)}`));
                }
                const liveIndex = Array.from(allLiveElements).indexOf(liveElement);
                if (liveIndex >= 0) {
                  for (const [url, ssrDoc] of ssrDocuments.entries()) {
                    let allSSRElements = [];
                    if (blockName === "header" || blockName === "footer") {
                      allSSRElements = Array.from(ssrDoc.querySelectorAll(blockName));
                    } else {
                      allSSRElements = Array.from(ssrDoc.querySelectorAll(`.${escapeCSS(blockName)}`));
                    }
                    console.log("[EDS Inspector] Searching SSR element for", blockName, "in", url, {
                      allSSRElementsCount: allSSRElements.length,
                      allLiveElementsCount: allLiveElements.length,
                      liveIndex,
                      isOutsideMain: !mainLive.contains(liveElement),
                      liveElementTag: liveElement.tagName.toLowerCase()
                    });
                    if (liveIndex >= 0 && liveIndex < allSSRElements.length) {
                      ssrElement = allSSRElements[liveIndex];
                      console.log("[EDS Inspector] Found SSR element for", blockName, "in", url, ssrElement, "tag:", ssrElement.tagName.toLowerCase());
                      break;
                    }
                  }
                }
              }
              if (!ssrElement && mainLive.contains(liveElement) && mainSSR) {
                const path = computeElementPath(liveElement, mainLive);
                const pathBasedElement = findElementByPath(mainSSR, path);
                if (pathBasedElement && blockName !== "header" && blockName !== "footer") {
                  let current = pathBasedElement;
                  let foundBlockElement = null;
                  while (current && current !== mainSSR) {
                    const classList = Array.from(current.classList || []);
                    if (classList.includes(blockName)) {
                      foundBlockElement = current;
                      break;
                    }
                    current = current.parentElement;
                  }
                  if (foundBlockElement) {
                    ssrElement = foundBlockElement;
                  }
                } else if (pathBasedElement) {
                  ssrElement = pathBasedElement;
                }
                if (!ssrElement) {
                  for (const [url, ssrDoc] of ssrDocuments.entries()) {
                    if (ssrDoc === mainSSR?.ownerDocument) continue;
                    const mainSSRInDoc = ssrDoc.querySelector("main") || ssrDoc;
                    const pathBasedElementInDoc = findElementByPath(mainSSRInDoc, path);
                    if (pathBasedElementInDoc && blockName !== "header" && blockName !== "footer") {
                      let current = pathBasedElementInDoc;
                      let foundBlockElement = null;
                      while (current && current !== mainSSRInDoc) {
                        const classList = Array.from(current.classList || []);
                        if (classList.includes(blockName)) {
                          foundBlockElement = current;
                          break;
                        }
                        current = current.parentElement;
                      }
                      if (foundBlockElement) {
                        ssrElement = foundBlockElement;
                        console.log("[EDS Inspector] Found SSR element for", blockName, "in", url, "via path-based search", ssrElement);
                        break;
                      }
                    } else if (pathBasedElementInDoc) {
                      ssrElement = pathBasedElementInDoc;
                      console.log("[EDS Inspector] Found SSR element for", blockName, "in", url, "via path-based search", ssrElement);
                      break;
                    }
                  }
                }
              }
              if (!ssrElement) {
                console.warn("[EDS Inspector] Could not find SSR element for", blockName, "in any SSR document");
              }
            } catch (e) {
              console.warn("[EDS Inspector] Error finding SSR element:", e);
            }
          }
          seenElements.add(liveElement);
          let sourceDocumentUrl = null;
          if (ssrElement) {
            for (const [url, ssrDoc] of ssrDocuments.entries()) {
              if (ssrDoc.contains(ssrElement)) {
                sourceDocumentUrl = url;
                break;
              }
            }
          }
          const blockData = {
            id: `block-${blocks.length}`,
            element: liveElement,
            // ルート要素を保存
            ssrElement,
            // SSR要素への参照を保存
            sourceDocumentUrl,
            // どのドキュメントから来たか
            name: blockName,
            tagName: liveElement.tagName.toLowerCase(),
            classes: liveElement.className || ""
          };
          blocks.push(blockData);
          console.log("[EDS Inspector] Detected block:", blockName, {
            rootElement: liveElement,
            ssrElement,
            hasSSRElement: !!ssrElement,
            sourceDocumentUrl,
            blockId: blockData.id,
            isOutsideMain: !mainLive.contains(liveElement)
          });
        });
      } catch (e) {
        console.warn("[EDS Inspector] Error querying for block:", blockName, e);
      }
    });
  }
  function detectBlocksFromSSR(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements) {
    const ssrBlockClasses = /* @__PURE__ */ new Set();
    for (const [url, ssrDoc] of ssrDocuments.entries()) {
      const mainSSRInDoc = ssrDoc.querySelector("main") || ssrDoc;
      const allSSRElements = mainSSRInDoc.querySelectorAll("*");
      allSSRElements.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const classList = Array.from(el.classList);
        classList.forEach((className) => {
          if (className && className !== "block" && !className.startsWith("section-") && !className.startsWith("icon-") && className !== "contained" && className.length > 2 && !className.includes(" ") && /^[a-z][a-z0-9-]*$/.test(className)) {
            ssrBlockClasses.add(className);
          }
        });
      });
    }
    console.log("[EDS Inspector] Potential block classes from SSR:", Array.from(ssrBlockClasses));
    ssrBlockClasses.forEach((blockName) => {
      if (blockResources.has(blockName)) return;
      if (blockName === "icon" || blockName.startsWith("icon-")) return;
      if (blockName === "section") return;
      try {
        let liveElements = Array.from(mainLive.querySelectorAll(`.${escapeCSS(blockName)}`));
        if (liveElements.length === 0) {
          liveElements = Array.from(document.querySelectorAll(`.${escapeCSS(blockName)}`));
          if (liveElements.length > 0) {
            console.log("[EDS Inspector] Block", blockName, "found outside main in SSR:", liveElements.length);
          }
        }
        liveElements.forEach((liveElement) => {
          if (!(liveElement instanceof HTMLElement)) return;
          const classList = Array.from(liveElement.classList);
          if (!classList.includes(blockName)) return;
          if (!isBlockRootElement(liveElement, blockName)) {
            return;
          }
          if (seenElements.has(liveElement)) return;
          if (isInsideBlock(liveElement, mainLive, blockResources, blockName)) {
            return;
          }
          let ssrElement = null;
          if (ssrDocuments.size > 0) {
            try {
              const allLiveElements = Array.from(document.querySelectorAll(`.${escapeCSS(blockName)}`));
              const liveIndex = Array.from(allLiveElements).indexOf(liveElement);
              if (liveIndex >= 0) {
                for (const [url, ssrDoc] of ssrDocuments.entries()) {
                  const allSSRElements = Array.from(ssrDoc.querySelectorAll(`.${escapeCSS(blockName)}`));
                  console.log("[EDS Inspector] Searching SSR element for", blockName, "in", url, {
                    allSSRElementsCount: allSSRElements.length,
                    allLiveElementsCount: allLiveElements.length,
                    liveIndex,
                    isOutsideMain: !mainLive.contains(liveElement)
                  });
                  if (liveIndex >= 0 && liveIndex < allSSRElements.length) {
                    ssrElement = allSSRElements[liveIndex];
                    console.log("[EDS Inspector] Found SSR element for", blockName, "in", url, ssrElement);
                    break;
                  }
                }
              }
              if (!ssrElement && mainLive.contains(liveElement) && mainSSR) {
                const path = computeElementPath(liveElement, mainLive);
                const pathBasedElement = findElementByPath(mainSSR, path);
                if (pathBasedElement && blockName !== "header" && blockName !== "footer") {
                  let current = pathBasedElement;
                  let foundBlockElement = null;
                  while (current && current !== mainSSR) {
                    const classList2 = Array.from(current.classList || []);
                    if (classList2.includes(blockName)) {
                      foundBlockElement = current;
                      break;
                    }
                    current = current.parentElement;
                  }
                  if (foundBlockElement) {
                    ssrElement = foundBlockElement;
                  }
                } else if (pathBasedElement) {
                  ssrElement = pathBasedElement;
                }
                if (!ssrElement) {
                  for (const [url, ssrDoc] of ssrDocuments.entries()) {
                    if (ssrDoc === mainSSR?.ownerDocument) continue;
                    const mainSSRInDoc = ssrDoc.querySelector("main") || ssrDoc;
                    const pathBasedElementInDoc = findElementByPath(mainSSRInDoc, path);
                    if (pathBasedElementInDoc && blockName !== "header" && blockName !== "footer") {
                      let current = pathBasedElementInDoc;
                      let foundBlockElement = null;
                      while (current && current !== mainSSRInDoc) {
                        const classList2 = Array.from(current.classList || []);
                        if (classList2.includes(blockName)) {
                          foundBlockElement = current;
                          break;
                        }
                        current = current.parentElement;
                      }
                      if (foundBlockElement) {
                        ssrElement = foundBlockElement;
                        console.log("[EDS Inspector] Found SSR element for", blockName, "in", url, "via path-based search", ssrElement);
                        break;
                      }
                    } else if (pathBasedElementInDoc) {
                      ssrElement = pathBasedElementInDoc;
                      console.log("[EDS Inspector] Found SSR element for", blockName, "in", url, "via path-based search", ssrElement);
                      break;
                    }
                  }
                }
              }
              if (!ssrElement) {
                console.warn("[EDS Inspector] Could not find SSR element for", blockName, "in any SSR document");
              }
            } catch (e) {
              console.warn("[EDS Inspector] Error finding SSR element:", e);
            }
          }
          seenElements.add(liveElement);
          let sourceDocumentUrl = null;
          if (ssrElement) {
            for (const [url, ssrDoc] of ssrDocuments.entries()) {
              if (ssrDoc.contains(ssrElement)) {
                sourceDocumentUrl = url;
                break;
              }
            }
          }
          blocks.push({
            id: `block-${blocks.length}`,
            element: liveElement,
            // ルート要素を保存
            ssrElement,
            // SSR要素への参照を保存
            sourceDocumentUrl,
            // どのドキュメントから来たか
            name: blockName,
            tagName: liveElement.tagName.toLowerCase(),
            classes: liveElement.className || ""
          });
          console.log("[EDS Inspector] Detected block (from SSR, no network resource):", blockName, "root element:", liveElement, "SSR element:", ssrElement, "sourceDocumentUrl:", sourceDocumentUrl);
        });
      } catch (e) {
        console.warn("[EDS Inspector] Error querying for SSR block:", blockName, e);
      }
    });
  }
  function detectDefaultContent(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements) {
    console.log("[EDS Inspector] Detecting default content blocks...", {
      ssrDocumentsCount: ssrDocuments.size,
      blockResourcesCount: blockResources.size,
      existingBlocksCount: blocks.length
    });
    const detectedBlockElements = /* @__PURE__ */ new Set();
    blocks.forEach((block) => {
      detectedBlockElements.add(block.element);
    });
    const collectBlockElements = (doc, isSSR = false) => {
      blockResources.forEach((blockName) => {
        try {
          let blockElements;
          if (blockName === "header" || blockName === "footer") {
            blockElements = doc.querySelectorAll(blockName);
          } else {
            blockElements = doc.querySelectorAll(`.${escapeCSS(blockName)}`);
          }
          blockElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              detectedBlockElements.add(el);
            }
          });
        } catch (e) {
        }
      });
    };
    collectBlockElements(document);
    ssrDocuments.forEach((ssrDoc) => {
      collectBlockElements(ssrDoc, true);
    });
    function isBlockElement(element, doc = document) {
      if (!element || !(element instanceof HTMLElement)) return false;
      if (detectedBlockElements.has(element)) return true;
      const classes = Array.from(element.classList || []);
      if (classes.some((cls) => blockResources.has(cls))) return true;
      let parent = element.parentElement;
      const root = doc.body || doc.documentElement;
      while (parent && parent !== root) {
        if (detectedBlockElements.has(parent)) return true;
        const parentClasses = Array.from(parent.classList || []);
        if (parentClasses.some((cls) => blockResources.has(cls))) return true;
        parent = parent.parentElement;
      }
      return false;
    }
    function isPictureDirectChildOfP(element) {
      if (!element || element.tagName.toLowerCase() !== "picture") return false;
      const parent = element.parentElement;
      return parent && parent.tagName.toLowerCase() === "p";
    }
    function findMatchingLiveElement(ssrElement, ssrDoc, mainSSRInDoc, contentDef) {
      const path = computeElementPath(ssrElement, mainSSRInDoc);
      let liveElement = findElementByPath(mainLive, path);
      if (liveElement && liveElement.tagName.toLowerCase() === contentDef.selector.toLowerCase()) {
        return liveElement;
      }
      liveElement = findElementByPath(document.body, path);
      if (liveElement && liveElement.tagName.toLowerCase() === contentDef.selector.toLowerCase()) {
        return liveElement;
      }
      const mainLiveElements = Array.from(mainLive.querySelectorAll(contentDef.selector));
      const mainSSRElements = Array.from(mainSSRInDoc.querySelectorAll(contentDef.selector));
      const ssrIndex = mainSSRElements.indexOf(ssrElement);
      if (ssrIndex >= 0 && ssrIndex < mainLiveElements.length) {
        const candidateElement = mainLiveElements[ssrIndex];
        if (candidateElement.tagName.toLowerCase() === contentDef.selector.toLowerCase()) {
          const ssrText = ssrElement.textContent?.trim() || "";
          const liveText = candidateElement.textContent?.trim() || "";
          const ssrTextShort = ssrText.substring(0, 50);
          const liveTextShort = liveText.substring(0, 50);
          if (ssrTextShort === liveTextShort || ssrText === "" && liveText === "") {
            return candidateElement;
          }
        }
      }
      return null;
    }
    DEFAULT_CONTENT_MAP.forEach((contentDef) => {
      for (const [url, ssrDoc] of ssrDocuments.entries()) {
        const mainSSRInDoc = ssrDoc.querySelector("main") || ssrDoc;
        let ssrElements;
        try {
          ssrElements = mainSSRInDoc.querySelectorAll(contentDef.selector);
          if (ssrElements.length === 0) {
            ssrElements = ssrDoc.querySelectorAll(contentDef.selector);
          }
        } catch (e) {
          console.warn("[EDS Inspector] Invalid selector:", contentDef.selector, e);
          continue;
        }
        ssrElements.forEach((ssrEl) => {
          if (!(ssrEl instanceof HTMLElement)) return;
          if (isBlockElement(ssrEl, ssrDoc)) {
            console.log("[EDS Inspector] Skipping SSR element (inside block):", {
              selector: contentDef.selector,
              element: ssrEl,
              tagName: ssrEl.tagName.toLowerCase()
            });
            return;
          }
          const isPictureInP = isPictureDirectChildOfP(ssrEl);
          if (isPictureInP && contentDef.selector === "picture") {
          } else if (isInsideParagraph(ssrEl, mainSSRInDoc) && contentDef.selector !== "p") {
            return;
          }
          const liveElement = findMatchingLiveElement(ssrEl, ssrDoc, mainSSRInDoc, contentDef);
          if (!liveElement) {
            console.log("[EDS Inspector] No matching live element found for SSR element:", {
              selector: contentDef.selector,
              ssrElement: ssrEl,
              tagName: ssrEl.tagName.toLowerCase(),
              path: computeElementPath(ssrEl, mainSSRInDoc)
            });
            return;
          }
          if (seenElements.has(liveElement)) return;
          if (isBlockElement(liveElement, document)) {
            console.log("[EDS Inspector] Skipping live element (inside block):", {
              selector: contentDef.selector,
              element: liveElement,
              tagName: liveElement.tagName.toLowerCase()
            });
            return;
          }
          const isLivePictureInP = isPictureDirectChildOfP(liveElement);
          if (!isLivePictureInP && isInsideParagraph(liveElement, mainLive) && contentDef.selector !== "p") {
            return;
          }
          seenElements.add(liveElement);
          blocks.push({
            id: `block-${blocks.length}`,
            element: liveElement,
            ssrElement: ssrEl,
            sourceDocumentUrl: url,
            name: contentDef.name,
            tagName: liveElement.tagName.toLowerCase(),
            classes: liveElement.className || "",
            category: contentDef.category || "default"
          });
          console.log("[EDS Inspector] \u2713 Detected default content:", {
            name: contentDef.name,
            category: contentDef.category || "default",
            selector: contentDef.selector,
            element: liveElement,
            ssrElement: ssrEl,
            sourceDocumentUrl: url,
            path: computeElementPath(ssrEl, mainSSRInDoc),
            isPictureInP: isPictureInP || isLivePictureInP,
            tagName: liveElement.tagName.toLowerCase()
          });
        });
      }
    });
    const detectedDefaultContent = blocks.filter((b) => {
      const cat = b.category;
      return cat && cat !== "block" && cat !== "button" && cat !== "icon";
    });
    console.log("[EDS Inspector] Default content detection complete:", {
      detectedCount: detectedDefaultContent.length,
      categories: [...new Set(detectedDefaultContent.map((b) => b.category))],
      items: detectedDefaultContent.map((b) => ({ name: b.name, category: b.category }))
    });
  }
  function detectButtons(ssrDocuments, mainSSR, mainLive, blocks, seenElements) {
    const buttonParagraphs = mainSSR.querySelectorAll("p");
    buttonParagraphs.forEach((ssrP) => {
      if (!(ssrP instanceof HTMLElement)) return;
      const link = ssrP.querySelector("a");
      if (!link) return;
      const children = Array.from(ssrP.children);
      if (children.length !== 1 || children[0].tagName.toLowerCase() !== "a") return;
      const path = computeElementPath(ssrP, mainSSR);
      const liveP = findElementByPath(mainLive, path);
      if (!liveP) return;
      if (seenElements.has(liveP)) return;
      if (!mainLive.contains(liveP)) return;
      seenElements.add(liveP);
      blocks.push({
        id: `block-${blocks.length}`,
        element: liveP,
        ssrElement: ssrP,
        // SSR要素への参照を保存
        name: "button",
        tagName: liveP.tagName.toLowerCase(),
        classes: liveP.className || "",
        category: "button"
      });
      console.log("[EDS Inspector] Detected button:", liveP);
    });
  }
  function isInsideBlock(element, mainLive, blockResources, currentBlockName) {
    let parent = element.parentElement;
    while (parent && parent !== mainLive) {
      const parentClasses = Array.from(parent.classList || []);
      if (parentClasses.some((cls) => blockResources.has(cls) && cls !== currentBlockName)) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }
  function isInsideParagraph(element, root) {
    let parent = element.parentElement;
    while (parent && parent !== root) {
      if (parent.tagName.toLowerCase() === "p") {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }
  var init_blocks = __esm({
    "src/content/detectors/blocks.js"() {
      init_dom();
      init_constants();
      init_state();
    }
  });

  // src/content/detectors/icons.js
  async function detectIcons(ssrDocuments, mainSSR, mainLive, iconResources) {
    const icons = [];
    const seenElements = /* @__PURE__ */ new Set();
    const seenIconNames = /* @__PURE__ */ new Set();
    await detectIconsFromResources(mainLive, iconResources, icons, seenElements, seenIconNames);
    detectIconsFromDOM(mainLive, icons, seenElements, seenIconNames);
    const uniqueIcons = [];
    const seenKeys = /* @__PURE__ */ new Set();
    icons.forEach((icon) => {
      const key = icon.name;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueIcons.push(icon);
      }
    });
    console.log("[EDS Inspector] Detected icons:", uniqueIcons.map((i) => ({ name: i.name, url: i.url })));
    return uniqueIcons;
  }
  async function detectIconsFromResources(mainLive, iconResources, icons, seenElements, seenIconNames) {
    for (const [iconName, iconUrl] of iconResources.entries()) {
      const selectors = [
        `span.icon-${CSS.escape(iconName)}`,
        `span.icon.icon-${CSS.escape(iconName)}`,
        `span[class*="icon-${CSS.escape(iconName)}"]`
      ];
      let found = false;
      for (const selector of selectors) {
        try {
          const liveIcons = mainLive.querySelectorAll(selector);
          for (const liveIcon of liveIcons) {
            if (seenElements.has(liveIcon)) continue;
            seenElements.add(liveIcon);
            found = true;
            const classes = liveIcon.className || "";
            const iconClassName = `icon-${iconName}`;
            let svgContent = await getIconSvg(liveIcon, iconUrl);
            icons.push({
              id: `icon-${icons.length}`,
              element: liveIcon,
              name: iconClassName,
              classes,
              svg: svgContent,
              url: iconUrl
            });
          }
        } catch (e) {
          console.warn("[EDS Inspector] Error querying for icon:", iconName, e);
        }
      }
      if (!found && !seenIconNames.has(iconName)) {
        seenIconNames.add(iconName);
        const svgContent = await fetchIconSvg(iconUrl);
        icons.push({
          id: `icon-${icons.length}`,
          element: null,
          name: `icon-${iconName}`,
          classes: "",
          svg: svgContent,
          url: iconUrl
        });
      }
    }
  }
  function detectIconsFromDOM(mainLive, icons, seenElements, seenIconNames) {
    const iconSelectors = [
      "span.icon",
      'span[class*="icon-"]'
    ];
    for (const selector of iconSelectors) {
      const liveIcons = mainLive.querySelectorAll(selector);
      for (const liveIcon of liveIcons) {
        if (seenElements.has(liveIcon)) continue;
        seenElements.add(liveIcon);
        const classes = liveIcon.className || "";
        const iconClass = classes.split(" ").find((cls) => cls.startsWith("icon-"));
        const iconName = iconClass || (classes.includes("icon") ? "icon" : "icon");
        if (seenIconNames.has(iconName.replace("icon-", ""))) continue;
        const svg = liveIcon.querySelector("svg");
        let svgContent = "";
        if (svg) {
          const svgClone = svg.cloneNode(true);
          svgClone.setAttribute("width", "48");
          svgClone.setAttribute("height", "48");
          svgClone.style.width = "48px";
          svgClone.style.height = "48px";
          svgContent = svgClone.outerHTML;
        }
        icons.push({
          id: `icon-${icons.length}`,
          element: liveIcon,
          name: iconName,
          classes,
          svg: svgContent,
          url: null
        });
      }
    }
  }
  async function getIconSvg(liveIcon, fallbackUrl) {
    const svg = liveIcon.querySelector("svg");
    if (svg) {
      const svgClone = svg.cloneNode(true);
      svgClone.setAttribute("width", "48");
      svgClone.setAttribute("height", "48");
      svgClone.style.width = "48px";
      svgClone.style.height = "48px";
      return svgClone.outerHTML;
    } else {
      return await fetchIconSvg(fallbackUrl);
    }
  }
  async function fetchIconSvg(iconUrl) {
    if (!iconUrl) return "";
    try {
      const response = await fetch(iconUrl);
      if (response.ok) {
        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = svgDoc.querySelector("svg");
        if (svgElement) {
          svgElement.setAttribute("width", "48");
          svgElement.setAttribute("height", "48");
          svgElement.style.width = "48px";
          svgElement.style.height = "48px";
          return svgElement.outerHTML;
        }
      }
    } catch (e) {
      console.warn("[EDS Inspector] Failed to fetch icon SVG:", iconUrl, e);
    }
    return "";
  }
  var init_icons = __esm({
    "src/content/detectors/icons.js"() {
    }
  });

  // src/content/overlay/element.js
  function createOverlayElement(item, type) {
    const el = document.createElement("div");
    if (type === "section") {
      el.className = "eds-overlay eds-overlay--section";
    } else {
      const isDefaultContent = item.category && item.category !== "block";
      if (isDefaultContent) {
        el.className = "eds-overlay eds-overlay--default-content";
      } else {
        el.className = "eds-overlay eds-overlay--block";
      }
    }
    el.dataset.overlayId = item.id;
    const label = document.createElement("div");
    label.className = "eds-overlay__label";
    if (type === "section") {
      if (item.label) {
        label.textContent = `Section: ${item.label}`;
      } else {
        label.textContent = "Section";
      }
    } else {
      const isDefaultContent = item.category && item.category !== "block";
      const prefix = isDefaultContent ? "Default Content:" : "Block:";
      label.textContent = `${prefix} ${item.name}`;
    }
    el.appendChild(label);
    el.addEventListener("click", (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      if (type === "block") {
        state.selectedBlockId = item.id;
      }
    });
    return el;
  }
  var init_element = __esm({
    "src/content/overlay/element.js"() {
      init_state();
    }
  });

  // src/content/overlay/builder.js
  function buildOverlays() {
    console.log("[EDS Inspector] Building overlays:", {
      sectionsCount: state.sections.length,
      blocksCount: state.blocks.length,
      overlaysEnabled: state.overlaysEnabled,
      overlaysVisible: state.overlaysVisible
    });
    const root = createOverlayRoot();
    root.innerHTML = "";
    state.overlays = [];
    state.sections.forEach((section) => {
      const el = createOverlayElement(section, "section");
      root.appendChild(el);
      state.overlays.push({ element: el, target: section.element, item: section, visible: state.overlaysEnabled.sections });
    });
    state.blocks.forEach((block) => {
      const el = createOverlayElement(block, "block");
      root.appendChild(el);
      const isDefaultContent = block.category && block.category !== "block" && block.category !== "button" && block.category !== "icon";
      state.overlays.push({ element: el, target: block.element, item: block, visible: true });
      if (isDefaultContent) {
        console.log("[EDS Inspector] Built overlay for Default Content:", {
          id: block.id,
          name: block.name,
          category: block.category,
          hasElement: !!block.element,
          hasTarget: !!block.element
        });
      }
    });
    const defaultContentOverlays = state.overlays.filter((o) => {
      const cat = o.item.category;
      return cat && cat !== "block" && cat !== "button" && cat !== "icon";
    });
    console.log("[EDS Inspector] Built overlays:", {
      total: state.overlays.length,
      defaultContent: defaultContentOverlays.length,
      overlaysEnabled: state.overlaysEnabled
    });
  }
  var init_builder = __esm({
    "src/content/overlay/builder.js"() {
      init_manager();
      init_element();
      init_state();
    }
  });

  // src/content/utils/path.js
  function parseRefRepoOwner(urlString) {
    try {
      const url = new URL(urlString);
      const match = url.hostname.match(/^(?<ref>[^-]+)--(?<repo>[^-]+)--(?<owner>[^.]+)/);
      if (match && match.groups) {
        return match.groups;
      }
    } catch (e) {
      return null;
    }
    return null;
  }
  function buildTreeFromPaths(paths) {
    const root = { name: "codebus", children: [] };
    paths.forEach((path) => {
      const parts = path.replace(/^\//, "").split("/");
      let current = root;
      parts.forEach((part, index) => {
        let child = current.children.find((c) => c.name === part);
        if (!child) {
          child = { name: part, children: [] };
          current.children.push(child);
        }
        if (index === parts.length - 1) {
          child.path = `/${parts.join("/")}`;
        }
        current = child;
      });
    });
    return root;
  }
  var init_path = __esm({
    "src/content/utils/path.js"() {
    }
  });

  // src/content/api/admin.js
  async function fetchAdminListing(basePath, filterFn) {
    const parsed = parseRefRepoOwner(basePath);
    if (!parsed) return null;
    const { owner, repo, ref } = parsed;
    const url = `https://admin.hlx.page/inspect/${owner}/${repo}/${ref}/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load listing: ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.entries)) return null;
    const filtered = filterFn ? json.entries.filter(filterFn) : json.entries;
    return filtered.map((entry) => entry.path);
  }
  var init_admin = __esm({
    "src/content/api/admin.js"() {
      init_path();
    }
  });

  // src/content/api/code-media.js
  async function loadCodeAndMedia() {
    if (state.codeBasePath) {
      try {
        const paths = await fetchAdminListing(state.codeBasePath, (entry) => entry.type === "file");
        if (paths && paths.length) {
          state.codeTree = buildTreeFromPaths(paths);
        }
      } catch (err) {
        console.warn("Code Bus listing failed", err);
      }
    }
    const networkMediaFiles = collectMediaFiles();
    let adminMediaFiles = [];
    if (state.mediaBasePath) {
      try {
        const mediaFilePattern = /^media_[0-9a-fA-F]{10,}\.[a-zA-Z0-9]+$/;
        const mediaPaths = await fetchAdminListing(state.mediaBasePath, (entry) => {
          if (entry.type !== "file") return false;
          const fileName = entry.path.split("/").pop();
          return mediaFilePattern.test(fileName);
        });
        if (mediaPaths) {
          adminMediaFiles = mediaPaths.map((path) => {
            const fileName = path.split("/").pop();
            const extension = fileName.split(".").pop().toLowerCase();
            const isVideo = ["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(extension);
            const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(extension);
            return {
              path,
              fileName,
              extension,
              isVideo,
              isImage,
              url: state.mediaBasePath ? `${state.mediaBasePath}${path}` : null
            };
          });
        }
      } catch (err) {
        console.warn("Media Bus listing failed", err);
      }
    }
    const mediaFilesMap = /* @__PURE__ */ new Map();
    adminMediaFiles.forEach((file) => {
      mediaFilesMap.set(file.fileName, file);
    });
    networkMediaFiles.forEach((url, fileName) => {
      if (!mediaFilesMap.has(fileName)) {
        const extension = fileName.split(".").pop().toLowerCase();
        const isVideo = ["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(extension);
        const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(extension);
        mediaFilesMap.set(fileName, {
          path: `/${fileName}`,
          fileName,
          extension,
          isVideo,
          isImage,
          url
        });
      }
    });
    state.mediaFiles = Array.from(mediaFilesMap.values());
    console.log("[EDS Inspector] Total media files:", state.mediaFiles.length);
    console.log("[EDS Inspector] Media files:", state.mediaFiles.map((f) => f.fileName));
  }
  var init_code_media = __esm({
    "src/content/api/code-media.js"() {
      init_state();
      init_admin();
      init_path();
      init_resources();
    }
  });

  // src/content/utils/serializer.js
  function serializeState() {
    console.log("[EDS Inspector Serializer] serializeState() called");
    console.log("[EDS Inspector Serializer] state.jsonFiles:", state.jsonFiles);
    console.log("[EDS Inspector Serializer] state.scriptFiles:", state.scriptFiles);
    if (state.jsonFiles) {
      console.log("[EDS Inspector Serializer] state.jsonFiles.size:", state.jsonFiles.size);
      const jsonArray = Array.from(state.jsonFiles.values());
      console.log("[EDS Inspector Serializer] jsonFiles array:", jsonArray);
    }
    if (state.scriptFiles) {
      console.log("[EDS Inspector Serializer] state.scriptFiles.size:", state.scriptFiles.size);
      const scriptArray = Array.from(state.scriptFiles.values());
      console.log("[EDS Inspector Serializer] scriptFiles array:", scriptArray);
    }
    const seenElements = /* @__PURE__ */ new Set();
    const allBlocks = [];
    state.blocks.forEach((block) => {
      if (seenElements.has(block.element)) return;
      seenElements.add(block.element);
      allBlocks.push(block);
    });
    const blocksByName = /* @__PURE__ */ new Map();
    allBlocks.forEach((block) => {
      const key = block.name;
      if (!blocksByName.has(key)) {
        blocksByName.set(key, {
          blocks: [],
          representative: block
          // 代表的なブロック（最初に見つかったもの）
        });
      }
      blocksByName.get(key).blocks.push(block);
    });
    return {
      sections: state.sections.map((section) => ({ id: section.id, label: section.label })),
      blocks: Array.from(blocksByName.entries()).map(([name, group]) => {
        const rep = group.representative;
        return {
          id: rep.id,
          // 代表的なブロックのIDを使用
          name: rep.name,
          tagName: rep.tagName,
          classes: rep.classes,
          category: rep.category || "block",
          count: group.blocks.length,
          // 同じ名前のブロック数
          sourceDocumentUrl: rep.sourceDocumentUrl || null
          // どのドキュメントから来たか
        };
      }),
      icons: state.icons.map((icon) => ({
        id: icon.id,
        name: icon.name,
        classes: icon.classes,
        svg: icon.svg,
        url: icon.url
      })),
      overlaysEnabled: { ...state.overlaysEnabled },
      selectedBlock: state.selectedBlockId,
      codeBasePath: state.codeBasePath,
      mediaBasePath: state.mediaBasePath,
      codeTree: state.codeTree,
      mediaFiles: state.mediaFiles ? state.mediaFiles.map((file) => ({
        path: file.path,
        fileName: file.fileName,
        extension: file.extension,
        isVideo: file.isVideo,
        isImage: file.isImage,
        url: file.url
      })) : null,
      jsonFiles: state.jsonFiles ? Array.from(state.jsonFiles.values()) : null,
      scriptFiles: state.scriptFiles ? Array.from(state.scriptFiles.values()) : null,
      isAnalyzed: state.isAnalyzed
    };
  }
  var init_serializer = __esm({
    "src/content/utils/serializer.js"() {
      init_state();
    }
  });

  // src/content/api/block-assets.js
  async function getBlockAssets(blockName) {
    const assets = [];
    const seen = /* @__PURE__ */ new Set();
    const addAsset = (urlString) => {
      try {
        const url = new URL(urlString, window.location.href);
        if (!url.pathname.includes(`/blocks/${blockName}/`)) return;
        if (seen.has(url.pathname)) return;
        seen.add(url.pathname);
        assets.push({ url: url.toString(), path: url.pathname });
      } catch (e) {
      }
    };
    performance.getEntriesByType("resource").forEach((entry) => addAsset(entry.name));
    document.querySelectorAll('link[href*="/blocks/"], script[src*="/blocks/"]').forEach((el) => {
      const url = el.getAttribute("href") || el.getAttribute("src");
      if (url) addAsset(url);
    });
    const enriched = [];
    for (const asset of assets) {
      try {
        const res = await fetch(asset.url);
        const text = await res.text();
        const type = asset.path.split(".").pop() || "file";
        enriched.push({ ...asset, type, content: text });
      } catch (err) {
        enriched.push({ ...asset, type: "error", content: `Failed to load asset: ${err.message}` });
      }
    }
    return enriched;
  }
  var init_block_assets = __esm({
    "src/content/api/block-assets.js"() {
    }
  });

  // src/content/message-handler.js
  function notifyStateChanged() {
    try {
      chrome.runtime.sendMessage({
        type: "eds-state-changed",
        target: "eds-background"
      }).catch(() => {
      });
    } catch (e) {
    }
  }
  async function getBlockDetail(blockId) {
    const block = state.blocks.find((b) => b.id === blockId);
    if (!block) return null;
    console.log("[EDS Inspector] getBlockDetail called for block:", blockId, {
      blockName: block.name,
      hasSSRElement: !!block.ssrElement,
      hasSSRDocument: !!state.ssrDocument,
      hasElement: !!block.element
    });
    const markup = formatHtmlSnippet(block.element);
    let ssrMarkup = null;
    if (block.ssrElement) {
      try {
        ssrMarkup = formatHtmlSnippet(block.ssrElement);
        console.log("[EDS Inspector] SSR markup retrieved from saved reference, length:", ssrMarkup?.length);
      } catch (e) {
        console.warn("[EDS Inspector] Failed to get SSR markup from saved reference:", e);
      }
    }
    if (!ssrMarkup && block.name && block.element && state.ssrDocuments.size > 0) {
      console.log("[EDS Inspector] Searching in", state.ssrDocuments.size, "SSR documents");
      const escapeCSS2 = (className) => {
        if (typeof CSS !== "undefined" && CSS.escape) {
          return CSS.escape(className);
        }
        return className.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
      };
      const liveElements = document.querySelectorAll(`.${escapeCSS2(block.name)}`);
      const liveIndex = Array.from(liveElements).indexOf(block.element);
      for (const [url, ssrDoc] of state.ssrDocuments.entries()) {
        try {
          const blockElements = ssrDoc.querySelectorAll(`.${escapeCSS2(block.name)}`);
          if (blockElements.length > 0) {
            if (liveIndex >= 0 && liveIndex < blockElements.length) {
              const ssrElement = blockElements[liveIndex];
              ssrMarkup = formatHtmlSnippet(ssrElement);
              console.log("[EDS Inspector] SSR markup retrieved from SSR document:", url, "length:", ssrMarkup?.length);
              break;
            } else if (blockElements.length === 1) {
              const ssrElement = blockElements[0];
              ssrMarkup = formatHtmlSnippet(ssrElement);
              console.log("[EDS Inspector] SSR markup retrieved from SSR document (single match):", url, "length:", ssrMarkup?.length);
              break;
            }
          }
        } catch (e) {
          console.warn("[EDS Inspector] Failed to search in SSR document:", url, e);
        }
      }
    }
    const assets = await getBlockAssets(block.name);
    const result = { block, markup, ssrMarkup, assets };
    console.log("[EDS Inspector] getBlockDetail returning:", {
      hasSSRMarkup: !!ssrMarkup,
      ssrMarkupLength: ssrMarkup?.length,
      assetsCount: assets?.length
    });
    return result;
  }
  function showDevToolsPrompt() {
    const prompt = document.createElement("div");
    prompt.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(120deg, #0ea5e9, #6366f1);
    color: #0b1220;
    padding: 16px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    font-family: Inter, Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    max-width: 400px;
    line-height: 1.5;
  `;
    prompt.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 8px;">EDS Site Inspector</div>
    <div style="margin-bottom: 12px;">Please open DevTools (F12 or Cmd+Option+I) and select the "EDS Site Inspector" tab.</div>
    <button id="eds-close-prompt" style="
      background: #0b1220;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    ">Close</button>
  `;
    document.body.appendChild(prompt);
    const closeBtn = prompt.querySelector("#eds-close-prompt");
    closeBtn.addEventListener("click", () => {
      prompt.remove();
    });
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.remove();
      }
    }, 5e3);
  }
  async function handleMessage(message, sender, sendResponse) {
    console.log("[EDS Inspector Content] Message received:", message);
    if (message?.target !== "eds-content") {
      console.log("[EDS Inspector Content] Message target mismatch, ignoring");
      return;
    }
    try {
      switch (message.type) {
        case "init": {
          console.log("[EDS Inspector Content] Initializing...");
          try {
            if (state.isAnalyzed) {
              console.log("[EDS Inspector Content] Already analyzed, skipping init()");
              const serializedState = serializeState();
              sendResponse(serializedState);
              break;
            }
            if (window.__edsInspectorInitialized) {
              console.log("[EDS Inspector Content] Re-initializing...");
              destroy();
              state.overlays = [];
              state.sections = [];
              state.blocks = [];
              state.icons = [];
              state.ssrDocuments = /* @__PURE__ */ new Map();
              state.isAnalyzed = false;
            }
            state.overlaysVisible = true;
            state.overlaysEnabled = { sections: true, blocks: true, defaultContent: true };
            console.log("[EDS Inspector Content] State set before init:", {
              overlaysVisible: state.overlaysVisible,
              overlaysEnabled: state.overlaysEnabled
            });
            const snapshot = await init();
            console.log("[EDS Inspector Content] Initialization complete:", snapshot);
            state.overlaysVisible = true;
            state.overlaysEnabled = { sections: true, blocks: true, defaultContent: true };
            setTimeout(() => {
              console.log("[EDS Inspector Content] Final overlay refresh after init, state:", {
                overlaysVisible: state.overlaysVisible,
                overlaysEnabled: state.overlaysEnabled,
                overlaysCount: state.overlays.length
              });
              state.overlaysVisible = true;
              refreshOverlayPositions().catch(console.error);
            }, 300);
            sendResponse(snapshot);
          } catch (err) {
            console.error("[EDS Inspector Content] Error in init handler:", err);
            sendResponse({ ok: false, error: err.message, stack: err.stack });
          }
          break;
        }
        case "reanalyze": {
          console.log("[EDS Inspector Content] reanalyze called");
          state.isAnalyzed = false;
          await analyzePage();
          console.log("[EDS Inspector Content] analyzePage completed, jsonFiles:", state.jsonFiles ? state.jsonFiles.size : 0);
          await loadCodeAndMedia();
          const serialized = serializeState();
          console.log("[EDS Inspector Content] serializeState completed, jsonFiles in serialized:", serialized.jsonFiles ? serialized.jsonFiles.length : 0);
          sendResponse(serialized);
          break;
        }
        case "enable-auto-update": {
          enableAutoUpdate();
          sendResponse({ ok: true });
          break;
        }
        case "disable-auto-update": {
          disableAutoUpdate();
          sendResponse({ ok: true });
          break;
        }
        case "toggle-overlay": {
          state.overlaysEnabled[message.payload.key] = message.payload.value;
          state.overlays.forEach((overlay) => {
            if (message.payload.key === "sections" && overlay.item.id.startsWith("section-")) {
              overlay.visible = message.payload.value;
            } else if (message.payload.key === "blocks" && overlay.item.id.startsWith("block-")) {
              const isDefaultContent = overlay.item.category && overlay.item.category !== "block";
              if (!isDefaultContent) {
                overlay.visible = message.payload.value;
              }
            } else if (message.payload.key === "defaultContent" && overlay.item.id.startsWith("block-")) {
              const isDefaultContent = overlay.item.category && overlay.item.category !== "block";
              if (isDefaultContent) {
                overlay.visible = message.payload.value;
              }
            }
          });
          refreshOverlayPositions();
          chrome.storage.local.set({
            "eds-overlays-enabled": state.overlaysEnabled
          }).catch((err) => {
            console.error("[EDS Inspector Content] Failed to save overlay state:", err);
          });
          sendResponse(serializeState());
          break;
        }
        case "toggle-overlays": {
          await toggleOverlays();
          sendResponse({ ok: true, visible: state.overlaysVisible });
          break;
        }
        case "refresh-overlays": {
          await refreshOverlayPositions();
          sendResponse({ ok: true });
          break;
        }
        case "set-overlays-visible": {
          const newVisible = message.payload.visible;
          console.log("[EDS Inspector Content] set-overlays-visible:", {
            old: state.overlaysVisible,
            new: newVisible,
            overlaysCount: state.overlays.length
          });
          state.overlaysVisible = newVisible;
          await refreshOverlayPositions();
          setTimeout(() => {
            refreshOverlayPositions().catch(console.error);
          }, 100);
          sendResponse({ ok: true, visible: state.overlaysVisible });
          break;
        }
        case "destroy": {
          destroy();
          sendResponse(serializeState());
          break;
        }
        case "highlight": {
          setHighlight(message.payload.id);
          sendResponse({ ok: true });
          break;
        }
        case "scroll-to-block": {
          const block = state.blocks.find((b) => b.id === message.payload.id);
          if (block && block.element) {
            const rect = block.element.getBoundingClientRect();
            const scrollY = window.scrollY || window.pageYOffset;
            let labelHeight = 25;
            const overlayRoot = document.getElementById("eds-inspector-overlay-root");
            if (overlayRoot) {
              const overlay = overlayRoot.querySelector(`[data-overlay-id="${block.id}"]`);
              if (overlay) {
                const label = overlay.querySelector(".eds-overlay__label");
                if (label) {
                  const labelRect = label.getBoundingClientRect();
                  labelHeight = labelRect.height + 4;
                }
              }
            }
            const targetY = rect.top + scrollY - labelHeight;
            window.scrollTo({
              top: Math.max(0, targetY),
              behavior: "smooth"
            });
            setTimeout(() => {
              refreshOverlayPositions().catch(console.error);
              setHighlight(message.payload.id);
            }, 300);
          }
          sendResponse({ ok: true });
          break;
        }
        case "select-block": {
          state.selectedBlockId = message.payload.id;
          sendResponse({ ok: true });
          break;
        }
        case "state": {
          sendResponse(serializeState());
          break;
        }
        case "get-block-detail": {
          const detail = await getBlockDetail(message.payload.id);
          sendResponse(detail);
          break;
        }
        case "get-blocks-by-name": {
          const blockName = message.payload.name;
          const blocksWithSameName = state.blocks.filter((b) => b.name === blockName);
          sendResponse(blocksWithSameName.map((block) => ({
            id: block.id,
            name: block.name,
            tagName: block.tagName,
            classes: block.classes,
            category: block.category || "block",
            sourceDocumentUrl: block.sourceDocumentUrl || null
          })));
          break;
        }
        case "get-fetched-html-documents": {
          const documents = Array.from(state.ssrDocuments.entries()).filter(([url]) => url !== state.mainDocumentUrl).map(([url, doc]) => {
            const html = doc.documentElement.outerHTML;
            return {
              url,
              length: html.length,
              isMain: false
            };
          });
          sendResponse(documents);
          break;
        }
        case "get-fetched-html-content": {
          const url = message.payload.url;
          const rawHtml = state.htmlDocuments.get(url);
          if (rawHtml) {
            sendResponse(rawHtml);
          } else {
            const doc = state.ssrDocuments.get(url);
            if (doc) {
              sendResponse(doc.documentElement.outerHTML);
            } else {
              sendResponse(null);
            }
          }
          break;
        }
        case "show-devtools-prompt": {
          showDevToolsPrompt();
          sendResponse({ ok: true });
          break;
        }
        case "scroll-page-for-lazy-load": {
          const scrollHeight = document.documentElement.scrollHeight;
          const clientHeight = document.documentElement.clientHeight;
          const maxScroll = scrollHeight - clientHeight;
          window.scrollTo({ top: maxScroll, behavior: "smooth" });
          await new Promise((resolve) => setTimeout(resolve, 1500));
          window.scrollTo({ top: 0, behavior: "smooth" });
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          await new Promise((resolve) => setTimeout(resolve, 500));
          sendResponse({ ok: true });
          break;
        }
        default:
          console.warn("[EDS Inspector Content] Unknown message type:", message.type);
          sendResponse({ ok: false, reason: "unknown-message" });
      }
    } catch (err) {
      console.error("[EDS Inspector Content] Error handling message:", err);
      sendResponse({ ok: false, error: err.message });
    }
  }
  var init_message_handler = __esm({
    "src/content/message-handler.js"() {
      init_state();
      init_analyzer();
      init_code_media();
      init_serializer();
      init_manager();
      init_manager();
      init_dom();
      init_block_assets();
      init_auto_update();
      init_analyzer();
    }
  });

  // src/content/analyzer.js
  async function analyzePage() {
    const mainLive = document.querySelector("main");
    if (!mainLive) {
      throw new Error("EDS Inspector: <main> element not found.");
    }
    try {
      const htmlDocuments = await collectHtmlDocuments();
      console.log("[EDS Inspector] Collected HTML documents:", htmlDocuments.size);
      state.htmlDocuments = htmlDocuments;
      state.ssrDocuments = await parseSSRDocuments(htmlDocuments);
      state.mainDocumentUrl = window.location.href.split("?")[0];
      console.log("[EDS Inspector] Parsed SSR documents:", state.ssrDocuments.size);
      const mainSSRDoc = state.ssrDocuments.get(state.mainDocumentUrl) || document;
      const mainSSR = mainSSRDoc.querySelector("main") || document.querySelector("main");
      if (!mainSSR) {
        console.warn("[EDS Inspector] Main SSR element not found, using document");
      }
      const blockResources = collectBlockResourceNames();
      const iconResources = collectIconNames();
      state.sections = detectSections(state.ssrDocuments, mainSSR, mainLive);
      state.blocks = detectBlocks(state.ssrDocuments, mainSSR, mainLive, blockResources);
      state.icons = await detectIcons(state.ssrDocuments, mainSSR, mainLive, iconResources);
    } catch (err) {
      console.error("[EDS Inspector] Error in analyzePage:", err);
      throw err;
    }
    console.log("[EDS Inspector Content] About to collect JSON files...");
    state.jsonFiles = collectJsonFiles();
    console.log("[EDS Inspector Content] JSON files collected:", state.jsonFiles ? state.jsonFiles.size : 0);
    console.log("[EDS Inspector Content] About to collect script files...");
    state.scriptFiles = collectScriptFiles();
    console.log("[EDS Inspector Content] Script files collected:", state.scriptFiles ? state.scriptFiles.size : 0);
    if (state.scriptFiles && state.scriptFiles.size > 0) {
      console.log("[EDS Inspector Content] Script files:", Array.from(state.scriptFiles.values()).map((f) => f.url));
    }
    await loadCodeAndMedia();
    buildOverlays();
    await refreshOverlayPositions();
    state.isAnalyzed = true;
    notifyStateChanged();
  }
  async function init() {
    console.log("[EDS Inspector Content] init() called");
    try {
      await resolveConfig();
      console.log("[EDS Inspector Content] Config resolved");
      if (state.isAnalyzed) {
        console.log("[EDS Inspector Content] Already analyzed, skipping analyzePage()");
      } else {
        await analyzePage();
        console.log("[EDS Inspector Content] Page analyzed");
      }
      await loadCodeAndMedia();
      console.log("[EDS Inspector Content] Code and media loaded");
      const serializedState = serializeState();
      console.log("[EDS Inspector Content] State serialized:", serializedState);
      return serializedState;
    } catch (err) {
      console.error("[EDS Inspector Content] Error in init():", err);
      throw err;
    }
  }
  var init_analyzer = __esm({
    "src/content/analyzer.js"() {
      init_state();
      init_config();
      init_resources();
      init_html_documents();
      init_json();
      init_scripts();
      init_sections();
      init_blocks();
      init_icons();
      init_builder();
      init_manager();
      init_code_media();
      init_message_handler();
      init_serializer();
    }
  });

  // src/content/utils/auto-update.js
  function scheduleAutoUpdate(delay = 500) {
    if (!autoUpdateEnabled) return;
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(async () => {
      try {
        console.log("[EDS Inspector Content] Auto-updating page analysis...");
        await analyzePage();
        console.log("[EDS Inspector Content] Auto-update complete");
      } catch (err) {
        console.error("[EDS Inspector Content] Error in auto-update:", err);
      }
    }, delay);
  }
  function setupAutoUpdate() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
    mutationObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        const main2 = document.querySelector("main");
        if (main2 && main2.contains(mutation.target)) {
          if (mutation.addedNodes.length > 0) {
            shouldUpdate = true;
          }
          if (mutation.type === "attributes" && mutation.attributeName === "class") {
            shouldUpdate = true;
          }
          if (mutation.type === "attributes" && (mutation.attributeName === "src" || mutation.attributeName === "data-src")) {
            const target = mutation.target;
            if (target.tagName === "IMG" || target.tagName === "VIDEO" || target.tagName === "SOURCE") {
              const url = target.getAttribute("src") || target.getAttribute("data-src");
              if (url && url.includes("media_")) {
                shouldUpdate = true;
              }
            }
          }
        }
      });
      if (shouldUpdate) {
        scheduleAutoUpdate(1e3);
      }
    });
    const main = document.querySelector("main");
    if (main) {
      mutationObserver.observe(main, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "src", "data-src"]
        // Lazy Load対応: src属性の変更も監視
      });
    }
    if (performanceObserver) {
      try {
        performanceObserver.disconnect();
      } catch (e) {
      }
    }
    try {
      performanceObserver = new PerformanceObserver((list) => {
        let shouldUpdate = false;
        list.getEntries().forEach((entry) => {
          const url = entry.name || "";
          if (url.includes("/blocks/") || url.includes("/icons/")) {
            shouldUpdate = true;
          }
        });
        if (shouldUpdate) {
          scheduleAutoUpdate(1e3);
        }
      });
      performanceObserver.observe({ entryTypes: ["resource"] });
    } catch (e) {
      console.warn("[EDS Inspector Content] PerformanceObserver not supported:", e);
    }
    if (document.readyState === "complete") {
      scheduleAutoUpdate(500);
    } else {
      window.addEventListener("load", () => {
        scheduleAutoUpdate(500);
      });
    }
  }
  function enableAutoUpdate() {
    autoUpdateEnabled = true;
    setupAutoUpdate();
  }
  function disableAutoUpdate() {
    autoUpdateEnabled = false;
    if (updateTimeout) {
      clearTimeout(updateTimeout);
      updateTimeout = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
    if (performanceObserver) {
      try {
        performanceObserver.disconnect();
      } catch (e) {
      }
    }
  }
  var autoUpdateEnabled, updateTimeout, mutationObserver, performanceObserver;
  var init_auto_update = __esm({
    "src/content/utils/auto-update.js"() {
      init_analyzer();
      init_code_media();
      autoUpdateEnabled = true;
      updateTimeout = null;
      mutationObserver = null;
      performanceObserver = null;
    }
  });

  // src/content.js
  var require_content = __commonJS({
    "src/content.js"() {
      init_manager();
      init_auto_update();
      init_message_handler();
      init_json();
      init_state();
      init_analyzer();
      (() => {
        const isAlreadyInitialized = window.__edsInspectorInitialized;
        if (isAlreadyInitialized) {
          console.warn("[EDS Inspector Content] Script already initialized, but message listener should still work.");
        } else {
          window.__edsInspectorInitialized = true;
        }
        if (window.__edsInspectorMessageListenerAttached) {
          console.log("[EDS Inspector Content] Message listener already attached, skipping re-initialization.");
          return;
        }
        setupJsonInterceptor();
        console.log("[EDS Inspector Content] JSON interceptor setup");
        attachGlobalListeners();
        console.log("[EDS Inspector Content] Global listeners attached");
        setupAutoUpdate();
        console.log("[EDS Inspector Content] Auto-update setup");
        if (!window.__edsInspectorMessageListenerAttached) {
          window.__edsInspectorMessageListenerAttached = true;
          chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            handleMessage(message, sender, sendResponse);
            return true;
          });
          console.log("[EDS Inspector Content] Message listener attached");
        } else {
          console.log("[EDS Inspector Content] Message listener already attached, skipping");
        }
        setupPageNavigationDetection();
        console.log("[EDS Inspector Content] Script loaded and message listener attached");
      })();
      function setupPageNavigationDetection() {
        let currentUrl = window.location.href;
        window.addEventListener("popstate", () => {
          const newUrl = window.location.href;
          if (newUrl !== currentUrl) {
            console.log("[EDS Inspector Content] Page navigation detected (popstate):", newUrl);
            currentUrl = newUrl;
            handlePageNavigation();
          }
        });
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        history.pushState = function(...args) {
          originalPushState.apply(history, args);
          const newUrl = window.location.href;
          if (newUrl !== currentUrl) {
            console.log("[EDS Inspector Content] Page navigation detected (pushState):", newUrl);
            currentUrl = newUrl;
            handlePageNavigation();
          }
        };
        history.replaceState = function(...args) {
          originalReplaceState.apply(history, args);
          const newUrl = window.location.href;
          if (newUrl !== currentUrl) {
            console.log("[EDS Inspector Content] Page navigation detected (replaceState):", newUrl);
            currentUrl = newUrl;
            handlePageNavigation();
          }
        };
        document.addEventListener("click", (e) => {
          const link = e.target.closest("a");
          if (link && link.href && link.href !== currentUrl) {
            try {
              const linkUrl = new URL(link.href);
              const currentUrlObj = new URL(currentUrl);
              if (linkUrl.origin === currentUrlObj.origin && linkUrl.pathname !== currentUrlObj.pathname) {
                setTimeout(() => {
                  const newUrl = window.location.href;
                  if (newUrl !== currentUrl) {
                    console.log("[EDS Inspector Content] Page navigation detected (link click):", newUrl);
                    currentUrl = newUrl;
                    handlePageNavigation();
                  }
                }, 500);
              }
            } catch (e2) {
            }
          }
        }, true);
        console.log("[EDS Inspector Content] Page navigation detection setup complete");
      }
      async function handlePageNavigation() {
        try {
          const extensionAvailable2 = await checkExtensionAvailable();
          if (!extensionAvailable2) {
            console.log("[EDS Inspector Content] Extension not available, skipping auto-reload");
            return;
          }
          if (!state.overlaysVisible) {
            console.log("[EDS Inspector Content] Overlays not visible, skipping auto-reload");
            return;
          }
          state.isAnalyzed = false;
          console.log("[EDS Inspector Content] Auto-reloading after page navigation...");
          setTimeout(async () => {
            try {
              await init();
              console.log("[EDS Inspector Content] Auto-reload complete after page navigation");
            } catch (err) {
              console.error("[EDS Inspector Content] Error during auto-reload:", err);
            }
          }, 1e3);
        } catch (err) {
          console.error("[EDS Inspector Content] Error handling page navigation:", err);
        }
      }
    }
  });
  require_content();
})();
//# sourceMappingURL=content.js.map
