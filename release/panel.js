(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/panel/utils.js
  async function sendToContent(tabId, type, payload = {}) {
    console.log("[EDS Inspector Panel] Sending message to content:", type, payload);
    try {
      const response = await chrome.tabs.sendMessage(tabId, { target: "eds-content", type, payload });
      console.log("[EDS Inspector Panel] Received response:", response);
      return response;
    } catch (err) {
      console.error("[EDS Inspector Panel] Failed to send message:", err);
      throw err;
    }
  }
  async function ensureContentInjected(tabId) {
    console.log("[EDS Inspector Panel] Requesting content script injection...");
    console.log("[EDS Inspector Panel] Tab ID:", tabId);
    try {
      const response = await Promise.race([
        chrome.runtime.sendMessage({ type: "eds-init-devtools", tabId }),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Could not establish connection. Receiving end does not exist.")), 3e3)
        )
      ]);
      console.log("[EDS Inspector Panel] Content script injection response:", response);
      if (response && response.ok === false) {
        throw new Error(response.error || "Content script injection failed");
      }
      if (!response) {
        throw new Error("No response from service worker");
      }
      return response;
    } catch (err) {
      console.error("[EDS Inspector Panel] Failed to request content script injection:", err);
      const errorMessage = err.message || "Unknown error";
      if (errorMessage.includes("Could not establish connection") || errorMessage.includes("Receiving end does not exist")) {
        throw new Error("Could not establish connection. Receiving end does not exist.");
      }
      throw err;
    }
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function highlightCode(code, lang) {
    if (lang === "html") {
      const escaped = escapeHtml(code);
      return highlightHtml(escaped);
    } else if (lang === "markdown") {
      return highlightMarkdown(code);
    } else if (lang === "css") {
      return highlightCss(code);
    } else if (lang === "javascript" || lang === "js") {
      return highlightJs(code);
    } else if (lang === "json") {
      return highlightJson(code);
    }
    return escapeHtml(code);
  }
  function highlightHtml(html) {
    return html.replace(/(&lt;\/?)([\w-]+)([^&]*?)(\/?&gt;)/g, (match, open, tag, attrs, close) => {
      const attrsHighlighted = attrs.replace(
        /(\w+)(=)(&quot;[^&]*&quot;|'[^']*'|[^\s&gt;]+)/g,
        '<span class="eds-code-attr">$1</span><span class="eds-code-punct">$2</span><span class="eds-code-string">$3</span>'
      );
      return `<span class="eds-code-tag">${open}</span><span class="eds-code-name">${tag}</span>${attrsHighlighted}<span class="eds-code-tag">${close}</span>`;
    }).replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="eds-code-comment">$1</span>');
  }
  function highlightMarkdown(md) {
    const escaped = escapeHtml(md);
    let highlighted = escaped;
    highlighted = highlighted.replace(/(#{1,6})\s+(.+)/g, (match, hashes, text) => {
      return `<span class="eds-code-keyword">${hashes}</span> ${text}`;
    });
    highlighted = highlighted.replace(/(```[\s\S]*?```)/g, (match) => {
      return `<span class="eds-code-string">${match}</span>`;
    });
    highlighted = highlighted.replace(/(`[^`]+`)/g, (match) => {
      return `<span class="eds-code-string">${match}</span>`;
    });
    highlighted = highlighted.replace(/(\*\*|__)(.+?)\1/g, (match, marker, text) => {
      return `<span class="eds-code-keyword">${marker}</span>${text}<span class="eds-code-keyword">${marker}</span>`;
    });
    highlighted = highlighted.replace(/\*([^*\s][^*]*[^*\s])\*/g, (match, text) => {
      if (match.includes("<span")) return match;
      return `<span class="eds-code-function">*</span>${text}<span class="eds-code-function">*</span>`;
    });
    highlighted = highlighted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      return `<span class="eds-code-keyword">[</span>${text}<span class="eds-code-keyword">]</span><span class="eds-code-keyword">(</span><span class="eds-code-string">${url}</span><span class="eds-code-keyword">)</span>`;
    });
    highlighted = highlighted.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      return `<span class="eds-code-comment">![</span>${alt}<span class="eds-code-comment">]</span><span class="eds-code-keyword">(</span><span class="eds-code-string">${url}</span><span class="eds-code-keyword">)</span>`;
    });
    highlighted = highlighted.replace(/(\s*)([-*+]|\d+\.)\s+(.+)/g, (match, indent, marker, text) => {
      return `${indent}<span class="eds-code-keyword">${marker}</span> ${text}`;
    });
    highlighted = highlighted.replace(/(&gt;)\s+(.+)/g, (match, marker, text) => {
      return `<span class="eds-code-comment">${marker}</span> ${text}`;
    });
    highlighted = highlighted.replace(/(---+|\*{3,})/g, (match) => {
      return `<span class="eds-code-comment">${match}</span>`;
    });
    return highlighted;
  }
  function highlightCss(css) {
    const matches = [];
    css.replace(/(\/\*[\s\S]*?\*\/)/g, (match, comment, offset) => {
      matches.push({ type: "comment", match, offset, length: match.length });
    });
    css.replace(/([\w-]+)(\s*)(:)/g, (match, prop, space, colon, offset) => {
      matches.push({ type: "prop", match: prop, offset, length: prop.length });
    });
    css.replace(/(:)(\s*)([^;{}]+)/g, (match, colon, space, value, offset) => {
      matches.push({ type: "value", match: value, offset: offset + colon.length + space.length, length: value.length });
    });
    css.replace(/(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\))/g, (match, color, offset) => {
      matches.push({ type: "color", match, offset, length: match.length });
    });
    css.replace(/([{}:;])/g, (match, punct, offset) => {
      matches.push({ type: "punct", match, offset, length: match.length });
    });
    matches.sort((a, b) => a.offset - b.offset);
    const uniqueMatches = [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const isInsideComment = uniqueMatches.some((existing) => {
        if (existing.type === "comment") {
          return m.offset > existing.offset && m.offset + m.length <= existing.offset + existing.length;
        }
        return false;
      });
      if (isInsideComment) continue;
      const overlaps = uniqueMatches.some((existing) => {
        return m.offset >= existing.offset && m.offset < existing.offset + existing.length || existing.offset >= m.offset && existing.offset < m.offset + m.length;
      });
      if (!overlaps) {
        uniqueMatches.push(m);
      }
    }
    let result = "";
    let lastIndex = 0;
    for (const m of uniqueMatches) {
      result += escapeHtml(css.substring(lastIndex, m.offset));
      const escapedMatch = escapeHtml(m.match);
      const className = {
        "punct": "eds-code-punct",
        "prop": "eds-code-prop",
        "value": "eds-code-value",
        "comment": "eds-code-comment",
        "color": "eds-code-color"
      }[m.type];
      result += `<span class="${className}">${escapedMatch}</span>`;
      lastIndex = m.offset + m.length;
    }
    result += escapeHtml(css.substring(lastIndex));
    return result;
  }
  function highlightJs(js) {
    const keywords = ["function", "const", "let", "var", "if", "else", "for", "while", "return", "class", "extends", "import", "export", "default", "async", "await", "try", "catch", "finally", "throw", "new", "this", "super", "typeof", "instanceof", "true", "false", "null", "undefined"];
    const matches = [];
    js.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)(\1)/g, (match, quote1, content, quote2, offset) => {
      matches.push({ type: "string", match, offset, length: match.length });
    });
    js.replace(/(\/\/.*$)/gm, (match, comment, offset) => {
      matches.push({ type: "comment", match, offset, length: match.length });
    });
    js.replace(/(\/\*[\s\S]*?\*\/)/g, (match, comment, offset) => {
      matches.push({ type: "comment", match, offset, length: match.length });
    });
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      let match;
      while ((match = regex.exec(js)) !== null) {
        matches.push({ type: "keyword", match: keyword, offset: match.index, length: keyword.length });
      }
    });
    js.replace(/\b(\d+\.?\d*)\b/g, (match, number, offset) => {
      matches.push({ type: "number", match, offset, length: match.length });
    });
    js.replace(/(\w+)(\s*\()/g, (match, name, paren, offset) => {
      if (!keywords.includes(name)) {
        matches.push({ type: "function", match: name, offset, length: name.length });
      }
    });
    matches.sort((a, b) => a.offset - b.offset);
    const uniqueMatches = [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const overlaps = uniqueMatches.some((existing) => {
        return m.offset >= existing.offset && m.offset < existing.offset + existing.length || existing.offset >= m.offset && existing.offset < m.offset + m.length;
      });
      const isInsideStringOrComment = uniqueMatches.some((existing) => {
        if (existing.type === "string" || existing.type === "comment") {
          return m.offset > existing.offset && m.offset + m.length <= existing.offset + existing.length;
        }
        return false;
      });
      if (!overlaps && !isInsideStringOrComment) {
        uniqueMatches.push(m);
      }
    }
    let result = "";
    let lastIndex = 0;
    for (const m of uniqueMatches) {
      result += escapeHtml(js.substring(lastIndex, m.offset));
      const escapedMatch = escapeHtml(m.match);
      const className = {
        "string": "eds-code-string",
        "comment": "eds-code-comment",
        "keyword": "eds-code-keyword",
        "number": "eds-code-number",
        "function": "eds-code-function"
      }[m.type];
      result += `<span class="${className}">${escapedMatch}</span>`;
      lastIndex = m.offset + m.length;
    }
    result += escapeHtml(js.substring(lastIndex));
    return result;
  }
  function highlightJson(json) {
    const matches = [];
    json.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)(\1)/g, (match, quote1, content, quote2, offset) => {
      matches.push({ type: "string", match, offset, length: match.length });
    });
    json.replace(/\b(true|false|null)\b/g, (match, keyword, offset) => {
      matches.push({ type: "keyword", match, offset, length: match.length });
    });
    json.replace(/\b(\d+\.?\d*)\b/g, (match, number, offset) => {
      matches.push({ type: "number", match, offset, length: match.length });
    });
    json.replace(/([{}[\]:,])/g, (match, punct, offset) => {
      matches.push({ type: "punct", match, offset, length: match.length });
    });
    matches.sort((a, b) => a.offset - b.offset);
    const uniqueMatches = [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const overlaps = uniqueMatches.some((existing) => {
        return m.offset >= existing.offset && m.offset < existing.offset + existing.length || existing.offset >= m.offset && existing.offset < m.offset + m.length;
      });
      const isInsideString = uniqueMatches.some((existing) => {
        if (existing.type === "string") {
          return m.offset > existing.offset && m.offset + m.length <= existing.offset + existing.length;
        }
        return false;
      });
      if (!overlaps && !isInsideString) {
        uniqueMatches.push(m);
      }
    }
    let result = "";
    let lastIndex = 0;
    for (const m of uniqueMatches) {
      result += escapeHtml(json.substring(lastIndex, m.offset));
      const escapedMatch = escapeHtml(m.match);
      const className = {
        "string": "eds-code-string",
        "keyword": "eds-code-keyword",
        "number": "eds-code-number",
        "punct": "eds-code-punct"
      }[m.type];
      result += `<span class="${className}">${escapedMatch}</span>`;
      lastIndex = m.offset + m.length;
    }
    result += escapeHtml(json.substring(lastIndex));
    return result;
  }
  var init_utils = __esm({
    "src/panel/utils.js"() {
    }
  });

  // src/utils/url.js
  function getMarkdownUrl(currentUrl) {
    try {
      const url = new URL(currentUrl);
      let pathname = url.pathname;
      if (pathname.endsWith("/")) {
        pathname += "index.md";
      } else {
        if (pathname.endsWith(".plain.html")) {
          pathname = pathname.replace(/\.plain\.html$/, ".md");
        } else if (pathname.endsWith(".html")) {
          pathname = pathname.replace(/\.html$/, ".md");
        } else {
          const pathParts = pathname.split(".");
          if (pathParts.length > 1) {
            pathParts[pathParts.length - 1] = "md";
            pathname = pathParts.join(".");
          } else {
            pathname += ".md";
          }
        }
      }
      url.pathname = pathname;
      return url.toString();
    } catch (e) {
      console.error("[EDS Inspector] Error constructing markdown URL:", e);
      return null;
    }
  }
  var init_url = __esm({
    "src/utils/url.js"() {
    }
  });

  // src/panel/utils/file-utils.js
  function saveSearchQuery(key, query) {
    try {
      sessionStorage.setItem(`${SEARCH_STORAGE_PREFIX}${key}`, query);
    } catch (err) {
      console.warn("[EDS Inspector Panel] Failed to save search query:", err);
    }
  }
  function getSearchQuery(key) {
    try {
      return sessionStorage.getItem(`${SEARCH_STORAGE_PREFIX}${key}`) || "";
    } catch (err) {
      console.warn("[EDS Inspector Panel] Failed to get search query:", err);
      return "";
    }
  }
  function copyToClipboard(text) {
    const copyWithFallback = (textToCopy) => {
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textToCopy.length);
      try {
        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);
        return successful;
      } catch (err) {
        document.body.removeChild(textarea);
        throw err;
      }
    };
    return new Promise((resolve, reject) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          resolve(true);
        }).catch(() => {
          try {
            if (copyWithFallback(text)) {
              resolve(true);
            } else {
              reject(new Error("Copy failed"));
            }
          } catch (err) {
            reject(err);
          }
        });
      } else {
        try {
          if (copyWithFallback(text)) {
            resolve(true);
          } else {
            reject(new Error("Copy failed"));
          }
        } catch (err) {
          reject(err);
        }
      }
    });
  }
  function createCopyButton(content, onSuccess, onError) {
    const copyBtn = document.createElement("button");
    copyBtn.className = "eds-copy-button";
    copyBtn.innerHTML = "\u{1F4CB}";
    copyBtn.title = "Copy to clipboard";
    copyBtn.style.cssText = "background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s; flex-shrink: 0;";
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        await copyToClipboard(content);
        if (onSuccess) {
          onSuccess(copyBtn);
        } else {
          showCopySuccess(copyBtn);
        }
      } catch (err) {
        console.error("[EDS Inspector Panel] Failed to copy:", err);
        if (onError) {
          onError(copyBtn, err);
        } else {
          showCopyError(copyBtn);
        }
      }
    });
    return copyBtn;
  }
  function showCopySuccess(button) {
    const originalHTML = button.innerHTML;
    const originalColor = button.style.color;
    button.innerHTML = "\u2713";
    button.style.color = "#86efac";
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.color = originalColor;
    }, 2e3);
  }
  function showCopyError(button) {
    const originalHTML = button.innerHTML;
    const originalColor = button.style.color;
    button.innerHTML = "\u2717";
    button.style.color = "#f87171";
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.color = originalColor;
    }, 2e3);
  }
  function createSearchUI(contentElement, rawText, searchKey = null) {
    const searchContainer = document.createElement("div");
    searchContainer.className = "eds-search-container";
    searchContainer.style.cssText = "display: flex; flex-direction: column; gap: 0; background: var(--bg-muted); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10;";
    const searchBar = document.createElement("div");
    searchBar.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 8px;";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search in file... (Ctrl+F / Cmd+F)";
    searchInput.className = "eds-search-input";
    searchInput.style.cssText = "flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); font-size: 12px; font-family: inherit;";
    if (searchKey) {
      const savedQuery = getSearchQuery(searchKey);
      if (savedQuery) {
        searchInput.value = savedQuery;
      }
    }
    const searchInfo = document.createElement("span");
    searchInfo.className = "eds-search-info";
    searchInfo.style.cssText = "font-size: 11px; color: var(--muted); min-width: 60px; text-align: right;";
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "\u25C0";
    prevBtn.title = "Previous match";
    prevBtn.className = "eds-search-nav";
    prevBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s;";
    prevBtn.disabled = true;
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "\u25B6";
    nextBtn.title = "Next match";
    nextBtn.className = "eds-search-nav";
    nextBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s;";
    nextBtn.disabled = true;
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "\u2715";
    closeBtn.title = "Close search";
    closeBtn.style.cssText = "background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;";
    searchBar.appendChild(searchInput);
    searchBar.appendChild(searchInfo);
    searchBar.appendChild(prevBtn);
    searchBar.appendChild(nextBtn);
    searchBar.appendChild(closeBtn);
    searchContainer.appendChild(searchBar);
    let matches = [];
    let currentMatchIndex = -1;
    let originalCodeHTML = null;
    let originalPlainText = rawText;
    const highlightMatches = (searchText) => {
      const codeElement = contentElement.querySelector("code");
      if (!codeElement) return;
      if (originalCodeHTML === null) {
        originalCodeHTML = codeElement.innerHTML;
      }
      if (originalCodeHTML) {
        codeElement.innerHTML = originalCodeHTML;
      }
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = codeElement.innerHTML;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";
      const textToSearch = originalPlainText || plainText;
      matches = [];
      currentMatchIndex = -1;
      if (!searchText) {
        searchInfo.textContent = "";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
      }
      const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matchIndices = [];
      let match;
      while ((match = regex.exec(textToSearch)) !== null) {
        matchIndices.push({
          index: match.index,
          length: match[0].length
        });
      }
      if (matchIndices.length > 0) {
        const walker = document.createTreeWalker(
          codeElement,
          NodeFilter.SHOW_TEXT,
          null
        );
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
          textNodes.push(node);
        }
        let cumulativeOffset = 0;
        let matchIndex = 0;
        textNodes.forEach((textNode) => {
          const text = textNode.textContent;
          const nodeStart = cumulativeOffset;
          const nodeEnd = cumulativeOffset + text.length;
          const nodeMatches = [];
          while (matchIndex < matchIndices.length) {
            const match2 = matchIndices[matchIndex];
            const matchStart = match2.index;
            const matchEnd = match2.index + match2.length;
            if (matchStart >= nodeStart && matchStart < nodeEnd) {
              const relativeStart = matchStart - nodeStart;
              const relativeEnd = Math.min(matchEnd - nodeStart, text.length);
              nodeMatches.push({
                index: relativeStart,
                length: relativeEnd - relativeStart
              });
              matches.push({
                node: textNode,
                index: relativeStart,
                length: relativeEnd - relativeStart
              });
              matchIndex++;
            } else if (matchStart >= nodeEnd) {
              break;
            } else {
              matchIndex++;
            }
          }
          if (nodeMatches.length > 0) {
            const parent = textNode.parentNode;
            const parts = [];
            let lastIndex = 0;
            nodeMatches.forEach(({ index, length }) => {
              if (index > lastIndex) {
                parts.push(text.substring(lastIndex, index));
              }
              const matchText = text.substring(index, index + length);
              const highlight = document.createElement("mark");
              highlight.className = "eds-search-highlight";
              highlight.style.cssText = "background: #fbbf24; color: #0b1220; padding: 2px 2px; border-radius: 2px; font-weight: 500;";
              highlight.textContent = matchText;
              parts.push(highlight);
              lastIndex = index + length;
            });
            if (lastIndex < text.length) {
              parts.push(text.substring(lastIndex));
            }
            const fragment = document.createDocumentFragment();
            parts.forEach((part) => {
              if (typeof part === "string") {
                fragment.appendChild(document.createTextNode(part));
              } else {
                fragment.appendChild(part);
              }
            });
            parent.replaceChild(fragment, textNode);
          }
          cumulativeOffset = nodeEnd;
        });
      }
      if (matches.length > 0) {
        currentMatchIndex = 0;
        scrollToMatch(0);
        updateSearchInfo();
      } else {
        searchInfo.textContent = "No matches";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
      }
    };
    const scrollToMatch = (index) => {
      if (matches.length === 0 || index < 0 || index >= matches.length) return;
      const markElements = Array.from(contentElement.querySelectorAll("mark.eds-search-highlight"));
      if (markElements[index]) {
        const matchElement = markElements[index];
        const scrollContainer = contentElement;
        const searchContainerHeight = searchContainer.offsetHeight || 0;
        const matchRect = matchElement.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        let offsetTop = 0;
        let element = matchElement;
        while (element && element !== scrollContainer) {
          offsetTop += element.offsetTop;
          element = element.offsetParent;
        }
        const targetScrollTop = offsetTop - searchContainerHeight - 20;
        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth"
        });
        markElements.forEach((el, i) => {
          if (i === index) {
            el.style.cssText = "background: #f59e0b; color: #0b1220; padding: 2px 2px; border-radius: 2px; font-weight: 600; box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3);";
          } else {
            el.style.cssText = "background: #fbbf24; color: #0b1220; padding: 2px 2px; border-radius: 2px; font-weight: 500;";
          }
        });
      }
    };
    const updateSearchInfo = () => {
      if (matches.length > 0) {
        searchInfo.textContent = `${currentMatchIndex + 1} / ${matches.length}`;
        prevBtn.disabled = false;
        nextBtn.disabled = false;
      } else {
        searchInfo.textContent = "";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
      }
    };
    searchInput.addEventListener("input", (e) => {
      const searchText = e.target.value;
      if (searchKey) {
        saveSearchQuery(searchKey, searchText);
      }
      highlightMatches(searchText);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          if (currentMatchIndex > 0) {
            currentMatchIndex--;
            scrollToMatch(currentMatchIndex);
            updateSearchInfo();
          }
        } else {
          if (currentMatchIndex < matches.length - 1) {
            currentMatchIndex++;
            scrollToMatch(currentMatchIndex);
            updateSearchInfo();
          }
        }
      } else if (e.key === "Escape") {
        clearSearch();
        searchInput.blur();
      }
    });
    prevBtn.addEventListener("click", () => {
      if (currentMatchIndex > 0) {
        currentMatchIndex--;
        scrollToMatch(currentMatchIndex);
        updateSearchInfo();
      } else if (matches.length > 0) {
        currentMatchIndex = matches.length - 1;
        scrollToMatch(currentMatchIndex);
        updateSearchInfo();
      }
    });
    nextBtn.addEventListener("click", () => {
      if (currentMatchIndex < matches.length - 1) {
        currentMatchIndex++;
        scrollToMatch(currentMatchIndex);
        updateSearchInfo();
      } else if (matches.length > 0) {
        currentMatchIndex = 0;
        scrollToMatch(currentMatchIndex);
        updateSearchInfo();
      }
    });
    const clearSearch = () => {
      highlightMatches("");
      searchInput.value = "";
      if (searchKey) {
        saveSearchQuery(searchKey, "");
      }
    };
    closeBtn.addEventListener("click", clearSearch);
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        e.stopPropagation();
        searchInput.focus();
        searchInput.select();
      } else if (e.key === "Escape") {
        clearSearch();
        searchInput.blur();
      }
    };
    if (!contentElement.hasAttribute("tabindex")) {
      contentElement.setAttribute("tabindex", "-1");
    }
    contentElement.addEventListener("keydown", handleKeyDown);
    searchBar.appendChild(searchInput);
    searchBar.appendChild(searchInfo);
    searchBar.appendChild(prevBtn);
    searchBar.appendChild(nextBtn);
    searchBar.appendChild(closeBtn);
    searchContainer.appendChild(searchBar);
    if (searchKey) {
      const savedQuery = getSearchQuery(searchKey);
      if (savedQuery) {
        setTimeout(() => {
          searchInput.value = savedQuery;
          highlightMatches(savedQuery);
        }, 100);
      }
    }
    return searchContainer;
  }
  function createFullscreenViewer(rawContent, processedHtml, title, searchKey = null) {
    const existing = document.querySelector(".eds-fullscreen-viewer");
    if (existing) {
      existing.remove();
    }
    const fullscreenContainer = document.createElement("div");
    fullscreenContainer.className = "eds-fullscreen-viewer";
    fullscreenContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.2s ease;
  `;
    const header = document.createElement("div");
    header.style.cssText = `
    padding: 12px 16px;
    background: var(--bg-muted);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  `;
    const headerLeft = document.createElement("div");
    headerLeft.style.cssText = "display: flex; align-items: center; gap: 12px;";
    const titleElement = document.createElement("div");
    titleElement.textContent = title;
    titleElement.style.cssText = "font-weight: 600; color: var(--text); font-size: 14px;";
    headerLeft.appendChild(titleElement);
    const headerRight = document.createElement("div");
    headerRight.style.cssText = "display: flex; align-items: center; gap: 8px;";
    const copyBtn = createCopyButton(rawContent, null, null);
    copyBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 6px 12px; font-size: 12px; transition: all 0.2s;";
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "\u229F";
    closeBtn.title = "Close (ESC)";
    closeBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 6px 12px; font-size: 14px; transition: all 0.2s; font-weight: 600;";
    closeBtn.addEventListener("click", () => {
      fullscreenContainer.remove();
      document.removeEventListener("keydown", handleEsc);
    });
    headerRight.appendChild(copyBtn);
    headerRight.appendChild(closeBtn);
    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    const contentArea = document.createElement("div");
    contentArea.style.cssText = `
    flex: 1;
    overflow: auto;
    position: relative;
    padding: 0;
  `;
    const searchUI = createSearchUI(contentArea, rawContent, searchKey);
    const codeContainer = document.createElement("div");
    codeContainer.style.cssText = "padding: 16px;";
    const pre = document.createElement("pre");
    pre.className = "eds-code";
    pre.style.cssText = "background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;";
    const code = document.createElement("code");
    code.innerHTML = processedHtml;
    code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
    pre.appendChild(code);
    codeContainer.appendChild(pre);
    contentArea.appendChild(searchUI);
    contentArea.appendChild(codeContainer);
    fullscreenContainer.appendChild(header);
    fullscreenContainer.appendChild(contentArea);
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        fullscreenContainer.remove();
        document.removeEventListener("keydown", handleEsc);
      }
    };
    document.addEventListener("keydown", handleEsc);
    if (!document.querySelector("#eds-fullscreen-styles")) {
      const style = document.createElement("style");
      style.id = "eds-fullscreen-styles";
      style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
      document.head.appendChild(style);
    }
    const panelRoot = document.querySelector("[data-tab-panel]")?.closest("main") || document.body;
    panelRoot.appendChild(fullscreenContainer);
    return fullscreenContainer;
  }
  var SEARCH_STORAGE_PREFIX;
  var init_file_utils = __esm({
    "src/panel/utils/file-utils.js"() {
      SEARCH_STORAGE_PREFIX = "eds-search-";
    }
  });

  // node_modules/js-beautify/js/src/core/output.js
  var require_output = __commonJS({
    "node_modules/js-beautify/js/src/core/output.js"(exports, module) {
      "use strict";
      function OutputLine(parent) {
        this.__parent = parent;
        this.__character_count = 0;
        this.__indent_count = -1;
        this.__alignment_count = 0;
        this.__wrap_point_index = 0;
        this.__wrap_point_character_count = 0;
        this.__wrap_point_indent_count = -1;
        this.__wrap_point_alignment_count = 0;
        this.__items = [];
      }
      OutputLine.prototype.clone_empty = function() {
        var line = new OutputLine(this.__parent);
        line.set_indent(this.__indent_count, this.__alignment_count);
        return line;
      };
      OutputLine.prototype.item = function(index) {
        if (index < 0) {
          return this.__items[this.__items.length + index];
        } else {
          return this.__items[index];
        }
      };
      OutputLine.prototype.has_match = function(pattern) {
        for (var lastCheckedOutput = this.__items.length - 1; lastCheckedOutput >= 0; lastCheckedOutput--) {
          if (this.__items[lastCheckedOutput].match(pattern)) {
            return true;
          }
        }
        return false;
      };
      OutputLine.prototype.set_indent = function(indent, alignment) {
        if (this.is_empty()) {
          this.__indent_count = indent || 0;
          this.__alignment_count = alignment || 0;
          this.__character_count = this.__parent.get_indent_size(this.__indent_count, this.__alignment_count);
        }
      };
      OutputLine.prototype._set_wrap_point = function() {
        if (this.__parent.wrap_line_length) {
          this.__wrap_point_index = this.__items.length;
          this.__wrap_point_character_count = this.__character_count;
          this.__wrap_point_indent_count = this.__parent.next_line.__indent_count;
          this.__wrap_point_alignment_count = this.__parent.next_line.__alignment_count;
        }
      };
      OutputLine.prototype._should_wrap = function() {
        return this.__wrap_point_index && this.__character_count > this.__parent.wrap_line_length && this.__wrap_point_character_count > this.__parent.next_line.__character_count;
      };
      OutputLine.prototype._allow_wrap = function() {
        if (this._should_wrap()) {
          this.__parent.add_new_line();
          var next = this.__parent.current_line;
          next.set_indent(this.__wrap_point_indent_count, this.__wrap_point_alignment_count);
          next.__items = this.__items.slice(this.__wrap_point_index);
          this.__items = this.__items.slice(0, this.__wrap_point_index);
          next.__character_count += this.__character_count - this.__wrap_point_character_count;
          this.__character_count = this.__wrap_point_character_count;
          if (next.__items[0] === " ") {
            next.__items.splice(0, 1);
            next.__character_count -= 1;
          }
          return true;
        }
        return false;
      };
      OutputLine.prototype.is_empty = function() {
        return this.__items.length === 0;
      };
      OutputLine.prototype.last = function() {
        if (!this.is_empty()) {
          return this.__items[this.__items.length - 1];
        } else {
          return null;
        }
      };
      OutputLine.prototype.push = function(item) {
        this.__items.push(item);
        var last_newline_index = item.lastIndexOf("\n");
        if (last_newline_index !== -1) {
          this.__character_count = item.length - last_newline_index;
        } else {
          this.__character_count += item.length;
        }
      };
      OutputLine.prototype.pop = function() {
        var item = null;
        if (!this.is_empty()) {
          item = this.__items.pop();
          this.__character_count -= item.length;
        }
        return item;
      };
      OutputLine.prototype._remove_indent = function() {
        if (this.__indent_count > 0) {
          this.__indent_count -= 1;
          this.__character_count -= this.__parent.indent_size;
        }
      };
      OutputLine.prototype._remove_wrap_indent = function() {
        if (this.__wrap_point_indent_count > 0) {
          this.__wrap_point_indent_count -= 1;
        }
      };
      OutputLine.prototype.trim = function() {
        while (this.last() === " ") {
          this.__items.pop();
          this.__character_count -= 1;
        }
      };
      OutputLine.prototype.toString = function() {
        var result = "";
        if (this.is_empty()) {
          if (this.__parent.indent_empty_lines) {
            result = this.__parent.get_indent_string(this.__indent_count);
          }
        } else {
          result = this.__parent.get_indent_string(this.__indent_count, this.__alignment_count);
          result += this.__items.join("");
        }
        return result;
      };
      function IndentStringCache(options, baseIndentString) {
        this.__cache = [""];
        this.__indent_size = options.indent_size;
        this.__indent_string = options.indent_char;
        if (!options.indent_with_tabs) {
          this.__indent_string = new Array(options.indent_size + 1).join(options.indent_char);
        }
        baseIndentString = baseIndentString || "";
        if (options.indent_level > 0) {
          baseIndentString = new Array(options.indent_level + 1).join(this.__indent_string);
        }
        this.__base_string = baseIndentString;
        this.__base_string_length = baseIndentString.length;
      }
      IndentStringCache.prototype.get_indent_size = function(indent, column) {
        var result = this.__base_string_length;
        column = column || 0;
        if (indent < 0) {
          result = 0;
        }
        result += indent * this.__indent_size;
        result += column;
        return result;
      };
      IndentStringCache.prototype.get_indent_string = function(indent_level, column) {
        var result = this.__base_string;
        column = column || 0;
        if (indent_level < 0) {
          indent_level = 0;
          result = "";
        }
        column += indent_level * this.__indent_size;
        this.__ensure_cache(column);
        result += this.__cache[column];
        return result;
      };
      IndentStringCache.prototype.__ensure_cache = function(column) {
        while (column >= this.__cache.length) {
          this.__add_column();
        }
      };
      IndentStringCache.prototype.__add_column = function() {
        var column = this.__cache.length;
        var indent = 0;
        var result = "";
        if (this.__indent_size && column >= this.__indent_size) {
          indent = Math.floor(column / this.__indent_size);
          column -= indent * this.__indent_size;
          result = new Array(indent + 1).join(this.__indent_string);
        }
        if (column) {
          result += new Array(column + 1).join(" ");
        }
        this.__cache.push(result);
      };
      function Output(options, baseIndentString) {
        this.__indent_cache = new IndentStringCache(options, baseIndentString);
        this.raw = false;
        this._end_with_newline = options.end_with_newline;
        this.indent_size = options.indent_size;
        this.wrap_line_length = options.wrap_line_length;
        this.indent_empty_lines = options.indent_empty_lines;
        this.__lines = [];
        this.previous_line = null;
        this.current_line = null;
        this.next_line = new OutputLine(this);
        this.space_before_token = false;
        this.non_breaking_space = false;
        this.previous_token_wrapped = false;
        this.__add_outputline();
      }
      Output.prototype.__add_outputline = function() {
        this.previous_line = this.current_line;
        this.current_line = this.next_line.clone_empty();
        this.__lines.push(this.current_line);
      };
      Output.prototype.get_line_number = function() {
        return this.__lines.length;
      };
      Output.prototype.get_indent_string = function(indent, column) {
        return this.__indent_cache.get_indent_string(indent, column);
      };
      Output.prototype.get_indent_size = function(indent, column) {
        return this.__indent_cache.get_indent_size(indent, column);
      };
      Output.prototype.is_empty = function() {
        return !this.previous_line && this.current_line.is_empty();
      };
      Output.prototype.add_new_line = function(force_newline) {
        if (this.is_empty() || !force_newline && this.just_added_newline()) {
          return false;
        }
        if (!this.raw) {
          this.__add_outputline();
        }
        return true;
      };
      Output.prototype.get_code = function(eol) {
        this.trim(true);
        var last_item = this.current_line.pop();
        if (last_item) {
          if (last_item[last_item.length - 1] === "\n") {
            last_item = last_item.replace(/\n+$/g, "");
          }
          this.current_line.push(last_item);
        }
        if (this._end_with_newline) {
          this.__add_outputline();
        }
        var sweet_code = this.__lines.join("\n");
        if (eol !== "\n") {
          sweet_code = sweet_code.replace(/[\n]/g, eol);
        }
        return sweet_code;
      };
      Output.prototype.set_wrap_point = function() {
        this.current_line._set_wrap_point();
      };
      Output.prototype.set_indent = function(indent, alignment) {
        indent = indent || 0;
        alignment = alignment || 0;
        this.next_line.set_indent(indent, alignment);
        if (this.__lines.length > 1) {
          this.current_line.set_indent(indent, alignment);
          return true;
        }
        this.current_line.set_indent();
        return false;
      };
      Output.prototype.add_raw_token = function(token) {
        for (var x = 0; x < token.newlines; x++) {
          this.__add_outputline();
        }
        this.current_line.set_indent(-1);
        this.current_line.push(token.whitespace_before);
        this.current_line.push(token.text);
        this.space_before_token = false;
        this.non_breaking_space = false;
        this.previous_token_wrapped = false;
      };
      Output.prototype.add_token = function(printable_token) {
        this.__add_space_before_token();
        this.current_line.push(printable_token);
        this.space_before_token = false;
        this.non_breaking_space = false;
        this.previous_token_wrapped = this.current_line._allow_wrap();
      };
      Output.prototype.__add_space_before_token = function() {
        if (this.space_before_token && !this.just_added_newline()) {
          if (!this.non_breaking_space) {
            this.set_wrap_point();
          }
          this.current_line.push(" ");
        }
      };
      Output.prototype.remove_indent = function(index) {
        var output_length = this.__lines.length;
        while (index < output_length) {
          this.__lines[index]._remove_indent();
          index++;
        }
        this.current_line._remove_wrap_indent();
      };
      Output.prototype.trim = function(eat_newlines) {
        eat_newlines = eat_newlines === void 0 ? false : eat_newlines;
        this.current_line.trim();
        while (eat_newlines && this.__lines.length > 1 && this.current_line.is_empty()) {
          this.__lines.pop();
          this.current_line = this.__lines[this.__lines.length - 1];
          this.current_line.trim();
        }
        this.previous_line = this.__lines.length > 1 ? this.__lines[this.__lines.length - 2] : null;
      };
      Output.prototype.just_added_newline = function() {
        return this.current_line.is_empty();
      };
      Output.prototype.just_added_blankline = function() {
        return this.is_empty() || this.current_line.is_empty() && this.previous_line.is_empty();
      };
      Output.prototype.ensure_empty_line_above = function(starts_with, ends_with) {
        var index = this.__lines.length - 2;
        while (index >= 0) {
          var potentialEmptyLine = this.__lines[index];
          if (potentialEmptyLine.is_empty()) {
            break;
          } else if (potentialEmptyLine.item(0).indexOf(starts_with) !== 0 && potentialEmptyLine.item(-1) !== ends_with) {
            this.__lines.splice(index + 1, 0, new OutputLine(this));
            this.previous_line = this.__lines[this.__lines.length - 2];
            break;
          }
          index--;
        }
      };
      module.exports.Output = Output;
    }
  });

  // node_modules/js-beautify/js/src/core/token.js
  var require_token = __commonJS({
    "node_modules/js-beautify/js/src/core/token.js"(exports, module) {
      "use strict";
      function Token(type, text, newlines, whitespace_before) {
        this.type = type;
        this.text = text;
        this.comments_before = null;
        this.newlines = newlines || 0;
        this.whitespace_before = whitespace_before || "";
        this.parent = null;
        this.next = null;
        this.previous = null;
        this.opened = null;
        this.closed = null;
        this.directives = null;
      }
      module.exports.Token = Token;
    }
  });

  // node_modules/js-beautify/js/src/javascript/acorn.js
  var require_acorn = __commonJS({
    "node_modules/js-beautify/js/src/javascript/acorn.js"(exports) {
      "use strict";
      var baseASCIIidentifierStartChars = "\\x23\\x24\\x40\\x41-\\x5a\\x5f\\x61-\\x7a";
      var baseASCIIidentifierChars = "\\x24\\x30-\\x39\\x41-\\x5a\\x5f\\x61-\\x7a";
      var nonASCIIidentifierStartChars = "\\xaa\\xb5\\xba\\xc0-\\xd6\\xd8-\\xf6\\xf8-\\u02c1\\u02c6-\\u02d1\\u02e0-\\u02e4\\u02ec\\u02ee\\u0370-\\u0374\\u0376\\u0377\\u037a-\\u037d\\u0386\\u0388-\\u038a\\u038c\\u038e-\\u03a1\\u03a3-\\u03f5\\u03f7-\\u0481\\u048a-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05d0-\\u05ea\\u05f0-\\u05f2\\u0620-\\u064a\\u066e\\u066f\\u0671-\\u06d3\\u06d5\\u06e5\\u06e6\\u06ee\\u06ef\\u06fa-\\u06fc\\u06ff\\u0710\\u0712-\\u072f\\u074d-\\u07a5\\u07b1\\u07ca-\\u07ea\\u07f4\\u07f5\\u07fa\\u0800-\\u0815\\u081a\\u0824\\u0828\\u0840-\\u0858\\u08a0\\u08a2-\\u08ac\\u0904-\\u0939\\u093d\\u0950\\u0958-\\u0961\\u0971-\\u0977\\u0979-\\u097f\\u0985-\\u098c\\u098f\\u0990\\u0993-\\u09a8\\u09aa-\\u09b0\\u09b2\\u09b6-\\u09b9\\u09bd\\u09ce\\u09dc\\u09dd\\u09df-\\u09e1\\u09f0\\u09f1\\u0a05-\\u0a0a\\u0a0f\\u0a10\\u0a13-\\u0a28\\u0a2a-\\u0a30\\u0a32\\u0a33\\u0a35\\u0a36\\u0a38\\u0a39\\u0a59-\\u0a5c\\u0a5e\\u0a72-\\u0a74\\u0a85-\\u0a8d\\u0a8f-\\u0a91\\u0a93-\\u0aa8\\u0aaa-\\u0ab0\\u0ab2\\u0ab3\\u0ab5-\\u0ab9\\u0abd\\u0ad0\\u0ae0\\u0ae1\\u0b05-\\u0b0c\\u0b0f\\u0b10\\u0b13-\\u0b28\\u0b2a-\\u0b30\\u0b32\\u0b33\\u0b35-\\u0b39\\u0b3d\\u0b5c\\u0b5d\\u0b5f-\\u0b61\\u0b71\\u0b83\\u0b85-\\u0b8a\\u0b8e-\\u0b90\\u0b92-\\u0b95\\u0b99\\u0b9a\\u0b9c\\u0b9e\\u0b9f\\u0ba3\\u0ba4\\u0ba8-\\u0baa\\u0bae-\\u0bb9\\u0bd0\\u0c05-\\u0c0c\\u0c0e-\\u0c10\\u0c12-\\u0c28\\u0c2a-\\u0c33\\u0c35-\\u0c39\\u0c3d\\u0c58\\u0c59\\u0c60\\u0c61\\u0c85-\\u0c8c\\u0c8e-\\u0c90\\u0c92-\\u0ca8\\u0caa-\\u0cb3\\u0cb5-\\u0cb9\\u0cbd\\u0cde\\u0ce0\\u0ce1\\u0cf1\\u0cf2\\u0d05-\\u0d0c\\u0d0e-\\u0d10\\u0d12-\\u0d3a\\u0d3d\\u0d4e\\u0d60\\u0d61\\u0d7a-\\u0d7f\\u0d85-\\u0d96\\u0d9a-\\u0db1\\u0db3-\\u0dbb\\u0dbd\\u0dc0-\\u0dc6\\u0e01-\\u0e30\\u0e32\\u0e33\\u0e40-\\u0e46\\u0e81\\u0e82\\u0e84\\u0e87\\u0e88\\u0e8a\\u0e8d\\u0e94-\\u0e97\\u0e99-\\u0e9f\\u0ea1-\\u0ea3\\u0ea5\\u0ea7\\u0eaa\\u0eab\\u0ead-\\u0eb0\\u0eb2\\u0eb3\\u0ebd\\u0ec0-\\u0ec4\\u0ec6\\u0edc-\\u0edf\\u0f00\\u0f40-\\u0f47\\u0f49-\\u0f6c\\u0f88-\\u0f8c\\u1000-\\u102a\\u103f\\u1050-\\u1055\\u105a-\\u105d\\u1061\\u1065\\u1066\\u106e-\\u1070\\u1075-\\u1081\\u108e\\u10a0-\\u10c5\\u10c7\\u10cd\\u10d0-\\u10fa\\u10fc-\\u1248\\u124a-\\u124d\\u1250-\\u1256\\u1258\\u125a-\\u125d\\u1260-\\u1288\\u128a-\\u128d\\u1290-\\u12b0\\u12b2-\\u12b5\\u12b8-\\u12be\\u12c0\\u12c2-\\u12c5\\u12c8-\\u12d6\\u12d8-\\u1310\\u1312-\\u1315\\u1318-\\u135a\\u1380-\\u138f\\u13a0-\\u13f4\\u1401-\\u166c\\u166f-\\u167f\\u1681-\\u169a\\u16a0-\\u16ea\\u16ee-\\u16f0\\u1700-\\u170c\\u170e-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176c\\u176e-\\u1770\\u1780-\\u17b3\\u17d7\\u17dc\\u1820-\\u1877\\u1880-\\u18a8\\u18aa\\u18b0-\\u18f5\\u1900-\\u191c\\u1950-\\u196d\\u1970-\\u1974\\u1980-\\u19ab\\u19c1-\\u19c7\\u1a00-\\u1a16\\u1a20-\\u1a54\\u1aa7\\u1b05-\\u1b33\\u1b45-\\u1b4b\\u1b83-\\u1ba0\\u1bae\\u1baf\\u1bba-\\u1be5\\u1c00-\\u1c23\\u1c4d-\\u1c4f\\u1c5a-\\u1c7d\\u1ce9-\\u1cec\\u1cee-\\u1cf1\\u1cf5\\u1cf6\\u1d00-\\u1dbf\\u1e00-\\u1f15\\u1f18-\\u1f1d\\u1f20-\\u1f45\\u1f48-\\u1f4d\\u1f50-\\u1f57\\u1f59\\u1f5b\\u1f5d\\u1f5f-\\u1f7d\\u1f80-\\u1fb4\\u1fb6-\\u1fbc\\u1fbe\\u1fc2-\\u1fc4\\u1fc6-\\u1fcc\\u1fd0-\\u1fd3\\u1fd6-\\u1fdb\\u1fe0-\\u1fec\\u1ff2-\\u1ff4\\u1ff6-\\u1ffc\\u2071\\u207f\\u2090-\\u209c\\u2102\\u2107\\u210a-\\u2113\\u2115\\u2119-\\u211d\\u2124\\u2126\\u2128\\u212a-\\u212d\\u212f-\\u2139\\u213c-\\u213f\\u2145-\\u2149\\u214e\\u2160-\\u2188\\u2c00-\\u2c2e\\u2c30-\\u2c5e\\u2c60-\\u2ce4\\u2ceb-\\u2cee\\u2cf2\\u2cf3\\u2d00-\\u2d25\\u2d27\\u2d2d\\u2d30-\\u2d67\\u2d6f\\u2d80-\\u2d96\\u2da0-\\u2da6\\u2da8-\\u2dae\\u2db0-\\u2db6\\u2db8-\\u2dbe\\u2dc0-\\u2dc6\\u2dc8-\\u2dce\\u2dd0-\\u2dd6\\u2dd8-\\u2dde\\u2e2f\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303c\\u3041-\\u3096\\u309d-\\u309f\\u30a1-\\u30fa\\u30fc-\\u30ff\\u3105-\\u312d\\u3131-\\u318e\\u31a0-\\u31ba\\u31f0-\\u31ff\\u3400-\\u4db5\\u4e00-\\u9fcc\\ua000-\\ua48c\\ua4d0-\\ua4fd\\ua500-\\ua60c\\ua610-\\ua61f\\ua62a\\ua62b\\ua640-\\ua66e\\ua67f-\\ua697\\ua6a0-\\ua6ef\\ua717-\\ua71f\\ua722-\\ua788\\ua78b-\\ua78e\\ua790-\\ua793\\ua7a0-\\ua7aa\\ua7f8-\\ua801\\ua803-\\ua805\\ua807-\\ua80a\\ua80c-\\ua822\\ua840-\\ua873\\ua882-\\ua8b3\\ua8f2-\\ua8f7\\ua8fb\\ua90a-\\ua925\\ua930-\\ua946\\ua960-\\ua97c\\ua984-\\ua9b2\\ua9cf\\uaa00-\\uaa28\\uaa40-\\uaa42\\uaa44-\\uaa4b\\uaa60-\\uaa76\\uaa7a\\uaa80-\\uaaaf\\uaab1\\uaab5\\uaab6\\uaab9-\\uaabd\\uaac0\\uaac2\\uaadb-\\uaadd\\uaae0-\\uaaea\\uaaf2-\\uaaf4\\uab01-\\uab06\\uab09-\\uab0e\\uab11-\\uab16\\uab20-\\uab26\\uab28-\\uab2e\\uabc0-\\uabe2\\uac00-\\ud7a3\\ud7b0-\\ud7c6\\ud7cb-\\ud7fb\\uf900-\\ufa6d\\ufa70-\\ufad9\\ufb00-\\ufb06\\ufb13-\\ufb17\\ufb1d\\ufb1f-\\ufb28\\ufb2a-\\ufb36\\ufb38-\\ufb3c\\ufb3e\\ufb40\\ufb41\\ufb43\\ufb44\\ufb46-\\ufbb1\\ufbd3-\\ufd3d\\ufd50-\\ufd8f\\ufd92-\\ufdc7\\ufdf0-\\ufdfb\\ufe70-\\ufe74\\ufe76-\\ufefc\\uff21-\\uff3a\\uff41-\\uff5a\\uff66-\\uffbe\\uffc2-\\uffc7\\uffca-\\uffcf\\uffd2-\\uffd7\\uffda-\\uffdc";
      var nonASCIIidentifierChars = "\\u0300-\\u036f\\u0483-\\u0487\\u0591-\\u05bd\\u05bf\\u05c1\\u05c2\\u05c4\\u05c5\\u05c7\\u0610-\\u061a\\u0620-\\u0649\\u0672-\\u06d3\\u06e7-\\u06e8\\u06fb-\\u06fc\\u0730-\\u074a\\u0800-\\u0814\\u081b-\\u0823\\u0825-\\u0827\\u0829-\\u082d\\u0840-\\u0857\\u08e4-\\u08fe\\u0900-\\u0903\\u093a-\\u093c\\u093e-\\u094f\\u0951-\\u0957\\u0962-\\u0963\\u0966-\\u096f\\u0981-\\u0983\\u09bc\\u09be-\\u09c4\\u09c7\\u09c8\\u09d7\\u09df-\\u09e0\\u0a01-\\u0a03\\u0a3c\\u0a3e-\\u0a42\\u0a47\\u0a48\\u0a4b-\\u0a4d\\u0a51\\u0a66-\\u0a71\\u0a75\\u0a81-\\u0a83\\u0abc\\u0abe-\\u0ac5\\u0ac7-\\u0ac9\\u0acb-\\u0acd\\u0ae2-\\u0ae3\\u0ae6-\\u0aef\\u0b01-\\u0b03\\u0b3c\\u0b3e-\\u0b44\\u0b47\\u0b48\\u0b4b-\\u0b4d\\u0b56\\u0b57\\u0b5f-\\u0b60\\u0b66-\\u0b6f\\u0b82\\u0bbe-\\u0bc2\\u0bc6-\\u0bc8\\u0bca-\\u0bcd\\u0bd7\\u0be6-\\u0bef\\u0c01-\\u0c03\\u0c46-\\u0c48\\u0c4a-\\u0c4d\\u0c55\\u0c56\\u0c62-\\u0c63\\u0c66-\\u0c6f\\u0c82\\u0c83\\u0cbc\\u0cbe-\\u0cc4\\u0cc6-\\u0cc8\\u0cca-\\u0ccd\\u0cd5\\u0cd6\\u0ce2-\\u0ce3\\u0ce6-\\u0cef\\u0d02\\u0d03\\u0d46-\\u0d48\\u0d57\\u0d62-\\u0d63\\u0d66-\\u0d6f\\u0d82\\u0d83\\u0dca\\u0dcf-\\u0dd4\\u0dd6\\u0dd8-\\u0ddf\\u0df2\\u0df3\\u0e34-\\u0e3a\\u0e40-\\u0e45\\u0e50-\\u0e59\\u0eb4-\\u0eb9\\u0ec8-\\u0ecd\\u0ed0-\\u0ed9\\u0f18\\u0f19\\u0f20-\\u0f29\\u0f35\\u0f37\\u0f39\\u0f41-\\u0f47\\u0f71-\\u0f84\\u0f86-\\u0f87\\u0f8d-\\u0f97\\u0f99-\\u0fbc\\u0fc6\\u1000-\\u1029\\u1040-\\u1049\\u1067-\\u106d\\u1071-\\u1074\\u1082-\\u108d\\u108f-\\u109d\\u135d-\\u135f\\u170e-\\u1710\\u1720-\\u1730\\u1740-\\u1750\\u1772\\u1773\\u1780-\\u17b2\\u17dd\\u17e0-\\u17e9\\u180b-\\u180d\\u1810-\\u1819\\u1920-\\u192b\\u1930-\\u193b\\u1951-\\u196d\\u19b0-\\u19c0\\u19c8-\\u19c9\\u19d0-\\u19d9\\u1a00-\\u1a15\\u1a20-\\u1a53\\u1a60-\\u1a7c\\u1a7f-\\u1a89\\u1a90-\\u1a99\\u1b46-\\u1b4b\\u1b50-\\u1b59\\u1b6b-\\u1b73\\u1bb0-\\u1bb9\\u1be6-\\u1bf3\\u1c00-\\u1c22\\u1c40-\\u1c49\\u1c5b-\\u1c7d\\u1cd0-\\u1cd2\\u1d00-\\u1dbe\\u1e01-\\u1f15\\u200c\\u200d\\u203f\\u2040\\u2054\\u20d0-\\u20dc\\u20e1\\u20e5-\\u20f0\\u2d81-\\u2d96\\u2de0-\\u2dff\\u3021-\\u3028\\u3099\\u309a\\ua640-\\ua66d\\ua674-\\ua67d\\ua69f\\ua6f0-\\ua6f1\\ua7f8-\\ua800\\ua806\\ua80b\\ua823-\\ua827\\ua880-\\ua881\\ua8b4-\\ua8c4\\ua8d0-\\ua8d9\\ua8f3-\\ua8f7\\ua900-\\ua909\\ua926-\\ua92d\\ua930-\\ua945\\ua980-\\ua983\\ua9b3-\\ua9c0\\uaa00-\\uaa27\\uaa40-\\uaa41\\uaa4c-\\uaa4d\\uaa50-\\uaa59\\uaa7b\\uaae0-\\uaae9\\uaaf2-\\uaaf3\\uabc0-\\uabe1\\uabec\\uabed\\uabf0-\\uabf9\\ufb20-\\ufb28\\ufe00-\\ufe0f\\ufe20-\\ufe26\\ufe33\\ufe34\\ufe4d-\\ufe4f\\uff10-\\uff19\\uff3f";
      var unicodeEscapeOrCodePoint = "\\\\u[0-9a-fA-F]{4}|\\\\u\\{[0-9a-fA-F]+\\}";
      var identifierStart = "(?:" + unicodeEscapeOrCodePoint + "|[" + baseASCIIidentifierStartChars + nonASCIIidentifierStartChars + "])";
      var identifierChars = "(?:" + unicodeEscapeOrCodePoint + "|[" + baseASCIIidentifierChars + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "])*";
      exports.identifier = new RegExp(identifierStart + identifierChars, "g");
      exports.identifierStart = new RegExp(identifierStart);
      exports.identifierMatch = new RegExp("(?:" + unicodeEscapeOrCodePoint + "|[" + baseASCIIidentifierChars + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "])+");
      exports.newline = /[\n\r\u2028\u2029]/;
      exports.lineBreak = new RegExp("\r\n|" + exports.newline.source);
      exports.allLineBreaks = new RegExp(exports.lineBreak.source, "g");
    }
  });

  // node_modules/js-beautify/js/src/core/options.js
  var require_options = __commonJS({
    "node_modules/js-beautify/js/src/core/options.js"(exports, module) {
      "use strict";
      function Options(options, merge_child_field) {
        this.raw_options = _mergeOpts(options, merge_child_field);
        this.disabled = this._get_boolean("disabled");
        this.eol = this._get_characters("eol", "auto");
        this.end_with_newline = this._get_boolean("end_with_newline");
        this.indent_size = this._get_number("indent_size", 4);
        this.indent_char = this._get_characters("indent_char", " ");
        this.indent_level = this._get_number("indent_level");
        this.preserve_newlines = this._get_boolean("preserve_newlines", true);
        this.max_preserve_newlines = this._get_number("max_preserve_newlines", 32786);
        if (!this.preserve_newlines) {
          this.max_preserve_newlines = 0;
        }
        this.indent_with_tabs = this._get_boolean("indent_with_tabs", this.indent_char === "	");
        if (this.indent_with_tabs) {
          this.indent_char = "	";
          if (this.indent_size === 1) {
            this.indent_size = 4;
          }
        }
        this.wrap_line_length = this._get_number("wrap_line_length", this._get_number("max_char"));
        this.indent_empty_lines = this._get_boolean("indent_empty_lines");
        this.templating = this._get_selection_list("templating", ["auto", "none", "angular", "django", "erb", "handlebars", "php", "smarty"], ["auto"]);
      }
      Options.prototype._get_array = function(name, default_value) {
        var option_value = this.raw_options[name];
        var result = default_value || [];
        if (typeof option_value === "object") {
          if (option_value !== null && typeof option_value.concat === "function") {
            result = option_value.concat();
          }
        } else if (typeof option_value === "string") {
          result = option_value.split(/[^a-zA-Z0-9_\/\-]+/);
        }
        return result;
      };
      Options.prototype._get_boolean = function(name, default_value) {
        var option_value = this.raw_options[name];
        var result = option_value === void 0 ? !!default_value : !!option_value;
        return result;
      };
      Options.prototype._get_characters = function(name, default_value) {
        var option_value = this.raw_options[name];
        var result = default_value || "";
        if (typeof option_value === "string") {
          result = option_value.replace(/\\r/, "\r").replace(/\\n/, "\n").replace(/\\t/, "	");
        }
        return result;
      };
      Options.prototype._get_number = function(name, default_value) {
        var option_value = this.raw_options[name];
        default_value = parseInt(default_value, 10);
        if (isNaN(default_value)) {
          default_value = 0;
        }
        var result = parseInt(option_value, 10);
        if (isNaN(result)) {
          result = default_value;
        }
        return result;
      };
      Options.prototype._get_selection = function(name, selection_list, default_value) {
        var result = this._get_selection_list(name, selection_list, default_value);
        if (result.length !== 1) {
          throw new Error(
            "Invalid Option Value: The option '" + name + "' can only be one of the following values:\n" + selection_list + "\nYou passed in: '" + this.raw_options[name] + "'"
          );
        }
        return result[0];
      };
      Options.prototype._get_selection_list = function(name, selection_list, default_value) {
        if (!selection_list || selection_list.length === 0) {
          throw new Error("Selection list cannot be empty.");
        }
        default_value = default_value || [selection_list[0]];
        if (!this._is_valid_selection(default_value, selection_list)) {
          throw new Error("Invalid Default Value!");
        }
        var result = this._get_array(name, default_value);
        if (!this._is_valid_selection(result, selection_list)) {
          throw new Error(
            "Invalid Option Value: The option '" + name + "' can contain only the following values:\n" + selection_list + "\nYou passed in: '" + this.raw_options[name] + "'"
          );
        }
        return result;
      };
      Options.prototype._is_valid_selection = function(result, selection_list) {
        return result.length && selection_list.length && !result.some(function(item) {
          return selection_list.indexOf(item) === -1;
        });
      };
      function _mergeOpts(allOptions, childFieldName) {
        var finalOpts = {};
        allOptions = _normalizeOpts(allOptions);
        var name;
        for (name in allOptions) {
          if (name !== childFieldName) {
            finalOpts[name] = allOptions[name];
          }
        }
        if (childFieldName && allOptions[childFieldName]) {
          for (name in allOptions[childFieldName]) {
            finalOpts[name] = allOptions[childFieldName][name];
          }
        }
        return finalOpts;
      }
      function _normalizeOpts(options) {
        var convertedOpts = {};
        var key;
        for (key in options) {
          var newKey = key.replace(/-/g, "_");
          convertedOpts[newKey] = options[key];
        }
        return convertedOpts;
      }
      module.exports.Options = Options;
      module.exports.normalizeOpts = _normalizeOpts;
      module.exports.mergeOpts = _mergeOpts;
    }
  });

  // node_modules/js-beautify/js/src/javascript/options.js
  var require_options2 = __commonJS({
    "node_modules/js-beautify/js/src/javascript/options.js"(exports, module) {
      "use strict";
      var BaseOptions = require_options().Options;
      var validPositionValues = ["before-newline", "after-newline", "preserve-newline"];
      function Options(options) {
        BaseOptions.call(this, options, "js");
        var raw_brace_style = this.raw_options.brace_style || null;
        if (raw_brace_style === "expand-strict") {
          this.raw_options.brace_style = "expand";
        } else if (raw_brace_style === "collapse-preserve-inline") {
          this.raw_options.brace_style = "collapse,preserve-inline";
        } else if (this.raw_options.braces_on_own_line !== void 0) {
          this.raw_options.brace_style = this.raw_options.braces_on_own_line ? "expand" : "collapse";
        }
        var brace_style_split = this._get_selection_list("brace_style", ["collapse", "expand", "end-expand", "none", "preserve-inline"]);
        this.brace_preserve_inline = false;
        this.brace_style = "collapse";
        for (var bs = 0; bs < brace_style_split.length; bs++) {
          if (brace_style_split[bs] === "preserve-inline") {
            this.brace_preserve_inline = true;
          } else {
            this.brace_style = brace_style_split[bs];
          }
        }
        this.unindent_chained_methods = this._get_boolean("unindent_chained_methods");
        this.break_chained_methods = this._get_boolean("break_chained_methods");
        this.space_in_paren = this._get_boolean("space_in_paren");
        this.space_in_empty_paren = this._get_boolean("space_in_empty_paren");
        this.jslint_happy = this._get_boolean("jslint_happy");
        this.space_after_anon_function = this._get_boolean("space_after_anon_function");
        this.space_after_named_function = this._get_boolean("space_after_named_function");
        this.keep_array_indentation = this._get_boolean("keep_array_indentation");
        this.space_before_conditional = this._get_boolean("space_before_conditional", true);
        this.unescape_strings = this._get_boolean("unescape_strings");
        this.e4x = this._get_boolean("e4x");
        this.comma_first = this._get_boolean("comma_first");
        this.operator_position = this._get_selection("operator_position", validPositionValues);
        this.test_output_raw = this._get_boolean("test_output_raw");
        if (this.jslint_happy) {
          this.space_after_anon_function = true;
        }
      }
      Options.prototype = new BaseOptions();
      module.exports.Options = Options;
    }
  });

  // node_modules/js-beautify/js/src/core/inputscanner.js
  var require_inputscanner = __commonJS({
    "node_modules/js-beautify/js/src/core/inputscanner.js"(exports, module) {
      "use strict";
      var regexp_has_sticky = RegExp.prototype.hasOwnProperty("sticky");
      function InputScanner(input_string) {
        this.__input = input_string || "";
        this.__input_length = this.__input.length;
        this.__position = 0;
      }
      InputScanner.prototype.restart = function() {
        this.__position = 0;
      };
      InputScanner.prototype.back = function() {
        if (this.__position > 0) {
          this.__position -= 1;
        }
      };
      InputScanner.prototype.hasNext = function() {
        return this.__position < this.__input_length;
      };
      InputScanner.prototype.next = function() {
        var val = null;
        if (this.hasNext()) {
          val = this.__input.charAt(this.__position);
          this.__position += 1;
        }
        return val;
      };
      InputScanner.prototype.peek = function(index) {
        var val = null;
        index = index || 0;
        index += this.__position;
        if (index >= 0 && index < this.__input_length) {
          val = this.__input.charAt(index);
        }
        return val;
      };
      InputScanner.prototype.__match = function(pattern, index) {
        pattern.lastIndex = index;
        var pattern_match = pattern.exec(this.__input);
        if (pattern_match && !(regexp_has_sticky && pattern.sticky)) {
          if (pattern_match.index !== index) {
            pattern_match = null;
          }
        }
        return pattern_match;
      };
      InputScanner.prototype.test = function(pattern, index) {
        index = index || 0;
        index += this.__position;
        if (index >= 0 && index < this.__input_length) {
          return !!this.__match(pattern, index);
        } else {
          return false;
        }
      };
      InputScanner.prototype.testChar = function(pattern, index) {
        var val = this.peek(index);
        pattern.lastIndex = 0;
        return val !== null && pattern.test(val);
      };
      InputScanner.prototype.match = function(pattern) {
        var pattern_match = this.__match(pattern, this.__position);
        if (pattern_match) {
          this.__position += pattern_match[0].length;
        } else {
          pattern_match = null;
        }
        return pattern_match;
      };
      InputScanner.prototype.read = function(starting_pattern, until_pattern, until_after) {
        var val = "";
        var match;
        if (starting_pattern) {
          match = this.match(starting_pattern);
          if (match) {
            val += match[0];
          }
        }
        if (until_pattern && (match || !starting_pattern)) {
          val += this.readUntil(until_pattern, until_after);
        }
        return val;
      };
      InputScanner.prototype.readUntil = function(pattern, until_after) {
        var val = "";
        var match_index = this.__position;
        pattern.lastIndex = this.__position;
        var pattern_match = pattern.exec(this.__input);
        if (pattern_match) {
          match_index = pattern_match.index;
          if (until_after) {
            match_index += pattern_match[0].length;
          }
        } else {
          match_index = this.__input_length;
        }
        val = this.__input.substring(this.__position, match_index);
        this.__position = match_index;
        return val;
      };
      InputScanner.prototype.readUntilAfter = function(pattern) {
        return this.readUntil(pattern, true);
      };
      InputScanner.prototype.get_regexp = function(pattern, match_from) {
        var result = null;
        var flags = "g";
        if (match_from && regexp_has_sticky) {
          flags = "y";
        }
        if (typeof pattern === "string" && pattern !== "") {
          result = new RegExp(pattern, flags);
        } else if (pattern) {
          result = new RegExp(pattern.source, flags);
        }
        return result;
      };
      InputScanner.prototype.get_literal_regexp = function(literal_string) {
        return RegExp(literal_string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
      };
      InputScanner.prototype.peekUntilAfter = function(pattern) {
        var start = this.__position;
        var val = this.readUntilAfter(pattern);
        this.__position = start;
        return val;
      };
      InputScanner.prototype.lookBack = function(testVal) {
        var start = this.__position - 1;
        return start >= testVal.length && this.__input.substring(start - testVal.length, start).toLowerCase() === testVal;
      };
      module.exports.InputScanner = InputScanner;
    }
  });

  // node_modules/js-beautify/js/src/core/tokenstream.js
  var require_tokenstream = __commonJS({
    "node_modules/js-beautify/js/src/core/tokenstream.js"(exports, module) {
      "use strict";
      function TokenStream(parent_token) {
        this.__tokens = [];
        this.__tokens_length = this.__tokens.length;
        this.__position = 0;
        this.__parent_token = parent_token;
      }
      TokenStream.prototype.restart = function() {
        this.__position = 0;
      };
      TokenStream.prototype.isEmpty = function() {
        return this.__tokens_length === 0;
      };
      TokenStream.prototype.hasNext = function() {
        return this.__position < this.__tokens_length;
      };
      TokenStream.prototype.next = function() {
        var val = null;
        if (this.hasNext()) {
          val = this.__tokens[this.__position];
          this.__position += 1;
        }
        return val;
      };
      TokenStream.prototype.peek = function(index) {
        var val = null;
        index = index || 0;
        index += this.__position;
        if (index >= 0 && index < this.__tokens_length) {
          val = this.__tokens[index];
        }
        return val;
      };
      TokenStream.prototype.add = function(token) {
        if (this.__parent_token) {
          token.parent = this.__parent_token;
        }
        this.__tokens.push(token);
        this.__tokens_length += 1;
      };
      module.exports.TokenStream = TokenStream;
    }
  });

  // node_modules/js-beautify/js/src/core/pattern.js
  var require_pattern = __commonJS({
    "node_modules/js-beautify/js/src/core/pattern.js"(exports, module) {
      "use strict";
      function Pattern(input_scanner, parent) {
        this._input = input_scanner;
        this._starting_pattern = null;
        this._match_pattern = null;
        this._until_pattern = null;
        this._until_after = false;
        if (parent) {
          this._starting_pattern = this._input.get_regexp(parent._starting_pattern, true);
          this._match_pattern = this._input.get_regexp(parent._match_pattern, true);
          this._until_pattern = this._input.get_regexp(parent._until_pattern);
          this._until_after = parent._until_after;
        }
      }
      Pattern.prototype.read = function() {
        var result = this._input.read(this._starting_pattern);
        if (!this._starting_pattern || result) {
          result += this._input.read(this._match_pattern, this._until_pattern, this._until_after);
        }
        return result;
      };
      Pattern.prototype.read_match = function() {
        return this._input.match(this._match_pattern);
      };
      Pattern.prototype.until_after = function(pattern) {
        var result = this._create();
        result._until_after = true;
        result._until_pattern = this._input.get_regexp(pattern);
        result._update();
        return result;
      };
      Pattern.prototype.until = function(pattern) {
        var result = this._create();
        result._until_after = false;
        result._until_pattern = this._input.get_regexp(pattern);
        result._update();
        return result;
      };
      Pattern.prototype.starting_with = function(pattern) {
        var result = this._create();
        result._starting_pattern = this._input.get_regexp(pattern, true);
        result._update();
        return result;
      };
      Pattern.prototype.matching = function(pattern) {
        var result = this._create();
        result._match_pattern = this._input.get_regexp(pattern, true);
        result._update();
        return result;
      };
      Pattern.prototype._create = function() {
        return new Pattern(this._input, this);
      };
      Pattern.prototype._update = function() {
      };
      module.exports.Pattern = Pattern;
    }
  });

  // node_modules/js-beautify/js/src/core/whitespacepattern.js
  var require_whitespacepattern = __commonJS({
    "node_modules/js-beautify/js/src/core/whitespacepattern.js"(exports, module) {
      "use strict";
      var Pattern = require_pattern().Pattern;
      function WhitespacePattern(input_scanner, parent) {
        Pattern.call(this, input_scanner, parent);
        if (parent) {
          this._line_regexp = this._input.get_regexp(parent._line_regexp);
        } else {
          this.__set_whitespace_patterns("", "");
        }
        this.newline_count = 0;
        this.whitespace_before_token = "";
      }
      WhitespacePattern.prototype = new Pattern();
      WhitespacePattern.prototype.__set_whitespace_patterns = function(whitespace_chars, newline_chars) {
        whitespace_chars += "\\t ";
        newline_chars += "\\n\\r";
        this._match_pattern = this._input.get_regexp(
          "[" + whitespace_chars + newline_chars + "]+",
          true
        );
        this._newline_regexp = this._input.get_regexp(
          "\\r\\n|[" + newline_chars + "]"
        );
      };
      WhitespacePattern.prototype.read = function() {
        this.newline_count = 0;
        this.whitespace_before_token = "";
        var resulting_string = this._input.read(this._match_pattern);
        if (resulting_string === " ") {
          this.whitespace_before_token = " ";
        } else if (resulting_string) {
          var matches = this.__split(this._newline_regexp, resulting_string);
          this.newline_count = matches.length - 1;
          this.whitespace_before_token = matches[this.newline_count];
        }
        return resulting_string;
      };
      WhitespacePattern.prototype.matching = function(whitespace_chars, newline_chars) {
        var result = this._create();
        result.__set_whitespace_patterns(whitespace_chars, newline_chars);
        result._update();
        return result;
      };
      WhitespacePattern.prototype._create = function() {
        return new WhitespacePattern(this._input, this);
      };
      WhitespacePattern.prototype.__split = function(regexp, input_string) {
        regexp.lastIndex = 0;
        var start_index = 0;
        var result = [];
        var next_match = regexp.exec(input_string);
        while (next_match) {
          result.push(input_string.substring(start_index, next_match.index));
          start_index = next_match.index + next_match[0].length;
          next_match = regexp.exec(input_string);
        }
        if (start_index < input_string.length) {
          result.push(input_string.substring(start_index, input_string.length));
        } else {
          result.push("");
        }
        return result;
      };
      module.exports.WhitespacePattern = WhitespacePattern;
    }
  });

  // node_modules/js-beautify/js/src/core/tokenizer.js
  var require_tokenizer = __commonJS({
    "node_modules/js-beautify/js/src/core/tokenizer.js"(exports, module) {
      "use strict";
      var InputScanner = require_inputscanner().InputScanner;
      var Token = require_token().Token;
      var TokenStream = require_tokenstream().TokenStream;
      var WhitespacePattern = require_whitespacepattern().WhitespacePattern;
      var TOKEN = {
        START: "TK_START",
        RAW: "TK_RAW",
        EOF: "TK_EOF"
      };
      var Tokenizer = function(input_string, options) {
        this._input = new InputScanner(input_string);
        this._options = options || {};
        this.__tokens = null;
        this._patterns = {};
        this._patterns.whitespace = new WhitespacePattern(this._input);
      };
      Tokenizer.prototype.tokenize = function() {
        this._input.restart();
        this.__tokens = new TokenStream();
        this._reset();
        var current;
        var previous = new Token(TOKEN.START, "");
        var open_token = null;
        var open_stack = [];
        var comments = new TokenStream();
        while (previous.type !== TOKEN.EOF) {
          current = this._get_next_token(previous, open_token);
          while (this._is_comment(current)) {
            comments.add(current);
            current = this._get_next_token(previous, open_token);
          }
          if (!comments.isEmpty()) {
            current.comments_before = comments;
            comments = new TokenStream();
          }
          current.parent = open_token;
          if (this._is_opening(current)) {
            open_stack.push(open_token);
            open_token = current;
          } else if (open_token && this._is_closing(current, open_token)) {
            current.opened = open_token;
            open_token.closed = current;
            open_token = open_stack.pop();
            current.parent = open_token;
          }
          current.previous = previous;
          previous.next = current;
          this.__tokens.add(current);
          previous = current;
        }
        return this.__tokens;
      };
      Tokenizer.prototype._is_first_token = function() {
        return this.__tokens.isEmpty();
      };
      Tokenizer.prototype._reset = function() {
      };
      Tokenizer.prototype._get_next_token = function(previous_token, open_token) {
        this._readWhitespace();
        var resulting_string = this._input.read(/.+/g);
        if (resulting_string) {
          return this._create_token(TOKEN.RAW, resulting_string);
        } else {
          return this._create_token(TOKEN.EOF, "");
        }
      };
      Tokenizer.prototype._is_comment = function(current_token) {
        return false;
      };
      Tokenizer.prototype._is_opening = function(current_token) {
        return false;
      };
      Tokenizer.prototype._is_closing = function(current_token, open_token) {
        return false;
      };
      Tokenizer.prototype._create_token = function(type, text) {
        var token = new Token(
          type,
          text,
          this._patterns.whitespace.newline_count,
          this._patterns.whitespace.whitespace_before_token
        );
        return token;
      };
      Tokenizer.prototype._readWhitespace = function() {
        return this._patterns.whitespace.read();
      };
      module.exports.Tokenizer = Tokenizer;
      module.exports.TOKEN = TOKEN;
    }
  });

  // node_modules/js-beautify/js/src/core/directives.js
  var require_directives = __commonJS({
    "node_modules/js-beautify/js/src/core/directives.js"(exports, module) {
      "use strict";
      function Directives(start_block_pattern, end_block_pattern) {
        start_block_pattern = typeof start_block_pattern === "string" ? start_block_pattern : start_block_pattern.source;
        end_block_pattern = typeof end_block_pattern === "string" ? end_block_pattern : end_block_pattern.source;
        this.__directives_block_pattern = new RegExp(start_block_pattern + / beautify( \w+[:]\w+)+ /.source + end_block_pattern, "g");
        this.__directive_pattern = / (\w+)[:](\w+)/g;
        this.__directives_end_ignore_pattern = new RegExp(start_block_pattern + /\sbeautify\signore:end\s/.source + end_block_pattern, "g");
      }
      Directives.prototype.get_directives = function(text) {
        if (!text.match(this.__directives_block_pattern)) {
          return null;
        }
        var directives = {};
        this.__directive_pattern.lastIndex = 0;
        var directive_match = this.__directive_pattern.exec(text);
        while (directive_match) {
          directives[directive_match[1]] = directive_match[2];
          directive_match = this.__directive_pattern.exec(text);
        }
        return directives;
      };
      Directives.prototype.readIgnored = function(input) {
        return input.readUntilAfter(this.__directives_end_ignore_pattern);
      };
      module.exports.Directives = Directives;
    }
  });

  // node_modules/js-beautify/js/src/core/templatablepattern.js
  var require_templatablepattern = __commonJS({
    "node_modules/js-beautify/js/src/core/templatablepattern.js"(exports, module) {
      "use strict";
      var Pattern = require_pattern().Pattern;
      var template_names = {
        django: false,
        erb: false,
        handlebars: false,
        php: false,
        smarty: false,
        angular: false
      };
      function TemplatablePattern(input_scanner, parent) {
        Pattern.call(this, input_scanner, parent);
        this.__template_pattern = null;
        this._disabled = Object.assign({}, template_names);
        this._excluded = Object.assign({}, template_names);
        if (parent) {
          this.__template_pattern = this._input.get_regexp(parent.__template_pattern);
          this._excluded = Object.assign(this._excluded, parent._excluded);
          this._disabled = Object.assign(this._disabled, parent._disabled);
        }
        var pattern = new Pattern(input_scanner);
        this.__patterns = {
          handlebars_comment: pattern.starting_with(/{{!--/).until_after(/--}}/),
          handlebars_unescaped: pattern.starting_with(/{{{/).until_after(/}}}/),
          handlebars: pattern.starting_with(/{{/).until_after(/}}/),
          php: pattern.starting_with(/<\?(?:[= ]|php)/).until_after(/\?>/),
          erb: pattern.starting_with(/<%[^%]/).until_after(/[^%]%>/),
          // django coflicts with handlebars a bit.
          django: pattern.starting_with(/{%/).until_after(/%}/),
          django_value: pattern.starting_with(/{{/).until_after(/}}/),
          django_comment: pattern.starting_with(/{#/).until_after(/#}/),
          smarty: pattern.starting_with(/{(?=[^}{\s\n])/).until_after(/[^\s\n]}/),
          smarty_comment: pattern.starting_with(/{\*/).until_after(/\*}/),
          smarty_literal: pattern.starting_with(/{literal}/).until_after(/{\/literal}/)
        };
      }
      TemplatablePattern.prototype = new Pattern();
      TemplatablePattern.prototype._create = function() {
        return new TemplatablePattern(this._input, this);
      };
      TemplatablePattern.prototype._update = function() {
        this.__set_templated_pattern();
      };
      TemplatablePattern.prototype.disable = function(language) {
        var result = this._create();
        result._disabled[language] = true;
        result._update();
        return result;
      };
      TemplatablePattern.prototype.read_options = function(options) {
        var result = this._create();
        for (var language in template_names) {
          result._disabled[language] = options.templating.indexOf(language) === -1;
        }
        result._update();
        return result;
      };
      TemplatablePattern.prototype.exclude = function(language) {
        var result = this._create();
        result._excluded[language] = true;
        result._update();
        return result;
      };
      TemplatablePattern.prototype.read = function() {
        var result = "";
        if (this._match_pattern) {
          result = this._input.read(this._starting_pattern);
        } else {
          result = this._input.read(this._starting_pattern, this.__template_pattern);
        }
        var next = this._read_template();
        while (next) {
          if (this._match_pattern) {
            next += this._input.read(this._match_pattern);
          } else {
            next += this._input.readUntil(this.__template_pattern);
          }
          result += next;
          next = this._read_template();
        }
        if (this._until_after) {
          result += this._input.readUntilAfter(this._until_pattern);
        }
        return result;
      };
      TemplatablePattern.prototype.__set_templated_pattern = function() {
        var items = [];
        if (!this._disabled.php) {
          items.push(this.__patterns.php._starting_pattern.source);
        }
        if (!this._disabled.handlebars) {
          items.push(this.__patterns.handlebars._starting_pattern.source);
        }
        if (!this._disabled.angular) {
          items.push(this.__patterns.handlebars._starting_pattern.source);
        }
        if (!this._disabled.erb) {
          items.push(this.__patterns.erb._starting_pattern.source);
        }
        if (!this._disabled.django) {
          items.push(this.__patterns.django._starting_pattern.source);
          items.push(this.__patterns.django_value._starting_pattern.source);
          items.push(this.__patterns.django_comment._starting_pattern.source);
        }
        if (!this._disabled.smarty) {
          items.push(this.__patterns.smarty._starting_pattern.source);
        }
        if (this._until_pattern) {
          items.push(this._until_pattern.source);
        }
        this.__template_pattern = this._input.get_regexp("(?:" + items.join("|") + ")");
      };
      TemplatablePattern.prototype._read_template = function() {
        var resulting_string = "";
        var c = this._input.peek();
        if (c === "<") {
          var peek1 = this._input.peek(1);
          if (!this._disabled.php && !this._excluded.php && peek1 === "?") {
            resulting_string = resulting_string || this.__patterns.php.read();
          }
          if (!this._disabled.erb && !this._excluded.erb && peek1 === "%") {
            resulting_string = resulting_string || this.__patterns.erb.read();
          }
        } else if (c === "{") {
          if (!this._disabled.handlebars && !this._excluded.handlebars) {
            resulting_string = resulting_string || this.__patterns.handlebars_comment.read();
            resulting_string = resulting_string || this.__patterns.handlebars_unescaped.read();
            resulting_string = resulting_string || this.__patterns.handlebars.read();
          }
          if (!this._disabled.django) {
            if (!this._excluded.django && !this._excluded.handlebars) {
              resulting_string = resulting_string || this.__patterns.django_value.read();
            }
            if (!this._excluded.django) {
              resulting_string = resulting_string || this.__patterns.django_comment.read();
              resulting_string = resulting_string || this.__patterns.django.read();
            }
          }
          if (!this._disabled.smarty) {
            if (this._disabled.django && this._disabled.handlebars) {
              resulting_string = resulting_string || this.__patterns.smarty_comment.read();
              resulting_string = resulting_string || this.__patterns.smarty_literal.read();
              resulting_string = resulting_string || this.__patterns.smarty.read();
            }
          }
        }
        return resulting_string;
      };
      module.exports.TemplatablePattern = TemplatablePattern;
    }
  });

  // node_modules/js-beautify/js/src/javascript/tokenizer.js
  var require_tokenizer2 = __commonJS({
    "node_modules/js-beautify/js/src/javascript/tokenizer.js"(exports, module) {
      "use strict";
      var InputScanner = require_inputscanner().InputScanner;
      var BaseTokenizer = require_tokenizer().Tokenizer;
      var BASETOKEN = require_tokenizer().TOKEN;
      var Directives = require_directives().Directives;
      var acorn = require_acorn();
      var Pattern = require_pattern().Pattern;
      var TemplatablePattern = require_templatablepattern().TemplatablePattern;
      function in_array(what, arr) {
        return arr.indexOf(what) !== -1;
      }
      var TOKEN = {
        START_EXPR: "TK_START_EXPR",
        END_EXPR: "TK_END_EXPR",
        START_BLOCK: "TK_START_BLOCK",
        END_BLOCK: "TK_END_BLOCK",
        WORD: "TK_WORD",
        RESERVED: "TK_RESERVED",
        SEMICOLON: "TK_SEMICOLON",
        STRING: "TK_STRING",
        EQUALS: "TK_EQUALS",
        OPERATOR: "TK_OPERATOR",
        COMMA: "TK_COMMA",
        BLOCK_COMMENT: "TK_BLOCK_COMMENT",
        COMMENT: "TK_COMMENT",
        DOT: "TK_DOT",
        UNKNOWN: "TK_UNKNOWN",
        START: BASETOKEN.START,
        RAW: BASETOKEN.RAW,
        EOF: BASETOKEN.EOF
      };
      var directives_core = new Directives(/\/\*/, /\*\//);
      var number_pattern = /0[xX][0123456789abcdefABCDEF_]*n?|0[oO][01234567_]*n?|0[bB][01_]*n?|\d[\d_]*n|(?:\.\d[\d_]*|\d[\d_]*\.?[\d_]*)(?:[eE][+-]?[\d_]+)?/;
      var digit = /[0-9]/;
      var dot_pattern = /[^\d\.]/;
      var positionable_operators = ">>> === !== &&= ??= ||= << && >= ** != == <= >> || ?? |> < / - + > : & % ? ^ | *".split(" ");
      var punct = ">>>= ... >>= <<= === >>> !== **= &&= ??= ||= => ^= :: /= << <= == && -= >= >> != -- += ** || ?? ++ %= &= *= |= |> = ! ? > < : / ^ - + * & % ~ |";
      punct = punct.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
      punct = "\\?\\.(?!\\d) " + punct;
      punct = punct.replace(/ /g, "|");
      var punct_pattern = new RegExp(punct);
      var line_starters = "continue,try,throw,return,var,let,const,if,switch,case,default,for,while,break,function,import,export".split(",");
      var reserved_words = line_starters.concat(["do", "in", "of", "else", "get", "set", "new", "catch", "finally", "typeof", "yield", "async", "await", "from", "as", "class", "extends"]);
      var reserved_word_pattern = new RegExp("^(?:" + reserved_words.join("|") + ")$");
      var in_html_comment;
      var Tokenizer = function(input_string, options) {
        BaseTokenizer.call(this, input_string, options);
        this._patterns.whitespace = this._patterns.whitespace.matching(
          /\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff/.source,
          /\u2028\u2029/.source
        );
        var pattern_reader = new Pattern(this._input);
        var templatable = new TemplatablePattern(this._input).read_options(this._options);
        this.__patterns = {
          template: templatable,
          identifier: templatable.starting_with(acorn.identifier).matching(acorn.identifierMatch),
          number: pattern_reader.matching(number_pattern),
          punct: pattern_reader.matching(punct_pattern),
          // comment ends just before nearest linefeed or end of file
          comment: pattern_reader.starting_with(/\/\//).until(/[\n\r\u2028\u2029]/),
          //  /* ... */ comment ends with nearest */ or end of file
          block_comment: pattern_reader.starting_with(/\/\*/).until_after(/\*\//),
          html_comment_start: pattern_reader.matching(/<!--/),
          html_comment_end: pattern_reader.matching(/-->/),
          include: pattern_reader.starting_with(/#include/).until_after(acorn.lineBreak),
          shebang: pattern_reader.starting_with(/#!/).until_after(acorn.lineBreak),
          xml: pattern_reader.matching(/[\s\S]*?<(\/?)([-a-zA-Z:0-9_.]+|{[^}]+?}|!\[CDATA\[[^\]]*?\]\]|)(\s*{[^}]+?}|\s+[-a-zA-Z:0-9_.]+|\s+[-a-zA-Z:0-9_.]+\s*=\s*('[^']*'|"[^"]*"|{([^{}]|{[^}]+?})+?}))*\s*(\/?)\s*>/),
          single_quote: templatable.until(/['\\\n\r\u2028\u2029]/),
          double_quote: templatable.until(/["\\\n\r\u2028\u2029]/),
          template_text: templatable.until(/[`\\$]/),
          template_expression: templatable.until(/[`}\\]/)
        };
      };
      Tokenizer.prototype = new BaseTokenizer();
      Tokenizer.prototype._is_comment = function(current_token) {
        return current_token.type === TOKEN.COMMENT || current_token.type === TOKEN.BLOCK_COMMENT || current_token.type === TOKEN.UNKNOWN;
      };
      Tokenizer.prototype._is_opening = function(current_token) {
        return current_token.type === TOKEN.START_BLOCK || current_token.type === TOKEN.START_EXPR;
      };
      Tokenizer.prototype._is_closing = function(current_token, open_token) {
        return (current_token.type === TOKEN.END_BLOCK || current_token.type === TOKEN.END_EXPR) && (open_token && (current_token.text === "]" && open_token.text === "[" || current_token.text === ")" && open_token.text === "(" || current_token.text === "}" && open_token.text === "{"));
      };
      Tokenizer.prototype._reset = function() {
        in_html_comment = false;
      };
      Tokenizer.prototype._get_next_token = function(previous_token, open_token) {
        var token = null;
        this._readWhitespace();
        var c = this._input.peek();
        if (c === null) {
          return this._create_token(TOKEN.EOF, "");
        }
        token = token || this._read_non_javascript(c);
        token = token || this._read_string(c);
        token = token || this._read_pair(c, this._input.peek(1));
        token = token || this._read_word(previous_token);
        token = token || this._read_singles(c);
        token = token || this._read_comment(c);
        token = token || this._read_regexp(c, previous_token);
        token = token || this._read_xml(c, previous_token);
        token = token || this._read_punctuation();
        token = token || this._create_token(TOKEN.UNKNOWN, this._input.next());
        return token;
      };
      Tokenizer.prototype._read_word = function(previous_token) {
        var resulting_string;
        resulting_string = this.__patterns.identifier.read();
        if (resulting_string !== "") {
          resulting_string = resulting_string.replace(acorn.allLineBreaks, "\n");
          if (!(previous_token.type === TOKEN.DOT || previous_token.type === TOKEN.RESERVED && (previous_token.text === "set" || previous_token.text === "get")) && reserved_word_pattern.test(resulting_string)) {
            if ((resulting_string === "in" || resulting_string === "of") && (previous_token.type === TOKEN.WORD || previous_token.type === TOKEN.STRING)) {
              return this._create_token(TOKEN.OPERATOR, resulting_string);
            }
            return this._create_token(TOKEN.RESERVED, resulting_string);
          }
          return this._create_token(TOKEN.WORD, resulting_string);
        }
        resulting_string = this.__patterns.number.read();
        if (resulting_string !== "") {
          return this._create_token(TOKEN.WORD, resulting_string);
        }
      };
      Tokenizer.prototype._read_singles = function(c) {
        var token = null;
        if (c === "(" || c === "[") {
          token = this._create_token(TOKEN.START_EXPR, c);
        } else if (c === ")" || c === "]") {
          token = this._create_token(TOKEN.END_EXPR, c);
        } else if (c === "{") {
          token = this._create_token(TOKEN.START_BLOCK, c);
        } else if (c === "}") {
          token = this._create_token(TOKEN.END_BLOCK, c);
        } else if (c === ";") {
          token = this._create_token(TOKEN.SEMICOLON, c);
        } else if (c === "." && dot_pattern.test(this._input.peek(1))) {
          token = this._create_token(TOKEN.DOT, c);
        } else if (c === ",") {
          token = this._create_token(TOKEN.COMMA, c);
        }
        if (token) {
          this._input.next();
        }
        return token;
      };
      Tokenizer.prototype._read_pair = function(c, d) {
        var token = null;
        if (c === "#" && d === "{") {
          token = this._create_token(TOKEN.START_BLOCK, c + d);
        }
        if (token) {
          this._input.next();
          this._input.next();
        }
        return token;
      };
      Tokenizer.prototype._read_punctuation = function() {
        var resulting_string = this.__patterns.punct.read();
        if (resulting_string !== "") {
          if (resulting_string === "=") {
            return this._create_token(TOKEN.EQUALS, resulting_string);
          } else if (resulting_string === "?.") {
            return this._create_token(TOKEN.DOT, resulting_string);
          } else {
            return this._create_token(TOKEN.OPERATOR, resulting_string);
          }
        }
      };
      Tokenizer.prototype._read_non_javascript = function(c) {
        var resulting_string = "";
        if (c === "#") {
          if (this._is_first_token()) {
            resulting_string = this.__patterns.shebang.read();
            if (resulting_string) {
              return this._create_token(TOKEN.UNKNOWN, resulting_string.trim() + "\n");
            }
          }
          resulting_string = this.__patterns.include.read();
          if (resulting_string) {
            return this._create_token(TOKEN.UNKNOWN, resulting_string.trim() + "\n");
          }
          c = this._input.next();
          var sharp = "#";
          if (this._input.hasNext() && this._input.testChar(digit)) {
            do {
              c = this._input.next();
              sharp += c;
            } while (this._input.hasNext() && c !== "#" && c !== "=");
            if (c === "#") {
            } else if (this._input.peek() === "[" && this._input.peek(1) === "]") {
              sharp += "[]";
              this._input.next();
              this._input.next();
            } else if (this._input.peek() === "{" && this._input.peek(1) === "}") {
              sharp += "{}";
              this._input.next();
              this._input.next();
            }
            return this._create_token(TOKEN.WORD, sharp);
          }
          this._input.back();
        } else if (c === "<" && this._is_first_token()) {
          resulting_string = this.__patterns.html_comment_start.read();
          if (resulting_string) {
            while (this._input.hasNext() && !this._input.testChar(acorn.newline)) {
              resulting_string += this._input.next();
            }
            in_html_comment = true;
            return this._create_token(TOKEN.COMMENT, resulting_string);
          }
        } else if (in_html_comment && c === "-") {
          resulting_string = this.__patterns.html_comment_end.read();
          if (resulting_string) {
            in_html_comment = false;
            return this._create_token(TOKEN.COMMENT, resulting_string);
          }
        }
        return null;
      };
      Tokenizer.prototype._read_comment = function(c) {
        var token = null;
        if (c === "/") {
          var comment = "";
          if (this._input.peek(1) === "*") {
            comment = this.__patterns.block_comment.read();
            var directives = directives_core.get_directives(comment);
            if (directives && directives.ignore === "start") {
              comment += directives_core.readIgnored(this._input);
            }
            comment = comment.replace(acorn.allLineBreaks, "\n");
            token = this._create_token(TOKEN.BLOCK_COMMENT, comment);
            token.directives = directives;
          } else if (this._input.peek(1) === "/") {
            comment = this.__patterns.comment.read();
            token = this._create_token(TOKEN.COMMENT, comment);
          }
        }
        return token;
      };
      Tokenizer.prototype._read_string = function(c) {
        if (c === "`" || c === "'" || c === '"') {
          var resulting_string = this._input.next();
          this.has_char_escapes = false;
          if (c === "`") {
            resulting_string += this._read_string_recursive("`", true, "${");
          } else {
            resulting_string += this._read_string_recursive(c);
          }
          if (this.has_char_escapes && this._options.unescape_strings) {
            resulting_string = unescape_string(resulting_string);
          }
          if (this._input.peek() === c) {
            resulting_string += this._input.next();
          }
          resulting_string = resulting_string.replace(acorn.allLineBreaks, "\n");
          return this._create_token(TOKEN.STRING, resulting_string);
        }
        return null;
      };
      Tokenizer.prototype._allow_regexp_or_xml = function(previous_token) {
        return previous_token.type === TOKEN.RESERVED && in_array(previous_token.text, ["return", "case", "throw", "else", "do", "typeof", "yield"]) || previous_token.type === TOKEN.END_EXPR && previous_token.text === ")" && previous_token.opened.previous.type === TOKEN.RESERVED && in_array(previous_token.opened.previous.text, ["if", "while", "for"]) || in_array(previous_token.type, [
          TOKEN.COMMENT,
          TOKEN.START_EXPR,
          TOKEN.START_BLOCK,
          TOKEN.START,
          TOKEN.END_BLOCK,
          TOKEN.OPERATOR,
          TOKEN.EQUALS,
          TOKEN.EOF,
          TOKEN.SEMICOLON,
          TOKEN.COMMA
        ]);
      };
      Tokenizer.prototype._read_regexp = function(c, previous_token) {
        if (c === "/" && this._allow_regexp_or_xml(previous_token)) {
          var resulting_string = this._input.next();
          var esc = false;
          var in_char_class = false;
          while (this._input.hasNext() && ((esc || in_char_class || this._input.peek() !== c) && !this._input.testChar(acorn.newline))) {
            resulting_string += this._input.peek();
            if (!esc) {
              esc = this._input.peek() === "\\";
              if (this._input.peek() === "[") {
                in_char_class = true;
              } else if (this._input.peek() === "]") {
                in_char_class = false;
              }
            } else {
              esc = false;
            }
            this._input.next();
          }
          if (this._input.peek() === c) {
            resulting_string += this._input.next();
            resulting_string += this._input.read(acorn.identifier);
          }
          return this._create_token(TOKEN.STRING, resulting_string);
        }
        return null;
      };
      Tokenizer.prototype._read_xml = function(c, previous_token) {
        if (this._options.e4x && c === "<" && this._allow_regexp_or_xml(previous_token)) {
          var xmlStr = "";
          var match = this.__patterns.xml.read_match();
          if (match) {
            var rootTag = match[2].replace(/^{\s+/, "{").replace(/\s+}$/, "}");
            var isCurlyRoot = rootTag.indexOf("{") === 0;
            var depth = 0;
            while (match) {
              var isEndTag = !!match[1];
              var tagName = match[2];
              var isSingletonTag = !!match[match.length - 1] || tagName.slice(0, 8) === "![CDATA[";
              if (!isSingletonTag && (tagName === rootTag || isCurlyRoot && tagName.replace(/^{\s+/, "{").replace(/\s+}$/, "}"))) {
                if (isEndTag) {
                  --depth;
                } else {
                  ++depth;
                }
              }
              xmlStr += match[0];
              if (depth <= 0) {
                break;
              }
              match = this.__patterns.xml.read_match();
            }
            if (!match) {
              xmlStr += this._input.match(/[\s\S]*/g)[0];
            }
            xmlStr = xmlStr.replace(acorn.allLineBreaks, "\n");
            return this._create_token(TOKEN.STRING, xmlStr);
          }
        }
        return null;
      };
      function unescape_string(s) {
        var out = "", escaped = 0;
        var input_scan = new InputScanner(s);
        var matched = null;
        while (input_scan.hasNext()) {
          matched = input_scan.match(/([\s]|[^\\]|\\\\)+/g);
          if (matched) {
            out += matched[0];
          }
          if (input_scan.peek() === "\\") {
            input_scan.next();
            if (input_scan.peek() === "x") {
              matched = input_scan.match(/x([0-9A-Fa-f]{2})/g);
            } else if (input_scan.peek() === "u") {
              matched = input_scan.match(/u([0-9A-Fa-f]{4})/g);
              if (!matched) {
                matched = input_scan.match(/u\{([0-9A-Fa-f]+)\}/g);
              }
            } else {
              out += "\\";
              if (input_scan.hasNext()) {
                out += input_scan.next();
              }
              continue;
            }
            if (!matched) {
              return s;
            }
            escaped = parseInt(matched[1], 16);
            if (escaped > 126 && escaped <= 255 && matched[0].indexOf("x") === 0) {
              return s;
            } else if (escaped >= 0 && escaped < 32) {
              out += "\\" + matched[0];
            } else if (escaped > 1114111) {
              out += "\\" + matched[0];
            } else if (escaped === 34 || escaped === 39 || escaped === 92) {
              out += "\\" + String.fromCharCode(escaped);
            } else {
              out += String.fromCharCode(escaped);
            }
          }
        }
        return out;
      }
      Tokenizer.prototype._read_string_recursive = function(delimiter, allow_unescaped_newlines, start_sub) {
        var current_char;
        var pattern;
        if (delimiter === "'") {
          pattern = this.__patterns.single_quote;
        } else if (delimiter === '"') {
          pattern = this.__patterns.double_quote;
        } else if (delimiter === "`") {
          pattern = this.__patterns.template_text;
        } else if (delimiter === "}") {
          pattern = this.__patterns.template_expression;
        }
        var resulting_string = pattern.read();
        var next = "";
        while (this._input.hasNext()) {
          next = this._input.next();
          if (next === delimiter || !allow_unescaped_newlines && acorn.newline.test(next)) {
            this._input.back();
            break;
          } else if (next === "\\" && this._input.hasNext()) {
            current_char = this._input.peek();
            if (current_char === "x" || current_char === "u") {
              this.has_char_escapes = true;
            } else if (current_char === "\r" && this._input.peek(1) === "\n") {
              this._input.next();
            }
            next += this._input.next();
          } else if (start_sub) {
            if (start_sub === "${" && next === "$" && this._input.peek() === "{") {
              next += this._input.next();
            }
            if (start_sub === next) {
              if (delimiter === "`") {
                next += this._read_string_recursive("}", allow_unescaped_newlines, "`");
              } else {
                next += this._read_string_recursive("`", allow_unescaped_newlines, "${");
              }
              if (this._input.hasNext()) {
                next += this._input.next();
              }
            }
          }
          next += pattern.read();
          resulting_string += next;
        }
        return resulting_string;
      };
      module.exports.Tokenizer = Tokenizer;
      module.exports.TOKEN = TOKEN;
      module.exports.positionable_operators = positionable_operators.slice();
      module.exports.line_starters = line_starters.slice();
    }
  });

  // node_modules/js-beautify/js/src/javascript/beautifier.js
  var require_beautifier = __commonJS({
    "node_modules/js-beautify/js/src/javascript/beautifier.js"(exports, module) {
      "use strict";
      var Output = require_output().Output;
      var Token = require_token().Token;
      var acorn = require_acorn();
      var Options = require_options2().Options;
      var Tokenizer = require_tokenizer2().Tokenizer;
      var line_starters = require_tokenizer2().line_starters;
      var positionable_operators = require_tokenizer2().positionable_operators;
      var TOKEN = require_tokenizer2().TOKEN;
      function in_array(what, arr) {
        return arr.indexOf(what) !== -1;
      }
      function ltrim(s) {
        return s.replace(/^\s+/g, "");
      }
      function generateMapFromStrings(list) {
        var result = {};
        for (var x = 0; x < list.length; x++) {
          result[list[x].replace(/-/g, "_")] = list[x];
        }
        return result;
      }
      function reserved_word(token, word) {
        return token && token.type === TOKEN.RESERVED && token.text === word;
      }
      function reserved_array(token, words) {
        return token && token.type === TOKEN.RESERVED && in_array(token.text, words);
      }
      var special_words = ["case", "return", "do", "if", "throw", "else", "await", "break", "continue", "async"];
      var validPositionValues = ["before-newline", "after-newline", "preserve-newline"];
      var OPERATOR_POSITION = generateMapFromStrings(validPositionValues);
      var OPERATOR_POSITION_BEFORE_OR_PRESERVE = [OPERATOR_POSITION.before_newline, OPERATOR_POSITION.preserve_newline];
      var MODE = {
        BlockStatement: "BlockStatement",
        // 'BLOCK'
        Statement: "Statement",
        // 'STATEMENT'
        ObjectLiteral: "ObjectLiteral",
        // 'OBJECT',
        ArrayLiteral: "ArrayLiteral",
        //'[EXPRESSION]',
        ForInitializer: "ForInitializer",
        //'(FOR-EXPRESSION)',
        Conditional: "Conditional",
        //'(COND-EXPRESSION)',
        Expression: "Expression"
        //'(EXPRESSION)'
      };
      function remove_redundant_indentation(output, frame) {
        if (frame.multiline_frame || frame.mode === MODE.ForInitializer || frame.mode === MODE.Conditional) {
          return;
        }
        output.remove_indent(frame.start_line_index);
      }
      function split_linebreaks(s) {
        s = s.replace(acorn.allLineBreaks, "\n");
        var out = [], idx = s.indexOf("\n");
        while (idx !== -1) {
          out.push(s.substring(0, idx));
          s = s.substring(idx + 1);
          idx = s.indexOf("\n");
        }
        if (s.length) {
          out.push(s);
        }
        return out;
      }
      function is_array(mode) {
        return mode === MODE.ArrayLiteral;
      }
      function is_expression(mode) {
        return in_array(mode, [MODE.Expression, MODE.ForInitializer, MODE.Conditional]);
      }
      function all_lines_start_with(lines, c) {
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (line.charAt(0) !== c) {
            return false;
          }
        }
        return true;
      }
      function each_line_matches_indent(lines, indent) {
        var i = 0, len = lines.length, line;
        for (; i < len; i++) {
          line = lines[i];
          if (line && line.indexOf(indent) !== 0) {
            return false;
          }
        }
        return true;
      }
      function Beautifier(source_text, options) {
        options = options || {};
        this._source_text = source_text || "";
        this._output = null;
        this._tokens = null;
        this._last_last_text = null;
        this._flags = null;
        this._previous_flags = null;
        this._flag_store = null;
        this._options = new Options(options);
      }
      Beautifier.prototype.create_flags = function(flags_base, mode) {
        var next_indent_level = 0;
        if (flags_base) {
          next_indent_level = flags_base.indentation_level;
          if (!this._output.just_added_newline() && flags_base.line_indent_level > next_indent_level) {
            next_indent_level = flags_base.line_indent_level;
          }
        }
        var next_flags = {
          mode,
          parent: flags_base,
          last_token: flags_base ? flags_base.last_token : new Token(TOKEN.START_BLOCK, ""),
          // last token text
          last_word: flags_base ? flags_base.last_word : "",
          // last TOKEN.WORD passed
          declaration_statement: false,
          declaration_assignment: false,
          multiline_frame: false,
          inline_frame: false,
          if_block: false,
          else_block: false,
          class_start_block: false,
          // class A { INSIDE HERE } or class B extends C { INSIDE HERE }
          do_block: false,
          do_while: false,
          import_block: false,
          in_case_statement: false,
          // switch(..){ INSIDE HERE }
          in_case: false,
          // we're on the exact line with "case 0:"
          case_body: false,
          // the indented case-action block
          case_block: false,
          // the indented case-action block is wrapped with {}
          indentation_level: next_indent_level,
          alignment: 0,
          line_indent_level: flags_base ? flags_base.line_indent_level : next_indent_level,
          start_line_index: this._output.get_line_number(),
          ternary_depth: 0
        };
        return next_flags;
      };
      Beautifier.prototype._reset = function(source_text) {
        var baseIndentString = source_text.match(/^[\t ]*/)[0];
        this._last_last_text = "";
        this._output = new Output(this._options, baseIndentString);
        this._output.raw = this._options.test_output_raw;
        this._flag_store = [];
        this.set_mode(MODE.BlockStatement);
        var tokenizer = new Tokenizer(source_text, this._options);
        this._tokens = tokenizer.tokenize();
        return source_text;
      };
      Beautifier.prototype.beautify = function() {
        if (this._options.disabled) {
          return this._source_text;
        }
        var sweet_code;
        var source_text = this._reset(this._source_text);
        var eol = this._options.eol;
        if (this._options.eol === "auto") {
          eol = "\n";
          if (source_text && acorn.lineBreak.test(source_text || "")) {
            eol = source_text.match(acorn.lineBreak)[0];
          }
        }
        var current_token = this._tokens.next();
        while (current_token) {
          this.handle_token(current_token);
          this._last_last_text = this._flags.last_token.text;
          this._flags.last_token = current_token;
          current_token = this._tokens.next();
        }
        sweet_code = this._output.get_code(eol);
        return sweet_code;
      };
      Beautifier.prototype.handle_token = function(current_token, preserve_statement_flags) {
        if (current_token.type === TOKEN.START_EXPR) {
          this.handle_start_expr(current_token);
        } else if (current_token.type === TOKEN.END_EXPR) {
          this.handle_end_expr(current_token);
        } else if (current_token.type === TOKEN.START_BLOCK) {
          this.handle_start_block(current_token);
        } else if (current_token.type === TOKEN.END_BLOCK) {
          this.handle_end_block(current_token);
        } else if (current_token.type === TOKEN.WORD) {
          this.handle_word(current_token);
        } else if (current_token.type === TOKEN.RESERVED) {
          this.handle_word(current_token);
        } else if (current_token.type === TOKEN.SEMICOLON) {
          this.handle_semicolon(current_token);
        } else if (current_token.type === TOKEN.STRING) {
          this.handle_string(current_token);
        } else if (current_token.type === TOKEN.EQUALS) {
          this.handle_equals(current_token);
        } else if (current_token.type === TOKEN.OPERATOR) {
          this.handle_operator(current_token);
        } else if (current_token.type === TOKEN.COMMA) {
          this.handle_comma(current_token);
        } else if (current_token.type === TOKEN.BLOCK_COMMENT) {
          this.handle_block_comment(current_token, preserve_statement_flags);
        } else if (current_token.type === TOKEN.COMMENT) {
          this.handle_comment(current_token, preserve_statement_flags);
        } else if (current_token.type === TOKEN.DOT) {
          this.handle_dot(current_token);
        } else if (current_token.type === TOKEN.EOF) {
          this.handle_eof(current_token);
        } else if (current_token.type === TOKEN.UNKNOWN) {
          this.handle_unknown(current_token, preserve_statement_flags);
        } else {
          this.handle_unknown(current_token, preserve_statement_flags);
        }
      };
      Beautifier.prototype.handle_whitespace_and_comments = function(current_token, preserve_statement_flags) {
        var newlines = current_token.newlines;
        var keep_whitespace = this._options.keep_array_indentation && is_array(this._flags.mode);
        if (current_token.comments_before) {
          var comment_token = current_token.comments_before.next();
          while (comment_token) {
            this.handle_whitespace_and_comments(comment_token, preserve_statement_flags);
            this.handle_token(comment_token, preserve_statement_flags);
            comment_token = current_token.comments_before.next();
          }
        }
        if (keep_whitespace) {
          for (var i = 0; i < newlines; i += 1) {
            this.print_newline(i > 0, preserve_statement_flags);
          }
        } else {
          if (this._options.max_preserve_newlines && newlines > this._options.max_preserve_newlines) {
            newlines = this._options.max_preserve_newlines;
          }
          if (this._options.preserve_newlines) {
            if (newlines > 1) {
              this.print_newline(false, preserve_statement_flags);
              for (var j = 1; j < newlines; j += 1) {
                this.print_newline(true, preserve_statement_flags);
              }
            }
          }
        }
      };
      var newline_restricted_tokens = ["async", "break", "continue", "return", "throw", "yield"];
      Beautifier.prototype.allow_wrap_or_preserved_newline = function(current_token, force_linewrap) {
        force_linewrap = force_linewrap === void 0 ? false : force_linewrap;
        if (this._output.just_added_newline()) {
          return;
        }
        var shouldPreserveOrForce = this._options.preserve_newlines && current_token.newlines || force_linewrap;
        var operatorLogicApplies = in_array(this._flags.last_token.text, positionable_operators) || in_array(current_token.text, positionable_operators);
        if (operatorLogicApplies) {
          var shouldPrintOperatorNewline = in_array(this._flags.last_token.text, positionable_operators) && in_array(this._options.operator_position, OPERATOR_POSITION_BEFORE_OR_PRESERVE) || in_array(current_token.text, positionable_operators);
          shouldPreserveOrForce = shouldPreserveOrForce && shouldPrintOperatorNewline;
        }
        if (shouldPreserveOrForce) {
          this.print_newline(false, true);
        } else if (this._options.wrap_line_length) {
          if (reserved_array(this._flags.last_token, newline_restricted_tokens)) {
            return;
          }
          this._output.set_wrap_point();
        }
      };
      Beautifier.prototype.print_newline = function(force_newline, preserve_statement_flags) {
        if (!preserve_statement_flags) {
          if (this._flags.last_token.text !== ";" && this._flags.last_token.text !== "," && this._flags.last_token.text !== "=" && (this._flags.last_token.type !== TOKEN.OPERATOR || this._flags.last_token.text === "--" || this._flags.last_token.text === "++")) {
            var next_token = this._tokens.peek();
            while (this._flags.mode === MODE.Statement && !(this._flags.if_block && reserved_word(next_token, "else")) && !this._flags.do_block) {
              this.restore_mode();
            }
          }
        }
        if (this._output.add_new_line(force_newline)) {
          this._flags.multiline_frame = true;
        }
      };
      Beautifier.prototype.print_token_line_indentation = function(current_token) {
        if (this._output.just_added_newline()) {
          if (this._options.keep_array_indentation && current_token.newlines && (current_token.text === "[" || is_array(this._flags.mode))) {
            this._output.current_line.set_indent(-1);
            this._output.current_line.push(current_token.whitespace_before);
            this._output.space_before_token = false;
          } else if (this._output.set_indent(this._flags.indentation_level, this._flags.alignment)) {
            this._flags.line_indent_level = this._flags.indentation_level;
          }
        }
      };
      Beautifier.prototype.print_token = function(current_token) {
        if (this._output.raw) {
          this._output.add_raw_token(current_token);
          return;
        }
        if (this._options.comma_first && current_token.previous && current_token.previous.type === TOKEN.COMMA && this._output.just_added_newline()) {
          if (this._output.previous_line.last() === ",") {
            var popped = this._output.previous_line.pop();
            if (this._output.previous_line.is_empty()) {
              this._output.previous_line.push(popped);
              this._output.trim(true);
              this._output.current_line.pop();
              this._output.trim();
            }
            this.print_token_line_indentation(current_token);
            this._output.add_token(",");
            this._output.space_before_token = true;
          }
        }
        this.print_token_line_indentation(current_token);
        this._output.non_breaking_space = true;
        this._output.add_token(current_token.text);
        if (this._output.previous_token_wrapped) {
          this._flags.multiline_frame = true;
        }
      };
      Beautifier.prototype.indent = function() {
        this._flags.indentation_level += 1;
        this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
      };
      Beautifier.prototype.deindent = function() {
        if (this._flags.indentation_level > 0 && (!this._flags.parent || this._flags.indentation_level > this._flags.parent.indentation_level)) {
          this._flags.indentation_level -= 1;
          this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
        }
      };
      Beautifier.prototype.set_mode = function(mode) {
        if (this._flags) {
          this._flag_store.push(this._flags);
          this._previous_flags = this._flags;
        } else {
          this._previous_flags = this.create_flags(null, mode);
        }
        this._flags = this.create_flags(this._previous_flags, mode);
        this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
      };
      Beautifier.prototype.restore_mode = function() {
        if (this._flag_store.length > 0) {
          this._previous_flags = this._flags;
          this._flags = this._flag_store.pop();
          if (this._previous_flags.mode === MODE.Statement) {
            remove_redundant_indentation(this._output, this._previous_flags);
          }
          this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
        }
      };
      Beautifier.prototype.start_of_object_property = function() {
        return this._flags.parent.mode === MODE.ObjectLiteral && this._flags.mode === MODE.Statement && (this._flags.last_token.text === ":" && this._flags.ternary_depth === 0 || reserved_array(this._flags.last_token, ["get", "set"]));
      };
      Beautifier.prototype.start_of_statement = function(current_token) {
        var start = false;
        start = start || reserved_array(this._flags.last_token, ["var", "let", "const"]) && current_token.type === TOKEN.WORD;
        start = start || reserved_word(this._flags.last_token, "do");
        start = start || !(this._flags.parent.mode === MODE.ObjectLiteral && this._flags.mode === MODE.Statement) && reserved_array(this._flags.last_token, newline_restricted_tokens) && !current_token.newlines;
        start = start || reserved_word(this._flags.last_token, "else") && !(reserved_word(current_token, "if") && !current_token.comments_before);
        start = start || this._flags.last_token.type === TOKEN.END_EXPR && (this._previous_flags.mode === MODE.ForInitializer || this._previous_flags.mode === MODE.Conditional);
        start = start || this._flags.last_token.type === TOKEN.WORD && this._flags.mode === MODE.BlockStatement && !this._flags.in_case && !(current_token.text === "--" || current_token.text === "++") && this._last_last_text !== "function" && current_token.type !== TOKEN.WORD && current_token.type !== TOKEN.RESERVED;
        start = start || this._flags.mode === MODE.ObjectLiteral && (this._flags.last_token.text === ":" && this._flags.ternary_depth === 0 || reserved_array(this._flags.last_token, ["get", "set"]));
        if (start) {
          this.set_mode(MODE.Statement);
          this.indent();
          this.handle_whitespace_and_comments(current_token, true);
          if (!this.start_of_object_property()) {
            this.allow_wrap_or_preserved_newline(
              current_token,
              reserved_array(current_token, ["do", "for", "if", "while"])
            );
          }
          return true;
        }
        return false;
      };
      Beautifier.prototype.handle_start_expr = function(current_token) {
        if (!this.start_of_statement(current_token)) {
          this.handle_whitespace_and_comments(current_token);
        }
        var next_mode = MODE.Expression;
        if (current_token.text === "[") {
          if (this._flags.last_token.type === TOKEN.WORD || this._flags.last_token.text === ")") {
            if (reserved_array(this._flags.last_token, line_starters)) {
              this._output.space_before_token = true;
            }
            this.print_token(current_token);
            this.set_mode(next_mode);
            this.indent();
            if (this._options.space_in_paren) {
              this._output.space_before_token = true;
            }
            return;
          }
          next_mode = MODE.ArrayLiteral;
          if (is_array(this._flags.mode)) {
            if (this._flags.last_token.text === "[" || this._flags.last_token.text === "," && (this._last_last_text === "]" || this._last_last_text === "}")) {
              if (!this._options.keep_array_indentation) {
                this.print_newline();
              }
            }
          }
          if (!in_array(this._flags.last_token.type, [TOKEN.START_EXPR, TOKEN.END_EXPR, TOKEN.WORD, TOKEN.OPERATOR, TOKEN.DOT])) {
            this._output.space_before_token = true;
          }
        } else {
          if (this._flags.last_token.type === TOKEN.RESERVED) {
            if (this._flags.last_token.text === "for") {
              this._output.space_before_token = this._options.space_before_conditional;
              next_mode = MODE.ForInitializer;
            } else if (in_array(this._flags.last_token.text, ["if", "while", "switch"])) {
              this._output.space_before_token = this._options.space_before_conditional;
              next_mode = MODE.Conditional;
            } else if (in_array(this._flags.last_word, ["await", "async"])) {
              this._output.space_before_token = true;
            } else if (this._flags.last_token.text === "import" && current_token.whitespace_before === "") {
              this._output.space_before_token = false;
            } else if (in_array(this._flags.last_token.text, line_starters) || this._flags.last_token.text === "catch") {
              this._output.space_before_token = true;
            }
          } else if (this._flags.last_token.type === TOKEN.EQUALS || this._flags.last_token.type === TOKEN.OPERATOR) {
            if (!this.start_of_object_property()) {
              this.allow_wrap_or_preserved_newline(current_token);
            }
          } else if (this._flags.last_token.type === TOKEN.WORD) {
            this._output.space_before_token = false;
            var peek_back_two = this._tokens.peek(-3);
            if (this._options.space_after_named_function && peek_back_two) {
              var peek_back_three = this._tokens.peek(-4);
              if (reserved_array(peek_back_two, ["async", "function"]) || peek_back_two.text === "*" && reserved_array(peek_back_three, ["async", "function"])) {
                this._output.space_before_token = true;
              } else if (this._flags.mode === MODE.ObjectLiteral) {
                if (peek_back_two.text === "{" || peek_back_two.text === "," || peek_back_two.text === "*" && (peek_back_three.text === "{" || peek_back_three.text === ",")) {
                  this._output.space_before_token = true;
                }
              } else if (this._flags.parent && this._flags.parent.class_start_block) {
                this._output.space_before_token = true;
              }
            }
          } else {
            this.allow_wrap_or_preserved_newline(current_token);
          }
          if (this._flags.last_token.type === TOKEN.RESERVED && (this._flags.last_word === "function" || this._flags.last_word === "typeof") || this._flags.last_token.text === "*" && (in_array(this._last_last_text, ["function", "yield"]) || this._flags.mode === MODE.ObjectLiteral && in_array(this._last_last_text, ["{", ","]))) {
            this._output.space_before_token = this._options.space_after_anon_function;
          }
        }
        if (this._flags.last_token.text === ";" || this._flags.last_token.type === TOKEN.START_BLOCK) {
          this.print_newline();
        } else if (this._flags.last_token.type === TOKEN.END_EXPR || this._flags.last_token.type === TOKEN.START_EXPR || this._flags.last_token.type === TOKEN.END_BLOCK || this._flags.last_token.text === "." || this._flags.last_token.type === TOKEN.COMMA) {
          this.allow_wrap_or_preserved_newline(current_token, current_token.newlines);
        }
        this.print_token(current_token);
        this.set_mode(next_mode);
        if (this._options.space_in_paren) {
          this._output.space_before_token = true;
        }
        this.indent();
      };
      Beautifier.prototype.handle_end_expr = function(current_token) {
        while (this._flags.mode === MODE.Statement) {
          this.restore_mode();
        }
        this.handle_whitespace_and_comments(current_token);
        if (this._flags.multiline_frame) {
          this.allow_wrap_or_preserved_newline(
            current_token,
            current_token.text === "]" && is_array(this._flags.mode) && !this._options.keep_array_indentation
          );
        }
        if (this._options.space_in_paren) {
          if (this._flags.last_token.type === TOKEN.START_EXPR && !this._options.space_in_empty_paren) {
            this._output.trim();
            this._output.space_before_token = false;
          } else {
            this._output.space_before_token = true;
          }
        }
        this.deindent();
        this.print_token(current_token);
        this.restore_mode();
        remove_redundant_indentation(this._output, this._previous_flags);
        if (this._flags.do_while && this._previous_flags.mode === MODE.Conditional) {
          this._previous_flags.mode = MODE.Expression;
          this._flags.do_block = false;
          this._flags.do_while = false;
        }
      };
      Beautifier.prototype.handle_start_block = function(current_token) {
        this.handle_whitespace_and_comments(current_token);
        var next_token = this._tokens.peek();
        var second_token = this._tokens.peek(1);
        if (this._flags.last_word === "switch" && this._flags.last_token.type === TOKEN.END_EXPR) {
          this.set_mode(MODE.BlockStatement);
          this._flags.in_case_statement = true;
        } else if (this._flags.case_body) {
          this.set_mode(MODE.BlockStatement);
        } else if (second_token && (in_array(second_token.text, [":", ","]) && in_array(next_token.type, [TOKEN.STRING, TOKEN.WORD, TOKEN.RESERVED]) || in_array(next_token.text, ["get", "set", "..."]) && in_array(second_token.type, [TOKEN.WORD, TOKEN.RESERVED]))) {
          if (in_array(this._last_last_text, ["class", "interface"]) && !in_array(second_token.text, [":", ","])) {
            this.set_mode(MODE.BlockStatement);
          } else {
            this.set_mode(MODE.ObjectLiteral);
          }
        } else if (this._flags.last_token.type === TOKEN.OPERATOR && this._flags.last_token.text === "=>") {
          this.set_mode(MODE.BlockStatement);
        } else if (in_array(this._flags.last_token.type, [TOKEN.EQUALS, TOKEN.START_EXPR, TOKEN.COMMA, TOKEN.OPERATOR]) || reserved_array(this._flags.last_token, ["return", "throw", "import", "default"])) {
          this.set_mode(MODE.ObjectLiteral);
        } else {
          this.set_mode(MODE.BlockStatement);
        }
        if (this._flags.last_token) {
          if (reserved_array(this._flags.last_token.previous, ["class", "extends"])) {
            this._flags.class_start_block = true;
          }
        }
        var empty_braces = !next_token.comments_before && next_token.text === "}";
        var empty_anonymous_function = empty_braces && this._flags.last_word === "function" && this._flags.last_token.type === TOKEN.END_EXPR;
        if (this._options.brace_preserve_inline) {
          var index = 0;
          var check_token = null;
          this._flags.inline_frame = true;
          do {
            index += 1;
            check_token = this._tokens.peek(index - 1);
            if (check_token.newlines) {
              this._flags.inline_frame = false;
              break;
            }
          } while (check_token.type !== TOKEN.EOF && !(check_token.type === TOKEN.END_BLOCK && check_token.opened === current_token));
        }
        if ((this._options.brace_style === "expand" || this._options.brace_style === "none" && current_token.newlines) && !this._flags.inline_frame) {
          if (this._flags.last_token.type !== TOKEN.OPERATOR && (empty_anonymous_function || this._flags.last_token.type === TOKEN.EQUALS || reserved_array(this._flags.last_token, special_words) && this._flags.last_token.text !== "else")) {
            this._output.space_before_token = true;
          } else {
            this.print_newline(false, true);
          }
        } else {
          if (is_array(this._previous_flags.mode) && (this._flags.last_token.type === TOKEN.START_EXPR || this._flags.last_token.type === TOKEN.COMMA)) {
            if (this._flags.last_token.type === TOKEN.COMMA || this._options.space_in_paren) {
              this._output.space_before_token = true;
            }
            if (this._flags.last_token.type === TOKEN.COMMA || this._flags.last_token.type === TOKEN.START_EXPR && this._flags.inline_frame) {
              this.allow_wrap_or_preserved_newline(current_token);
              this._previous_flags.multiline_frame = this._previous_flags.multiline_frame || this._flags.multiline_frame;
              this._flags.multiline_frame = false;
            }
          }
          if (this._flags.last_token.type !== TOKEN.OPERATOR && this._flags.last_token.type !== TOKEN.START_EXPR) {
            if (in_array(this._flags.last_token.type, [TOKEN.START_BLOCK, TOKEN.SEMICOLON]) && !this._flags.inline_frame) {
              this.print_newline();
            } else {
              this._output.space_before_token = true;
            }
          }
        }
        this.print_token(current_token);
        this.indent();
        if (!empty_braces && !(this._options.brace_preserve_inline && this._flags.inline_frame)) {
          this.print_newline();
        }
      };
      Beautifier.prototype.handle_end_block = function(current_token) {
        this.handle_whitespace_and_comments(current_token);
        while (this._flags.mode === MODE.Statement) {
          this.restore_mode();
        }
        var empty_braces = this._flags.last_token.type === TOKEN.START_BLOCK;
        if (this._flags.inline_frame && !empty_braces) {
          this._output.space_before_token = true;
        } else if (this._options.brace_style === "expand") {
          if (!empty_braces) {
            this.print_newline();
          }
        } else {
          if (!empty_braces) {
            if (is_array(this._flags.mode) && this._options.keep_array_indentation) {
              this._options.keep_array_indentation = false;
              this.print_newline();
              this._options.keep_array_indentation = true;
            } else {
              this.print_newline();
            }
          }
        }
        this.restore_mode();
        this.print_token(current_token);
      };
      Beautifier.prototype.handle_word = function(current_token) {
        if (current_token.type === TOKEN.RESERVED) {
          if (in_array(current_token.text, ["set", "get"]) && this._flags.mode !== MODE.ObjectLiteral) {
            current_token.type = TOKEN.WORD;
          } else if (current_token.text === "import" && in_array(this._tokens.peek().text, ["(", "."])) {
            current_token.type = TOKEN.WORD;
          } else if (in_array(current_token.text, ["as", "from"]) && !this._flags.import_block) {
            current_token.type = TOKEN.WORD;
          } else if (this._flags.mode === MODE.ObjectLiteral) {
            var next_token = this._tokens.peek();
            if (next_token.text === ":") {
              current_token.type = TOKEN.WORD;
            }
          }
        }
        if (this.start_of_statement(current_token)) {
          if (reserved_array(this._flags.last_token, ["var", "let", "const"]) && current_token.type === TOKEN.WORD) {
            this._flags.declaration_statement = true;
          }
        } else if (current_token.newlines && !is_expression(this._flags.mode) && (this._flags.last_token.type !== TOKEN.OPERATOR || (this._flags.last_token.text === "--" || this._flags.last_token.text === "++")) && this._flags.last_token.type !== TOKEN.EQUALS && (this._options.preserve_newlines || !reserved_array(this._flags.last_token, ["var", "let", "const", "set", "get"]))) {
          this.handle_whitespace_and_comments(current_token);
          this.print_newline();
        } else {
          this.handle_whitespace_and_comments(current_token);
        }
        if (this._flags.do_block && !this._flags.do_while) {
          if (reserved_word(current_token, "while")) {
            this._output.space_before_token = true;
            this.print_token(current_token);
            this._output.space_before_token = true;
            this._flags.do_while = true;
            return;
          } else {
            this.print_newline();
            this._flags.do_block = false;
          }
        }
        if (this._flags.if_block) {
          if (!this._flags.else_block && reserved_word(current_token, "else")) {
            this._flags.else_block = true;
          } else {
            while (this._flags.mode === MODE.Statement) {
              this.restore_mode();
            }
            this._flags.if_block = false;
            this._flags.else_block = false;
          }
        }
        if (this._flags.in_case_statement && reserved_array(current_token, ["case", "default"])) {
          this.print_newline();
          if (!this._flags.case_block && (this._flags.case_body || this._options.jslint_happy)) {
            this.deindent();
          }
          this._flags.case_body = false;
          this.print_token(current_token);
          this._flags.in_case = true;
          return;
        }
        if (this._flags.last_token.type === TOKEN.COMMA || this._flags.last_token.type === TOKEN.START_EXPR || this._flags.last_token.type === TOKEN.EQUALS || this._flags.last_token.type === TOKEN.OPERATOR) {
          if (!this.start_of_object_property() && !// start of object property is different for numeric values with +/- prefix operators
          (in_array(this._flags.last_token.text, ["+", "-"]) && this._last_last_text === ":" && this._flags.parent.mode === MODE.ObjectLiteral)) {
            this.allow_wrap_or_preserved_newline(current_token);
          }
        }
        if (reserved_word(current_token, "function")) {
          if (in_array(this._flags.last_token.text, ["}", ";"]) || this._output.just_added_newline() && !(in_array(this._flags.last_token.text, ["(", "[", "{", ":", "=", ","]) || this._flags.last_token.type === TOKEN.OPERATOR)) {
            if (!this._output.just_added_blankline() && !current_token.comments_before) {
              this.print_newline();
              this.print_newline(true);
            }
          }
          if (this._flags.last_token.type === TOKEN.RESERVED || this._flags.last_token.type === TOKEN.WORD) {
            if (reserved_array(this._flags.last_token, ["get", "set", "new", "export"]) || reserved_array(this._flags.last_token, newline_restricted_tokens)) {
              this._output.space_before_token = true;
            } else if (reserved_word(this._flags.last_token, "default") && this._last_last_text === "export") {
              this._output.space_before_token = true;
            } else if (this._flags.last_token.text === "declare") {
              this._output.space_before_token = true;
            } else {
              this.print_newline();
            }
          } else if (this._flags.last_token.type === TOKEN.OPERATOR || this._flags.last_token.text === "=") {
            this._output.space_before_token = true;
          } else if (!this._flags.multiline_frame && (is_expression(this._flags.mode) || is_array(this._flags.mode))) {
          } else {
            this.print_newline();
          }
          this.print_token(current_token);
          this._flags.last_word = current_token.text;
          return;
        }
        var prefix = "NONE";
        if (this._flags.last_token.type === TOKEN.END_BLOCK) {
          if (this._previous_flags.inline_frame) {
            prefix = "SPACE";
          } else if (!reserved_array(current_token, ["else", "catch", "finally", "from"])) {
            prefix = "NEWLINE";
          } else {
            if (this._options.brace_style === "expand" || this._options.brace_style === "end-expand" || this._options.brace_style === "none" && current_token.newlines) {
              prefix = "NEWLINE";
            } else {
              prefix = "SPACE";
              this._output.space_before_token = true;
            }
          }
        } else if (this._flags.last_token.type === TOKEN.SEMICOLON && this._flags.mode === MODE.BlockStatement) {
          prefix = "NEWLINE";
        } else if (this._flags.last_token.type === TOKEN.SEMICOLON && is_expression(this._flags.mode)) {
          prefix = "SPACE";
        } else if (this._flags.last_token.type === TOKEN.STRING) {
          prefix = "NEWLINE";
        } else if (this._flags.last_token.type === TOKEN.RESERVED || this._flags.last_token.type === TOKEN.WORD || this._flags.last_token.text === "*" && (in_array(this._last_last_text, ["function", "yield"]) || this._flags.mode === MODE.ObjectLiteral && in_array(this._last_last_text, ["{", ","]))) {
          prefix = "SPACE";
        } else if (this._flags.last_token.type === TOKEN.START_BLOCK) {
          if (this._flags.inline_frame) {
            prefix = "SPACE";
          } else {
            prefix = "NEWLINE";
          }
        } else if (this._flags.last_token.type === TOKEN.END_EXPR) {
          this._output.space_before_token = true;
          prefix = "NEWLINE";
        }
        if (reserved_array(current_token, line_starters) && this._flags.last_token.text !== ")") {
          if (this._flags.inline_frame || this._flags.last_token.text === "else" || this._flags.last_token.text === "export") {
            prefix = "SPACE";
          } else {
            prefix = "NEWLINE";
          }
        }
        if (reserved_array(current_token, ["else", "catch", "finally"])) {
          if ((!(this._flags.last_token.type === TOKEN.END_BLOCK && this._previous_flags.mode === MODE.BlockStatement) || this._options.brace_style === "expand" || this._options.brace_style === "end-expand" || this._options.brace_style === "none" && current_token.newlines) && !this._flags.inline_frame) {
            this.print_newline();
          } else {
            this._output.trim(true);
            var line = this._output.current_line;
            if (line.last() !== "}") {
              this.print_newline();
            }
            this._output.space_before_token = true;
          }
        } else if (prefix === "NEWLINE") {
          if (reserved_array(this._flags.last_token, special_words)) {
            this._output.space_before_token = true;
          } else if (this._flags.last_token.text === "declare" && reserved_array(current_token, ["var", "let", "const"])) {
            this._output.space_before_token = true;
          } else if (this._flags.last_token.type !== TOKEN.END_EXPR) {
            if ((this._flags.last_token.type !== TOKEN.START_EXPR || !reserved_array(current_token, ["var", "let", "const"])) && this._flags.last_token.text !== ":") {
              if (reserved_word(current_token, "if") && reserved_word(current_token.previous, "else")) {
                this._output.space_before_token = true;
              } else {
                this.print_newline();
              }
            }
          } else if (reserved_array(current_token, line_starters) && this._flags.last_token.text !== ")") {
            this.print_newline();
          }
        } else if (this._flags.multiline_frame && is_array(this._flags.mode) && this._flags.last_token.text === "," && this._last_last_text === "}") {
          this.print_newline();
        } else if (prefix === "SPACE") {
          this._output.space_before_token = true;
        }
        if (current_token.previous && (current_token.previous.type === TOKEN.WORD || current_token.previous.type === TOKEN.RESERVED)) {
          this._output.space_before_token = true;
        }
        this.print_token(current_token);
        this._flags.last_word = current_token.text;
        if (current_token.type === TOKEN.RESERVED) {
          if (current_token.text === "do") {
            this._flags.do_block = true;
          } else if (current_token.text === "if") {
            this._flags.if_block = true;
          } else if (current_token.text === "import") {
            this._flags.import_block = true;
          } else if (this._flags.import_block && reserved_word(current_token, "from")) {
            this._flags.import_block = false;
          }
        }
      };
      Beautifier.prototype.handle_semicolon = function(current_token) {
        if (this.start_of_statement(current_token)) {
          this._output.space_before_token = false;
        } else {
          this.handle_whitespace_and_comments(current_token);
        }
        var next_token = this._tokens.peek();
        while (this._flags.mode === MODE.Statement && !(this._flags.if_block && reserved_word(next_token, "else")) && !this._flags.do_block) {
          this.restore_mode();
        }
        if (this._flags.import_block) {
          this._flags.import_block = false;
        }
        this.print_token(current_token);
      };
      Beautifier.prototype.handle_string = function(current_token) {
        if (current_token.text.startsWith("`") && current_token.newlines === 0 && current_token.whitespace_before === "" && (current_token.previous.text === ")" || this._flags.last_token.type === TOKEN.WORD)) {
        } else if (this.start_of_statement(current_token)) {
          this._output.space_before_token = true;
        } else {
          this.handle_whitespace_and_comments(current_token);
          if (this._flags.last_token.type === TOKEN.RESERVED || this._flags.last_token.type === TOKEN.WORD || this._flags.inline_frame) {
            this._output.space_before_token = true;
          } else if (this._flags.last_token.type === TOKEN.COMMA || this._flags.last_token.type === TOKEN.START_EXPR || this._flags.last_token.type === TOKEN.EQUALS || this._flags.last_token.type === TOKEN.OPERATOR) {
            if (!this.start_of_object_property()) {
              this.allow_wrap_or_preserved_newline(current_token);
            }
          } else if (current_token.text.startsWith("`") && this._flags.last_token.type === TOKEN.END_EXPR && (current_token.previous.text === "]" || current_token.previous.text === ")") && current_token.newlines === 0) {
            this._output.space_before_token = true;
          } else {
            this.print_newline();
          }
        }
        this.print_token(current_token);
      };
      Beautifier.prototype.handle_equals = function(current_token) {
        if (this.start_of_statement(current_token)) {
        } else {
          this.handle_whitespace_and_comments(current_token);
        }
        if (this._flags.declaration_statement) {
          this._flags.declaration_assignment = true;
        }
        this._output.space_before_token = true;
        this.print_token(current_token);
        this._output.space_before_token = true;
      };
      Beautifier.prototype.handle_comma = function(current_token) {
        this.handle_whitespace_and_comments(current_token, true);
        this.print_token(current_token);
        this._output.space_before_token = true;
        if (this._flags.declaration_statement) {
          if (is_expression(this._flags.parent.mode)) {
            this._flags.declaration_assignment = false;
          }
          if (this._flags.declaration_assignment) {
            this._flags.declaration_assignment = false;
            this.print_newline(false, true);
          } else if (this._options.comma_first) {
            this.allow_wrap_or_preserved_newline(current_token);
          }
        } else if (this._flags.mode === MODE.ObjectLiteral || this._flags.mode === MODE.Statement && this._flags.parent.mode === MODE.ObjectLiteral) {
          if (this._flags.mode === MODE.Statement) {
            this.restore_mode();
          }
          if (!this._flags.inline_frame) {
            this.print_newline();
          }
        } else if (this._options.comma_first) {
          this.allow_wrap_or_preserved_newline(current_token);
        }
      };
      Beautifier.prototype.handle_operator = function(current_token) {
        var isGeneratorAsterisk = current_token.text === "*" && (reserved_array(this._flags.last_token, ["function", "yield"]) || in_array(this._flags.last_token.type, [TOKEN.START_BLOCK, TOKEN.COMMA, TOKEN.END_BLOCK, TOKEN.SEMICOLON]));
        var isUnary = in_array(current_token.text, ["-", "+"]) && (in_array(this._flags.last_token.type, [TOKEN.START_BLOCK, TOKEN.START_EXPR, TOKEN.EQUALS, TOKEN.OPERATOR]) || in_array(this._flags.last_token.text, line_starters) || this._flags.last_token.text === ",");
        if (this.start_of_statement(current_token)) {
        } else {
          var preserve_statement_flags = !isGeneratorAsterisk;
          this.handle_whitespace_and_comments(current_token, preserve_statement_flags);
        }
        if (current_token.text === "*" && this._flags.last_token.type === TOKEN.DOT) {
          this.print_token(current_token);
          return;
        }
        if (current_token.text === "::") {
          this.print_token(current_token);
          return;
        }
        if (in_array(current_token.text, ["-", "+"]) && this.start_of_object_property()) {
          this.print_token(current_token);
          return;
        }
        if (this._flags.last_token.type === TOKEN.OPERATOR && in_array(this._options.operator_position, OPERATOR_POSITION_BEFORE_OR_PRESERVE)) {
          this.allow_wrap_or_preserved_newline(current_token);
        }
        if (current_token.text === ":" && this._flags.in_case) {
          this.print_token(current_token);
          this._flags.in_case = false;
          this._flags.case_body = true;
          if (this._tokens.peek().type !== TOKEN.START_BLOCK) {
            this.indent();
            this.print_newline();
            this._flags.case_block = false;
          } else {
            this._flags.case_block = true;
            this._output.space_before_token = true;
          }
          return;
        }
        var space_before = true;
        var space_after = true;
        var in_ternary = false;
        if (current_token.text === ":") {
          if (this._flags.ternary_depth === 0) {
            space_before = false;
          } else {
            this._flags.ternary_depth -= 1;
            in_ternary = true;
          }
        } else if (current_token.text === "?") {
          this._flags.ternary_depth += 1;
        }
        if (!isUnary && !isGeneratorAsterisk && this._options.preserve_newlines && in_array(current_token.text, positionable_operators)) {
          var isColon = current_token.text === ":";
          var isTernaryColon = isColon && in_ternary;
          var isOtherColon = isColon && !in_ternary;
          switch (this._options.operator_position) {
            case OPERATOR_POSITION.before_newline:
              this._output.space_before_token = !isOtherColon;
              this.print_token(current_token);
              if (!isColon || isTernaryColon) {
                this.allow_wrap_or_preserved_newline(current_token);
              }
              this._output.space_before_token = true;
              return;
            case OPERATOR_POSITION.after_newline:
              this._output.space_before_token = true;
              if (!isColon || isTernaryColon) {
                if (this._tokens.peek().newlines) {
                  this.print_newline(false, true);
                } else {
                  this.allow_wrap_or_preserved_newline(current_token);
                }
              } else {
                this._output.space_before_token = false;
              }
              this.print_token(current_token);
              this._output.space_before_token = true;
              return;
            case OPERATOR_POSITION.preserve_newline:
              if (!isOtherColon) {
                this.allow_wrap_or_preserved_newline(current_token);
              }
              space_before = !(this._output.just_added_newline() || isOtherColon);
              this._output.space_before_token = space_before;
              this.print_token(current_token);
              this._output.space_before_token = true;
              return;
          }
        }
        if (isGeneratorAsterisk) {
          this.allow_wrap_or_preserved_newline(current_token);
          space_before = false;
          var next_token = this._tokens.peek();
          space_after = next_token && in_array(next_token.type, [TOKEN.WORD, TOKEN.RESERVED]);
        } else if (current_token.text === "...") {
          this.allow_wrap_or_preserved_newline(current_token);
          space_before = this._flags.last_token.type === TOKEN.START_BLOCK;
          space_after = false;
        } else if (in_array(current_token.text, ["--", "++", "!", "~"]) || isUnary) {
          if (this._flags.last_token.type === TOKEN.COMMA || this._flags.last_token.type === TOKEN.START_EXPR) {
            this.allow_wrap_or_preserved_newline(current_token);
          }
          space_before = false;
          space_after = false;
          if (current_token.newlines && (current_token.text === "--" || current_token.text === "++" || current_token.text === "~")) {
            var new_line_needed = reserved_array(this._flags.last_token, special_words) && current_token.newlines;
            if (new_line_needed && (this._previous_flags.if_block || this._previous_flags.else_block)) {
              this.restore_mode();
            }
            this.print_newline(new_line_needed, true);
          }
          if (this._flags.last_token.text === ";" && is_expression(this._flags.mode)) {
            space_before = true;
          }
          if (this._flags.last_token.type === TOKEN.RESERVED) {
            space_before = true;
          } else if (this._flags.last_token.type === TOKEN.END_EXPR) {
            space_before = !(this._flags.last_token.text === "]" && (current_token.text === "--" || current_token.text === "++"));
          } else if (this._flags.last_token.type === TOKEN.OPERATOR) {
            space_before = in_array(current_token.text, ["--", "-", "++", "+"]) && in_array(this._flags.last_token.text, ["--", "-", "++", "+"]);
            if (in_array(current_token.text, ["+", "-"]) && in_array(this._flags.last_token.text, ["--", "++"])) {
              space_after = true;
            }
          }
          if ((this._flags.mode === MODE.BlockStatement && !this._flags.inline_frame || this._flags.mode === MODE.Statement) && (this._flags.last_token.text === "{" || this._flags.last_token.text === ";")) {
            this.print_newline();
          }
        }
        this._output.space_before_token = this._output.space_before_token || space_before;
        this.print_token(current_token);
        this._output.space_before_token = space_after;
      };
      Beautifier.prototype.handle_block_comment = function(current_token, preserve_statement_flags) {
        if (this._output.raw) {
          this._output.add_raw_token(current_token);
          if (current_token.directives && current_token.directives.preserve === "end") {
            this._output.raw = this._options.test_output_raw;
          }
          return;
        }
        if (current_token.directives) {
          this.print_newline(false, preserve_statement_flags);
          this.print_token(current_token);
          if (current_token.directives.preserve === "start") {
            this._output.raw = true;
          }
          this.print_newline(false, true);
          return;
        }
        if (!acorn.newline.test(current_token.text) && !current_token.newlines) {
          this._output.space_before_token = true;
          this.print_token(current_token);
          this._output.space_before_token = true;
          return;
        } else {
          this.print_block_commment(current_token, preserve_statement_flags);
        }
      };
      Beautifier.prototype.print_block_commment = function(current_token, preserve_statement_flags) {
        var lines = split_linebreaks(current_token.text);
        var j;
        var javadoc = false;
        var starless = false;
        var lastIndent = current_token.whitespace_before;
        var lastIndentLength = lastIndent.length;
        this.print_newline(false, preserve_statement_flags);
        this.print_token_line_indentation(current_token);
        this._output.add_token(lines[0]);
        this.print_newline(false, preserve_statement_flags);
        if (lines.length > 1) {
          lines = lines.slice(1);
          javadoc = all_lines_start_with(lines, "*");
          starless = each_line_matches_indent(lines, lastIndent);
          if (javadoc) {
            this._flags.alignment = 1;
          }
          for (j = 0; j < lines.length; j++) {
            if (javadoc) {
              this.print_token_line_indentation(current_token);
              this._output.add_token(ltrim(lines[j]));
            } else if (starless && lines[j]) {
              this.print_token_line_indentation(current_token);
              this._output.add_token(lines[j].substring(lastIndentLength));
            } else {
              this._output.current_line.set_indent(-1);
              this._output.add_token(lines[j]);
            }
            this.print_newline(false, preserve_statement_flags);
          }
          this._flags.alignment = 0;
        }
      };
      Beautifier.prototype.handle_comment = function(current_token, preserve_statement_flags) {
        if (current_token.newlines) {
          this.print_newline(false, preserve_statement_flags);
        } else {
          this._output.trim(true);
        }
        this._output.space_before_token = true;
        this.print_token(current_token);
        this.print_newline(false, preserve_statement_flags);
      };
      Beautifier.prototype.handle_dot = function(current_token) {
        if (this.start_of_statement(current_token)) {
        } else {
          this.handle_whitespace_and_comments(current_token, true);
        }
        if (this._flags.last_token.text.match("^[0-9]+$")) {
          this._output.space_before_token = true;
        }
        if (reserved_array(this._flags.last_token, special_words)) {
          this._output.space_before_token = false;
        } else {
          this.allow_wrap_or_preserved_newline(
            current_token,
            this._flags.last_token.text === ")" && this._options.break_chained_methods
          );
        }
        if (this._options.unindent_chained_methods && this._output.just_added_newline()) {
          this.deindent();
        }
        this.print_token(current_token);
      };
      Beautifier.prototype.handle_unknown = function(current_token, preserve_statement_flags) {
        this.print_token(current_token);
        if (current_token.text[current_token.text.length - 1] === "\n") {
          this.print_newline(false, preserve_statement_flags);
        }
      };
      Beautifier.prototype.handle_eof = function(current_token) {
        while (this._flags.mode === MODE.Statement) {
          this.restore_mode();
        }
        this.handle_whitespace_and_comments(current_token);
      };
      module.exports.Beautifier = Beautifier;
    }
  });

  // node_modules/js-beautify/js/src/javascript/index.js
  var require_javascript = __commonJS({
    "node_modules/js-beautify/js/src/javascript/index.js"(exports, module) {
      "use strict";
      var Beautifier = require_beautifier().Beautifier;
      var Options = require_options2().Options;
      function js_beautify2(js_source_text, options) {
        var beautifier = new Beautifier(js_source_text, options);
        return beautifier.beautify();
      }
      module.exports = js_beautify2;
      module.exports.defaultOptions = function() {
        return new Options();
      };
    }
  });

  // node_modules/js-beautify/js/src/css/options.js
  var require_options3 = __commonJS({
    "node_modules/js-beautify/js/src/css/options.js"(exports, module) {
      "use strict";
      var BaseOptions = require_options().Options;
      function Options(options) {
        BaseOptions.call(this, options, "css");
        this.selector_separator_newline = this._get_boolean("selector_separator_newline", true);
        this.newline_between_rules = this._get_boolean("newline_between_rules", true);
        var space_around_selector_separator = this._get_boolean("space_around_selector_separator");
        this.space_around_combinator = this._get_boolean("space_around_combinator") || space_around_selector_separator;
        var brace_style_split = this._get_selection_list("brace_style", ["collapse", "expand", "end-expand", "none", "preserve-inline"]);
        this.brace_style = "collapse";
        for (var bs = 0; bs < brace_style_split.length; bs++) {
          if (brace_style_split[bs] !== "expand") {
            this.brace_style = "collapse";
          } else {
            this.brace_style = brace_style_split[bs];
          }
        }
      }
      Options.prototype = new BaseOptions();
      module.exports.Options = Options;
    }
  });

  // node_modules/js-beautify/js/src/css/beautifier.js
  var require_beautifier2 = __commonJS({
    "node_modules/js-beautify/js/src/css/beautifier.js"(exports, module) {
      "use strict";
      var Options = require_options3().Options;
      var Output = require_output().Output;
      var InputScanner = require_inputscanner().InputScanner;
      var Directives = require_directives().Directives;
      var directives_core = new Directives(/\/\*/, /\*\//);
      var lineBreak = /\r\n|[\r\n]/;
      var allLineBreaks = /\r\n|[\r\n]/g;
      var whitespaceChar = /\s/;
      var whitespacePattern = /(?:\s|\n)+/g;
      var block_comment_pattern = /\/\*(?:[\s\S]*?)((?:\*\/)|$)/g;
      var comment_pattern = /\/\/(?:[^\n\r\u2028\u2029]*)/g;
      function Beautifier(source_text, options) {
        this._source_text = source_text || "";
        this._options = new Options(options);
        this._ch = null;
        this._input = null;
        this.NESTED_AT_RULE = {
          "page": true,
          "font-face": true,
          "keyframes": true,
          // also in CONDITIONAL_GROUP_RULE below
          "media": true,
          "supports": true,
          "document": true
        };
        this.CONDITIONAL_GROUP_RULE = {
          "media": true,
          "supports": true,
          "document": true
        };
        this.NON_SEMICOLON_NEWLINE_PROPERTY = [
          "grid-template-areas",
          "grid-template"
        ];
      }
      Beautifier.prototype.eatString = function(endChars) {
        var result = "";
        this._ch = this._input.next();
        while (this._ch) {
          result += this._ch;
          if (this._ch === "\\") {
            result += this._input.next();
          } else if (endChars.indexOf(this._ch) !== -1 || this._ch === "\n") {
            break;
          }
          this._ch = this._input.next();
        }
        return result;
      };
      Beautifier.prototype.eatWhitespace = function(allowAtLeastOneNewLine) {
        var result = whitespaceChar.test(this._input.peek());
        var newline_count = 0;
        while (whitespaceChar.test(this._input.peek())) {
          this._ch = this._input.next();
          if (allowAtLeastOneNewLine && this._ch === "\n") {
            if (newline_count === 0 || newline_count < this._options.max_preserve_newlines) {
              newline_count++;
              this._output.add_new_line(true);
            }
          }
        }
        return result;
      };
      Beautifier.prototype.foundNestedPseudoClass = function() {
        var openParen = 0;
        var i = 1;
        var ch = this._input.peek(i);
        while (ch) {
          if (ch === "{") {
            return true;
          } else if (ch === "(") {
            openParen += 1;
          } else if (ch === ")") {
            if (openParen === 0) {
              return false;
            }
            openParen -= 1;
          } else if (ch === ";" || ch === "}") {
            return false;
          }
          i++;
          ch = this._input.peek(i);
        }
        return false;
      };
      Beautifier.prototype.print_string = function(output_string) {
        this._output.set_indent(this._indentLevel);
        this._output.non_breaking_space = true;
        this._output.add_token(output_string);
      };
      Beautifier.prototype.preserveSingleSpace = function(isAfterSpace) {
        if (isAfterSpace) {
          this._output.space_before_token = true;
        }
      };
      Beautifier.prototype.indent = function() {
        this._indentLevel++;
      };
      Beautifier.prototype.outdent = function() {
        if (this._indentLevel > 0) {
          this._indentLevel--;
        }
      };
      Beautifier.prototype.beautify = function() {
        if (this._options.disabled) {
          return this._source_text;
        }
        var source_text = this._source_text;
        var eol = this._options.eol;
        if (eol === "auto") {
          eol = "\n";
          if (source_text && lineBreak.test(source_text || "")) {
            eol = source_text.match(lineBreak)[0];
          }
        }
        source_text = source_text.replace(allLineBreaks, "\n");
        var baseIndentString = source_text.match(/^[\t ]*/)[0];
        this._output = new Output(this._options, baseIndentString);
        this._input = new InputScanner(source_text);
        this._indentLevel = 0;
        this._nestedLevel = 0;
        this._ch = null;
        var parenLevel = 0;
        var insideRule = false;
        var insidePropertyValue = false;
        var enteringConditionalGroup = false;
        var insideNonNestedAtRule = false;
        var insideScssMap = false;
        var topCharacter = this._ch;
        var insideNonSemiColonValues = false;
        var whitespace;
        var isAfterSpace;
        var previous_ch;
        while (true) {
          whitespace = this._input.read(whitespacePattern);
          isAfterSpace = whitespace !== "";
          previous_ch = topCharacter;
          this._ch = this._input.next();
          if (this._ch === "\\" && this._input.hasNext()) {
            this._ch += this._input.next();
          }
          topCharacter = this._ch;
          if (!this._ch) {
            break;
          } else if (this._ch === "/" && this._input.peek() === "*") {
            this._output.add_new_line();
            this._input.back();
            var comment = this._input.read(block_comment_pattern);
            var directives = directives_core.get_directives(comment);
            if (directives && directives.ignore === "start") {
              comment += directives_core.readIgnored(this._input);
            }
            this.print_string(comment);
            this.eatWhitespace(true);
            this._output.add_new_line();
          } else if (this._ch === "/" && this._input.peek() === "/") {
            this._output.space_before_token = true;
            this._input.back();
            this.print_string(this._input.read(comment_pattern));
            this.eatWhitespace(true);
          } else if (this._ch === "$") {
            this.preserveSingleSpace(isAfterSpace);
            this.print_string(this._ch);
            var variable = this._input.peekUntilAfter(/[: ,;{}()[\]\/='"]/g);
            if (variable.match(/[ :]$/)) {
              variable = this.eatString(": ").replace(/\s+$/, "");
              this.print_string(variable);
              this._output.space_before_token = true;
            }
            if (parenLevel === 0 && variable.indexOf(":") !== -1) {
              insidePropertyValue = true;
              this.indent();
            }
          } else if (this._ch === "@") {
            this.preserveSingleSpace(isAfterSpace);
            if (this._input.peek() === "{") {
              this.print_string(this._ch + this.eatString("}"));
            } else {
              this.print_string(this._ch);
              var variableOrRule = this._input.peekUntilAfter(/[: ,;{}()[\]\/='"]/g);
              if (variableOrRule.match(/[ :]$/)) {
                variableOrRule = this.eatString(": ").replace(/\s+$/, "");
                this.print_string(variableOrRule);
                this._output.space_before_token = true;
              }
              if (parenLevel === 0 && variableOrRule.indexOf(":") !== -1) {
                insidePropertyValue = true;
                this.indent();
              } else if (variableOrRule in this.NESTED_AT_RULE) {
                this._nestedLevel += 1;
                if (variableOrRule in this.CONDITIONAL_GROUP_RULE) {
                  enteringConditionalGroup = true;
                }
              } else if (parenLevel === 0 && !insidePropertyValue) {
                insideNonNestedAtRule = true;
              }
            }
          } else if (this._ch === "#" && this._input.peek() === "{") {
            this.preserveSingleSpace(isAfterSpace);
            this.print_string(this._ch + this.eatString("}"));
          } else if (this._ch === "{") {
            if (insidePropertyValue) {
              insidePropertyValue = false;
              this.outdent();
            }
            insideNonNestedAtRule = false;
            if (enteringConditionalGroup) {
              enteringConditionalGroup = false;
              insideRule = this._indentLevel >= this._nestedLevel;
            } else {
              insideRule = this._indentLevel >= this._nestedLevel - 1;
            }
            if (this._options.newline_between_rules && insideRule) {
              if (this._output.previous_line && this._output.previous_line.item(-1) !== "{") {
                this._output.ensure_empty_line_above("/", ",");
              }
            }
            this._output.space_before_token = true;
            if (this._options.brace_style === "expand") {
              this._output.add_new_line();
              this.print_string(this._ch);
              this.indent();
              this._output.set_indent(this._indentLevel);
            } else {
              if (previous_ch === "(") {
                this._output.space_before_token = false;
              } else if (previous_ch !== ",") {
                this.indent();
              }
              this.print_string(this._ch);
            }
            this.eatWhitespace(true);
            this._output.add_new_line();
          } else if (this._ch === "}") {
            this.outdent();
            this._output.add_new_line();
            if (previous_ch === "{") {
              this._output.trim(true);
            }
            if (insidePropertyValue) {
              this.outdent();
              insidePropertyValue = false;
            }
            this.print_string(this._ch);
            insideRule = false;
            if (this._nestedLevel) {
              this._nestedLevel--;
            }
            this.eatWhitespace(true);
            this._output.add_new_line();
            if (this._options.newline_between_rules && !this._output.just_added_blankline()) {
              if (this._input.peek() !== "}") {
                this._output.add_new_line(true);
              }
            }
            if (this._input.peek() === ")") {
              this._output.trim(true);
              if (this._options.brace_style === "expand") {
                this._output.add_new_line(true);
              }
            }
          } else if (this._ch === ":") {
            for (var i = 0; i < this.NON_SEMICOLON_NEWLINE_PROPERTY.length; i++) {
              if (this._input.lookBack(this.NON_SEMICOLON_NEWLINE_PROPERTY[i])) {
                insideNonSemiColonValues = true;
                break;
              }
            }
            if ((insideRule || enteringConditionalGroup) && !(this._input.lookBack("&") || this.foundNestedPseudoClass()) && !this._input.lookBack("(") && !insideNonNestedAtRule && parenLevel === 0) {
              this.print_string(":");
              if (!insidePropertyValue) {
                insidePropertyValue = true;
                this._output.space_before_token = true;
                this.eatWhitespace(true);
                this.indent();
              }
            } else {
              if (this._input.lookBack(" ")) {
                this._output.space_before_token = true;
              }
              if (this._input.peek() === ":") {
                this._ch = this._input.next();
                this.print_string("::");
              } else {
                this.print_string(":");
              }
            }
          } else if (this._ch === '"' || this._ch === "'") {
            var preserveQuoteSpace = previous_ch === '"' || previous_ch === "'";
            this.preserveSingleSpace(preserveQuoteSpace || isAfterSpace);
            this.print_string(this._ch + this.eatString(this._ch));
            this.eatWhitespace(true);
          } else if (this._ch === ";") {
            insideNonSemiColonValues = false;
            if (parenLevel === 0) {
              if (insidePropertyValue) {
                this.outdent();
                insidePropertyValue = false;
              }
              insideNonNestedAtRule = false;
              this.print_string(this._ch);
              this.eatWhitespace(true);
              if (this._input.peek() !== "/") {
                this._output.add_new_line();
              }
            } else {
              this.print_string(this._ch);
              this.eatWhitespace(true);
              this._output.space_before_token = true;
            }
          } else if (this._ch === "(") {
            if (this._input.lookBack("url")) {
              this.print_string(this._ch);
              this.eatWhitespace();
              parenLevel++;
              this.indent();
              this._ch = this._input.next();
              if (this._ch === ")" || this._ch === '"' || this._ch === "'") {
                this._input.back();
              } else if (this._ch) {
                this.print_string(this._ch + this.eatString(")"));
                if (parenLevel) {
                  parenLevel--;
                  this.outdent();
                }
              }
            } else {
              var space_needed = false;
              if (this._input.lookBack("with")) {
                space_needed = true;
              }
              this.preserveSingleSpace(isAfterSpace || space_needed);
              this.print_string(this._ch);
              if (insidePropertyValue && previous_ch === "$" && this._options.selector_separator_newline) {
                this._output.add_new_line();
                insideScssMap = true;
              } else {
                this.eatWhitespace();
                parenLevel++;
                this.indent();
              }
            }
          } else if (this._ch === ")") {
            if (parenLevel) {
              parenLevel--;
              this.outdent();
            }
            if (insideScssMap && this._input.peek() === ";" && this._options.selector_separator_newline) {
              insideScssMap = false;
              this.outdent();
              this._output.add_new_line();
            }
            this.print_string(this._ch);
          } else if (this._ch === ",") {
            this.print_string(this._ch);
            this.eatWhitespace(true);
            if (this._options.selector_separator_newline && (!insidePropertyValue || insideScssMap) && parenLevel === 0 && !insideNonNestedAtRule) {
              this._output.add_new_line();
            } else {
              this._output.space_before_token = true;
            }
          } else if ((this._ch === ">" || this._ch === "+" || this._ch === "~") && !insidePropertyValue && parenLevel === 0) {
            if (this._options.space_around_combinator) {
              this._output.space_before_token = true;
              this.print_string(this._ch);
              this._output.space_before_token = true;
            } else {
              this.print_string(this._ch);
              this.eatWhitespace();
              if (this._ch && whitespaceChar.test(this._ch)) {
                this._ch = "";
              }
            }
          } else if (this._ch === "]") {
            this.print_string(this._ch);
          } else if (this._ch === "[") {
            this.preserveSingleSpace(isAfterSpace);
            this.print_string(this._ch);
          } else if (this._ch === "=") {
            this.eatWhitespace();
            this.print_string("=");
            if (whitespaceChar.test(this._ch)) {
              this._ch = "";
            }
          } else if (this._ch === "!" && !this._input.lookBack("\\")) {
            this._output.space_before_token = true;
            this.print_string(this._ch);
          } else {
            var preserveAfterSpace = previous_ch === '"' || previous_ch === "'";
            this.preserveSingleSpace(preserveAfterSpace || isAfterSpace);
            this.print_string(this._ch);
            if (!this._output.just_added_newline() && this._input.peek() === "\n" && insideNonSemiColonValues) {
              this._output.add_new_line();
            }
          }
        }
        var sweetCode = this._output.get_code(eol);
        return sweetCode;
      };
      module.exports.Beautifier = Beautifier;
    }
  });

  // node_modules/js-beautify/js/src/css/index.js
  var require_css = __commonJS({
    "node_modules/js-beautify/js/src/css/index.js"(exports, module) {
      "use strict";
      var Beautifier = require_beautifier2().Beautifier;
      var Options = require_options3().Options;
      function css_beautify(source_text, options) {
        var beautifier = new Beautifier(source_text, options);
        return beautifier.beautify();
      }
      module.exports = css_beautify;
      module.exports.defaultOptions = function() {
        return new Options();
      };
    }
  });

  // node_modules/js-beautify/js/src/html/options.js
  var require_options4 = __commonJS({
    "node_modules/js-beautify/js/src/html/options.js"(exports, module) {
      "use strict";
      var BaseOptions = require_options().Options;
      function Options(options) {
        BaseOptions.call(this, options, "html");
        if (this.templating.length === 1 && this.templating[0] === "auto") {
          this.templating = ["django", "erb", "handlebars", "php"];
        }
        this.indent_inner_html = this._get_boolean("indent_inner_html");
        this.indent_body_inner_html = this._get_boolean("indent_body_inner_html", true);
        this.indent_head_inner_html = this._get_boolean("indent_head_inner_html", true);
        this.indent_handlebars = this._get_boolean("indent_handlebars", true);
        this.wrap_attributes = this._get_selection(
          "wrap_attributes",
          ["auto", "force", "force-aligned", "force-expand-multiline", "aligned-multiple", "preserve", "preserve-aligned"]
        );
        this.wrap_attributes_min_attrs = this._get_number("wrap_attributes_min_attrs", 2);
        this.wrap_attributes_indent_size = this._get_number("wrap_attributes_indent_size", this.indent_size);
        this.extra_liners = this._get_array("extra_liners", ["head", "body", "/html"]);
        this.inline = this._get_array("inline", [
          "a",
          "abbr",
          "area",
          "audio",
          "b",
          "bdi",
          "bdo",
          "br",
          "button",
          "canvas",
          "cite",
          "code",
          "data",
          "datalist",
          "del",
          "dfn",
          "em",
          "embed",
          "i",
          "iframe",
          "img",
          "input",
          "ins",
          "kbd",
          "keygen",
          "label",
          "map",
          "mark",
          "math",
          "meter",
          "noscript",
          "object",
          "output",
          "progress",
          "q",
          "ruby",
          "s",
          "samp",
          /* 'script', */
          "select",
          "small",
          "span",
          "strong",
          "sub",
          "sup",
          "svg",
          "template",
          "textarea",
          "time",
          "u",
          "var",
          "video",
          "wbr",
          "text",
          // obsolete inline tags
          "acronym",
          "big",
          "strike",
          "tt"
        ]);
        this.inline_custom_elements = this._get_boolean("inline_custom_elements", true);
        this.void_elements = this._get_array("void_elements", [
          // HTLM void elements - aka self-closing tags - aka singletons
          // https://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements
          "area",
          "base",
          "br",
          "col",
          "embed",
          "hr",
          "img",
          "input",
          "keygen",
          "link",
          "menuitem",
          "meta",
          "param",
          "source",
          "track",
          "wbr",
          // NOTE: Optional tags are too complex for a simple list
          // they are hard coded in _do_optional_end_element
          // Doctype and xml elements
          "!doctype",
          "?xml",
          // obsolete tags
          // basefont: https://www.computerhope.com/jargon/h/html-basefont-tag.htm
          // isndex: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/isindex
          "basefont",
          "isindex"
        ]);
        this.unformatted = this._get_array("unformatted", []);
        this.content_unformatted = this._get_array("content_unformatted", [
          "pre",
          "textarea"
        ]);
        this.unformatted_content_delimiter = this._get_characters("unformatted_content_delimiter");
        this.indent_scripts = this._get_selection("indent_scripts", ["normal", "keep", "separate"]);
      }
      Options.prototype = new BaseOptions();
      module.exports.Options = Options;
    }
  });

  // node_modules/js-beautify/js/src/html/tokenizer.js
  var require_tokenizer3 = __commonJS({
    "node_modules/js-beautify/js/src/html/tokenizer.js"(exports, module) {
      "use strict";
      var BaseTokenizer = require_tokenizer().Tokenizer;
      var BASETOKEN = require_tokenizer().TOKEN;
      var Directives = require_directives().Directives;
      var TemplatablePattern = require_templatablepattern().TemplatablePattern;
      var Pattern = require_pattern().Pattern;
      var TOKEN = {
        TAG_OPEN: "TK_TAG_OPEN",
        TAG_CLOSE: "TK_TAG_CLOSE",
        CONTROL_FLOW_OPEN: "TK_CONTROL_FLOW_OPEN",
        CONTROL_FLOW_CLOSE: "TK_CONTROL_FLOW_CLOSE",
        ATTRIBUTE: "TK_ATTRIBUTE",
        EQUALS: "TK_EQUALS",
        VALUE: "TK_VALUE",
        COMMENT: "TK_COMMENT",
        TEXT: "TK_TEXT",
        UNKNOWN: "TK_UNKNOWN",
        START: BASETOKEN.START,
        RAW: BASETOKEN.RAW,
        EOF: BASETOKEN.EOF
      };
      var directives_core = new Directives(/<\!--/, /-->/);
      var Tokenizer = function(input_string, options) {
        BaseTokenizer.call(this, input_string, options);
        this._current_tag_name = "";
        var templatable_reader = new TemplatablePattern(this._input).read_options(this._options);
        var pattern_reader = new Pattern(this._input);
        this.__patterns = {
          word: templatable_reader.until(/[\n\r\t <]/),
          word_control_flow_close_excluded: templatable_reader.until(/[\n\r\t <}]/),
          single_quote: templatable_reader.until_after(/'/),
          double_quote: templatable_reader.until_after(/"/),
          attribute: templatable_reader.until(/[\n\r\t =>]|\/>/),
          element_name: templatable_reader.until(/[\n\r\t >\/]/),
          angular_control_flow_start: pattern_reader.matching(/\@[a-zA-Z]+[^({]*[({]/),
          handlebars_comment: pattern_reader.starting_with(/{{!--/).until_after(/--}}/),
          handlebars: pattern_reader.starting_with(/{{/).until_after(/}}/),
          handlebars_open: pattern_reader.until(/[\n\r\t }]/),
          handlebars_raw_close: pattern_reader.until(/}}/),
          comment: pattern_reader.starting_with(/<!--/).until_after(/-->/),
          cdata: pattern_reader.starting_with(/<!\[CDATA\[/).until_after(/]]>/),
          // https://en.wikipedia.org/wiki/Conditional_comment
          conditional_comment: pattern_reader.starting_with(/<!\[/).until_after(/]>/),
          processing: pattern_reader.starting_with(/<\?/).until_after(/\?>/)
        };
        if (this._options.indent_handlebars) {
          this.__patterns.word = this.__patterns.word.exclude("handlebars");
          this.__patterns.word_control_flow_close_excluded = this.__patterns.word_control_flow_close_excluded.exclude("handlebars");
        }
        this._unformatted_content_delimiter = null;
        if (this._options.unformatted_content_delimiter) {
          var literal_regexp = this._input.get_literal_regexp(this._options.unformatted_content_delimiter);
          this.__patterns.unformatted_content_delimiter = pattern_reader.matching(literal_regexp).until_after(literal_regexp);
        }
      };
      Tokenizer.prototype = new BaseTokenizer();
      Tokenizer.prototype._is_comment = function(current_token) {
        return false;
      };
      Tokenizer.prototype._is_opening = function(current_token) {
        return current_token.type === TOKEN.TAG_OPEN || current_token.type === TOKEN.CONTROL_FLOW_OPEN;
      };
      Tokenizer.prototype._is_closing = function(current_token, open_token) {
        return current_token.type === TOKEN.TAG_CLOSE && (open_token && ((current_token.text === ">" || current_token.text === "/>") && open_token.text[0] === "<" || current_token.text === "}}" && open_token.text[0] === "{" && open_token.text[1] === "{")) || current_token.type === TOKEN.CONTROL_FLOW_CLOSE && (current_token.text === "}" && open_token.text.endsWith("{"));
      };
      Tokenizer.prototype._reset = function() {
        this._current_tag_name = "";
      };
      Tokenizer.prototype._get_next_token = function(previous_token, open_token) {
        var token = null;
        this._readWhitespace();
        var c = this._input.peek();
        if (c === null) {
          return this._create_token(TOKEN.EOF, "");
        }
        token = token || this._read_open_handlebars(c, open_token);
        token = token || this._read_attribute(c, previous_token, open_token);
        token = token || this._read_close(c, open_token);
        token = token || this._read_script_and_style(c, previous_token);
        token = token || this._read_control_flows(c, open_token);
        token = token || this._read_raw_content(c, previous_token, open_token);
        token = token || this._read_content_word(c, open_token);
        token = token || this._read_comment_or_cdata(c);
        token = token || this._read_processing(c);
        token = token || this._read_open(c, open_token);
        token = token || this._create_token(TOKEN.UNKNOWN, this._input.next());
        return token;
      };
      Tokenizer.prototype._read_comment_or_cdata = function(c) {
        var token = null;
        var resulting_string = null;
        var directives = null;
        if (c === "<") {
          var peek1 = this._input.peek(1);
          if (peek1 === "!") {
            resulting_string = this.__patterns.comment.read();
            if (resulting_string) {
              directives = directives_core.get_directives(resulting_string);
              if (directives && directives.ignore === "start") {
                resulting_string += directives_core.readIgnored(this._input);
              }
            } else {
              resulting_string = this.__patterns.cdata.read();
            }
          }
          if (resulting_string) {
            token = this._create_token(TOKEN.COMMENT, resulting_string);
            token.directives = directives;
          }
        }
        return token;
      };
      Tokenizer.prototype._read_processing = function(c) {
        var token = null;
        var resulting_string = null;
        var directives = null;
        if (c === "<") {
          var peek1 = this._input.peek(1);
          if (peek1 === "!" || peek1 === "?") {
            resulting_string = this.__patterns.conditional_comment.read();
            resulting_string = resulting_string || this.__patterns.processing.read();
          }
          if (resulting_string) {
            token = this._create_token(TOKEN.COMMENT, resulting_string);
            token.directives = directives;
          }
        }
        return token;
      };
      Tokenizer.prototype._read_open = function(c, open_token) {
        var resulting_string = null;
        var token = null;
        if (!open_token || open_token.type === TOKEN.CONTROL_FLOW_OPEN) {
          if (c === "<") {
            resulting_string = this._input.next();
            if (this._input.peek() === "/") {
              resulting_string += this._input.next();
            }
            resulting_string += this.__patterns.element_name.read();
            token = this._create_token(TOKEN.TAG_OPEN, resulting_string);
          }
        }
        return token;
      };
      Tokenizer.prototype._read_open_handlebars = function(c, open_token) {
        var resulting_string = null;
        var token = null;
        if (!open_token || open_token.type === TOKEN.CONTROL_FLOW_OPEN) {
          if ((this._options.templating.includes("angular") || this._options.indent_handlebars) && c === "{" && this._input.peek(1) === "{") {
            if (this._options.indent_handlebars && this._input.peek(2) === "!") {
              resulting_string = this.__patterns.handlebars_comment.read();
              resulting_string = resulting_string || this.__patterns.handlebars.read();
              token = this._create_token(TOKEN.COMMENT, resulting_string);
            } else {
              resulting_string = this.__patterns.handlebars_open.read();
              token = this._create_token(TOKEN.TAG_OPEN, resulting_string);
            }
          }
        }
        return token;
      };
      Tokenizer.prototype._read_control_flows = function(c, open_token) {
        var resulting_string = "";
        var token = null;
        if (!this._options.templating.includes("angular")) {
          return token;
        }
        if (c === "@") {
          resulting_string = this.__patterns.angular_control_flow_start.read();
          if (resulting_string === "") {
            return token;
          }
          var opening_parentheses_count = resulting_string.endsWith("(") ? 1 : 0;
          var closing_parentheses_count = 0;
          while (!(resulting_string.endsWith("{") && opening_parentheses_count === closing_parentheses_count)) {
            var next_char = this._input.next();
            if (next_char === null) {
              break;
            } else if (next_char === "(") {
              opening_parentheses_count++;
            } else if (next_char === ")") {
              closing_parentheses_count++;
            }
            resulting_string += next_char;
          }
          token = this._create_token(TOKEN.CONTROL_FLOW_OPEN, resulting_string);
        } else if (c === "}" && open_token && open_token.type === TOKEN.CONTROL_FLOW_OPEN) {
          resulting_string = this._input.next();
          token = this._create_token(TOKEN.CONTROL_FLOW_CLOSE, resulting_string);
        }
        return token;
      };
      Tokenizer.prototype._read_close = function(c, open_token) {
        var resulting_string = null;
        var token = null;
        if (open_token && open_token.type === TOKEN.TAG_OPEN) {
          if (open_token.text[0] === "<" && (c === ">" || c === "/" && this._input.peek(1) === ">")) {
            resulting_string = this._input.next();
            if (c === "/") {
              resulting_string += this._input.next();
            }
            token = this._create_token(TOKEN.TAG_CLOSE, resulting_string);
          } else if (open_token.text[0] === "{" && c === "}" && this._input.peek(1) === "}") {
            this._input.next();
            this._input.next();
            token = this._create_token(TOKEN.TAG_CLOSE, "}}");
          }
        }
        return token;
      };
      Tokenizer.prototype._read_attribute = function(c, previous_token, open_token) {
        var token = null;
        var resulting_string = "";
        if (open_token && open_token.text[0] === "<") {
          if (c === "=") {
            token = this._create_token(TOKEN.EQUALS, this._input.next());
          } else if (c === '"' || c === "'") {
            var content = this._input.next();
            if (c === '"') {
              content += this.__patterns.double_quote.read();
            } else {
              content += this.__patterns.single_quote.read();
            }
            token = this._create_token(TOKEN.VALUE, content);
          } else {
            resulting_string = this.__patterns.attribute.read();
            if (resulting_string) {
              if (previous_token.type === TOKEN.EQUALS) {
                token = this._create_token(TOKEN.VALUE, resulting_string);
              } else {
                token = this._create_token(TOKEN.ATTRIBUTE, resulting_string);
              }
            }
          }
        }
        return token;
      };
      Tokenizer.prototype._is_content_unformatted = function(tag_name) {
        return this._options.void_elements.indexOf(tag_name) === -1 && (this._options.content_unformatted.indexOf(tag_name) !== -1 || this._options.unformatted.indexOf(tag_name) !== -1);
      };
      Tokenizer.prototype._read_raw_content = function(c, previous_token, open_token) {
        var resulting_string = "";
        if (open_token && open_token.text[0] === "{") {
          resulting_string = this.__patterns.handlebars_raw_close.read();
        } else if (previous_token.type === TOKEN.TAG_CLOSE && previous_token.opened.text[0] === "<" && previous_token.text[0] !== "/") {
          var tag_name = previous_token.opened.text.substr(1).toLowerCase();
          if (this._is_content_unformatted(tag_name)) {
            resulting_string = this._input.readUntil(new RegExp("</" + tag_name + "[\\n\\r\\t ]*?>", "ig"));
          }
        }
        if (resulting_string) {
          return this._create_token(TOKEN.TEXT, resulting_string);
        }
        return null;
      };
      Tokenizer.prototype._read_script_and_style = function(c, previous_token) {
        if (previous_token.type === TOKEN.TAG_CLOSE && previous_token.opened.text[0] === "<" && previous_token.text[0] !== "/") {
          var tag_name = previous_token.opened.text.substr(1).toLowerCase();
          if (tag_name === "script" || tag_name === "style") {
            var token = this._read_comment_or_cdata(c);
            if (token) {
              token.type = TOKEN.TEXT;
              return token;
            }
            var resulting_string = this._input.readUntil(new RegExp("</" + tag_name + "[\\n\\r\\t ]*?>", "ig"));
            if (resulting_string) {
              return this._create_token(TOKEN.TEXT, resulting_string);
            }
          }
        }
        return null;
      };
      Tokenizer.prototype._read_content_word = function(c, open_token) {
        var resulting_string = "";
        if (this._options.unformatted_content_delimiter) {
          if (c === this._options.unformatted_content_delimiter[0]) {
            resulting_string = this.__patterns.unformatted_content_delimiter.read();
          }
        }
        if (!resulting_string) {
          resulting_string = open_token && open_token.type === TOKEN.CONTROL_FLOW_OPEN ? this.__patterns.word_control_flow_close_excluded.read() : this.__patterns.word.read();
        }
        if (resulting_string) {
          return this._create_token(TOKEN.TEXT, resulting_string);
        }
        return null;
      };
      module.exports.Tokenizer = Tokenizer;
      module.exports.TOKEN = TOKEN;
    }
  });

  // node_modules/js-beautify/js/src/html/beautifier.js
  var require_beautifier3 = __commonJS({
    "node_modules/js-beautify/js/src/html/beautifier.js"(exports, module) {
      "use strict";
      var Options = require_options4().Options;
      var Output = require_output().Output;
      var Tokenizer = require_tokenizer3().Tokenizer;
      var TOKEN = require_tokenizer3().TOKEN;
      var lineBreak = /\r\n|[\r\n]/;
      var allLineBreaks = /\r\n|[\r\n]/g;
      var Printer = function(options, base_indent_string) {
        this.indent_level = 0;
        this.alignment_size = 0;
        this.max_preserve_newlines = options.max_preserve_newlines;
        this.preserve_newlines = options.preserve_newlines;
        this._output = new Output(options, base_indent_string);
      };
      Printer.prototype.current_line_has_match = function(pattern) {
        return this._output.current_line.has_match(pattern);
      };
      Printer.prototype.set_space_before_token = function(value, non_breaking) {
        this._output.space_before_token = value;
        this._output.non_breaking_space = non_breaking;
      };
      Printer.prototype.set_wrap_point = function() {
        this._output.set_indent(this.indent_level, this.alignment_size);
        this._output.set_wrap_point();
      };
      Printer.prototype.add_raw_token = function(token) {
        this._output.add_raw_token(token);
      };
      Printer.prototype.print_preserved_newlines = function(raw_token) {
        var newlines = 0;
        if (raw_token.type !== TOKEN.TEXT && raw_token.previous.type !== TOKEN.TEXT) {
          newlines = raw_token.newlines ? 1 : 0;
        }
        if (this.preserve_newlines) {
          newlines = raw_token.newlines < this.max_preserve_newlines + 1 ? raw_token.newlines : this.max_preserve_newlines + 1;
        }
        for (var n = 0; n < newlines; n++) {
          this.print_newline(n > 0);
        }
        return newlines !== 0;
      };
      Printer.prototype.traverse_whitespace = function(raw_token) {
        if (raw_token.whitespace_before || raw_token.newlines) {
          if (!this.print_preserved_newlines(raw_token)) {
            this._output.space_before_token = true;
          }
          return true;
        }
        return false;
      };
      Printer.prototype.previous_token_wrapped = function() {
        return this._output.previous_token_wrapped;
      };
      Printer.prototype.print_newline = function(force) {
        this._output.add_new_line(force);
      };
      Printer.prototype.print_token = function(token) {
        if (token.text) {
          this._output.set_indent(this.indent_level, this.alignment_size);
          this._output.add_token(token.text);
        }
      };
      Printer.prototype.indent = function() {
        this.indent_level++;
      };
      Printer.prototype.deindent = function() {
        if (this.indent_level > 0) {
          this.indent_level--;
          this._output.set_indent(this.indent_level, this.alignment_size);
        }
      };
      Printer.prototype.get_full_indent = function(level) {
        level = this.indent_level + (level || 0);
        if (level < 1) {
          return "";
        }
        return this._output.get_indent_string(level);
      };
      var get_type_attribute = function(start_token) {
        var result = null;
        var raw_token = start_token.next;
        while (raw_token.type !== TOKEN.EOF && start_token.closed !== raw_token) {
          if (raw_token.type === TOKEN.ATTRIBUTE && raw_token.text === "type") {
            if (raw_token.next && raw_token.next.type === TOKEN.EQUALS && raw_token.next.next && raw_token.next.next.type === TOKEN.VALUE) {
              result = raw_token.next.next.text;
            }
            break;
          }
          raw_token = raw_token.next;
        }
        return result;
      };
      var get_custom_beautifier_name = function(tag_check, raw_token) {
        var typeAttribute = null;
        var result = null;
        if (!raw_token.closed) {
          return null;
        }
        if (tag_check === "script") {
          typeAttribute = "text/javascript";
        } else if (tag_check === "style") {
          typeAttribute = "text/css";
        }
        typeAttribute = get_type_attribute(raw_token) || typeAttribute;
        if (typeAttribute.search("text/css") > -1) {
          result = "css";
        } else if (typeAttribute.search(/module|((text|application|dojo)\/(x-)?(javascript|ecmascript|jscript|livescript|(ld\+)?json|method|aspect))/) > -1) {
          result = "javascript";
        } else if (typeAttribute.search(/(text|application|dojo)\/(x-)?(html)/) > -1) {
          result = "html";
        } else if (typeAttribute.search(/test\/null/) > -1) {
          result = "null";
        }
        return result;
      };
      function in_array(what, arr) {
        return arr.indexOf(what) !== -1;
      }
      function TagFrame(parent, parser_token, indent_level) {
        this.parent = parent || null;
        this.tag = parser_token ? parser_token.tag_name : "";
        this.indent_level = indent_level || 0;
        this.parser_token = parser_token || null;
      }
      function TagStack(printer) {
        this._printer = printer;
        this._current_frame = null;
      }
      TagStack.prototype.get_parser_token = function() {
        return this._current_frame ? this._current_frame.parser_token : null;
      };
      TagStack.prototype.record_tag = function(parser_token) {
        var new_frame = new TagFrame(this._current_frame, parser_token, this._printer.indent_level);
        this._current_frame = new_frame;
      };
      TagStack.prototype._try_pop_frame = function(frame) {
        var parser_token = null;
        if (frame) {
          parser_token = frame.parser_token;
          this._printer.indent_level = frame.indent_level;
          this._current_frame = frame.parent;
        }
        return parser_token;
      };
      TagStack.prototype._get_frame = function(tag_list, stop_list) {
        var frame = this._current_frame;
        while (frame) {
          if (tag_list.indexOf(frame.tag) !== -1) {
            break;
          } else if (stop_list && stop_list.indexOf(frame.tag) !== -1) {
            frame = null;
            break;
          }
          frame = frame.parent;
        }
        return frame;
      };
      TagStack.prototype.try_pop = function(tag, stop_list) {
        var frame = this._get_frame([tag], stop_list);
        return this._try_pop_frame(frame);
      };
      TagStack.prototype.indent_to_tag = function(tag_list) {
        var frame = this._get_frame(tag_list);
        if (frame) {
          this._printer.indent_level = frame.indent_level;
        }
      };
      function Beautifier(source_text, options, js_beautify2, css_beautify) {
        this._source_text = source_text || "";
        options = options || {};
        this._js_beautify = js_beautify2;
        this._css_beautify = css_beautify;
        this._tag_stack = null;
        var optionHtml = new Options(options, "html");
        this._options = optionHtml;
        this._is_wrap_attributes_force = this._options.wrap_attributes.substr(0, "force".length) === "force";
        this._is_wrap_attributes_force_expand_multiline = this._options.wrap_attributes === "force-expand-multiline";
        this._is_wrap_attributes_force_aligned = this._options.wrap_attributes === "force-aligned";
        this._is_wrap_attributes_aligned_multiple = this._options.wrap_attributes === "aligned-multiple";
        this._is_wrap_attributes_preserve = this._options.wrap_attributes.substr(0, "preserve".length) === "preserve";
        this._is_wrap_attributes_preserve_aligned = this._options.wrap_attributes === "preserve-aligned";
      }
      Beautifier.prototype.beautify = function() {
        if (this._options.disabled) {
          return this._source_text;
        }
        var source_text = this._source_text;
        var eol = this._options.eol;
        if (this._options.eol === "auto") {
          eol = "\n";
          if (source_text && lineBreak.test(source_text)) {
            eol = source_text.match(lineBreak)[0];
          }
        }
        source_text = source_text.replace(allLineBreaks, "\n");
        var baseIndentString = source_text.match(/^[\t ]*/)[0];
        var last_token = {
          text: "",
          type: ""
        };
        var last_tag_token = new TagOpenParserToken(this._options);
        var printer = new Printer(this._options, baseIndentString);
        var tokens = new Tokenizer(source_text, this._options).tokenize();
        this._tag_stack = new TagStack(printer);
        var parser_token = null;
        var raw_token = tokens.next();
        while (raw_token.type !== TOKEN.EOF) {
          if (raw_token.type === TOKEN.TAG_OPEN || raw_token.type === TOKEN.COMMENT) {
            parser_token = this._handle_tag_open(printer, raw_token, last_tag_token, last_token, tokens);
            last_tag_token = parser_token;
          } else if (raw_token.type === TOKEN.ATTRIBUTE || raw_token.type === TOKEN.EQUALS || raw_token.type === TOKEN.VALUE || raw_token.type === TOKEN.TEXT && !last_tag_token.tag_complete) {
            parser_token = this._handle_inside_tag(printer, raw_token, last_tag_token, last_token);
          } else if (raw_token.type === TOKEN.TAG_CLOSE) {
            parser_token = this._handle_tag_close(printer, raw_token, last_tag_token);
          } else if (raw_token.type === TOKEN.TEXT) {
            parser_token = this._handle_text(printer, raw_token, last_tag_token);
          } else if (raw_token.type === TOKEN.CONTROL_FLOW_OPEN) {
            parser_token = this._handle_control_flow_open(printer, raw_token);
          } else if (raw_token.type === TOKEN.CONTROL_FLOW_CLOSE) {
            parser_token = this._handle_control_flow_close(printer, raw_token);
          } else {
            printer.add_raw_token(raw_token);
          }
          last_token = parser_token;
          raw_token = tokens.next();
        }
        var sweet_code = printer._output.get_code(eol);
        return sweet_code;
      };
      Beautifier.prototype._handle_control_flow_open = function(printer, raw_token) {
        var parser_token = {
          text: raw_token.text,
          type: raw_token.type
        };
        printer.set_space_before_token(raw_token.newlines || raw_token.whitespace_before !== "", true);
        if (raw_token.newlines) {
          printer.print_preserved_newlines(raw_token);
        } else {
          printer.set_space_before_token(raw_token.newlines || raw_token.whitespace_before !== "", true);
        }
        printer.print_token(raw_token);
        printer.indent();
        return parser_token;
      };
      Beautifier.prototype._handle_control_flow_close = function(printer, raw_token) {
        var parser_token = {
          text: raw_token.text,
          type: raw_token.type
        };
        printer.deindent();
        if (raw_token.newlines) {
          printer.print_preserved_newlines(raw_token);
        } else {
          printer.set_space_before_token(raw_token.newlines || raw_token.whitespace_before !== "", true);
        }
        printer.print_token(raw_token);
        return parser_token;
      };
      Beautifier.prototype._handle_tag_close = function(printer, raw_token, last_tag_token) {
        var parser_token = {
          text: raw_token.text,
          type: raw_token.type
        };
        printer.alignment_size = 0;
        last_tag_token.tag_complete = true;
        printer.set_space_before_token(raw_token.newlines || raw_token.whitespace_before !== "", true);
        if (last_tag_token.is_unformatted) {
          printer.add_raw_token(raw_token);
        } else {
          if (last_tag_token.tag_start_char === "<") {
            printer.set_space_before_token(raw_token.text[0] === "/", true);
            if (this._is_wrap_attributes_force_expand_multiline && last_tag_token.has_wrapped_attrs) {
              printer.print_newline(false);
            }
          }
          printer.print_token(raw_token);
        }
        if (last_tag_token.indent_content && !(last_tag_token.is_unformatted || last_tag_token.is_content_unformatted)) {
          printer.indent();
          last_tag_token.indent_content = false;
        }
        if (!last_tag_token.is_inline_element && !(last_tag_token.is_unformatted || last_tag_token.is_content_unformatted)) {
          printer.set_wrap_point();
        }
        return parser_token;
      };
      Beautifier.prototype._handle_inside_tag = function(printer, raw_token, last_tag_token, last_token) {
        var wrapped = last_tag_token.has_wrapped_attrs;
        var parser_token = {
          text: raw_token.text,
          type: raw_token.type
        };
        printer.set_space_before_token(raw_token.newlines || raw_token.whitespace_before !== "", true);
        if (last_tag_token.is_unformatted) {
          printer.add_raw_token(raw_token);
        } else if (last_tag_token.tag_start_char === "{" && raw_token.type === TOKEN.TEXT) {
          if (printer.print_preserved_newlines(raw_token)) {
            raw_token.newlines = 0;
            printer.add_raw_token(raw_token);
          } else {
            printer.print_token(raw_token);
          }
        } else {
          if (raw_token.type === TOKEN.ATTRIBUTE) {
            printer.set_space_before_token(true);
          } else if (raw_token.type === TOKEN.EQUALS) {
            printer.set_space_before_token(false);
          } else if (raw_token.type === TOKEN.VALUE && raw_token.previous.type === TOKEN.EQUALS) {
            printer.set_space_before_token(false);
          }
          if (raw_token.type === TOKEN.ATTRIBUTE && last_tag_token.tag_start_char === "<") {
            if (this._is_wrap_attributes_preserve || this._is_wrap_attributes_preserve_aligned) {
              printer.traverse_whitespace(raw_token);
              wrapped = wrapped || raw_token.newlines !== 0;
            }
            if (this._is_wrap_attributes_force && last_tag_token.attr_count >= this._options.wrap_attributes_min_attrs && (last_token.type !== TOKEN.TAG_OPEN || // ie. second attribute and beyond
            this._is_wrap_attributes_force_expand_multiline)) {
              printer.print_newline(false);
              wrapped = true;
            }
          }
          printer.print_token(raw_token);
          wrapped = wrapped || printer.previous_token_wrapped();
          last_tag_token.has_wrapped_attrs = wrapped;
        }
        return parser_token;
      };
      Beautifier.prototype._handle_text = function(printer, raw_token, last_tag_token) {
        var parser_token = {
          text: raw_token.text,
          type: "TK_CONTENT"
        };
        if (last_tag_token.custom_beautifier_name) {
          this._print_custom_beatifier_text(printer, raw_token, last_tag_token);
        } else if (last_tag_token.is_unformatted || last_tag_token.is_content_unformatted) {
          printer.add_raw_token(raw_token);
        } else {
          printer.traverse_whitespace(raw_token);
          printer.print_token(raw_token);
        }
        return parser_token;
      };
      Beautifier.prototype._print_custom_beatifier_text = function(printer, raw_token, last_tag_token) {
        var local = this;
        if (raw_token.text !== "") {
          var text = raw_token.text, _beautifier, script_indent_level = 1, pre = "", post = "";
          if (last_tag_token.custom_beautifier_name === "javascript" && typeof this._js_beautify === "function") {
            _beautifier = this._js_beautify;
          } else if (last_tag_token.custom_beautifier_name === "css" && typeof this._css_beautify === "function") {
            _beautifier = this._css_beautify;
          } else if (last_tag_token.custom_beautifier_name === "html") {
            _beautifier = function(html_source, options) {
              var beautifier = new Beautifier(html_source, options, local._js_beautify, local._css_beautify);
              return beautifier.beautify();
            };
          }
          if (this._options.indent_scripts === "keep") {
            script_indent_level = 0;
          } else if (this._options.indent_scripts === "separate") {
            script_indent_level = -printer.indent_level;
          }
          var indentation = printer.get_full_indent(script_indent_level);
          text = text.replace(/\n[ \t]*$/, "");
          if (last_tag_token.custom_beautifier_name !== "html" && text[0] === "<" && text.match(/^(<!--|<!\[CDATA\[)/)) {
            var matched = /^(<!--[^\n]*|<!\[CDATA\[)(\n?)([ \t\n]*)([\s\S]*)(-->|]]>)$/.exec(text);
            if (!matched) {
              printer.add_raw_token(raw_token);
              return;
            }
            pre = indentation + matched[1] + "\n";
            text = matched[4];
            if (matched[5]) {
              post = indentation + matched[5];
            }
            text = text.replace(/\n[ \t]*$/, "");
            if (matched[2] || matched[3].indexOf("\n") !== -1) {
              matched = matched[3].match(/[ \t]+$/);
              if (matched) {
                raw_token.whitespace_before = matched[0];
              }
            }
          }
          if (text) {
            if (_beautifier) {
              var Child_options = function() {
                this.eol = "\n";
              };
              Child_options.prototype = this._options.raw_options;
              var child_options = new Child_options();
              text = _beautifier(indentation + text, child_options);
            } else {
              var white = raw_token.whitespace_before;
              if (white) {
                text = text.replace(new RegExp("\n(" + white + ")?", "g"), "\n");
              }
              text = indentation + text.replace(/\n/g, "\n" + indentation);
            }
          }
          if (pre) {
            if (!text) {
              text = pre + post;
            } else {
              text = pre + text + "\n" + post;
            }
          }
          printer.print_newline(false);
          if (text) {
            raw_token.text = text;
            raw_token.whitespace_before = "";
            raw_token.newlines = 0;
            printer.add_raw_token(raw_token);
            printer.print_newline(true);
          }
        }
      };
      Beautifier.prototype._handle_tag_open = function(printer, raw_token, last_tag_token, last_token, tokens) {
        var parser_token = this._get_tag_open_token(raw_token);
        if ((last_tag_token.is_unformatted || last_tag_token.is_content_unformatted) && !last_tag_token.is_empty_element && raw_token.type === TOKEN.TAG_OPEN && !parser_token.is_start_tag) {
          printer.add_raw_token(raw_token);
          parser_token.start_tag_token = this._tag_stack.try_pop(parser_token.tag_name);
        } else {
          printer.traverse_whitespace(raw_token);
          this._set_tag_position(printer, raw_token, parser_token, last_tag_token, last_token);
          if (!parser_token.is_inline_element) {
            printer.set_wrap_point();
          }
          printer.print_token(raw_token);
        }
        if (parser_token.is_start_tag && this._is_wrap_attributes_force) {
          var peek_index = 0;
          var peek_token;
          do {
            peek_token = tokens.peek(peek_index);
            if (peek_token.type === TOKEN.ATTRIBUTE) {
              parser_token.attr_count += 1;
            }
            peek_index += 1;
          } while (peek_token.type !== TOKEN.EOF && peek_token.type !== TOKEN.TAG_CLOSE);
        }
        if (this._is_wrap_attributes_force_aligned || this._is_wrap_attributes_aligned_multiple || this._is_wrap_attributes_preserve_aligned) {
          parser_token.alignment_size = raw_token.text.length + 1;
        }
        if (!parser_token.tag_complete && !parser_token.is_unformatted) {
          printer.alignment_size = parser_token.alignment_size;
        }
        return parser_token;
      };
      var TagOpenParserToken = function(options, parent, raw_token) {
        this.parent = parent || null;
        this.text = "";
        this.type = "TK_TAG_OPEN";
        this.tag_name = "";
        this.is_inline_element = false;
        this.is_unformatted = false;
        this.is_content_unformatted = false;
        this.is_empty_element = false;
        this.is_start_tag = false;
        this.is_end_tag = false;
        this.indent_content = false;
        this.multiline_content = false;
        this.custom_beautifier_name = null;
        this.start_tag_token = null;
        this.attr_count = 0;
        this.has_wrapped_attrs = false;
        this.alignment_size = 0;
        this.tag_complete = false;
        this.tag_start_char = "";
        this.tag_check = "";
        if (!raw_token) {
          this.tag_complete = true;
        } else {
          var tag_check_match;
          this.tag_start_char = raw_token.text[0];
          this.text = raw_token.text;
          if (this.tag_start_char === "<") {
            tag_check_match = raw_token.text.match(/^<([^\s>]*)/);
            this.tag_check = tag_check_match ? tag_check_match[1] : "";
          } else {
            tag_check_match = raw_token.text.match(/^{{~?(?:[\^]|#\*?)?([^\s}]+)/);
            this.tag_check = tag_check_match ? tag_check_match[1] : "";
            if ((raw_token.text.startsWith("{{#>") || raw_token.text.startsWith("{{~#>")) && this.tag_check[0] === ">") {
              if (this.tag_check === ">" && raw_token.next !== null) {
                this.tag_check = raw_token.next.text.split(" ")[0];
              } else {
                this.tag_check = raw_token.text.split(">")[1];
              }
            }
          }
          this.tag_check = this.tag_check.toLowerCase();
          if (raw_token.type === TOKEN.COMMENT) {
            this.tag_complete = true;
          }
          this.is_start_tag = this.tag_check.charAt(0) !== "/";
          this.tag_name = !this.is_start_tag ? this.tag_check.substr(1) : this.tag_check;
          this.is_end_tag = !this.is_start_tag || raw_token.closed && raw_token.closed.text === "/>";
          var handlebar_starts = 2;
          if (this.tag_start_char === "{" && this.text.length >= 3) {
            if (this.text.charAt(2) === "~") {
              handlebar_starts = 3;
            }
          }
          this.is_end_tag = this.is_end_tag || this.tag_start_char === "{" && (!options.indent_handlebars || this.text.length < 3 || /[^#\^]/.test(this.text.charAt(handlebar_starts)));
        }
      };
      Beautifier.prototype._get_tag_open_token = function(raw_token) {
        var parser_token = new TagOpenParserToken(this._options, this._tag_stack.get_parser_token(), raw_token);
        parser_token.alignment_size = this._options.wrap_attributes_indent_size;
        parser_token.is_end_tag = parser_token.is_end_tag || in_array(parser_token.tag_check, this._options.void_elements);
        parser_token.is_empty_element = parser_token.tag_complete || parser_token.is_start_tag && parser_token.is_end_tag;
        parser_token.is_unformatted = !parser_token.tag_complete && in_array(parser_token.tag_check, this._options.unformatted);
        parser_token.is_content_unformatted = !parser_token.is_empty_element && in_array(parser_token.tag_check, this._options.content_unformatted);
        parser_token.is_inline_element = in_array(parser_token.tag_name, this._options.inline) || this._options.inline_custom_elements && parser_token.tag_name.includes("-") || parser_token.tag_start_char === "{";
        return parser_token;
      };
      Beautifier.prototype._set_tag_position = function(printer, raw_token, parser_token, last_tag_token, last_token) {
        if (!parser_token.is_empty_element) {
          if (parser_token.is_end_tag) {
            parser_token.start_tag_token = this._tag_stack.try_pop(parser_token.tag_name);
          } else {
            if (this._do_optional_end_element(parser_token)) {
              if (!parser_token.is_inline_element) {
                printer.print_newline(false);
              }
            }
            this._tag_stack.record_tag(parser_token);
            if ((parser_token.tag_name === "script" || parser_token.tag_name === "style") && !(parser_token.is_unformatted || parser_token.is_content_unformatted)) {
              parser_token.custom_beautifier_name = get_custom_beautifier_name(parser_token.tag_check, raw_token);
            }
          }
        }
        if (in_array(parser_token.tag_check, this._options.extra_liners)) {
          printer.print_newline(false);
          if (!printer._output.just_added_blankline()) {
            printer.print_newline(true);
          }
        }
        if (parser_token.is_empty_element) {
          if (parser_token.tag_start_char === "{" && parser_token.tag_check === "else") {
            this._tag_stack.indent_to_tag(["if", "unless", "each"]);
            parser_token.indent_content = true;
            var foundIfOnCurrentLine = printer.current_line_has_match(/{{#if/);
            if (!foundIfOnCurrentLine) {
              printer.print_newline(false);
            }
          }
          if (parser_token.tag_name === "!--" && last_token.type === TOKEN.TAG_CLOSE && last_tag_token.is_end_tag && parser_token.text.indexOf("\n") === -1) {
          } else {
            if (!(parser_token.is_inline_element || parser_token.is_unformatted)) {
              printer.print_newline(false);
            }
            this._calcluate_parent_multiline(printer, parser_token);
          }
        } else if (parser_token.is_end_tag) {
          var do_end_expand = false;
          do_end_expand = parser_token.start_tag_token && parser_token.start_tag_token.multiline_content;
          do_end_expand = do_end_expand || !parser_token.is_inline_element && !(last_tag_token.is_inline_element || last_tag_token.is_unformatted) && !(last_token.type === TOKEN.TAG_CLOSE && parser_token.start_tag_token === last_tag_token) && last_token.type !== "TK_CONTENT";
          if (parser_token.is_content_unformatted || parser_token.is_unformatted) {
            do_end_expand = false;
          }
          if (do_end_expand) {
            printer.print_newline(false);
          }
        } else {
          parser_token.indent_content = !parser_token.custom_beautifier_name;
          if (parser_token.tag_start_char === "<") {
            if (parser_token.tag_name === "html") {
              parser_token.indent_content = this._options.indent_inner_html;
            } else if (parser_token.tag_name === "head") {
              parser_token.indent_content = this._options.indent_head_inner_html;
            } else if (parser_token.tag_name === "body") {
              parser_token.indent_content = this._options.indent_body_inner_html;
            }
          }
          if (!(parser_token.is_inline_element || parser_token.is_unformatted) && (last_token.type !== "TK_CONTENT" || parser_token.is_content_unformatted)) {
            printer.print_newline(false);
          }
          this._calcluate_parent_multiline(printer, parser_token);
        }
      };
      Beautifier.prototype._calcluate_parent_multiline = function(printer, parser_token) {
        if (parser_token.parent && printer._output.just_added_newline() && !((parser_token.is_inline_element || parser_token.is_unformatted) && parser_token.parent.is_inline_element)) {
          parser_token.parent.multiline_content = true;
        }
      };
      var p_closers = ["address", "article", "aside", "blockquote", "details", "div", "dl", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "main", "menu", "nav", "ol", "p", "pre", "section", "table", "ul"];
      var p_parent_excludes = ["a", "audio", "del", "ins", "map", "noscript", "video"];
      Beautifier.prototype._do_optional_end_element = function(parser_token) {
        var result = null;
        if (parser_token.is_empty_element || !parser_token.is_start_tag || !parser_token.parent) {
          return;
        }
        if (parser_token.tag_name === "body") {
          result = result || this._tag_stack.try_pop("head");
        } else if (parser_token.tag_name === "li") {
          result = result || this._tag_stack.try_pop("li", ["ol", "ul", "menu"]);
        } else if (parser_token.tag_name === "dd" || parser_token.tag_name === "dt") {
          result = result || this._tag_stack.try_pop("dt", ["dl"]);
          result = result || this._tag_stack.try_pop("dd", ["dl"]);
        } else if (parser_token.parent.tag_name === "p" && p_closers.indexOf(parser_token.tag_name) !== -1) {
          var p_parent = parser_token.parent.parent;
          if (!p_parent || p_parent_excludes.indexOf(p_parent.tag_name) === -1) {
            result = result || this._tag_stack.try_pop("p");
          }
        } else if (parser_token.tag_name === "rp" || parser_token.tag_name === "rt") {
          result = result || this._tag_stack.try_pop("rt", ["ruby", "rtc"]);
          result = result || this._tag_stack.try_pop("rp", ["ruby", "rtc"]);
        } else if (parser_token.tag_name === "optgroup") {
          result = result || this._tag_stack.try_pop("optgroup", ["select"]);
        } else if (parser_token.tag_name === "option") {
          result = result || this._tag_stack.try_pop("option", ["select", "datalist", "optgroup"]);
        } else if (parser_token.tag_name === "colgroup") {
          result = result || this._tag_stack.try_pop("caption", ["table"]);
        } else if (parser_token.tag_name === "thead") {
          result = result || this._tag_stack.try_pop("caption", ["table"]);
          result = result || this._tag_stack.try_pop("colgroup", ["table"]);
        } else if (parser_token.tag_name === "tbody" || parser_token.tag_name === "tfoot") {
          result = result || this._tag_stack.try_pop("caption", ["table"]);
          result = result || this._tag_stack.try_pop("colgroup", ["table"]);
          result = result || this._tag_stack.try_pop("thead", ["table"]);
          result = result || this._tag_stack.try_pop("tbody", ["table"]);
        } else if (parser_token.tag_name === "tr") {
          result = result || this._tag_stack.try_pop("caption", ["table"]);
          result = result || this._tag_stack.try_pop("colgroup", ["table"]);
          result = result || this._tag_stack.try_pop("tr", ["table", "thead", "tbody", "tfoot"]);
        } else if (parser_token.tag_name === "th" || parser_token.tag_name === "td") {
          result = result || this._tag_stack.try_pop("td", ["table", "thead", "tbody", "tfoot", "tr"]);
          result = result || this._tag_stack.try_pop("th", ["table", "thead", "tbody", "tfoot", "tr"]);
        }
        parser_token.parent = this._tag_stack.get_parser_token();
        return result;
      };
      module.exports.Beautifier = Beautifier;
    }
  });

  // node_modules/js-beautify/js/src/html/index.js
  var require_html = __commonJS({
    "node_modules/js-beautify/js/src/html/index.js"(exports, module) {
      "use strict";
      var Beautifier = require_beautifier3().Beautifier;
      var Options = require_options4().Options;
      function style_html(html_source, options, js_beautify2, css_beautify) {
        var beautifier = new Beautifier(html_source, options, js_beautify2, css_beautify);
        return beautifier.beautify();
      }
      module.exports = style_html;
      module.exports.defaultOptions = function() {
        return new Options();
      };
    }
  });

  // node_modules/js-beautify/js/src/index.js
  var require_src = __commonJS({
    "node_modules/js-beautify/js/src/index.js"(exports, module) {
      "use strict";
      var js_beautify2 = require_javascript();
      var css_beautify = require_css();
      var html_beautify = require_html();
      function style_html(html_source, options, js, css) {
        js = js || js_beautify2;
        css = css || css_beautify;
        return html_beautify(html_source, options, js, css);
      }
      style_html.defaultOptions = html_beautify.defaultOptions;
      module.exports.js = js_beautify2;
      module.exports.css = css_beautify;
      module.exports.html = style_html;
    }
  });

  // node_modules/js-beautify/js/index.js
  var require_js = __commonJS({
    "node_modules/js-beautify/js/index.js"(exports, module) {
      "use strict";
      function get_beautify(js_beautify2, css_beautify, html_beautify) {
        var beautify = function(src, config) {
          return js_beautify2.js_beautify(src, config);
        };
        beautify.js = js_beautify2.js_beautify;
        beautify.css = css_beautify.css_beautify;
        beautify.html = html_beautify.html_beautify;
        beautify.js_beautify = js_beautify2.js_beautify;
        beautify.css_beautify = css_beautify.css_beautify;
        beautify.html_beautify = html_beautify.html_beautify;
        return beautify;
      }
      if (typeof define === "function" && define.amd) {
        define([
          "./lib/beautify",
          "./lib/beautify-css",
          "./lib/beautify-html"
        ], function(js_beautify2, css_beautify, html_beautify) {
          return get_beautify(js_beautify2, css_beautify, html_beautify);
        });
      } else {
        (function(mod) {
          var beautifier = require_src();
          beautifier.js_beautify = beautifier.js;
          beautifier.css_beautify = beautifier.css;
          beautifier.html_beautify = beautifier.html;
          mod.exports = get_beautify(beautifier, beautifier, beautifier);
        })(module);
      }
    }
  });

  // src/panel/utils/code-processor.js
  function fallbackToJsBeautify(html) {
    try {
      return import_js_beautify.js_beautify.html(html, JS_BEAUTIFY_CONFIG);
    } catch (e) {
      console.warn("[EDS Inspector] js-beautify fallback failed:", e);
      return html;
    }
  }
  function safeIndentHtml(html) {
    if (!html || typeof html !== "string") return html;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const errorNode = doc.querySelector("parsererror");
      if (errorNode) {
        return fallbackToJsBeautify(html);
      }
      const body = doc.body;
      if (body && body.firstElementChild) {
        const formatted = formatElementRecursive(body.firstElementChild, 0, 2);
        if (formatted && formatted.trim()) {
          return formatted;
        }
      }
      return fallbackToJsBeautify(html);
    } catch (e) {
      console.warn("[EDS Inspector] HTML formatting error:", e);
      return fallbackToJsBeautify(html);
    }
  }
  function formatElementRecursive(element, indent, indentSize) {
    if (!element) return "";
    const indentStr = " ".repeat(indent);
    const tagName = element.tagName.toLowerCase();
    const attrs = Array.from(element.attributes).map((attr) => ` ${attr.name}="${attr.value}"`).join("");
    const children = Array.from(element.childNodes);
    const elementChildren = children.filter((child) => child.nodeType === Node.ELEMENT_NODE);
    const textChildren = children.filter((child) => child.nodeType === Node.TEXT_NODE);
    if (children.length === 0) {
      return `${indentStr}<${tagName}${attrs} />`;
    }
    if (elementChildren.length === 0) {
      const text = textChildren.map((child) => child.textContent).join("").trim();
      if (text) {
        return `${indentStr}<${tagName}${attrs}>${text}</${tagName}>`;
      } else {
        return `${indentStr}<${tagName}${attrs} />`;
      }
    }
    let result = `${indentStr}<${tagName}${attrs}>
`;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.nodeType === Node.ELEMENT_NODE) {
        const formatted = formatElementRecursive(child, indent + indentSize, indentSize);
        if (formatted) {
          result += formatted + "\n";
        }
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (text) {
          result += " ".repeat(indent + indentSize) + text + "\n";
        }
      }
    }
    result += `${indentStr}</${tagName}>`;
    return result;
  }
  function detectFileType(type, path) {
    let lang = type ? type.toLowerCase() : "";
    const ext = path ? path.split(".").pop().toLowerCase() : "";
    if (!lang || lang === "file") {
      if (ext === "html" || ext === "htm") lang = "html";
      else if (ext === "css") lang = "css";
      else if (ext === "js" || ext === "mjs") lang = "javascript";
      else if (ext === "json") lang = "json";
      else if (ext === "xml") lang = "xml";
      else lang = "text";
    }
    return lang;
  }
  function processCode(content, type, path) {
    if (!content || content === "(empty file)") {
      return escapeHtml(content);
    }
    const lang = detectFileType(type, path);
    if (lang === "html") {
      content = safeIndentHtml(content);
    }
    return highlightCode(content, lang);
  }
  var import_js_beautify, JS_BEAUTIFY_CONFIG;
  var init_code_processor = __esm({
    "src/panel/utils/code-processor.js"() {
      init_utils();
      import_js_beautify = __toESM(require_js());
      JS_BEAUTIFY_CONFIG = {
        indent_size: 2,
        wrap_line_length: 200,
        wrap_attributes: "auto",
        indent_inner_html: true
      };
    }
  });

  // src/panel/renderers/docs.js
  function renderDocsContent(container, content, mode, tabId) {
    container.innerHTML = "";
    const contentText = typeof content === "object" ? content.documents || content : content;
    renderSingleDoc(container, contentText, mode, tabId);
  }
  function renderSingleDoc(container, content, mode, tabId, isNested = false) {
    if (!isNested) {
      const existing = container.querySelector(".eds-docs-content");
      if (existing) existing.remove();
    }
    const contentArea = document.createElement("div");
    contentArea.className = "eds-docs-content";
    contentArea.style.cssText = "padding: 0; background: var(--bg); max-height: 100vh; overflow-y: auto; position: relative;";
    const headerBar = document.createElement("div");
    headerBar.style.cssText = "padding: 8px 12px; background: var(--bg-muted); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: flex-end;";
    const fullscreenBtn = document.createElement("button");
    fullscreenBtn.innerHTML = "\u26F6";
    fullscreenBtn.title = "Fullscreen view";
    fullscreenBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; opacity: 0.7;";
    fullscreenBtn.addEventListener("mouseenter", () => {
      fullscreenBtn.style.opacity = "1";
      fullscreenBtn.style.background = "var(--bg)";
    });
    fullscreenBtn.addEventListener("mouseleave", () => {
      fullscreenBtn.style.opacity = "0.7";
      fullscreenBtn.style.background = "transparent";
    });
    fullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const fileType = mode === "markdown" ? "markdown" : "html";
      const processedCode = processCode(content, fileType, mode === "markdown" ? "Markdown" : "Markup");
      const searchKey2 = `docs-${mode}-fullscreen-${Date.now()}`;
      createFullscreenViewer(content, processedCode, mode === "markdown" ? "Markdown" : "Markup", searchKey2);
    });
    headerBar.appendChild(fullscreenBtn);
    const searchKey = `docs-${mode}-${Date.now()}`;
    const searchUI = createSearchUI(contentArea, content, searchKey);
    const codeContainer = document.createElement("div");
    codeContainer.style.cssText = "padding: 16px;";
    const sourcePre = document.createElement("pre");
    sourcePre.className = "eds-code";
    sourcePre.style.cssText = "background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;";
    const sourceCode = document.createElement("code");
    if (mode === "markdown") {
      sourceCode.textContent = content;
    } else {
      sourceCode.innerHTML = highlightCode(content, "html");
    }
    sourceCode.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
    sourcePre.appendChild(sourceCode);
    codeContainer.appendChild(sourcePre);
    contentArea.appendChild(searchUI);
    contentArea.appendChild(codeContainer);
    container.appendChild(headerBar);
    container.appendChild(contentArea);
  }
  function createModeToggle(root, tabId) {
    const toggleContainer = document.createElement("div");
    toggleContainer.style.cssText = "display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-muted); border-bottom: 1px solid var(--border);";
    const label = document.createElement("span");
    label.textContent = "View:";
    label.style.cssText = "font-size: 12px; color: var(--text-muted); font-weight: 500;";
    const switchContainer = document.createElement("div");
    switchContainer.style.cssText = "position: relative; display: inline-flex; align-items: center; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 2px; cursor: pointer; transition: all 0.2s ease;";
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.cssText = "position: relative; display: flex; z-index: 1;";
    const markupBtn = document.createElement("button");
    markupBtn.textContent = "Markup";
    markupBtn.className = "eds-mode-toggle-btn";
    markupBtn.style.cssText = "padding: 6px 16px; border: none; background: transparent; color: var(--text); cursor: pointer; font-size: 12px; font-weight: 500; transition: color 0.2s ease; border-radius: 6px; position: relative; z-index: 2; white-space: nowrap;";
    const markdownBtn = document.createElement("button");
    markdownBtn.textContent = "Markdown";
    markdownBtn.className = "eds-mode-toggle-btn";
    markdownBtn.style.cssText = "padding: 6px 16px; border: none; background: transparent; color: var(--text); cursor: pointer; font-size: 12px; font-weight: 500; transition: color 0.2s ease; border-radius: 6px; position: relative; z-index: 2; white-space: nowrap;";
    const slider = document.createElement("div");
    slider.style.cssText = "position: absolute; top: 2px; left: 2px; height: calc(100% - 4px); background: #6366f1; border-radius: 6px; transition: all 0.2s ease; z-index: 0;";
    const updateSwitch = () => {
      const markupWidth = markupBtn.offsetWidth;
      const markdownWidth = markdownBtn.offsetWidth;
      if (currentMode === "markup") {
        slider.style.width = `${markupWidth}px`;
        slider.style.transform = "translateX(0)";
        markupBtn.style.color = "white";
        markdownBtn.style.color = "var(--text)";
      } else {
        slider.style.width = `${markdownWidth}px`;
        slider.style.transform = `translateX(${markupWidth}px)`;
        markupBtn.style.color = "var(--text)";
        markdownBtn.style.color = "white";
      }
    };
    setTimeout(() => {
      updateSwitch();
    }, 0);
    markupBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (currentMode === "markup") return;
      currentMode = "markup";
      updateSwitch();
      await renderDocs(tabId);
    });
    markdownBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (currentMode === "markdown") return;
      currentMode = "markdown";
      updateSwitch();
      await renderDocs(tabId);
    });
    switchContainer.addEventListener("click", async (e) => {
      if (e.target === markdownBtn || e.target === markupBtn) return;
      currentMode = currentMode === "markdown" ? "markup" : "markdown";
      updateSwitch();
      await renderDocs(tabId);
    });
    buttonsContainer.appendChild(markupBtn);
    buttonsContainer.appendChild(markdownBtn);
    switchContainer.appendChild(slider);
    switchContainer.appendChild(buttonsContainer);
    setTimeout(() => {
      updateSwitch();
    }, 0);
    let resizeTimeout;
    const resizeHandler = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateSwitch();
      }, 100);
    };
    window.addEventListener("resize", resizeHandler);
    toggleContainer.appendChild(label);
    toggleContainer.appendChild(switchContainer);
    return toggleContainer;
  }
  function createDocTabs(root, tabId, allDocs, mainUrl) {
    const existing = root.querySelector(".eds-doc-tabs-container");
    if (existing) {
      existing.remove();
    }
    if (!currentSelectedDocUrl) {
      currentSelectedDocUrl = mainUrl;
    }
    const docTabsContainer = document.createElement("div");
    docTabsContainer.className = "eds-doc-tabs-container";
    docTabsContainer.style.cssText = "display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--border); background: var(--bg-muted); overflow-x: auto;";
    allDocs.forEach((doc) => {
      const tab = document.createElement("button");
      tab.style.cssText = "padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;";
      try {
        const urlObj = new URL(doc.url);
        let pathname = urlObj.pathname;
        if (pathname === "/" || pathname === "") {
          pathname = "/";
        }
        const displayName = doc.isMain ? `Main: ${pathname}` : pathname;
        tab.textContent = displayName;
      } catch (e) {
        tab.textContent = doc.url;
      }
      if (doc.url === currentSelectedDocUrl) {
        tab.style.cssText = "padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: #6366f1; color: white; cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;";
      }
      tab.addEventListener("click", async () => {
        currentSelectedDocUrl = doc.url;
        docTabsContainer.querySelectorAll("button").forEach((btn) => {
          btn.style.cssText = "padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;";
        });
        tab.style.cssText = "padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: #6366f1; color: white; cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;";
        await loadAndRenderDoc(doc.url, tabId);
      });
      docTabsContainer.appendChild(tab);
    });
    const toggleContainer = root.querySelector(".eds-mode-toggle-container");
    if (toggleContainer && toggleContainer.nextSibling) {
      root.insertBefore(docTabsContainer, toggleContainer.nextSibling);
    } else {
      root.appendChild(docTabsContainer);
    }
    return docTabsContainer;
  }
  async function loadAndRenderDoc(url, tabId) {
    const root = document.querySelector('[data-tab-panel="docs"]');
    let contentArea = root.querySelector(".eds-docs-content-area");
    if (!contentArea) {
      contentArea = document.createElement("div");
      contentArea.className = "eds-docs-content-area";
      root.appendChild(contentArea);
    }
    contentArea.innerHTML = '<p class="eds-loading">Loading documentation\u2026</p>';
    try {
      let content;
      if (currentMode === "markdown") {
        const markdownUrl = getMarkdownUrl(url);
        if (!markdownUrl) {
          contentArea.innerHTML = '<p class="eds-empty">Could not construct markdown URL.</p>';
          return;
        }
        const now = Date.now();
        const cacheAge = markdownCache.timestamp ? now - markdownCache.timestamp : Infinity;
        const useCache = markdownCache.url === markdownUrl && cacheAge < 5 * 60 * 1e3;
        if (useCache && markdownCache.content) {
          content = markdownCache.content;
          console.log("[EDS Inspector Panel] Using cached markdown");
        } else {
          const response = await fetch(markdownUrl);
          if (!response.ok) {
            if (response.status === 404) {
              contentArea.innerHTML = `<p class="eds-empty">Markdown file not found at:<br><code style="word-break: break-all; background: var(--bg-muted); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">${markdownUrl}</code></p>`;
            } else {
              contentArea.innerHTML = `<p class="eds-empty">Failed to load markdown: ${response.status} ${response.statusText}</p>`;
            }
            return;
          }
          content = await response.text();
          markdownCache = {
            url: markdownUrl,
            content,
            timestamp: now
          };
        }
      } else {
        const html = await sendToContent(tabId, "get-fetched-html-content", { url });
        if (html) {
          content = html;
        } else {
          const response = await fetch(url);
          if (!response.ok) {
            contentArea.innerHTML = `<p class="eds-empty">Failed to load markup: ${response.status} ${response.statusText}</p>`;
            return;
          }
          content = await response.text();
        }
      }
      renderDocsContent(contentArea, content, currentMode, tabId);
    } catch (err) {
      console.error("[EDS Inspector Panel] Error loading doc:", err);
      contentArea.innerHTML = `<p class="eds-empty">Error loading documentation: ${err.message}</p>`;
    }
  }
  async function renderDocs(tabId) {
    const root = document.querySelector('[data-tab-panel="docs"]');
    let toggleContainer = root.querySelector(".eds-mode-toggle-container");
    if (!toggleContainer) {
      toggleContainer = createModeToggle(root, tabId);
      toggleContainer.className = "eds-mode-toggle-container";
      root.innerHTML = "";
      root.appendChild(toggleContainer);
    }
    const fetchedDocs = await sendToContent(tabId, "get-fetched-html-documents");
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      const contentArea2 = root.querySelector(".eds-docs-content-area") || document.createElement("div");
      contentArea2.className = "eds-docs-content-area";
      if (!root.querySelector(".eds-docs-content-area")) {
        root.appendChild(contentArea2);
      }
      contentArea2.innerHTML = '<p class="eds-empty">Could not determine current page URL.</p>';
      return;
    }
    const mainUrl = tab.url.split("?")[0];
    if (fetchedDocs && fetchedDocs.length > 0) {
      const allDocs = [
        { url: mainUrl, isMain: true },
        ...fetchedDocs.map((doc) => ({ url: doc.url, isMain: false }))
      ];
      createDocTabs(root, tabId, allDocs, mainUrl);
    } else {
      const existing = root.querySelector(".eds-doc-tabs-container");
      if (existing) {
        existing.remove();
      }
    }
    let contentArea = root.querySelector(".eds-docs-content-area");
    if (!contentArea) {
      contentArea = document.createElement("div");
      contentArea.className = "eds-docs-content-area";
      root.appendChild(contentArea);
    }
    const selectedUrl = currentSelectedDocUrl || mainUrl;
    await loadAndRenderDoc(selectedUrl, tabId);
  }
  var markdownCache, currentMode, currentSelectedDocUrl;
  var init_docs = __esm({
    "src/panel/renderers/docs.js"() {
      init_url();
      init_file_utils();
      init_utils();
      init_code_processor();
      markdownCache = {
        url: null,
        content: null,
        timestamp: null
      };
      currentMode = "markup";
      currentSelectedDocUrl = null;
    }
  });

  // src/panel/renderers/control.js
  function renderControl(state, refresh, tabId) {
    const root = document.querySelector('[data-tab-panel="control"]');
    root.innerHTML = "";
    const overlayControls = document.createElement("div");
    overlayControls.className = "overlay-controls";
    const allItem = document.createElement("div");
    allItem.className = "control-item control-item--all";
    const allLabel = document.createElement("label");
    allLabel.className = "control-label";
    const allCheckbox = document.createElement("input");
    allCheckbox.type = "checkbox";
    allCheckbox.id = "control-toggle-all";
    allCheckbox.className = "control-checkbox control-checkbox--all";
    const allEnabled = state.overlaysEnabled?.sections && state.overlaysEnabled?.blocks && state.overlaysEnabled?.defaultContent;
    allCheckbox.checked = allEnabled ?? true;
    allCheckbox.addEventListener("change", async (evt) => {
      const enabled = evt.target.checked;
      try {
        await Promise.all([
          sendToContent(tabId, "toggle-overlay", { key: "sections", value: enabled }),
          sendToContent(tabId, "toggle-overlay", { key: "blocks", value: enabled }),
          sendToContent(tabId, "toggle-overlay", { key: "defaultContent", value: enabled })
        ]);
        const sectionsCheckbox2 = document.getElementById("control-toggle-sections");
        const blocksCheckbox2 = document.getElementById("control-toggle-blocks");
        const defaultCheckbox2 = document.getElementById("control-toggle-default");
        if (sectionsCheckbox2) sectionsCheckbox2.checked = enabled;
        if (blocksCheckbox2) blocksCheckbox2.checked = enabled;
        if (defaultCheckbox2) defaultCheckbox2.checked = enabled;
        const state2 = await sendToContent(tabId, "state");
        if (state2 && state2.overlaysEnabled) {
          chrome.storage.local.set({
            "eds-overlays-enabled": state2.overlaysEnabled
          }).catch((err) => {
            console.error("[EDS Inspector Panel] Failed to save overlay state:", err);
          });
        }
      } finally {
        refresh();
      }
    });
    const allText = document.createElement("span");
    allText.className = "control-text control-text--all";
    allText.textContent = "Show All Overlays";
    allLabel.appendChild(allCheckbox);
    allLabel.appendChild(allText);
    allItem.appendChild(allLabel);
    overlayControls.appendChild(allItem);
    const divider = document.createElement("div");
    divider.className = "control-divider";
    overlayControls.appendChild(divider);
    const sectionsItem = document.createElement("div");
    sectionsItem.className = "control-item";
    const sectionsLabel = document.createElement("label");
    sectionsLabel.className = "control-label";
    const sectionsCheckbox = document.createElement("input");
    sectionsCheckbox.type = "checkbox";
    sectionsCheckbox.id = "control-toggle-sections";
    sectionsCheckbox.className = "control-checkbox";
    sectionsCheckbox.checked = state.overlaysEnabled?.sections ?? true;
    sectionsCheckbox.addEventListener("change", async (evt) => {
      try {
        await sendToContent(tabId, "toggle-overlay", { key: "sections", value: evt.target.checked });
        updateToggleAllState();
        const state2 = await sendToContent(tabId, "state");
        if (state2 && state2.overlaysEnabled) {
          chrome.storage.local.set({
            "eds-overlays-enabled": state2.overlaysEnabled
          }).catch((err) => {
            console.error("[EDS Inspector Panel] Failed to save overlay state:", err);
          });
        }
      } finally {
        refresh();
      }
    });
    const sectionsText = document.createElement("span");
    sectionsText.className = "control-text";
    sectionsText.textContent = "Sections";
    sectionsLabel.appendChild(sectionsCheckbox);
    sectionsLabel.appendChild(sectionsText);
    sectionsItem.appendChild(sectionsLabel);
    overlayControls.appendChild(sectionsItem);
    const blocksItem = document.createElement("div");
    blocksItem.className = "control-item";
    const blocksLabel = document.createElement("label");
    blocksLabel.className = "control-label";
    const blocksCheckbox = document.createElement("input");
    blocksCheckbox.type = "checkbox";
    blocksCheckbox.id = "control-toggle-blocks";
    blocksCheckbox.className = "control-checkbox";
    blocksCheckbox.checked = state.overlaysEnabled?.blocks ?? true;
    blocksCheckbox.addEventListener("change", async (evt) => {
      try {
        await sendToContent(tabId, "toggle-overlay", { key: "blocks", value: evt.target.checked });
        updateToggleAllState();
        const state2 = await sendToContent(tabId, "state");
        if (state2 && state2.overlaysEnabled) {
          chrome.storage.local.set({
            "eds-overlays-enabled": state2.overlaysEnabled
          }).catch((err) => {
            console.error("[EDS Inspector Panel] Failed to save overlay state:", err);
          });
        }
      } finally {
        refresh();
      }
    });
    const blocksText = document.createElement("span");
    blocksText.className = "control-text";
    blocksText.textContent = "Blocks";
    blocksLabel.appendChild(blocksCheckbox);
    blocksLabel.appendChild(blocksText);
    blocksItem.appendChild(blocksLabel);
    overlayControls.appendChild(blocksItem);
    const defaultItem = document.createElement("div");
    defaultItem.className = "control-item";
    const defaultLabel = document.createElement("label");
    defaultLabel.className = "control-label";
    const defaultCheckbox = document.createElement("input");
    defaultCheckbox.type = "checkbox";
    defaultCheckbox.id = "control-toggle-default";
    defaultCheckbox.className = "control-checkbox";
    defaultCheckbox.checked = state.overlaysEnabled?.defaultContent ?? true;
    defaultCheckbox.addEventListener("change", async (evt) => {
      try {
        await sendToContent(tabId, "toggle-overlay", { key: "defaultContent", value: evt.target.checked });
        updateToggleAllState();
        const state2 = await sendToContent(tabId, "state");
        if (state2 && state2.overlaysEnabled) {
          chrome.storage.local.set({
            "eds-overlays-enabled": state2.overlaysEnabled
          }).catch((err) => {
            console.error("[EDS Inspector Panel] Failed to save overlay state:", err);
          });
        }
      } finally {
        refresh();
      }
    });
    function updateToggleAllState() {
      const sectionsCheckbox2 = document.getElementById("control-toggle-sections");
      const blocksCheckbox2 = document.getElementById("control-toggle-blocks");
      const defaultCheckbox2 = document.getElementById("control-toggle-default");
      if (sectionsCheckbox2 && blocksCheckbox2 && defaultCheckbox2 && allCheckbox) {
        allCheckbox.checked = sectionsCheckbox2.checked && blocksCheckbox2.checked && defaultCheckbox2.checked;
      }
    }
    const defaultText = document.createElement("span");
    defaultText.className = "control-text";
    defaultText.textContent = "Default Content";
    defaultLabel.appendChild(defaultCheckbox);
    defaultLabel.appendChild(defaultText);
    defaultItem.appendChild(defaultLabel);
    overlayControls.appendChild(defaultItem);
    root.appendChild(overlayControls);
    const reloadButton = document.createElement("button");
    reloadButton.className = "eds-button eds-button--primary";
    reloadButton.textContent = "Reload";
    reloadButton.style.cssText = "width: 100%; margin-top: 16px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--accent); color: #0b1220; cursor: pointer; font-weight: 600; font-size: 12px;";
    reloadButton.addEventListener("click", async () => {
      reloadButton.disabled = true;
      reloadButton.textContent = "Reloading...";
      try {
        await sendToContent(tabId, "scroll-page-for-lazy-load");
        await sendToContent(tabId, "reanalyze");
        await refresh();
      } catch (err) {
        console.error("[EDS Inspector Panel] Error reloading:", err);
      } finally {
        reloadButton.disabled = false;
        reloadButton.textContent = "Reload";
      }
    });
    root.appendChild(reloadButton);
  }
  var init_control = __esm({
    "src/panel/renderers/control.js"() {
      init_utils();
    }
  });

  // src/panel/renderers/block-detail.js
  async function renderBlockDetailWithExpandedPaths(state, detail, refresh, tabId, preservedExpandedPaths) {
    const root = document.querySelector('[data-tab-panel="blocks"]');
    if (!detail || !detail.block) {
      return;
    }
    const scrollContainer = root.closest("main") || root.parentElement;
    const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    const expandedPaths = preservedExpandedPaths || /* @__PURE__ */ new Set();
    const backButton = document.createElement("button");
    backButton.className = "eds-back-button";
    backButton.textContent = "\u2190 Back to Blocks List";
    backButton.addEventListener("click", async () => {
      await sendToContent(tabId, "select-block", { id: null });
      if (refresh) {
        refresh();
      }
    });
    root.innerHTML = "";
    root.appendChild(backButton);
    const blockNameHeader = document.createElement("div");
    blockNameHeader.className = "eds-block-name-header";
    blockNameHeader.textContent = detail.block.name;
    blockNameHeader.style.cssText = "font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border);";
    root.appendChild(blockNameHeader);
    const blocksWithSameName = await sendToContent(tabId, "get-blocks-by-name", { name: detail.block.name });
    const currentBlockIndex = blocksWithSameName.findIndex((b) => b.id === detail.block.id);
    const hasMultipleBlocks = blocksWithSameName.length > 1;
    const markupSection = document.createElement("div");
    markupSection.className = "eds-markup-section";
    markupSection.style.cssText = "margin-bottom: 24px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;";
    const markupHeader = document.createElement("div");
    markupHeader.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-muted); cursor: pointer;";
    const markupTitleWrapper = document.createElement("div");
    markupTitleWrapper.style.cssText = "display: flex; align-items: center; gap: 12px;";
    const markupTitle = document.createElement("div");
    markupTitle.textContent = "Markup";
    markupTitle.style.cssText = "font-weight: 600; color: var(--text); font-size: 14px;";
    if (hasMultipleBlocks) {
      const instanceNav = document.createElement("div");
      instanceNav.style.cssText = "display: flex; align-items: center; gap: 4px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 2px;";
      const prevBtn = document.createElement("button");
      prevBtn.innerHTML = "\u25C0";
      prevBtn.disabled = currentBlockIndex === 0;
      prevBtn.style.cssText = "background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s; display: flex; align-items: center; justify-content: center;";
      prevBtn.disabled && (prevBtn.style.opacity = "0.5");
      prevBtn.disabled && (prevBtn.style.cursor = "not-allowed");
      prevBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (currentBlockIndex > 0 && !prevBtn.disabled) {
          const currentExpandedPaths = /* @__PURE__ */ new Set();
          const markupContent2 = root.querySelector(".eds-markup-content");
          if (markupContent2 && markupContent2.style.display !== "none") {
            currentExpandedPaths.add("markup-section");
          }
          const prevBlock = blocksWithSameName[currentBlockIndex - 1];
          await sendToContent(tabId, "select-block", { id: prevBlock.id });
          await sendToContent(tabId, "scroll-to-block", { id: prevBlock.id });
          await sendToContent(tabId, "highlight", { id: prevBlock.id });
          const prevDetail = await sendToContent(tabId, "get-block-detail", { id: prevBlock.id });
          await renderBlockDetailWithExpandedPaths(state, prevDetail, refresh, tabId, currentExpandedPaths);
        }
      });
      const navInfo = document.createElement("span");
      navInfo.textContent = `${currentBlockIndex + 1} / ${blocksWithSameName.length}`;
      navInfo.style.cssText = "font-size: 12px; color: var(--text); padding: 0 8px; min-width: 50px; text-align: center; font-weight: 500;";
      const nextBtn = document.createElement("button");
      nextBtn.innerHTML = "\u25B6";
      nextBtn.disabled = currentBlockIndex === blocksWithSameName.length - 1;
      nextBtn.style.cssText = "background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s; display: flex; align-items: center; justify-content: center;";
      nextBtn.disabled && (nextBtn.style.opacity = "0.5");
      nextBtn.disabled && (nextBtn.style.cursor = "not-allowed");
      nextBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (currentBlockIndex < blocksWithSameName.length - 1 && !nextBtn.disabled) {
          const currentExpandedPaths = /* @__PURE__ */ new Set();
          const markupContent2 = root.querySelector(".eds-markup-content");
          if (markupContent2 && markupContent2.style.display !== "none") {
            currentExpandedPaths.add("markup-section");
          }
          const nextBlock = blocksWithSameName[currentBlockIndex + 1];
          await sendToContent(tabId, "select-block", { id: nextBlock.id });
          await sendToContent(tabId, "scroll-to-block", { id: nextBlock.id });
          await sendToContent(tabId, "highlight", { id: nextBlock.id });
          const nextDetail = await sendToContent(tabId, "get-block-detail", { id: nextBlock.id });
          await renderBlockDetailWithExpandedPaths(state, nextDetail, refresh, tabId, currentExpandedPaths);
        }
      });
      instanceNav.appendChild(prevBtn);
      instanceNav.appendChild(navInfo);
      instanceNav.appendChild(nextBtn);
      markupTitleWrapper.appendChild(markupTitle);
      markupTitleWrapper.appendChild(instanceNav);
    } else {
      markupTitleWrapper.appendChild(markupTitle);
    }
    const markupToggle = document.createElement("span");
    markupToggle.className = "eds-markup-toggle";
    markupToggle.textContent = "\u25BC";
    markupToggle.style.cssText = "font-size: 10px; color: var(--muted); transition: transform 0.2s;";
    markupHeader.appendChild(markupTitleWrapper);
    markupHeader.appendChild(markupToggle);
    const markupContent = document.createElement("div");
    markupContent.className = "eds-markup-content";
    markupContent.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; background: var(--bg);";
    const ssrMarkupContent = detail.ssrMarkup || null;
    const ssrContainer = document.createElement("div");
    ssrContainer.style.cssText = "border: 1px solid var(--border); border-radius: 8px; overflow: hidden;";
    const ssrHeader = document.createElement("div");
    ssrHeader.style.cssText = "padding: 8px 12px; background: var(--bg-muted); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;";
    const ssrHeaderLeft = document.createElement("div");
    const ssrTitle = document.createElement("div");
    ssrTitle.textContent = "Markup (SSR)";
    ssrTitle.style.cssText = "font-weight: 600; color: var(--text); font-size: 12px; margin-bottom: 4px;";
    const ssrDocInfo = document.createElement("div");
    if (detail.block.sourceDocumentUrl) {
      try {
        const urlObj = new URL(detail.block.sourceDocumentUrl);
        const isMain = detail.block.sourceDocumentUrl === window.location.href.split("?")[0];
        ssrDocInfo.textContent = `Source: ${urlObj.pathname}${isMain ? " (Main)" : ""}`;
      } catch (e) {
        ssrDocInfo.textContent = `Source: ${detail.block.sourceDocumentUrl}`;
      }
    } else {
      ssrDocInfo.textContent = "Source: Unknown";
    }
    ssrDocInfo.style.cssText = "font-size: 10px; color: var(--text-muted);";
    ssrHeaderLeft.appendChild(ssrTitle);
    ssrHeaderLeft.appendChild(ssrDocInfo);
    const ssrFullscreenBtn = document.createElement("button");
    ssrFullscreenBtn.innerHTML = "\u26F6";
    ssrFullscreenBtn.title = "Fullscreen view";
    ssrFullscreenBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; flex-shrink: 0; opacity: 0.7;";
    ssrFullscreenBtn.addEventListener("mouseenter", () => {
      ssrFullscreenBtn.style.opacity = "1";
      ssrFullscreenBtn.style.background = "var(--bg)";
    });
    ssrFullscreenBtn.addEventListener("mouseleave", () => {
      ssrFullscreenBtn.style.opacity = "0.7";
      ssrFullscreenBtn.style.background = "transparent";
    });
    ssrFullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (ssrMarkupContent) {
        const processedCode = processCode(ssrMarkupContent, "html", "Markup (SSR)");
        createFullscreenViewer(ssrMarkupContent, processedCode, "Markup (SSR)", `markup-ssr-fullscreen-${detail.block.id}`);
      }
    });
    ssrHeader.appendChild(ssrHeaderLeft);
    ssrHeader.appendChild(ssrFullscreenBtn);
    const ssrCodeContainer = document.createElement("div");
    ssrCodeContainer.style.cssText = "position: relative;";
    if (ssrMarkupContent) {
      const searchKey = `markup-ssr-${detail.block.id}`;
      const searchUI = createSearchUI(ssrCodeContainer, ssrMarkupContent, searchKey);
      const codeWrapper = document.createElement("div");
      codeWrapper.style.cssText = "padding: 12px; max-height: 400px; overflow-y: auto;";
      const processedCode = processCode(ssrMarkupContent, "html", "Markup (SSR)");
      const pre = document.createElement("pre");
      pre.className = "eds-code";
      pre.style.cssText = "background: var(--bg-muted); border: 1px solid var(--border); border-radius: 4px; padding: 12px; overflow-x: auto; margin: 0;";
      const code = document.createElement("code");
      code.innerHTML = processedCode;
      code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 11px; line-height: 1.5; display: block;';
      pre.appendChild(code);
      codeWrapper.appendChild(pre);
      ssrCodeContainer.appendChild(searchUI);
      ssrCodeContainer.appendChild(codeWrapper);
    } else {
      ssrCodeContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; margin: 0; padding: 12px;">No SSR markup available</p>';
    }
    ssrContainer.appendChild(ssrHeader);
    ssrContainer.appendChild(ssrCodeContainer);
    const csrMarkupContent = detail.markup || "No markup captured for this block.";
    const csrContainer = document.createElement("div");
    csrContainer.style.cssText = "border: 1px solid var(--border); border-radius: 8px; overflow: hidden;";
    const csrHeader = document.createElement("div");
    csrHeader.style.cssText = "padding: 8px 12px; background: var(--bg-muted); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;";
    const csrHeaderLeft = document.createElement("div");
    const csrTitle = document.createElement("div");
    csrTitle.textContent = "Markup (CSR)";
    csrTitle.style.cssText = "font-weight: 600; color: var(--text); font-size: 12px; margin-bottom: 4px;";
    const csrSpacer = document.createElement("div");
    csrSpacer.style.cssText = "font-size: 10px; height: 14px;";
    csrHeaderLeft.appendChild(csrTitle);
    csrHeaderLeft.appendChild(csrSpacer);
    const csrFullscreenBtn = document.createElement("button");
    csrFullscreenBtn.innerHTML = "\u26F6";
    csrFullscreenBtn.title = "Fullscreen view";
    csrFullscreenBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; flex-shrink: 0; opacity: 0.7;";
    csrFullscreenBtn.addEventListener("mouseenter", () => {
      csrFullscreenBtn.style.opacity = "1";
      csrFullscreenBtn.style.background = "var(--bg)";
    });
    csrFullscreenBtn.addEventListener("mouseleave", () => {
      csrFullscreenBtn.style.opacity = "0.7";
      csrFullscreenBtn.style.background = "transparent";
    });
    csrFullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (csrMarkupContent && csrMarkupContent !== "No markup captured for this block.") {
        const processedCode = processCode(csrMarkupContent, "html", "Markup (CSR)");
        createFullscreenViewer(csrMarkupContent, processedCode, "Markup (CSR)", `markup-csr-fullscreen-${detail.block.id}`);
      }
    });
    csrHeader.appendChild(csrHeaderLeft);
    csrHeader.appendChild(csrFullscreenBtn);
    const csrCodeContainer = document.createElement("div");
    csrCodeContainer.style.cssText = "position: relative;";
    if (csrMarkupContent !== "No markup captured for this block.") {
      const searchKey = `markup-csr-${detail.block.id}`;
      const searchUI = createSearchUI(csrCodeContainer, csrMarkupContent, searchKey);
      const codeWrapper = document.createElement("div");
      codeWrapper.style.cssText = "padding: 12px; max-height: 400px; overflow-y: auto;";
      const processedCode = processCode(csrMarkupContent, "html", "Markup (CSR)");
      const pre = document.createElement("pre");
      pre.className = "eds-code";
      pre.style.cssText = "background: var(--bg-muted); border: 1px solid var(--border); border-radius: 4px; padding: 12px; overflow-x: auto; margin: 0;";
      const code = document.createElement("code");
      code.innerHTML = processedCode;
      code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 11px; line-height: 1.5; display: block;';
      pre.appendChild(code);
      codeWrapper.appendChild(pre);
      csrCodeContainer.appendChild(searchUI);
      csrCodeContainer.appendChild(codeWrapper);
    } else {
      csrCodeContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; margin: 0; padding: 12px;">No CSR markup available</p>';
    }
    csrContainer.appendChild(csrHeader);
    csrContainer.appendChild(csrCodeContainer);
    markupContent.appendChild(ssrContainer);
    markupContent.appendChild(csrContainer);
    const wasMarkupExpanded = expandedPaths.has("markup-section");
    if (wasMarkupExpanded) {
      markupContent.style.display = "grid";
      markupToggle.textContent = "\u25BC";
    } else {
      markupContent.style.display = "none";
      markupToggle.textContent = "\u25B6";
    }
    markupHeader.addEventListener("click", () => {
      const isExpanded = markupContent.style.display !== "none";
      if (isExpanded) {
        markupContent.style.display = "none";
        markupToggle.textContent = "\u25B6";
        expandedPaths.delete("markup-section");
      } else {
        markupContent.style.display = "grid";
        markupToggle.textContent = "\u25BC";
        expandedPaths.add("markup-section");
      }
    });
    markupSection.appendChild(markupHeader);
    markupSection.appendChild(markupContent);
    root.appendChild(markupSection);
    const allAssets = [];
    if (detail.assets && detail.assets.length) {
      allAssets.push(...detail.assets);
    }
    if (allAssets.length > 0) {
      const codeTitle = document.createElement("h3");
      codeTitle.textContent = "Code";
      codeTitle.style.cssText = "font-size: 14px; font-weight: 600; color: var(--text); margin: 24px 0 12px 0;";
      root.appendChild(codeTitle);
      const controls = document.createElement("div");
      controls.className = "eds-asset-controls";
      controls.style.cssText = "display: flex; gap: 4px; margin-bottom: 8px;";
      const expandAllBtn = document.createElement("button");
      expandAllBtn.className = "eds-button";
      expandAllBtn.textContent = "Expand All";
      expandAllBtn.style.cssText = "padding: 4px 8px; font-size: 11px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text); cursor: pointer;";
      expandAllBtn.addEventListener("click", () => {
        root.querySelectorAll(".eds-asset-item").forEach((item) => {
          const content = item.querySelector(".eds-asset-content");
          const toggle = item.querySelector(".eds-asset-toggle");
          if (content && toggle) {
            content.style.display = "block";
            toggle.textContent = "\u25BC";
          }
        });
      });
      const collapseAllBtn = document.createElement("button");
      collapseAllBtn.className = "eds-button";
      collapseAllBtn.textContent = "Collapse All";
      collapseAllBtn.style.cssText = "padding: 4px 8px; font-size: 11px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text); cursor: pointer;";
      collapseAllBtn.addEventListener("click", () => {
        root.querySelectorAll(".eds-asset-item").forEach((item) => {
          const content = item.querySelector(".eds-asset-content");
          const toggle = item.querySelector(".eds-asset-toggle");
          if (content && toggle) {
            content.style.display = "none";
            toggle.textContent = "\u25B6";
          }
        });
      });
      controls.appendChild(expandAllBtn);
      controls.appendChild(collapseAllBtn);
      root.appendChild(controls);
      const list = document.createElement("ul");
      list.className = "eds-file-list";
      allAssets.forEach((asset) => {
        const li = createAssetItem(asset, expandedPaths, null, null, false, state, refresh, tabId);
        list.appendChild(li);
      });
      root.appendChild(list);
    }
    if (scrollContainer && savedScrollTop > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = savedScrollTop;
        });
      });
    }
  }
  async function renderBlockDetail(state, detail, refresh, tabId) {
    await renderBlockDetailWithExpandedPaths(state, detail, refresh, tabId, null);
  }
  function createAssetItem(asset, expandedPaths, blocksWithSameName, currentBlockIndex, hasMultipleBlocks, state, refresh, tabId) {
    const li = document.createElement("li");
    li.className = "eds-asset-item";
    li.style.cssText = "margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;";
    const header = document.createElement("div");
    header.className = "eds-asset-header";
    header.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-muted); cursor: pointer; overflow: hidden;";
    const leftSection = document.createElement("div");
    leftSection.style.cssText = "display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden;";
    const toggle = document.createElement("span");
    toggle.className = "eds-asset-toggle";
    toggle.textContent = "\u25B6";
    toggle.style.cssText = "font-size: 10px; color: var(--muted); transition: transform 0.2s; flex-shrink: 0;";
    const title = document.createElement("div");
    title.className = "eds-file-title";
    title.textContent = asset.path;
    title.style.cssText = "font-weight: 600; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
    leftSection.appendChild(toggle);
    leftSection.appendChild(title);
    const rightSection = document.createElement("div");
    rightSection.style.cssText = "display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 12px;";
    const pill = document.createElement("span");
    pill.className = "eds-pill";
    pill.textContent = asset.type;
    pill.style.cssText = "flex-shrink: 0;";
    const rawContent = asset.content || "(empty file)";
    let copyBtn = null;
    if (!rightSection.querySelector(".eds-copy-button")) {
      copyBtn = createCopyButton(rawContent, null, null);
      copyBtn.style.cssText = "background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s; flex-shrink: 0;";
      rightSection.appendChild(pill);
      rightSection.appendChild(copyBtn);
    } else {
      copyBtn = rightSection.querySelector(".eds-copy-button");
      rightSection.appendChild(pill);
    }
    const fullscreenBtn = document.createElement("button");
    fullscreenBtn.innerHTML = "\u26F6";
    fullscreenBtn.title = "Fullscreen view";
    fullscreenBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; flex-shrink: 0; opacity: 0.7;";
    fullscreenBtn.addEventListener("mouseenter", () => {
      fullscreenBtn.style.opacity = "1";
      fullscreenBtn.style.background = "var(--bg)";
    });
    fullscreenBtn.addEventListener("mouseleave", () => {
      fullscreenBtn.style.opacity = "0.7";
      fullscreenBtn.style.background = "transparent";
    });
    fullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const processedCode2 = processCode(rawContent, asset.type, asset.path);
      createFullscreenViewer(rawContent, processedCode2, asset.path, `block-asset-fullscreen-${asset.path}`);
    });
    rightSection.appendChild(fullscreenBtn);
    const content = document.createElement("div");
    content.className = "eds-asset-content";
    const processedCode = processCode(rawContent, asset.type, asset.path);
    const pre = document.createElement("pre");
    pre.className = "eds-code";
    pre.style.cssText = "background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;";
    const code = document.createElement("code");
    code.innerHTML = processedCode;
    code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
    pre.appendChild(code);
    const wasExpanded = expandedPaths.has(asset.path);
    if (wasExpanded) {
      content.style.cssText = "display: block; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;";
      toggle.textContent = "\u25BC";
    } else {
      content.style.cssText = "display: none; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;";
      toggle.textContent = "\u25B6";
    }
    const searchKey = `block-${asset.path}`;
    const searchUI = createSearchUI(content, rawContent, searchKey);
    const codeContainer = document.createElement("div");
    codeContainer.style.cssText = "padding: 16px;";
    codeContainer.appendChild(pre);
    content.appendChild(searchUI);
    content.appendChild(codeContainer);
    const handleToggle = () => {
      const isExpanded = content.style.display !== "none";
      const newExpanded = !isExpanded;
      content.style.display = newExpanded ? "block" : "none";
      toggle.textContent = newExpanded ? "\u25BC" : "\u25B6";
    };
    header.addEventListener("click", (e) => {
      if (e.target === copyBtn || e.target.closest(".eds-nav-button") || e.target.closest(".eds-copy-button") || e.target.closest(".eds-search-container") || e.target.closest(".eds-search-input") || e.target.closest(".eds-search-nav") || e.target.closest("button")) {
        return;
      }
      handleToggle();
    });
    header.appendChild(leftSection);
    header.appendChild(rightSection);
    li.appendChild(header);
    li.appendChild(content);
    return li;
  }
  var init_block_detail = __esm({
    "src/panel/renderers/block-detail.js"() {
      init_utils();
      init_code_processor();
      init_file_utils();
    }
  });

  // src/panel/renderers/blocks.js
  function renderBlocks(state, refresh, tabId) {
    const root = document.querySelector('[data-tab-panel="blocks"]');
    root.innerHTML = "";
    if (!state.blocks.length) {
      root.innerHTML = '<p class="eds-empty">No blocks detected inside <main>.</p>';
      return;
    }
    const blocksByCategory = {};
    const defaultContentCategories = ["heading", "text", "image", "list", "code", "table", "quote", "media", "default"];
    state.blocks.forEach((block) => {
      const category = block.category || "block";
      if (defaultContentCategories.includes(category)) {
        return;
      }
      if (block.name === "section") {
        return;
      }
      if (category !== "block") {
        return;
      }
      if (!blocksByCategory[category]) {
        blocksByCategory[category] = [];
      }
      blocksByCategory[category].push(block);
    });
    const categoryOrder = ["block"];
    categoryOrder.forEach((category) => {
      if (!blocksByCategory[category] || blocksByCategory[category].length === 0) return;
      const list = document.createElement("ul");
      list.className = "eds-block-list";
      blocksByCategory[category].forEach((block) => {
        const li = document.createElement("li");
        li.className = "eds-block-item";
        if (state.selectedBlock === block.id) {
          li.classList.add("is-selected");
        }
        const nameSpan = document.createElement("span");
        nameSpan.textContent = block.name;
        nameSpan.className = "eds-block-name";
        if (block.count && block.count > 1) {
          const countSpan = document.createElement("span");
          countSpan.className = "eds-block-count";
          countSpan.textContent = ` (${block.count})`;
          countSpan.style.cssText = "color: var(--muted); font-size: 11px; margin-left: 4px;";
          nameSpan.appendChild(countSpan);
        }
        const tagSpan = document.createElement("span");
        tagSpan.textContent = block.tagName;
        tagSpan.className = "eds-block-list__tag";
        li.appendChild(nameSpan);
        li.appendChild(tagSpan);
        li.addEventListener("mouseenter", () => sendToContent(tabId, "highlight", { id: block.id }));
        li.addEventListener("mouseleave", () => sendToContent(tabId, "highlight", { id: null }));
        li.addEventListener("click", async () => {
          document.querySelectorAll(".eds-block-item").forEach((item) => {
            item.classList.remove("is-selected");
          });
          li.classList.add("is-selected");
          const blocksWithSameName = await sendToContent(tabId, "get-blocks-by-name", { name: block.name });
          const firstBlock = blocksWithSameName && blocksWithSameName.length > 0 ? blocksWithSameName[0] : block;
          await sendToContent(tabId, "select-block", { id: firstBlock.id });
          await sendToContent(tabId, "scroll-to-block", { id: firstBlock.id });
          await sendToContent(tabId, "highlight", { id: firstBlock.id });
          const detail = await sendToContent(tabId, "get-block-detail", { id: firstBlock.id });
          renderBlockDetail(state, detail, refresh, tabId);
        });
        list.appendChild(li);
      });
      root.appendChild(list);
    });
  }
  var init_blocks = __esm({
    "src/panel/renderers/blocks.js"() {
      init_utils();
      init_block_detail();
    }
  });

  // src/panel/renderers/icons.js
  function renderIcons(state) {
    const root = document.querySelector('[data-tab-panel="icons"]');
    root.innerHTML = "";
    if (!state.icons || !state.icons.length) {
      root.innerHTML = '<p class="eds-empty">No icons found on this page.</p>';
      return;
    }
    const grid = document.createElement("div");
    grid.className = "eds-icon-grid";
    state.icons.forEach((icon) => {
      const card = document.createElement("div");
      card.className = "eds-icon-card";
      if (icon.url) {
        card.addEventListener("click", () => {
          window.open(icon.url, "_blank");
        });
      }
      const preview = document.createElement("div");
      preview.className = "eds-icon-preview";
      if (icon.svg) {
        preview.innerHTML = icon.svg;
      } else {
        preview.textContent = "\u{1F4E6}";
        preview.style.fontSize = "48px";
      }
      const name = document.createElement("div");
      name.className = "eds-icon-name";
      name.textContent = icon.name;
      card.appendChild(preview);
      card.appendChild(name);
      grid.appendChild(card);
    });
    root.appendChild(grid);
  }
  var init_icons = __esm({
    "src/panel/renderers/icons.js"() {
    }
  });

  // src/panel/renderers/code.js
  function renderScripts(state) {
    const root = document.querySelector('[data-tab-panel="code"]');
    if (root.hidden) {
      return;
    }
    const expandedUrls = /* @__PURE__ */ new Set();
    const loadedUrls = /* @__PURE__ */ new Set();
    const existingItems = root.querySelectorAll(".eds-file-item");
    existingItems.forEach((item) => {
      const url = item.dataset.scriptUrl;
      const content = item.querySelector(".eds-file-content");
      if (url && content && content.style.display !== "none") {
        expandedUrls.add(url);
      }
      if (url && content && content.querySelector(".eds-code")) {
        loadedUrls.add(url);
      }
    });
    root.innerHTML = "";
    let scriptFilesArray = [];
    if (state.scriptFiles) {
      if (Array.isArray(state.scriptFiles)) {
        scriptFilesArray = state.scriptFiles;
      } else if (state.scriptFiles instanceof Map) {
        scriptFilesArray = Array.from(state.scriptFiles.values());
      } else if (typeof state.scriptFiles === "object") {
        scriptFilesArray = Object.values(state.scriptFiles);
      }
    }
    console.log("[EDS Inspector Panel] renderScripts - scriptFiles:", state.scriptFiles, "array:", scriptFilesArray);
    if (!scriptFilesArray || scriptFilesArray.length === 0) {
      root.innerHTML = '<p class="eds-empty">No script files detected.</p>';
      return;
    }
    const list = document.createElement("ul");
    list.className = "eds-file-list";
    list.style.cssText = "list-style: none; padding: 0; margin: 0;";
    scriptFilesArray.forEach((scriptFile) => {
      const li = document.createElement("li");
      li.className = "eds-file-item";
      li.dataset.scriptUrl = scriptFile.url;
      li.style.cssText = "margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;";
      const header = document.createElement("div");
      header.className = "eds-file-header";
      header.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-muted); cursor: pointer;";
      const title = document.createElement("div");
      title.className = "eds-file-title";
      title.textContent = scriptFile.filename;
      title.style.cssText = "font-weight: 600; color: var(--text); flex: 1;";
      const url = document.createElement("div");
      url.className = "eds-file-url";
      try {
        const urlObj = new URL(scriptFile.url);
        url.textContent = urlObj.pathname + urlObj.search;
      } catch (e) {
        url.textContent = scriptFile.pathname;
      }
      url.style.cssText = "font-size: 11px; color: var(--muted); margin-left: 12px; font-family: monospace;";
      const toggle = document.createElement("span");
      toggle.className = "eds-file-toggle";
      toggle.textContent = "\u25B6";
      toggle.style.cssText = "font-size: 10px; color: var(--muted); transition: transform 0.2s; flex-shrink: 0;";
      const rightSection = document.createElement("div");
      rightSection.style.cssText = "display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 12px;";
      const leftSection = document.createElement("div");
      leftSection.style.cssText = "display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;";
      leftSection.appendChild(toggle);
      leftSection.appendChild(title);
      leftSection.appendChild(url);
      header.appendChild(leftSection);
      header.appendChild(rightSection);
      const content = document.createElement("div");
      content.className = "eds-file-content";
      const wasExpanded = expandedUrls.has(scriptFile.url);
      const wasLoaded = loadedUrls.has(scriptFile.url);
      if (wasExpanded) {
        content.style.cssText = "display: block; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;";
        toggle.textContent = "\u25BC";
      } else {
        content.style.cssText = "display: none; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;";
        toggle.textContent = "\u25B6";
      }
      if (wasLoaded && wasExpanded) {
        (async () => {
          try {
            const response = await fetch(scriptFile.url);
            if (!response.ok) {
              throw new Error(`Failed to load script: ${response.status} ${response.statusText}`);
            }
            const codeText = await response.text();
            const pre = document.createElement("pre");
            pre.className = "eds-code";
            pre.style.cssText = "background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;";
            const code = document.createElement("code");
            code.innerHTML = highlightCode(codeText, "javascript");
            code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
            pre.appendChild(code);
            content.innerHTML = "";
            const searchKey = `script-${scriptFile.url}`;
            if (!rightSection.querySelector(".eds-copy-button")) {
              const copyBtn = createCopyButton(codeText, null, null);
              copyBtn.style.cssText = "background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;";
              rightSection.appendChild(copyBtn);
              const fullscreenBtn = document.createElement("button");
              fullscreenBtn.innerHTML = "\u26F6";
              fullscreenBtn.title = "Fullscreen view";
              fullscreenBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; opacity: 0.7;";
              fullscreenBtn.addEventListener("mouseenter", () => {
                fullscreenBtn.style.opacity = "1";
                fullscreenBtn.style.background = "var(--bg)";
              });
              fullscreenBtn.addEventListener("mouseleave", () => {
                fullscreenBtn.style.opacity = "0.7";
                fullscreenBtn.style.background = "transparent";
              });
              fullscreenBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                createFullscreenViewer(codeText, code.innerHTML, scriptFile.pathname || scriptFile.url, searchKey);
              });
              rightSection.appendChild(fullscreenBtn);
            }
            const searchUI = createSearchUI(content, codeText, searchKey);
            const codeContainer = document.createElement("div");
            codeContainer.style.cssText = "padding: 16px;";
            codeContainer.appendChild(pre);
            content.appendChild(searchUI);
            content.appendChild(codeContainer);
          } catch (err) {
            console.error("[EDS Inspector Panel] Error loading script:", err);
            content.innerHTML = `<p class="eds-empty" style="color: #ef4444;">Error loading script: ${err.message}</p>`;
          }
        })();
      } else {
        const loading = document.createElement("div");
        loading.textContent = "Loading...";
        loading.style.cssText = "color: var(--muted);";
        content.appendChild(loading);
      }
      const handleToggle = async () => {
        const isExpanded = content.style.display !== "none";
        const newExpanded = !isExpanded;
        content.style.display = newExpanded ? "block" : "none";
        toggle.textContent = newExpanded ? "\u25BC" : "\u25B6";
        if (newExpanded && !wasLoaded) {
          try {
            content.innerHTML = '<div style="color: var(--muted);">Loading...</div>';
            const response = await fetch(scriptFile.url);
            if (!response.ok) {
              throw new Error(`Failed to load script: ${response.status} ${response.statusText}`);
            }
            const codeText = await response.text();
            content.innerHTML = "";
            const pre = document.createElement("pre");
            pre.className = "eds-code";
            pre.style.cssText = "background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;";
            const code = document.createElement("code");
            code.innerHTML = highlightCode(codeText, "javascript");
            code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
            pre.appendChild(code);
            if (!rightSection.querySelector(".eds-copy-button")) {
              const copyBtn = createCopyButton(codeText, null, null);
              copyBtn.style.cssText = "background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;";
              rightSection.appendChild(copyBtn);
              const fullscreenBtn = document.createElement("button");
              fullscreenBtn.innerHTML = "\u26F6";
              fullscreenBtn.title = "Fullscreen view";
              fullscreenBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; opacity: 0.7;";
              fullscreenBtn.addEventListener("mouseenter", () => {
                fullscreenBtn.style.opacity = "1";
                fullscreenBtn.style.background = "var(--bg)";
              });
              fullscreenBtn.addEventListener("mouseleave", () => {
                fullscreenBtn.style.opacity = "0.7";
                fullscreenBtn.style.background = "transparent";
              });
              fullscreenBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const searchKey2 = `script-${scriptFile.url}`;
                createFullscreenViewer(codeText, code.innerHTML, scriptFile.pathname || scriptFile.url, searchKey2);
              });
              rightSection.appendChild(fullscreenBtn);
            }
            const searchKey = `script-${scriptFile.url}`;
            const searchUI = createSearchUI(content, codeText, searchKey);
            const codeContainer = document.createElement("div");
            codeContainer.style.cssText = "padding: 16px;";
            codeContainer.appendChild(pre);
            content.appendChild(searchUI);
            content.appendChild(codeContainer);
          } catch (err) {
            console.error("[EDS Inspector Panel] Error loading script:", err);
            content.innerHTML = `<p class="eds-empty" style="color: #ef4444;">Error loading script: ${err.message}</p>`;
          }
        }
      };
      header.addEventListener("click", handleToggle);
      li.appendChild(header);
      li.appendChild(content);
      list.appendChild(li);
    });
    root.appendChild(list);
  }
  var init_code = __esm({
    "src/panel/renderers/code.js"() {
      init_utils();
      init_file_utils();
    }
  });

  // src/panel/renderers/media.js
  function renderMedia(state) {
    const root = document.querySelector('[data-tab-panel="media"]');
    root.innerHTML = "";
    if (!state.mediaFiles) {
      root.innerHTML = '<p class="eds-loading">Loading Media Bus\u2026</p>';
      return;
    }
    if (!state.mediaFiles.length) {
      root.innerHTML = '<p class="eds-empty">No media_ files found.</p>';
      return;
    }
    const grid = document.createElement("div");
    grid.className = "eds-media-grid";
    state.mediaFiles.forEach((file) => {
      const card = document.createElement("div");
      card.className = "eds-media-card";
      if (file.url) {
        card.addEventListener("click", () => {
          window.open(file.url, "_blank");
        });
      }
      const preview = document.createElement("div");
      preview.className = "eds-media-preview";
      if (file.isVideo) {
        preview.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5V19L19 12L8 5Z" fill="#94a3b8"/>
        </svg>
      `;
      } else if (file.isImage && file.url) {
        const img = document.createElement("img");
        img.src = file.url;
        img.style.cssText = "max-width: 100%; max-height: 120px; object-fit: contain;";
        img.onerror = () => {
          preview.innerHTML = "\u{1F4F7}";
          preview.style.fontSize = "48px";
        };
        preview.appendChild(img);
      } else {
        preview.innerHTML = "\u{1F4C4}";
        preview.style.fontSize = "48px";
      }
      const name = document.createElement("div");
      name.className = "eds-media-name";
      name.textContent = file.fileName || file.path.split("/").pop();
      card.appendChild(preview);
      card.appendChild(name);
      grid.appendChild(card);
    });
    root.appendChild(grid);
  }
  var init_media = __esm({
    "src/panel/renderers/media.js"() {
    }
  });

  // src/panel/renderers/json.js
  function renderJson(state) {
    const root = document.querySelector('[data-tab-panel="json"]');
    if (root.hidden) {
      return;
    }
    const expandedUrls = /* @__PURE__ */ new Set();
    const loadedUrls = /* @__PURE__ */ new Set();
    const existingItems = root.querySelectorAll(".eds-file-item");
    existingItems.forEach((item) => {
      const url = item.dataset.jsonUrl;
      const content = item.querySelector(".eds-file-content");
      if (url && content && content.style.display !== "none") {
        expandedUrls.add(url);
      }
      if (url && content && content.querySelector(".eds-code")) {
        loadedUrls.add(url);
      }
    });
    root.innerHTML = "";
    let jsonFilesArray = [];
    if (state.jsonFiles) {
      if (Array.isArray(state.jsonFiles)) {
        jsonFilesArray = state.jsonFiles;
      } else if (state.jsonFiles instanceof Map) {
        jsonFilesArray = Array.from(state.jsonFiles.values());
      } else if (typeof state.jsonFiles === "object") {
        jsonFilesArray = Object.values(state.jsonFiles);
      }
    }
    console.log("[EDS Inspector Panel] renderJson - jsonFiles:", state.jsonFiles, "array:", jsonFilesArray);
    if (!jsonFilesArray || jsonFilesArray.length === 0) {
      root.innerHTML = '<p class="eds-empty">No JSON files detected.</p>';
      return;
    }
    const list = document.createElement("ul");
    list.className = "eds-file-list";
    list.style.cssText = "list-style: none; padding: 0; margin: 0;";
    jsonFilesArray.forEach((jsonFile) => {
      const li = document.createElement("li");
      li.className = "eds-file-item";
      li.dataset.jsonUrl = jsonFile.url;
      li.style.cssText = "margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;";
      const header = document.createElement("div");
      header.className = "eds-file-header";
      header.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-muted); cursor: pointer;";
      const title = document.createElement("div");
      title.className = "eds-file-title";
      title.textContent = jsonFile.filename;
      title.style.cssText = "font-weight: 600; color: var(--text); flex: 1;";
      const url = document.createElement("div");
      url.className = "eds-file-url";
      try {
        const urlObj = new URL(jsonFile.url);
        url.textContent = urlObj.pathname + urlObj.search;
      } catch (e) {
        url.textContent = jsonFile.pathname;
      }
      url.style.cssText = "font-size: 11px; color: var(--muted); margin-left: 12px; font-family: monospace;";
      const toggle = document.createElement("span");
      toggle.className = "eds-file-toggle";
      toggle.textContent = "\u25B6";
      toggle.style.cssText = "font-size: 10px; color: var(--muted); transition: transform 0.2s; flex-shrink: 0;";
      const rightSection = document.createElement("div");
      rightSection.style.cssText = "display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 12px;";
      const leftSection = document.createElement("div");
      leftSection.style.cssText = "display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;";
      leftSection.appendChild(toggle);
      leftSection.appendChild(title);
      leftSection.appendChild(url);
      header.appendChild(leftSection);
      header.appendChild(rightSection);
      const content = document.createElement("div");
      content.className = "eds-file-content";
      const wasExpanded = expandedUrls.has(jsonFile.url);
      const wasLoaded = loadedUrls.has(jsonFile.url);
      if (wasExpanded) {
        content.style.cssText = "display: block; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;";
        toggle.textContent = "\u25BC";
      } else {
        content.style.cssText = "display: none; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;";
        toggle.textContent = "\u25B6";
      }
      if (wasLoaded && wasExpanded) {
        (async () => {
          try {
            const response = await fetch(jsonFile.url);
            if (!response.ok) {
              throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
            }
            const jsonData = await response.json();
            const jsonString = JSON.stringify(jsonData, null, 2);
            const pre = document.createElement("pre");
            pre.className = "eds-code";
            pre.style.cssText = "background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;";
            const code = document.createElement("code");
            code.innerHTML = highlightCode(jsonString, "json");
            code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
            pre.appendChild(code);
            content.innerHTML = "";
            const searchKey = `json-${jsonFile.url}`;
            if (!rightSection.querySelector(".eds-copy-button")) {
              const copyBtn = createCopyButton(jsonString, null, null);
              copyBtn.style.cssText = "background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;";
              rightSection.appendChild(copyBtn);
              const fullscreenBtn = document.createElement("button");
              fullscreenBtn.innerHTML = "\u26F6";
              fullscreenBtn.title = "Fullscreen view";
              fullscreenBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; opacity: 0.7;";
              fullscreenBtn.addEventListener("mouseenter", () => {
                fullscreenBtn.style.opacity = "1";
                fullscreenBtn.style.background = "var(--bg)";
              });
              fullscreenBtn.addEventListener("mouseleave", () => {
                fullscreenBtn.style.opacity = "0.7";
                fullscreenBtn.style.background = "transparent";
              });
              fullscreenBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                createFullscreenViewer(jsonString, code.innerHTML, jsonFile.pathname || jsonFile.url, searchKey);
              });
              rightSection.appendChild(fullscreenBtn);
            }
            const searchUI = createSearchUI(content, jsonString, searchKey);
            const codeContainer = document.createElement("div");
            codeContainer.style.cssText = "padding: 16px;";
            codeContainer.appendChild(pre);
            content.appendChild(searchUI);
            content.appendChild(codeContainer);
          } catch (err) {
            console.error("[EDS Inspector Panel] Error loading JSON:", err);
            content.innerHTML = `<p class="eds-empty" style="color: #ef4444;">Error loading JSON: ${err.message}</p>`;
          }
        })();
      } else {
        const loading = document.createElement("div");
        loading.textContent = "Loading...";
        loading.style.cssText = "color: var(--muted);";
        content.appendChild(loading);
      }
      const handleToggle = async () => {
        const isExpanded = content.style.display !== "none";
        const newExpanded = !isExpanded;
        content.style.display = newExpanded ? "block" : "none";
        toggle.textContent = newExpanded ? "\u25BC" : "\u25B6";
        if (newExpanded && !wasLoaded) {
          try {
            content.innerHTML = '<div style="color: var(--muted);">Loading...</div>';
            const response = await fetch(jsonFile.url);
            if (!response.ok) {
              throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
            }
            const jsonData = await response.json();
            const jsonString = JSON.stringify(jsonData, null, 2);
            content.innerHTML = "";
            const pre = document.createElement("pre");
            pre.className = "eds-code";
            pre.style.cssText = "background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;";
            const code = document.createElement("code");
            code.innerHTML = highlightCode(jsonString, "json");
            code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
            pre.appendChild(code);
            if (!rightSection.querySelector(".eds-copy-button")) {
              const copyBtn = createCopyButton(jsonString, null, null);
              copyBtn.style.cssText = "background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;";
              rightSection.appendChild(copyBtn);
              const fullscreenBtn = document.createElement("button");
              fullscreenBtn.innerHTML = "\u26F6";
              fullscreenBtn.title = "Fullscreen view";
              fullscreenBtn.style.cssText = "background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; opacity: 0.7;";
              fullscreenBtn.addEventListener("mouseenter", () => {
                fullscreenBtn.style.opacity = "1";
                fullscreenBtn.style.background = "var(--bg)";
              });
              fullscreenBtn.addEventListener("mouseleave", () => {
                fullscreenBtn.style.opacity = "0.7";
                fullscreenBtn.style.background = "transparent";
              });
              fullscreenBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const searchKey2 = `json-${jsonFile.url}`;
                createFullscreenViewer(jsonString, code.innerHTML, jsonFile.pathname || jsonFile.url, searchKey2);
              });
              rightSection.appendChild(fullscreenBtn);
            }
            const searchKey = `json-${jsonFile.url}`;
            const searchUI = createSearchUI(content, jsonString, searchKey);
            const codeContainer = document.createElement("div");
            codeContainer.style.cssText = "padding: 16px;";
            codeContainer.appendChild(pre);
            content.innerHTML = "";
            content.appendChild(searchUI);
            content.appendChild(codeContainer);
          } catch (err) {
            console.error("[EDS Inspector Panel] Error loading JSON:", err);
            content.innerHTML = `<p class="eds-empty" style="color: #ef4444;">Error loading JSON: ${err.message}</p>`;
          }
        }
      };
      header.addEventListener("click", handleToggle);
      li.appendChild(header);
      li.appendChild(content);
      list.appendChild(li);
    });
    root.appendChild(list);
  }
  var init_json = __esm({
    "src/panel/renderers/json.js"() {
      init_utils();
      init_file_utils();
    }
  });

  // src/panel/data/eds-sites.json
  var eds_sites_default;
  var init_eds_sites = __esm({
    "src/panel/data/eds-sites.json"() {
      eds_sites_default = [
        {
          title: "Adobe Business",
          url: "https://business.adobe.com/"
        },
        {
          title: "Adobe Developer",
          url: "https://developer.adobe.com/"
        },
        {
          title: "Adobe Experience Cloud",
          url: "https://business.adobe.com/products/experience-cloud.html"
        },
        {
          title: "Adobe Creative Cloud",
          url: "https://www.adobe.com/creativecloud.html"
        },
        {
          title: "Adobe Document Cloud",
          url: "https://www.adobe.com/documentcloud.html"
        },
        {
          title: "Adobe Stock",
          url: "https://stock.adobe.com/"
        },
        {
          title: "Adobe Fonts",
          url: "https://fonts.adobe.com/"
        },
        {
          title: "Adobe Color",
          url: "https://color.adobe.com/"
        },
        {
          title: "Adobe Behance",
          url: "https://www.behance.net/"
        },
        {
          title: "Adobe Portfolio",
          url: "https://portfolio.adobe.com/"
        },
        {
          title: "Adobe Experience Manager",
          url: "https://business.adobe.com/products/experience-manager/adobe-experience-manager-sites.html"
        },
        {
          title: "Adobe Analytics",
          url: "https://business.adobe.com/products/analytics/adobe-analytics.html"
        },
        {
          title: "Adobe Target",
          url: "https://business.adobe.com/products/target/adobe-target.html"
        },
        {
          title: "Adobe Marketo",
          url: "https://business.adobe.com/products/marketo/marketing-automation.html"
        },
        {
          title: "Adobe Commerce",
          url: "https://business.adobe.com/products/magento/magento-commerce.html"
        },
        {
          title: "Adobe Campaign",
          url: "https://business.adobe.com/products/campaign/adobe-campaign.html"
        },
        {
          title: "Adobe Real-Time CDP",
          url: "https://business.adobe.com/products/real-time-customer-data-platform/rtcdp.html"
        },
        {
          title: "Adobe Journey Optimizer",
          url: "https://business.adobe.com/products/journey-optimizer/adobe-journey-optimizer.html"
        },
        {
          title: "Adobe Workfront",
          url: "https://business.adobe.com/products/workfront/workfront.html"
        },
        {
          title: "Adobe Experience Platform",
          url: "https://business.adobe.com/products/experience-platform/adobe-experience-platform.html"
        },
        {
          title: "Qantas",
          url: "https://www.qantas.com/"
        },
        {
          title: "UPS",
          url: "https://www.ups.com/"
        },
        {
          title: "H&M UAE",
          url: "https://ae.hm.com/"
        },
        {
          title: "SoftBank Business",
          url: "https://www.softbank.jp/business/"
        },
        {
          title: "AEM Boilerplate XWalk",
          url: "https://main--aem-boilerplate-xwalk--adobe-rnd.aem.live/"
        },
        {
          title: "AEM Boilerplate",
          url: "https://main--aem-boilerplate--adobe.aem.live/"
        },
        {
          title: "Fr\xE9scopa Coffee",
          url: "https://frescopa.coffee/"
        }
      ];
    }
  });

  // src/panel/renderers/explore.js
  function renderExplore() {
    const root = document.querySelector('[data-tab-panel="explore"]');
    root.innerHTML = "";
    const searchRowContainer = document.createElement("div");
    searchRowContainer.className = "eds-explore-search-row";
    const comboBoxContainer = document.createElement("div");
    comboBoxContainer.className = "eds-explore-combobox";
    const inputContainer = document.createElement("div");
    inputContainer.className = "eds-explore-input-container";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "eds-explore-input";
    input.placeholder = "Search EDS sites by title or URL...";
    input.autocomplete = "off";
    const dropdownIcon = document.createElement("span");
    dropdownIcon.className = "eds-explore-dropdown-icon";
    dropdownIcon.textContent = "\u25BC";
    inputContainer.appendChild(input);
    inputContainer.appendChild(dropdownIcon);
    const dropdown = document.createElement("div");
    dropdown.className = "eds-explore-dropdown";
    dropdown.hidden = true;
    comboBoxContainer.appendChild(inputContainer);
    comboBoxContainer.appendChild(dropdown);
    const openSiteButtons = document.createElement("div");
    openSiteButtons.className = "eds-explore-open-buttons";
    openSiteButtons.style.display = "none";
    const openInCurrentTab = document.createElement("button");
    openInCurrentTab.className = "eds-explore-open-button";
    openInCurrentTab.textContent = "Open in this tab";
    openInCurrentTab.addEventListener("click", () => {
      if (selectedSite) {
        openSite(selectedSite.url, "current");
      }
    });
    const openInNewTab = document.createElement("button");
    openInNewTab.className = "eds-explore-open-button";
    openInNewTab.textContent = "Open in new tab";
    openInNewTab.addEventListener("click", () => {
      if (selectedSite) {
        openSite(selectedSite.url, "new");
      }
    });
    openSiteButtons.appendChild(openInCurrentTab);
    openSiteButtons.appendChild(openInNewTab);
    searchRowContainer.appendChild(comboBoxContainer);
    searchRowContainer.appendChild(openSiteButtons);
    const previewContainer = document.createElement("div");
    previewContainer.className = "eds-explore-preview-container";
    const previewLabel = document.createElement("div");
    previewLabel.className = "eds-explore-preview-label";
    previewLabel.textContent = "Preview";
    const previewFrame = document.createElement("div");
    previewFrame.className = "eds-explore-preview-frame";
    const previewLoading = document.createElement("div");
    previewLoading.className = "eds-explore-preview-loading";
    previewLoading.style.display = "none";
    previewLoading.innerHTML = `
    <div class="eds-explore-loading-spinner"></div>
    <div class="eds-explore-loading-text">Loading...</div>
  `;
    const previewIframe = document.createElement("iframe");
    previewIframe.className = "eds-explore-preview-iframe";
    previewIframe.sandbox = "allow-same-origin allow-scripts allow-forms allow-popups";
    previewIframe.style.display = "none";
    const previewEmpty = document.createElement("div");
    previewEmpty.className = "eds-explore-preview-empty";
    previewEmpty.textContent = "Select an EDS site to preview";
    previewEmpty.style.display = "flex";
    previewFrame.appendChild(previewLoading);
    previewFrame.appendChild(previewIframe);
    previewFrame.appendChild(previewEmpty);
    previewContainer.appendChild(previewLabel);
    previewContainer.appendChild(previewFrame);
    root.appendChild(searchRowContainer);
    root.appendChild(previewContainer);
    let selectedSite = null;
    let filteredSites = [...eds_sites_default];
    function updateDropdown() {
      dropdown.innerHTML = "";
      if (filteredSites.length === 0) {
        const noResults = document.createElement("div");
        noResults.className = "eds-explore-dropdown-item";
        noResults.textContent = "No sites found";
        noResults.style.color = "var(--muted)";
        dropdown.appendChild(noResults);
      } else {
        filteredSites.forEach((site) => {
          const item = document.createElement("div");
          item.className = "eds-explore-dropdown-item";
          item.innerHTML = `
          <div class="eds-explore-dropdown-item-title">${escapeHtml2(site.title)}</div>
          <div class="eds-explore-dropdown-item-url">${escapeHtml2(site.url)}</div>
        `;
          item.addEventListener("click", () => {
            selectSite(site);
          });
          dropdown.appendChild(item);
        });
      }
    }
    function selectSite(site) {
      selectedSite = site;
      input.value = site.title;
      dropdown.hidden = true;
      loadPreview(site.url);
      openSiteButtons.style.display = "flex";
    }
    function openSite(url, mode) {
      if (mode === "current") {
        const tabId = chrome.devtools?.inspectedWindow?.tabId;
        if (tabId) {
          chrome.tabs.update(tabId, { url });
        } else {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
              chrome.tabs.update(tabs[0].id, { url });
            }
          });
        }
      } else {
        chrome.tabs.create({ url });
      }
    }
    function loadPreview(url) {
      previewIframe.onload = null;
      previewIframe.onerror = null;
      previewEmpty.style.display = "none";
      previewIframe.style.display = "none";
      previewLoading.style.display = "flex";
      previewFrame.style.cursor = "default";
      previewFrame.onclick = null;
      let loadTimeout = setTimeout(() => {
        previewLoading.style.display = "none";
        previewEmpty.style.display = "flex";
        previewEmpty.textContent = "Failed to load preview (timeout)";
        previewIframe.src = "";
      }, 3e4);
      previewIframe.onload = () => {
        clearTimeout(loadTimeout);
        previewLoading.style.display = "none";
        previewIframe.style.display = "block";
        previewFrame.style.cursor = "pointer";
        previewFrame.onclick = () => {
          window.open(url, "_blank");
        };
      };
      previewIframe.onerror = () => {
        clearTimeout(loadTimeout);
        previewLoading.style.display = "none";
        previewEmpty.style.display = "flex";
        previewEmpty.textContent = "Failed to load preview";
        previewIframe.src = "";
      };
      previewIframe.src = url;
    }
    function escapeHtml2(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    function filterSites(query) {
      const lowerQuery = query.toLowerCase();
      filteredSites = eds_sites_default.filter((site) => {
        return site.title.toLowerCase().includes(lowerQuery) || site.url.toLowerCase().includes(lowerQuery);
      });
      updateDropdown();
    }
    input.addEventListener("focus", () => {
      dropdown.hidden = false;
      updateDropdown();
    });
    input.addEventListener("input", (e) => {
      filterSites(e.target.value);
      dropdown.hidden = false;
      if (e.target.value === "") {
        selectedSite = null;
        previewEmpty.style.display = "flex";
        previewIframe.style.display = "none";
        previewLoading.style.display = "none";
        previewIframe.src = "";
        previewFrame.style.cursor = "default";
        previewFrame.onclick = null;
        openSiteButtons.style.display = "none";
      }
    });
    input.addEventListener("blur", () => {
      setTimeout(() => {
        dropdown.hidden = true;
      }, 200);
    });
    updateDropdown();
  }
  var init_explore = __esm({
    "src/panel/renderers/explore.js"() {
      init_eds_sites();
    }
  });

  // src/panel.js
  var require_panel = __commonJS({
    "src/panel.js"() {
      init_utils();
      init_docs();
      init_control();
      init_blocks();
      init_icons();
      init_code();
      init_media();
      init_json();
      init_block_detail();
      init_explore();
      var tabId = chrome.devtools.inspectedWindow.tabId;
      console.log("[EDS Inspector Panel] Tab ID:", tabId);
      var sendToContentWithTabId = (type, payload) => sendToContent(tabId, type, payload);
      var ensureContentInjectedWithTabId = () => ensureContentInjected(tabId);
      function saveSelectedTab(tab) {
        try {
          sessionStorage.setItem("eds-selected-tab", tab);
        } catch (err) {
          console.warn("[EDS Inspector Panel] Failed to save selected tab:", err);
        }
      }
      function getSelectedTab() {
        try {
          return sessionStorage.getItem("eds-selected-tab") || "control";
        } catch (err) {
          console.warn("[EDS Inspector Panel] Failed to get selected tab:", err);
          return "control";
        }
      }
      async function switchTab(tab) {
        document.querySelectorAll(".eds-tabs button").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.tab === tab);
        });
        document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.tabPanel !== tab;
        });
        saveSelectedTab(tab);
        if (tab === "docs") {
          renderDocs(tabId);
        }
        if (tab === "json") {
          try {
            const state = await sendToContentWithTabId("state");
            if (state) {
              renderJson(state);
            }
          } catch (err) {
            console.error("[EDS Inspector Panel] Error loading JSON tab:", err);
          }
        }
        if (tab === "code") {
          try {
            const state = await sendToContentWithTabId("state");
            if (state) {
              renderScripts(state);
            }
          } catch (err) {
            console.error("[EDS Inspector Panel] Error loading Scripts tab:", err);
          }
        }
        if (tab === "explore") {
          renderExplore();
        }
      }
      function bindTabs() {
        document.querySelectorAll(".eds-tabs button").forEach((btn) => {
          btn.addEventListener("click", async () => {
            await switchTab(btn.dataset.tab);
          });
        });
      }
      var isUpdating = false;
      function setLoading(loading) {
        const tabs = document.querySelectorAll(".eds-tabs button");
        tabs.forEach((btn) => {
          btn.disabled = loading;
          if (loading) {
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
          } else {
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
          }
        });
        const main = document.querySelector("main");
        if (loading) {
          const existingLoading = main.querySelector(".eds-loading-overlay");
          if (!existingLoading) {
            const loadingOverlay = document.createElement("div");
            loadingOverlay.className = "eds-loading-overlay";
            loadingOverlay.style.cssText = "position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(11, 18, 32, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;";
            loadingOverlay.innerHTML = '<div class="eds-loading" style="padding: 20px; text-align: center;">Loading...</div>';
            main.style.position = "relative";
            main.appendChild(loadingOverlay);
          }
        } else {
          const existingLoading = main.querySelector(".eds-loading-overlay");
          if (existingLoading) {
            existingLoading.remove();
          }
        }
      }
      async function hydratePanels() {
        if (isUpdating) {
          console.log("[EDS Inspector Panel] Already updating, skipping...");
          return;
        }
        try {
          isUpdating = true;
          setLoading(true);
          console.log("[EDS Inspector Panel] Fetching state from content script...");
          const state = await sendToContentWithTabId("state");
          console.log("[EDS Inspector Panel] State received:", state);
          if (!state) {
            throw new Error("No state received from content script");
          }
          if (!state.overlaysVisible) {
            console.log("[EDS Inspector Panel] Overlays not visible, ensuring visibility...");
            await sendToContentWithTabId("set-overlays-visible", { visible: true });
            const updatedState = await sendToContentWithTabId("state");
            if (updatedState) {
              Object.assign(state, updatedState);
            }
          }
          renderControl(state, hydratePanels, tabId);
          if (state.selectedBlock) {
            const detail = await sendToContentWithTabId("get-block-detail", { id: state.selectedBlock });
            renderBlockDetail(state, detail, hydratePanels, tabId);
          } else {
            renderBlocks(state, hydratePanels, tabId);
          }
          renderIcons(state);
          renderScripts(state);
          renderMedia(state);
          renderJson(state);
        } catch (err) {
          console.error("[EDS Inspector Panel] Error hydrating panels:", err);
          const controlPanel = document.querySelector('[data-tab-panel="control"]');
          if (controlPanel) {
            controlPanel.innerHTML = `
        <div class="eds-error" style="padding: 20px; color: #d32f2f;">
          <h3>Error: Failed to communicate with content script</h3>
          <p>${err.message}</p>
          <p>Please make sure:</p>
          <ul>
            <li>The page is fully loaded</li>
            <li>You're on a valid web page (not chrome:// or extension://)</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      `;
          }
          throw err;
        } finally {
          isUpdating = false;
          setLoading(false);
        }
      }
      async function scrollAndAnalyze() {
        console.log("[EDS Inspector Panel] Scrolling page for lazy load...");
        await sendToContentWithTabId("scroll-page-for-lazy-load");
        console.log("[EDS Inspector Panel] Page scroll complete, initializing...");
        await sendToContentWithTabId("init");
      }
      async function initializePanel() {
        console.log("[EDS Inspector Panel] Initializing panel...");
        const controlPanel = document.querySelector('[data-tab-panel="control"]');
        chrome.storage.local.set({
          "eds-devtools-open": true
        }).catch((err) => {
          console.error("[EDS Inspector Panel] Failed to set devtools-open flag:", err);
        });
        try {
          setLoading(true);
          if (controlPanel) {
            controlPanel.innerHTML = '<div class="eds-loading" style="padding: 20px;">Initializing EDS Site Inspector...</div>';
          }
          bindTabs();
          const savedTab = getSelectedTab();
          await switchTab(savedTab);
          console.log("[EDS Inspector Panel] Ensuring content script is injected...");
          try {
            await ensureContentInjectedWithTabId();
            console.log("[EDS Inspector Panel] Content script injection ensured");
          } catch (injectErr) {
            console.error("[EDS Inspector Panel] Failed to inject content script:", injectErr);
            if (controlPanel) {
              const errorMessage = injectErr.message || "Unknown error";
              const isConnectionError = errorMessage.includes("Could not establish connection") || errorMessage.includes("Receiving end does not exist");
              controlPanel.innerHTML = `
          <div class="eds-error" style="padding: 20px; color: #d32f2f; line-height: 1.6;">
            <h3 style="margin-top: 0;">Error: Failed to inject content script</h3>
            <p><strong>${errorMessage}</strong></p>
            ${isConnectionError ? `
              <p>This error usually means the extension's service worker is not running.</p>
              <h4>Please try the following steps:</h4>
              <ol style="margin-left: 20px;">
                <li>Go to <code>chrome://extensions/</code></li>
                <li>Find "EDS Site Inspector" extension</li>
                <li>Click the <strong>"Reload"</strong> button (\u{1F504}) to restart the service worker</li>
                <li>Click the <strong>"Service worker"</strong> link to verify it's running</li>
                <li>Refresh this page (F5)</li>
                <li>Reopen this DevTools panel</li>
              </ol>
            ` : `
              <p>Please try:</p>
              <ul style="margin-left: 20px;">
                <li>Refreshing the page (F5)</li>
                <li>Reloading the extension from chrome://extensions/</li>
              </ul>
            `}
          </div>
        `;
            }
            throw injectErr;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
          let isAlreadyAnalyzed = false;
          try {
            const currentState = await sendToContentWithTabId("state");
            if (currentState && currentState.isAnalyzed) {
              isAlreadyAnalyzed = true;
              console.log("[EDS Inspector Panel] Already analyzed, skipping initialization");
              if (!currentState.overlaysVisible) {
                console.log("[EDS Inspector Panel] Overlays not visible, ensuring visibility...");
                await sendToContentWithTabId("set-overlays-visible", { visible: true });
              }
            }
          } catch (e) {
            console.log("[EDS Inspector Panel] Could not check state, will initialize:", e);
          }
          if (!isAlreadyAnalyzed) {
            try {
              console.log("[EDS Inspector Panel] Scrolling page and initializing...");
              await scrollAndAnalyze();
              console.log("[EDS Inspector Panel] Initialization complete");
            } catch (e) {
              console.warn("[EDS Inspector Panel] Init message failed, retrying...", e);
              await new Promise((resolve) => setTimeout(resolve, 300));
              try {
                await scrollAndAnalyze();
                console.log("[EDS Inspector Panel] Initialization complete after retry");
              } catch (retryErr) {
                console.error("[EDS Inspector Panel] Init message failed after retry:", retryErr);
                if (controlPanel) {
                  controlPanel.innerHTML = `
              <div class="eds-error" style="padding: 20px; color: #d32f2f;">
                <h3>Error: Failed to initialize content script</h3>
                <p>${retryErr.message}</p>
                <p>The content script may not be loaded. Please try:</p>
                <ul>
                  <li>Refreshing the page</li>
                  <li>Checking the page console for errors</li>
                </ul>
              </div>
            `;
                }
                throw retryErr;
              }
            }
          } else {
            console.log("[EDS Inspector Panel] Skipping initialization, already analyzed");
          }
          console.log("[EDS Inspector Panel] Hydrating panels...");
          await hydratePanels();
          console.log("[EDS Inspector Panel] Panel initialization complete");
        } catch (err) {
          console.error("[EDS Inspector Panel] Error initializing panel:", err);
          if (controlPanel && !controlPanel.querySelector(".eds-error")) {
            controlPanel.innerHTML = `
        <div class="eds-error" style="padding: 20px; color: #d32f2f;">
          <h3>Error: Failed to initialize panel</h3>
          <p>${err.message}</p>
          <p>Check the console for more details.</p>
        </div>
      `;
          }
        } finally {
          setLoading(false);
        }
      }
      function showReloadingIndicator() {
        const existing = document.querySelector(".eds-reloading-indicator");
        if (existing) {
          existing.remove();
        }
        const indicator = document.createElement("div");
        indicator.className = "eds-reloading-indicator";
        indicator.innerHTML = `
    <div class="eds-reloading-indicator__content">
      <div class="eds-reloading-indicator__spinner"></div>
      <span class="eds-reloading-indicator__text">Reloading page...</span>
    </div>
  `;
        const main = document.querySelector("main");
        if (main) {
          main.insertBefore(indicator, main.firstChild);
        }
      }
      function hideReloadingIndicator() {
        const indicator = document.querySelector(".eds-reloading-indicator");
        if (indicator) {
          indicator.remove();
        }
      }
      console.log("[EDS Inspector Panel] Panel script loaded");
      window.initializePanel = initializePanel;
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes["eds-overlays-enabled"]) {
          const newValue = changes["eds-overlays-enabled"].newValue;
          if (newValue) {
            const allCheckbox = document.getElementById("control-toggle-all");
            const sectionsCheckbox = document.getElementById("control-toggle-sections");
            const blocksCheckbox = document.getElementById("control-toggle-blocks");
            const defaultCheckbox = document.getElementById("control-toggle-default");
            if (sectionsCheckbox && newValue.sections !== void 0) {
              sectionsCheckbox.checked = newValue.sections;
            }
            if (blocksCheckbox && newValue.blocks !== void 0) {
              blocksCheckbox.checked = newValue.blocks;
            }
            if (defaultCheckbox && newValue.defaultContent !== void 0) {
              defaultCheckbox.checked = newValue.defaultContent;
            }
            if (allCheckbox && sectionsCheckbox && blocksCheckbox && defaultCheckbox) {
              allCheckbox.checked = sectionsCheckbox.checked && blocksCheckbox.checked && defaultCheckbox.checked;
            }
          }
        }
      });
      if (chrome.devtools && chrome.devtools.network) {
        chrome.devtools.network.onNavigated.addListener(async (url) => {
          console.log("[EDS Inspector Panel] Page navigation detected:", url);
          showReloadingIndicator();
          try {
            await hydratePanels();
            console.log("[EDS Inspector Panel] Panels refreshed after page navigation");
          } catch (err) {
            console.error("[EDS Inspector Panel] Error refreshing panels after navigation:", err);
            try {
              await initializePanel();
            } catch (initErr) {
              console.error("[EDS Inspector Panel] Error re-initializing panel after navigation:", initErr);
            }
          } finally {
            hideReloadingIndicator();
          }
        });
        console.log("[EDS Inspector Panel] Page navigation listener attached");
      }
    }
  });
  require_panel();
})();
//# sourceMappingURL=panel.js.map
