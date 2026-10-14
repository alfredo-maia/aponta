import { createElement, type ReactNode } from 'react';

const HTML_TAG_RE = /<\/?(p|div|span|br|strong|b|em|i|u|ul|ol|li|a|img|h[1-3]|blockquote)\b/i;
const MARKDOWN_IMAGE_RE = /!\[(.*?)\]\((.*?)\)/g;

const ALLOWED_TAGS = new Set([
  'p',
  'div',
  'span',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'h1',
  'h2',
  'h3',
  'blockquote',
]);

export function isBlankRichText(html: string | null | undefined): boolean {
  if (!html) return true;
  const withImageMarker = html.replace(/<img\b[^>]*>/gi, ' IMG ');
  const text = withImageMarker
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
}

export function isSafeMediaUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const url = raw.trim();
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return false;
  }
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  return /^https?:\/\//i.test(url);
}

function InlineImage({ src, alt }: { src: string; alt: string }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block my-4">
      <img
        src={src}
        alt={alt || 'Evidência'}
        className="block mx-auto max-h-80 w-auto max-w-full rounded-lg object-contain"
        loading="lazy"
      />
    </a>
  );
}

function renderNodes(nodes: NodeListOf<ChildNode> | ChildNode[]): ReactNode[] {
  return Array.from(nodes)
    .map((node, index) => renderNode(node, index))
    .filter((node) => node !== null);
}

function renderNode(node: ChildNode, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = renderNodes(el.childNodes);

  if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object') {
    return null;
  }

  if (tag === 'img') {
    const src = el.getAttribute('src');
    if (!isSafeMediaUrl(src)) return null;
    return <InlineImage key={key} src={src!} alt={el.getAttribute('alt') || ''} />;
  }

  if (tag === 'br') {
    return <br key={key} />;
  }

  if (tag === 'a') {
    const href = el.getAttribute('href');
    if (!isSafeMediaUrl(href)) {
      return <span key={key}>{children}</span>;
    }
    return (
      <a
        key={key}
        href={href!}
        target="_blank"
        rel="noreferrer"
        className="text-brand-600 underline hover:text-brand-800"
      >
        {children}
      </a>
    );
  }

  if (!ALLOWED_TAGS.has(tag)) {
    return <span key={key}>{children}</span>;
  }

  const className =
    tag === 'p'
      ? 'whitespace-pre-wrap text-gray-800 leading-relaxed'
      : tag === 'ul'
        ? 'list-disc pl-5 space-y-1'
        : tag === 'ol'
          ? 'list-decimal pl-5 space-y-1'
          : tag === 'blockquote'
            ? 'border-l-2 border-gray-200 pl-3 text-gray-700 italic'
            : undefined;

  return createElement(tag, { key, className }, children);
}

function HtmlContent({ html }: { html: string }) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return <div className="space-y-2">{renderNodes(parsed.body.childNodes)}</div>;
}

function MarkdownContent({ content }: { content: string }) {
  const parts: Array<{ type: 'text' | 'image'; content: string; alt?: string }> = [];
  let lastIndex = 0;
  const imageRegex = new RegExp(MARKDOWN_IMAGE_RE.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'image', alt: match[1], content: match[2] });
    lastIndex = imageRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.substring(lastIndex) });
  }

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          if (!part.content.trim()) return null;
          return (
            <div key={idx} className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {part.content.trim()}
            </div>
          );
        }
        if (!isSafeMediaUrl(part.content)) return null;
        return <InlineImage key={idx} src={part.content} alt={part.alt || ''} />;
      })}
    </div>
  );
}

export function RichContentView({ content }: { content: string }) {
  if (!content) {
    return null;
  }

  if (HTML_TAG_RE.test(content)) {
    return <HtmlContent html={content} />;
  }

  if (content.includes('![')) {
    return <MarkdownContent content={content} />;
  }

  return <span className="whitespace-pre-wrap">{content}</span>;
}
