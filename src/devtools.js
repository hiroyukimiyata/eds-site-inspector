chrome.devtools.panels.create('EDS Site Inspector', '', 'panel.html', (panel) => {
  panel.onShown.addListener((window) => {
    if (window && window.initializePanel) {
      window.initializePanel();
    }
  });
});
