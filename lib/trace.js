// trace a path input within the tree starting at the root (bksmart).
// return the deepest node which was reached,

import { DELIM, isFolder } from "./util.js";

// alongside the total number of nodes traversed.
export default (bksmart, input) => {
  const components = input.split(DELIM);
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
};
