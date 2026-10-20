import sanitizeHtml from 'sanitize-html';

/**
 * Article content is authored through a rich-text editor (Tiptap) and
 * rendered back as raw HTML with no further escaping on either the API
 * or the web client. Before this sanitizer existed, that was a direct
 * stored-XSS hole: an AGENT (or anyone able to reach the create/update
 * endpoints) could persist `<script>`/`onerror`/`javascript:` payloads
 * that would execute for every later reader of the article, including
 * CLIENT users with no privileged role at all.
 *
 * The allowlist below covers everything the current editor toolbar (and
 * the TextAlign/Color extensions landing alongside this change on the
 * frontend) can legitimately produce. Anything outside it — scripts,
 * event handler attributes, `javascript:`/`data:` URLs, unlisted CSS
 * properties — is stripped, never merely escaped.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'mark',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'span',
];

const STYLED_TAGS = [
  'span',
  'p',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'td',
  'th',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
};

for (const tag of STYLED_TAGS) {
  ALLOWED_ATTRIBUTES[tag] = [...(ALLOWED_ATTRIBUTES[tag] ?? []), 'style'];
}

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const RGB_COLOR = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i;
const TEXT_ALIGN = /^(left|right|center|justify)$/i;

export function sanitizeArticleContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    allowedStyles: {
      '*': {
        color: [HEX_COLOR, RGB_COLOR],
        'background-color': [HEX_COLOR, RGB_COLOR],
        'text-align': [TEXT_ALIGN],
      },
    },
  });
}
