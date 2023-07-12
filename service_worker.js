const delim = "";

// if the node has children, it's a folder.
// otherwise it's a leaf (bookmark).
function isFolder(node) {
  return node.children !== undefined;
}

// suggestions are encoded in XML, but the content of the suggestions
// (URLs, paths) may contain some XML-unsafe characters.
function escapeXML(string) {
  return string
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// add a suffix to pluralize a word if the
// item count is not exactly 1; as in,
// 0 items, 1 item, 2 items
function pluralize(count, suffix = "s") {
  return count !== 1 ? suffix : "";
}

// perform a queue-based breadth-first search for the bksmart node.
const getBksmart = async () => {
  const root = (await chrome.bookmarks.getTree())[0];
  const queue = [root];
  for (let node = queue.shift(); node !== undefined; node = queue.shift()) {
    if (isFolder(node) && node.title === "bksmart") {
      return node;
    }
    if (node.children) {
      queue.push(...node.children);
    }
  }
  throw new Error("Could not find bksmart folder");
};

// trace a path input within the tree starting at the root (bksmart).
// return the deepest node which was reached,
// alongside the total number of nodes traversed.

function search(bksmart, input) {
  const components = input.split(delim);
  let node = bksmart;
  let i, component;
  for (
    i = 0, component = components[i];
    i < components.length;
    i++, component = components[i]
  ) {
    if (isFolder(node)) {
      // can we go down a level to the child which matches this component?
      const next = node.children?.find((child) => child.title === component);
      if (next === undefined) {
        // no, there is no child which matches. fail at the parent.
        return [node, i];
      }
      node = next;
      continue;
    } else {
      // we can't go down a level because this is a leaf. fail at the leaf.
      return [node, i];
    }
  }
  // success - we have traced the entire path; i === input.length.
  return [node, i];
}

chrome.omnibox.onInputChanged.addListener(async (input, suggest) => {
  const bksmart = await getBksmart();
  const [node, matched] = search(bksmart, input);

  // what is the path which describes the parent of the nodes we want to suggest?
  // if our node is a folder, then the path is the input itself.
  // example: tree is a -> b -> (1,2,3), input is "ab"; then we will suggest ab>1, ab>2, ab>3
  // where "ab" is the closest valid folder
  // if the node is a leaf, then the path is the parent of the leaf.
  // example: tree is a -> b -> (1,2,3), input is "ab1"; then we will suggest ab>1
  // where "ab" is the closest valid folder
  const closestValidFolder = input.slice(0, matched - !isFolder(node));
  suggest(
    (isFolder(node) ? node.children : [node]).map((child) => ({
      description:
        `<dim>${escapeXML(closestValidFolder)}</dim><match>${escapeXML(
          child.title
        )}</match> ` +
        (child.url !== undefined
          ? `<url>${escapeXML(child.url)}</url>`
          : `[${child.children.length} item${pluralize(
              child.children.length
            )}]`),
      content: [closestValidFolder, child.title].join(delim),
    }))
  );
});

// open the URL correctly depending on the disposition.
function open(url, disposition) {
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
}

// get a URL to this node in the bookmarks index.
function folderURL(node) {
  return `chrome://bookmarks/?id=${node.id}`;
}

chrome.omnibox.setDefaultSuggestion({
  description: "[folder][subfolder...][bookmark]",
});

chrome.omnibox.onInputEntered.addListener(async (input, disposition) => {
  const bksmart = await getBksmart();
  let url;
  determineURL: {
    // if the input is whitespace or an underscore, go bksmart in the bookmarks index.
    if (input === "" || input === "_") {
      url = folderURL(bksmart);
      break determineURL;
    }
    const [node, matched] = search(bksmart, input);
    // if we could not match the whole path, then fail silently.
    if (matched < input.length) {
      return;
    }
    // if this is a leaf, then the URL is the leaf's URL.
    if (!isFolder(node)) {
      url = node.url;
      break determineURL;
    }
    // else this is a folder.
    // if there is a child with an underscore as the title for this folder,
    // then that child's URL is the URL which represents the folder.
    const underscored = node.children.find(
      (child) => !isFolder(child) && child.title === "_"
    );
    if (underscored !== undefined) {
      url = underscored.url;
      break determineURL;
    }
    // otherwise, just open the folder in the bookmarks index.
    url = folderURL(node);
  }
  open(url, disposition);
});
