import { isFolder } from "./util.js";

// perform a queue-based breadth-first search for the bksmart node.
export default async () => {
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
