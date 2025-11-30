(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/background.js
  var require_background = __commonJS({
    "src/background.js"() {
      console.log("[EDS Inspector] Background script loaded");
      chrome.action.onClicked.addListener(async (tab) => {
        console.log("[EDS Inspector] Action clicked, tab:", tab);
        if (!tab.id) {
          console.error("[EDS Inspector] No tab ID available");
          return;
        }
        const url = tab.url || "";
        const invalidSchemes = ["chrome://", "edge://", "chrome-extension://", "moz-extension://", "about:", "file://"];
        const isInvalidPage = invalidSchemes.some((scheme) => url.startsWith(scheme));
        if (isInvalidPage) {
          console.warn("[EDS Inspector] Cannot inject scripts on this page:", url);
          return;
        }
        try {
          console.log("[EDS Inspector] Starting injection for tab:", tab.id, "URL:", url);
          let scriptAlreadyRunning = false;
          try {
            const stateResponse = await chrome.tabs.sendMessage(tab.id, { target: "eds-content", type: "state" });
            if (stateResponse) {
              console.log("[EDS Inspector] Script already running, state:", stateResponse);
              scriptAlreadyRunning = true;
            }
          } catch (e) {
            console.log("[EDS Inspector] Script not running yet (state check failed):", e.message);
          }
          if (!scriptAlreadyRunning) {
            console.log("[EDS Inspector] Injecting CSS...");
            try {
              await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content.css"] });
              console.log("[EDS Inspector] CSS injected successfully");
            } catch (cssErr) {
              console.warn("[EDS Inspector] CSS injection failed (may already be injected):", cssErr.message);
            }
            console.log("[EDS Inspector] Injecting JavaScript...");
            try {
              await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
              console.log("[EDS Inspector] JavaScript injected successfully");
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (jsErr) {
              console.warn("[EDS Inspector] JavaScript injection failed:", jsErr.message);
            }
          }
          console.log("[EDS Inspector] Sending init message...");
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { target: "eds-content", type: "init" });
            console.log("[EDS Inspector] Initialization complete, response:", response);
          } catch (msgErr) {
            console.error("[EDS Inspector] Failed to send init message:", msgErr);
            console.error("[EDS Inspector] This might mean content.js is not loaded or message listener is not attached");
            throw msgErr;
          }
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { target: "eds-content", type: "toggle-overlays" });
            console.log("[EDS Inspector] Toggle overlays response:", response);
          } catch (e) {
            console.log("[EDS Inspector] Cannot toggle overlays (content script may not be ready):", e);
            try {
              await chrome.tabs.sendMessage(tab.id, { target: "eds-content", type: "init" });
              setTimeout(async () => {
                try {
                  await chrome.tabs.sendMessage(tab.id, { target: "eds-content", type: "toggle-overlays" });
                } catch (e2) {
                  console.log("[EDS Inspector] Cannot toggle overlays after init:", e2);
                }
              }, 200);
            } catch (initErr) {
              console.log("[EDS Inspector] Cannot initialize content script:", initErr);
            }
          }
        } catch (err) {
          console.error("[EDS Inspector] Failed to inject scripts:", err);
          console.error("[EDS Inspector] Error details:", {
            message: err.message,
            stack: err.stack,
            tabId: tab.id,
            url
          });
        }
      });
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("[EDS Inspector] Message received:", message);
        if (message?.type === "ping") {
          sendResponse({ ok: true });
          return false;
        }
        if (message?.type === "eds-init-devtools" && message.tabId) {
          (async () => {
            console.log("[EDS Inspector] Received eds-init-devtools message for tab:", message.tabId);
            try {
              try {
                await chrome.scripting.insertCSS({ target: { tabId: message.tabId }, files: ["content.css"] });
                console.log("[EDS Inspector] CSS injected via DevTools");
              } catch (cssErr) {
                console.warn("[EDS Inspector] CSS injection failed (may already be injected):", cssErr.message);
              }
              await chrome.scripting.executeScript({ target: { tabId: message.tabId }, files: ["content.js"] });
              console.log("[EDS Inspector] JavaScript injected via DevTools");
              await new Promise((resolve) => setTimeout(resolve, 100));
              console.log("[EDS Inspector] Sending success response");
              sendResponse({ ok: true });
            } catch (err) {
              console.error("[EDS Inspector] Failed to inject via DevTools:", err);
              sendResponse({ ok: false, error: err.message });
            }
          })();
          return true;
        }
        if (message?.type === "eds-state-changed" && message?.target === "eds-background") {
          console.log("[EDS Inspector] State changed notification received from content script");
          sendResponse({ ok: true });
          return false;
        }
        return false;
      });
    }
  });
  require_background();
})();
//# sourceMappingURL=background.js.map
