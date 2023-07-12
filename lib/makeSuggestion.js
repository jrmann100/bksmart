// suggestions are encoded in XML, but the content of the suggestions

import { DELIM } from "./util.js";

// (URLs, paths) may contain some XML-unsafe characters.
const escapeXML = (string) =>
  string
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

// add a suffix to pluralize a word if the
// item count is not exactly 1; as in,
// 0 items, 1 item, 2 items
const pluralize = (count, suffix = "s") => (count !== 1 ? suffix : "");

export default (folder, node) => ({
  description:
    `<dim>${escapeXML(folder)}</dim><match>${escapeXML(node.title)}</match> ` +
    (node.url !== undefined
      ? `<url>${escapeXML(node.url)}</url>`
      : `[${node.children.length} item${pluralize(node.children.length)}]`),
  content: [folder, node.title].join(DELIM),
});
