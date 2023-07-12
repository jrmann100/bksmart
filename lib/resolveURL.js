import getBksmart from "./getBksmart.js";
import trace from "./trace.js";
import { isFolder } from "./util.js";

// get a URL to this node in the bookmarks index.
const folderURL = (node) => `chrome://bookmarks/?id=${node.id}`;

export default async (input) => {
  const bksmart = await getBksmart();
  // if the input is whitespace or an underscore, go bksmart in the bookmarks index.
  if (input === "" || input === "_") {
    return folderURL(bksmart);
  }
  const [node, matched] = trace(bksmart, input);
  // if we could not match the whole path, then fail silently.
  if (matched < input.length) {
    return;
  }
  // if this is a leaf, then the URL is the leaf's URL.
  if (!isFolder(node)) {
    return node.url;
  }
  // else this is a folder.
  // if there is a child with an underscore as the title for this folder,
  // then that child's URL is the URL which represents the folder.
  const underscored = node.children.find(
    (child) => !isFolder(child) && child.title === "_"
  );
  if (underscored !== undefined) {
    return underscored.url;
  }
  // otherwise, just open the folder in the bookmarks index.
  return folderURL(node);
};
