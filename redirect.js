import resolveURL from "./lib/resolveURL.js";
(async () => {
  try {
    const query = new URLSearchParams(window.location.search).get("bk");
    if (query === null) {
      throw new Error("You must provide search <code>?bk=<query></code>");
    }

    const url = await resolveURL(query);
    if (url === undefined) {
      throw new Error(`No nodes matched query "${query}"`);
    }

    // prefer local redirect because tabs.update doesn't work with newBackgroundTab
    if (new URL(url).protocol === "chrome:") {
      chrome.tabs.update({ url });
    } else {
      window.location.href = url;
    }
  } catch (error) {
    document.body.innerHTML = error.message;
  }
})();
