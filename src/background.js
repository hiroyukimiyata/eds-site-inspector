chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tab.id, { target: 'eds-content', type: 'init' });
  } catch (err) {
    console.error('EDS Site Inspector failed to inject scripts', err);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'eds-init-devtools' || !message.tabId) return;
  (async () => {
    try {
      await chrome.scripting.insertCSS({ target: { tabId: message.tabId }, files: ['content.css'] });
      await chrome.scripting.executeScript({ target: { tabId: message.tabId }, files: ['content.js'] });
      sendResponse({ ok: true });
    } catch (err) {
      console.error('EDS Site Inspector failed to inject via DevTools', err);
      sendResponse({ ok: false, error: err.message });
    }
  })();
  return true;
});
