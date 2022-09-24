// todo: cross-browser support

function pluralS(count) {
  // fixme
  return count !== 1 ? "s" : "";
}

const delim = "";

// suggestions are broken in manifest v3:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1186804
// so here is a gift from the async gods:
Function.prototype.callback = function (...args) {
  return new Promise((res) => this(...args, res));
};

const find = (bookmark, title, type = bookmarkTypes.bookmark) => {
  const results = search(bookmark, title, type);
  if (results.length > 1)
    throw Error(`Found multiple matches for search ${title}.`);
  return results[0];
};

const bookmarkTypes = {
  folder: 1,
  bookmark: 2,
};

const matchType = (type, bookmark) => {
  if (type === bookmarkTypes.folder) return bookmark.url === undefined;
  else if (type === bookmarkTypes.bookmark) return bookmark.url !== undefined;
};

const matches = (bookmark, title) => {
  return bookmark.title?.split(",").includes(title);
};
// this is both great and slow because it scans the entire tree.
const search = (bookmark, title, type = bookmarkTypes.bookmark) => {
  // should we support comma separation? is it helpful?
  if (matchType(type, bookmark) && matches(bookmark, title)) return [bookmark];
  else if (bookmark.children)
    return bookmark.children
      ?.map((child) => search(child, title, type))
      .flat(1)
      .filter((result) => result !== null);
  else return null;
};

const getPath = async (root, bookmark) =>
  bookmark.parentId === root.id
    ? [bookmark]
    : [
        ...(await getPath(
          root,
          (
            await chrome.bookmarks.get.callback(bookmark.parentId)
          )[0]
        )),
        bookmark,
      ];

const getPathS = (path) => path.map((x) => x.title.split(",")[0]).join(delim);

chrome.omnibox.setDefaultSuggestion({
  description: ["[folder]", "[subfolder]", "...", "[bookmark]"].join(delim),
});

// todo oninputstarted

// todo test with s/
// https://stackoverflow.com/a/7918944
if (!String.prototype.encodeHTML) {
  String.prototype.encodeHTML = function () {
    return this.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };
}

async function handleInput(input, suggest) {
  const root = (await chrome.bookmarks.getTree.callback())[0];
  const bksmart = find(root, "bksmart", bookmarkTypes.folder);
  // const matches = search(bksmart, input, bookmarkTypes.bookmark); // todo: path parsing
  // const suggestions = await Promise.all(
  //   matches.map(async (match) => {
  //     const path = await getPath(bksmart, match);
  //     return {
  //       description: `${path.map((x) => x.title.split(",")[0]).join(" > ")} (${
  //         match.url
  //       })`, // how to structure this function-wise?
  //       content: getPathS(path),
  //     };
  //   })
  // );
  // suggest(suggestions);
  const components = input.split(delim);
  let node = bksmart;
  for (
    let i = 0, component = components[i];
    i < components.length;
    component = components[++i]
  ) {
    console.debug(node, component);
    if (node.children !== undefined) {
      node = node.children.find((child) => matches(child, component));
      if (node === undefined) {
        break;
      }
    } else {
      break;
    }
  }
  console.debug(input, node);
  if (node === undefined) {
    suggest([{ description: "No matches found.", content: "_" }]);
  } else if (node.url !== undefined) {
    const suggestion = [
      {
        description: `<dim>${input
          .split(delim)
          .slice(0, -1)
          .join(delim)}</dim><match>${input
          .split(delim)
          .at(-1)}</match> <url>${node.url.encodeHTML()}</url>`,
        content: [input, node.title].join(delim),
      },
    ];
    console.debug("suggesting", suggestion);
    suggest(suggestion);
  } else {
    const suggestions = node.children.map(
      (child) => ({
        description:
          `<dim>${input}</dim><match>${child.title}</match> ` +
          (child.url !== undefined
            ? `<url>${child.url}</url>`
            : `[${child.children.length} item${pluralS(
                child.children.length
              )}]`),
        content: [input, child.title].join(delim),
      })
      // ({ description: child.title, content: child.title })
    );
    console.debug("suggesting", suggestions);
    suggest(suggestions);
  }
}
chrome.omnibox.onInputChanged.addListener(handleInput);

chrome.omnibox.onInputEntered.addListener(async (input, disposition) => {
  const root = (await chrome.bookmarks.getTree.callback())[0];
  const bksmart = find(root, "bksmart", bookmarkTypes.folder);
  let url;
  if (input === "" || input === "_") {
    url = `chrome://bookmarks/?id=${bksmart.id}`;
  } else {
    const components = input.split(delim);
    let node = bksmart;
    for (
      let i = 0, component = components[i];
      i < components.length;
      component = components[++i]
    ) {
      console.debug(node, component);
      if (node.children !== undefined) {
        node = node.children.find((child) => matches(child, component));
        if (node === undefined) {
          break;
        }
      } else {
        break;
      }
    }
    if (node === undefined) {
      console.warn("could not match query:", input);
      return;
    }
    url = node.url ?? node?.children.find((child) => matches(child, "_")).url;
  }
  if (url === undefined) return;
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
