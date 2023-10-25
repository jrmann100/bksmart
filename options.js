document.querySelector("button").onclick = () =>
  chrome.tabs.create({
    url: "chrome://settings/searchEngines#:~:text=ecosia.org-,Site%20search,-To%20search%20a",
  });
document.querySelector("#location").innerText =
  chrome.runtime.getURL("redirect.html") + "?bk=%s";
