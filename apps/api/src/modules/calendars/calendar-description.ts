import sanitizeHtml from 'sanitize-html';

/** The only HTML trusted by the calendar UI is this allowlisted API output. */
export function calendarDescription(value?: string): string {
  if (typeof value !== 'string') return '';
  return sanitizeHtml(value.slice(0, 5000), {
    allowedTags: [
      'p',
      'div',
      'br',
      'span',
      'b',
      'strong',
      'i',
      'em',
      'u',
      's',
      'strike',
      'ul',
      'ol',
      'li',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'a',
      'hr',
      'pre',
      'code',
      'sub',
      'sup',
    ],
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attributes) => ({
        tagName: 'a',
        attribs: {
          ...attributes,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  }).trim();
}
