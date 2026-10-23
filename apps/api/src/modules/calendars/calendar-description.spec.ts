import { calendarDescription } from './calendar-description';

describe('calendar description HTML', () => {
  it('preserves formatting, entities, lists, and safe links', () => {
    const html = calendarDescription(
      '<p><strong>Program</strong> &amp; <em>echipament</em><br><u>Important</u></p>' +
        '<ul><li>Bocanci</li></ul><ol><li>Înscriere</li></ol>' +
        '<a href="https://example.test/inscriere?a=1&amp;b=2" title="Înscriere">Formular</a>',
    );
    expect(html).toContain(
      '<strong>Program</strong> &amp; <em>echipament</em>',
    );
    expect(html).toContain('<br /><u>Important</u>');
    expect(html).toContain('<ul><li>Bocanci</li></ul>');
    expect(html).toContain('<ol><li>Înscriere</li></ol>');
    expect(html).toContain('href="https://example.test/inscriere?a=1&amp;b=2"');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(calendarDescription('Întâlnire\nAducem apă & gustări.')).toBe(
      'Întâlnire\nAducem apă &amp; gustări.',
    );
  });

  it.each([
    '<script>alert(1)</script>',
    '<style>body{display:none}</style>',
    '<iframe src="https://example.test"></iframe>',
    '<img src=x onerror="alert(1)">',
    '<svg onload="alert(1)"><script>alert(1)</script></svg>',
    '<form><input autofocus onfocus="alert(1)"></form>',
  ])('removes executable and embedded content: %s', (payload) => {
    expect(calendarDescription(`${payload}<p>Detalii</p>`)).toBe(
      '<p>Detalii</p>',
    );
  });

  it.each([
    'javascript:alert(1)',
    'jav&#x61;script:alert(1)',
    'data:text/html,test',
    '//example.test',
  ])('removes unsafe link destinations: %s', (href) => {
    const html = calendarDescription(
      `<a href="${href}" onclick="alert(1)" style="color:red" class="overlay" id="login">Detalii</a>`,
    );
    expect(html).not.toMatch(/href=|onclick=|style=|class=|id=/);
    expect(html).toContain('Detalii</a>');
  });

  it('limits provider input and handles missing descriptions', () => {
    expect(calendarDescription()).toBe('');
    expect(calendarDescription('x'.repeat(6000))).toHaveLength(5000);
    expect(calendarDescription('<b>Text')).toBe('<b>Text</b>');
  });
});
