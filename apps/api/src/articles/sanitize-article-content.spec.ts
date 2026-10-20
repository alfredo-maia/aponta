import { sanitizeArticleContent } from './sanitize-article-content';

describe('sanitizeArticleContent', () => {
  it('removes <script> tags and their content entirely', () => {
    const result = sanitizeArticleContent(
      '<p>hello</p><script>alert(1)</script>',
    );
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert(1)');
    expect(result).toContain('<p>hello</p>');
  });

  it('strips the onerror handler from an <img> but keeps the tag', () => {
    const result = sanitizeArticleContent(
      '<img src="x" onerror="alert(1)">',
    );
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert(1)');
    expect(result).toContain('<img');
    expect(result).toContain('src="x"');
  });

  it('neutralizes a javascript: href on an <a> tag', () => {
    const result = sanitizeArticleContent(
      '<a href="javascript:alert(1)">click me</a>',
    );
    expect(result).not.toContain('javascript:');
  });

  it('neutralizes a javascript: src on an <img> tag', () => {
    const result = sanitizeArticleContent(
      '<img src="javascript:alert(1)">',
    );
    expect(result).not.toContain('javascript:');
  });

  it('removes <style> tags and their content entirely', () => {
    const result = sanitizeArticleContent(
      '<p>hello</p><style>body{background:url(x)}</style>',
    );
    expect(result).not.toContain('<style');
    expect(result).not.toContain('background:url');
  });

  it('keeps a legitimate table intact', () => {
    const html =
      '<table><thead><tr><th colspan="2">H</th></tr></thead><tbody><tr><td>a</td><td>b</td></tr></tbody></table>';
    const result = sanitizeArticleContent(html);
    expect(result).toContain('<table>');
    expect(result).toContain('<th colspan="2">H</th>');
    expect(result).toContain('<td>a</td>');
    expect(result).toContain('<td>b</td>');
  });

  it('keeps a text-align style on a <p>', () => {
    const result = sanitizeArticleContent(
      '<p style="text-align:center">centered</p>',
    );
    expect(result).toContain('text-align:center');
    expect(result).toContain('centered');
  });

  it('keeps a hex color style on a <span>', () => {
    const result = sanitizeArticleContent(
      '<span style="color:#ff0000">red</span>',
    );
    expect(result).toContain('color:#ff0000');
  });

  it('keeps an rgb() background-color style', () => {
    const result = sanitizeArticleContent(
      '<p style="background-color:rgb(255, 0, 0)">bg</p>',
    );
    expect(result).toContain('background-color:rgb(255, 0, 0)');
  });

  it('strips disallowed CSS properties (e.g. position) while keeping allowed ones', () => {
    const result = sanitizeArticleContent(
      '<p style="position:fixed;color:#000000">x</p>',
    );
    expect(result).not.toContain('position');
    expect(result).toContain('color:#000000');
  });

  it('keeps <mark> highlighting intact', () => {
    const result = sanitizeArticleContent('<mark>highlighted</mark>');
    expect(result).toBe('<mark>highlighted</mark>');
  });

  it('keeps basic formatting tags intact', () => {
    const html = '<p><strong>bold</strong> <em>em</em> <u>u</u> <s>s</s></p>';
    expect(sanitizeArticleContent(html)).toBe(html);
  });

  it('allows http, https and mailto links', () => {
    expect(sanitizeArticleContent('<a href="https://example.com">x</a>')).toContain(
      'href="https://example.com"',
    );
    expect(sanitizeArticleContent('<a href="mailto:a@b.com">x</a>')).toContain(
      'href="mailto:a@b.com"',
    );
  });
});
