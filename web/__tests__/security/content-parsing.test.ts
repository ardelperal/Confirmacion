import { parseYamlSafe, parseFrontmatter, validateSessionFrontmatter } from '@/lib/yamlParser';
import { parseMarkdownSafe, processMarkdownContent, normalizeUrl } from '@/lib/markdownParser';

describe('Content Parsing Security Tests', () => {
  describe('YAML Parser Security', () => {
    test('should reject YAML with anchors and aliases', () => {
      const maliciousYaml = `
name: &anchor "test"
reference: *anchor
`;
      expect(() => parseYamlSafe(maliciousYaml)).toThrow('YAML anchors and aliases are not allowed');
    });

    test('should reject YAML with custom tags', () => {
      const maliciousYaml = `
value: !!python/object/apply:os.system ["rm -rf /"]
`;
      expect(() => parseYamlSafe(maliciousYaml)).toThrow('Custom YAML tags are not allowed');
    });

    test('should reject oversized YAML', () => {
      const largeYaml = 'key: "' + 'x'.repeat(60000) + '"';
      expect(() => parseYamlSafe(largeYaml)).toThrow('YAML content exceeds maximum size limit');
    });

    test('should reject deeply nested YAML', () => {
      let nestedYaml = 'root:';
      for (let i = 0; i < 15; i++) {
        nestedYaml += `\n${'  '.repeat(i + 1)}level${i}:`;
      }
      nestedYaml += `\n${'  '.repeat(16)}value: "deep"`;
      
      expect(() => parseYamlSafe(nestedYaml)).toThrow('YAML nesting depth exceeds maximum limit');
    });

    test('should sanitize control characters in YAML values', () => {
      const yamlWithControlChars = 'title: "Test\x00\x01\x1F"';
      const result = parseYamlSafe(yamlWithControlChars);
      expect(result.title).toBe('Test');
    });

    test('should parse safe YAML correctly', () => {
      const safeYaml = `
code: "A1"
title: "Test Session"
description: "A safe test session"
`;
      const result = parseYamlSafe(safeYaml);
      expect(result).toEqual({
        code: 'A1',
        title: 'Test Session',
        description: 'A safe test session'
      });
    });

    test('should validate session frontmatter structure', () => {
      const validFrontmatter = { code: 'A1', title: 'Test Session' };
      expect(() => validateSessionFrontmatter(validFrontmatter)).not.toThrow();

      const invalidCode = { code: 'X9', title: 'Test' };
      expect(() => validateSessionFrontmatter(invalidCode)).toThrow('Invalid session code format');

      const missingTitle = { code: 'A1' };
      expect(() => validateSessionFrontmatter(missingTitle)).toThrow('Missing required field');
    });
  });

  describe('Markdown Parser Security', () => {
    test('should neutralize script tags', async () => {
      const maliciousMarkdown = `
# Test
<script>alert('xss')</script>
Safe content
`;
      const result = await parseMarkdownSafe(maliciousMarkdown);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Safe content');
    });

    test('should neutralize event handlers', async () => {
      const maliciousMarkdown = `
[Click me](javascript:alert('xss'))
<img src="x" onerror="alert('xss')">
<div onclick="alert('xss')">Click</div>
`;
      const result = await parseMarkdownSafe(maliciousMarkdown);
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
    });

    test('should neutralize dangerous HTML elements', async () => {
      const maliciousMarkdown = `
<iframe src="https://evil.com"></iframe>
<object data="malicious.swf"></object>
<embed src="malicious.swf">
<form><input type="text"></form>
`;
      const result = await parseMarkdownSafe(maliciousMarkdown);
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
    });

    test('should preserve safe markdown elements', async () => {
      const safeMarkdown = `
# Heading 1
## Heading 2

**Bold text** and *italic text*

- List item 1
- List item 2

[Safe link](https://example.com)

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |

> Blockquote

\`\`\`
code block
\`\`\`
`;
      const result = await parseMarkdownSafe(safeMarkdown);
      expect(result).toContain('<h1>');
      expect(result).toContain('<h2>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('<table>');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('<pre>');
    });

    test('should add security attributes to external links', async () => {
      const markdown = '[External link](https://example.com)';
      const result = await parseMarkdownSafe(markdown);
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('target="_blank"');
    });

    test('should detect and warn about dangerous content', async () => {
      const dangerousMarkdown = `
# Test
<script>alert('xss')</script>
Safe content
`;
      const { html, warnings } = await processMarkdownContent(dangerousMarkdown);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Contenido potencialmente peligroso');
      expect(html).not.toContain('<script>');
    });

    test('should reject oversized markdown', async () => {
      const largeMarkdown = '#'.repeat(150000);
      await expect(parseMarkdownSafe(largeMarkdown)).rejects.toThrow('Markdown content exceeds maximum size limit');
    });
  });

  describe('URL Normalization Security', () => {
    test('should block javascript: URLs', () => {
      expect(normalizeUrl('javascript:alert(1)')).toBe('');
      expect(normalizeUrl('JAVASCRIPT:alert(1)')).toBe('');
      expect(normalizeUrl('  javascript:alert(1)  ')).toBe('');
    });

    test('should block data: URLs except safe images', () => {
      expect(normalizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(normalizeUrl('data:application/javascript,alert(1)')).toBe('');
      
      // Pero permitir imágenes data: válidas
      const validDataImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      expect(normalizeUrl(validDataImage)).toBe(validDataImage);
    });

    test('should block other dangerous protocols', () => {
      expect(normalizeUrl('vbscript:msgbox(1)')).toBe('');
      expect(normalizeUrl('file:///etc/passwd')).toBe('');
      expect(normalizeUrl('ftp://malicious.com')).toBe('');
      expect(normalizeUrl('jar:http://evil.com!/malicious.class')).toBe('');
    });

    test('should allow safe HTTP/HTTPS URLs', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
      expect(normalizeUrl('http://example.com/path?query=1')).toBe('http://example.com/path?query=1');
    });

    test('should allow safe mailto URLs', () => {
      expect(normalizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
      expect(normalizeUrl('mailto:invalid-email')).toBe('');
    });

    test('should block path traversal in relative URLs', () => {
      expect(normalizeUrl('../../../etc/passwd')).toBe('');
      expect(normalizeUrl('../../malicious.html')).toBe('');
      expect(normalizeUrl('/absolute/path')).toBe('');
    });

    test('should allow safe relative URLs', () => {
      expect(normalizeUrl('image.png')).toBe('image.png');
      expect(normalizeUrl('folder/file.html')).toBe('folder/file.html');
    });

    test('should handle malformed URLs', () => {
      expect(normalizeUrl('http://[invalid')).toBe('');
      expect(normalizeUrl('https://')).toBe('');
      expect(normalizeUrl('')).toBe('');
      expect(normalizeUrl(null as any)).toBe('');
    });

    test('should remove control characters', () => {
      expect(normalizeUrl('https://example.com\x00\x01')).toBe('https://example.com/');
      expect(normalizeUrl('  https://example.com  \n')).toBe('https://example.com/');
    });
  });

  describe('Frontmatter Integration', () => {
    test('should parse valid frontmatter and markdown', () => {
      const content = `---
code: "A1"
title: "Test Session"
---

# Content

This is **safe** content.`;
      
      const { frontmatter, body } = parseFrontmatter(content);
      expect(frontmatter.code).toBe('A1');
      expect(frontmatter.title).toBe('Test Session');
      expect(body).toContain('# Content');
    });

    test('should reject malicious frontmatter', () => {
      const maliciousContent = `---
code: "A1"
title: &anchor "Test"
ref: *anchor
---

# Content`;
      
      expect(() => parseFrontmatter(maliciousContent)).toThrow('YAML anchors and aliases are not allowed');
    });

    test('should handle content without frontmatter', () => {
      const content = '# Just Markdown\n\nNo frontmatter here.';
      const { frontmatter, body } = parseFrontmatter(content);
      expect(frontmatter).toEqual({});
      expect(body).toBe(content);
    });

    test('should reject oversized frontmatter', () => {
      const largeFrontmatter = `---\ncode: "A1"\ntitle: "${'x'.repeat(15000)}"\n---\n\n# Content`;
      expect(() => parseFrontmatter(largeFrontmatter)).toThrow('Frontmatter exceeds maximum size limit');
    });
  });
});