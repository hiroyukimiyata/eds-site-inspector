(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/devtools.js
  var require_devtools = __commonJS({
    "src/devtools.js"() {
      console.log("[EDS Inspector DevTools] DevTools script loaded");
      try {
        chrome.devtools.panels.create("EDS Site Inspector", "", "panel.html", (panel) => {
          if (chrome.runtime.lastError) {
            console.error("[EDS Inspector DevTools] Failed to create panel:", chrome.runtime.lastError.message);
            return;
          }
          console.log("[EDS Inspector DevTools] Panel created successfully:", panel);
          panel.onShown.addListener((window) => {
            console.log("[EDS Inspector DevTools] Panel shown, window:", window);
            if (window && window.initializePanel) {
              console.log("[EDS Inspector DevTools] Calling initializePanel...");
              window.initializePanel();
            } else {
              console.warn("[EDS Inspector DevTools] initializePanel function not found on window");
            }
          });
          panel.onHidden.addListener(() => {
            console.log("[EDS Inspector DevTools] Panel hidden");
            chrome.storage.local.remove("eds-devtools-open").catch((err) => {
              console.error("[EDS Inspector DevTools] Failed to remove devtools-open flag:", err);
            });
            const tabId = chrome.devtools.inspectedWindow.tabId;
            if (tabId) {
              chrome.tabs.sendMessage(tabId, {
                target: "eds-content",
                type: "set-overlays-visible",
                payload: { visible: false }
              }).catch((err) => {
                console.log("[EDS Inspector DevTools] Failed to hide overlays:", err);
              });
            }
          });
        });
      } catch (err) {
        console.error("[EDS Inspector DevTools] Error creating panel:", err);
      }
    }
  });
  require_devtools();
})();
//# sourceMappingURL=devtools.js.map
