(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/popup.js
  var require_popup = __commonJS({
    "src/popup.js"() {
      (async () => {
        function showError(message) {
          const container = document.querySelector(".popup-container");
          if (container) {
            container.innerHTML = `<div class="popup-content"><p class="error-message">${message}</p></div>`;
          } else {
            document.body.innerHTML = `<div class="popup-container"><div class="popup-content"><p class="error-message">${message}</p></div></div>`;
          }
        }
        try {
          let updateOverlayState2 = function(key, value) {
            chrome.tabs.sendMessage(tab.id, {
              target: "eds-content",
              type: "toggle-overlay",
              payload: { key, value }
            }).then((response) => {
              if (response && response.overlaysEnabled) {
                chrome.storage.local.set({
                  "eds-overlays-enabled": response.overlaysEnabled
                }).catch((err) => {
                  console.error("[EDS Inspector Popup] Failed to save overlay state:", err);
                });
              }
            }).catch((err) => {
              console.error("[EDS Inspector Popup] Failed to update overlay state:", err);
            });
          };
          var updateOverlayState = updateOverlayState2;
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab || !tab.id) {
            console.error("[EDS Inspector Popup] No active tab found");
            showError("No active tab found");
            return;
          }
          const url = tab.url || "";
          const invalidSchemes = ["chrome://", "edge://", "chrome-extension://", "moz-extension://", "about:", "file://"];
          const isInvalidPage = invalidSchemes.some((scheme) => url.startsWith(scheme));
          if (isInvalidPage) {
            showError("Cannot use on this page");
            return;
          }
          if (document.readyState === "loading") {
            await new Promise((resolve) => {
              document.addEventListener("DOMContentLoaded", resolve);
            });
          }
          const toggleSections = document.getElementById("toggle-sections");
          const toggleBlocks = document.getElementById("toggle-blocks");
          const toggleDefault = document.getElementById("toggle-default");
          if (!toggleSections || !toggleBlocks || !toggleDefault) {
            console.error("[EDS Inspector Popup] Checkboxes not found");
            showError("UI elements not found");
            return;
          }
          toggleSections.checked = true;
          toggleBlocks.checked = true;
          toggleDefault.checked = true;
          let currentState = null;
          try {
            currentState = await chrome.tabs.sendMessage(tab.id, {
              target: "eds-content",
              type: "state"
            });
          } catch (e) {
            console.log("[EDS Inspector Popup] Content script not running, initializing...");
            try {
              await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ["content.css"]
              });
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
              });
              await new Promise((resolve) => setTimeout(resolve, 100));
              await chrome.tabs.sendMessage(tab.id, {
                target: "eds-content",
                type: "init"
              });
              await new Promise((resolve) => setTimeout(resolve, 500));
              currentState = await chrome.tabs.sendMessage(tab.id, {
                target: "eds-content",
                type: "state"
              });
              if (!currentState || !currentState.overlaysVisible) {
                console.log("[EDS Inspector Popup] Ensuring overlays are visible");
                await chrome.tabs.sendMessage(tab.id, {
                  target: "eds-content",
                  type: "set-overlays-visible",
                  payload: { visible: true }
                });
                currentState = await chrome.tabs.sendMessage(tab.id, {
                  target: "eds-content",
                  type: "state"
                });
              }
            } catch (initErr) {
              console.error("[EDS Inspector Popup] Failed to initialize:", initErr);
              showError("Initialization failed: " + initErr.message);
              return;
            }
          }
          if (currentState && currentState.overlaysEnabled) {
            const { sections, blocks, defaultContent } = currentState.overlaysEnabled;
            if (sections !== void 0) toggleSections.checked = sections;
            if (blocks !== void 0) toggleBlocks.checked = blocks;
            if (defaultContent !== void 0) toggleDefault.checked = defaultContent;
            if (!currentState.overlaysVisible) {
              chrome.tabs.sendMessage(tab.id, {
                target: "eds-content",
                type: "set-overlays-visible",
                payload: { visible: true }
              }).catch((err) => {
              });
            }
          }
          toggleSections.addEventListener("change", () => {
            updateOverlayState2("sections", toggleSections.checked);
          });
          toggleBlocks.addEventListener("change", () => {
            updateOverlayState2("blocks", toggleBlocks.checked);
          });
          toggleDefault.addEventListener("change", () => {
            updateOverlayState2("defaultContent", toggleDefault.checked);
          });
          window.addEventListener("blur", () => {
            chrome.storage.local.get("eds-devtools-open").then((result) => {
              if (!result["eds-devtools-open"]) {
                chrome.tabs.sendMessage(tab.id, {
                  target: "eds-content",
                  type: "set-overlays-visible",
                  payload: { visible: false }
                }).catch((err) => {
                });
              }
            }).catch((err) => {
              chrome.tabs.sendMessage(tab.id, {
                target: "eds-content",
                type: "set-overlays-visible",
                payload: { visible: false }
              }).catch(() => {
              });
            });
          });
          document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
              chrome.storage.local.get("eds-devtools-open").then((result) => {
                if (!result["eds-devtools-open"]) {
                  chrome.tabs.sendMessage(tab.id, {
                    target: "eds-content",
                    type: "set-overlays-visible",
                    payload: { visible: false }
                  }).catch((err) => {
                  });
                }
              }).catch((err) => {
                chrome.tabs.sendMessage(tab.id, {
                  target: "eds-content",
                  type: "set-overlays-visible",
                  payload: { visible: false }
                }).catch(() => {
                });
              });
            }
          });
          chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === "local" && changes["eds-overlays-enabled"]) {
              const newValue = changes["eds-overlays-enabled"].newValue;
              if (newValue) {
                const { sections, blocks, defaultContent } = newValue;
                if (sections !== void 0) toggleSections.checked = sections;
                if (blocks !== void 0) toggleBlocks.checked = blocks;
                if (defaultContent !== void 0) toggleDefault.checked = defaultContent;
              }
            }
          });
        } catch (err) {
          console.error("[EDS Inspector Popup] Unexpected error:", err);
          showError("Unexpected error: " + err.message);
        }
      })();
    }
  });
  require_popup();
})();
//# sourceMappingURL=popup.js.map
