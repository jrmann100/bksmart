import getBksmart from "./lib/getBksmart.js";
import resolveURL from "./lib/resolveURL.js";
import makeSuggestion from "./lib/makeSuggestion.js";
import trace from "./lib/trace.js";
import { isFolder } from "./lib/util.js";

chrome.omnibox.onInputChanged.addListener(async (input, suggest) => {
  const bksmart = await getBksmart();
  const [node, matched] = trace(bksmart, input);

  // what is the path which describes the parent of the nodes we want to suggest?
  // if our node is a folder, then the path is the input itself.
  // example: tree is a -> b -> (1,2,3), input is "ab"; then we will suggest ab>1, ab>2, ab>3
  // where "ab" is the closest valid folder
  // if the node is a leaf, then the path is the parent of the leaf.
  // example: tree is a -> b -> (1,2,3), input is "ab1"; then we will suggest ab>1
  // where "ab" is the closest valid folder
  const closestValidFolder = input.slice(0, matched - !isFolder(node));
  suggest(
    (isFolder(node) ? node.children : [node]).map((child) =>
      makeSuggestion(closestValidFolder, child)
    )
  );
});

chrome.omnibox.setDefaultSuggestion({
  description: "[folder][subfolder...][bookmark]",
});

chrome.omnibox.onInputEntered.addListener(async (input, disposition) => {
  const url = await resolveURL(input);

  switch (disposition) {
    case "currentTab":
      chrome.tabs.update({ url });
      break;
    case "newForegroundTab":
      chrome.tabs.create({ url });
      break;
    case "newBackgroundTab":
      chrome.tabs.create({ url, active: false });
      break;
  }
});
