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
          let updateToggleAllState2 = function() {
            toggleAll.checked = toggleSections.checked && toggleBlocks.checked && toggleDefault.checked;
          }, toggleAllOverlays2 = function(enabled) {
            Promise.all([
              chrome.tabs.sendMessage(tab.id, {
                target: "eds-content",
                type: "toggle-overlay",
                payload: { key: "sections", value: enabled }
              }),
              chrome.tabs.sendMessage(tab.id, {
                target: "eds-content",
                type: "toggle-overlay",
                payload: { key: "blocks", value: enabled }
              }),
              chrome.tabs.sendMessage(tab.id, {
                target: "eds-content",
                type: "toggle-overlay",
                payload: { key: "defaultContent", value: enabled }
              })
            ]).then(() => {
              chrome.storage.local.set({
                "eds-overlays-enabled": {
                  sections: enabled,
                  blocks: enabled,
                  defaultContent: enabled
                }
              }).catch((err) => {
                console.error("[EDS Inspector Popup] Failed to save overlay state:", err);
              });
            }).catch((err) => {
              console.error("[EDS Inspector Popup] Failed to toggle all overlays:", err);
            });
          }, updateOverlayState2 = function(key, value) {
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
          var updateToggleAllState = updateToggleAllState2, toggleAllOverlays = toggleAllOverlays2, updateOverlayState = updateOverlayState2;
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
          try {
            const platformInfo = await chrome.runtime.getPlatformInfo();
            const devtoolsHint = document.getElementById("devtools-hint");
            if (devtoolsHint) {
              let shortcut = "";
              if (platformInfo.os === "mac") {
                shortcut = "Cmd+Option+I";
              } else {
                shortcut = "F12 or Ctrl+Shift+I";
              }
              devtoolsHint.textContent = `Open DevTools for details (${shortcut})`;
            }
          } catch (err) {
            console.log("[EDS Inspector Popup] Could not get platform info:", err);
          }
          const toggleAll = document.getElementById("toggle-all");
          const toggleSections = document.getElementById("toggle-sections");
          const toggleBlocks = document.getElementById("toggle-blocks");
          const toggleDefault = document.getElementById("toggle-default");
          if (!toggleAll || !toggleSections || !toggleBlocks || !toggleDefault) {
            console.error("[EDS Inspector Popup] Checkboxes not found");
            showError("UI elements not found");
            return;
          }
          toggleAll.checked = true;
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
            toggleAll.checked = sections && blocks && defaultContent;
            if (!currentState.overlaysVisible) {
              chrome.tabs.sendMessage(tab.id, {
                target: "eds-content",
                type: "set-overlays-visible",
                payload: { visible: true }
              }).catch((err) => {
              });
            }
          }
          toggleAll.addEventListener("change", () => {
            const allEnabled = toggleAll.checked;
            toggleSections.checked = allEnabled;
            toggleBlocks.checked = allEnabled;
            toggleDefault.checked = allEnabled;
            toggleAllOverlays2(allEnabled);
          });
          toggleSections.addEventListener("change", () => {
            updateOverlayState2("sections", toggleSections.checked);
            updateToggleAllState2();
          });
          toggleBlocks.addEventListener("change", () => {
            updateOverlayState2("blocks", toggleBlocks.checked);
            updateToggleAllState2();
          });
          toggleDefault.addEventListener("change", () => {
            updateOverlayState2("defaultContent", toggleDefault.checked);
            updateToggleAllState2();
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
                toggleAll.checked = sections && blocks && defaultContent;
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
