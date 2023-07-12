export const DELIM = "";

// if the node has children, it's a folder.
// otherwise it's a leaf (bookmark).
export const isFolder = (node) => node.children !== undefined;
