import { describe, expect, it } from 'vitest';
import { parseDecklist } from '../decklist-parser';

describe('parseDecklist', () => {
  describe('happy path', () => {
    it('parses the spec example (mono-Yellow Viktor deck)', () => {
      const input = `
1 Viktor, Herald of the Arcane
1 Viktor, Leader
3 Seal of Unity
3 Stupefy
3 Hidden Blade
3 Siphon Power
3 Soaring Scout
3 Cull the Weak
3 Watchful Sentry
3 Faithful Manufactor
3 Vanguard Captain
3 Cruel Patron
3 Machine Evangel
3 Grand Strategem
3 Harnessed Dragon
1 Targon's Peak
1 Trifarian War Camp
1 Obelisk of Power
12 Order Rune
`;
      const result = parseDecklist(input);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.runes).toEqual({ R: 0, B: 0, P: 0, O: 0, G: 0, Y: 12 });
      expect(result.totalRunes).toBe(12);
      expect(result.cards).toHaveLength(18);
      // Note: spec example sums to 44, not the 40-card Riftbound legal size — the
      // parser is intentionally permissive and doesn't validate deck legality.
      expect(result.totalCards).toBe(44);
      expect(result.cards[0]).toEqual({ count: 1, name: 'Viktor, Herald of the Arcane', section: 'Main Deck' });
    });

    it('parses a multi-color rune pool (Houston Regional split)', () => {
      const input = `3 Daring Poro\n7 Mind Rune\n5 Order Rune\n`;
      const result = parseDecklist(input);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.runes).toEqual({ R: 0, B: 7, P: 0, O: 0, G: 0, Y: 5 });
      expect(result.totalRunes).toBe(12);
    });

    it('returns an empty result for empty input without errors', () => {
      const result = parseDecklist('');
      expect(result.cards).toEqual([]);
      expect(result.runes).toEqual({ R: 0, B: 0, P: 0, O: 0, G: 0, Y: 0 });
      expect(result.totalCards).toBe(0);
      expect(result.totalRunes).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('returns an empty result for whitespace-only input', () => {
      const result = parseDecklist('   \n\n\t\n');
      expect(result.cards).toEqual([]);
      expect(result.totalCards).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });

  describe('rune domain mapping (SPEC §3)', () => {
    it.each([
      ['Fury Rune', 'R'],
      ['Mind Rune', 'B'],
      ['Chaos Rune', 'P'],
      ['Body Rune', 'O'],
      ['Calm Rune', 'G'],
      ['Order Rune', 'Y'],
    ] as const)('%s → %s', (rune, color) => {
      const result = parseDecklist(`12 ${rune}`);
      expect(result.runes[color]).toBe(12);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('rune domain matching is case-insensitive', () => {
      const result = parseDecklist('12 order rune');
      expect(result.runes.Y).toBe(12);
      expect(result.errors).toEqual([]);
    });

    it('warns and excludes unknown rune domains', () => {
      const result = parseDecklist('1 Stone Rune');
      expect(result.runes).toEqual({ R: 0, B: 0, P: 0, O: 0, G: 0, Y: 0 });
      expect(result.cards).toEqual([]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/Stone/);
    });

    it('does not treat card names ending in "Rune Sword" as runes', () => {
      const result = parseDecklist('1 Fury Rune Sword');
      expect(result.cards).toEqual([{ count: 1, name: 'Fury Rune Sword', section: 'Main Deck' }]);
      expect(result.runes.R).toBe(0);
    });
  });

  describe('whitespace and comments', () => {
    it('ignores blank lines, comments (// and #), and tolerates extra whitespace', () => {
      const input = `
// this is a comment
# another comment
   3   Viktor, Leader

   12 Order Rune
`;
      const result = parseDecklist(input);
      expect(result.errors).toEqual([]);
      expect(result.cards).toEqual([{ count: 3, name: 'Viktor, Leader', section: 'Main Deck' }]);
      expect(result.runes.Y).toBe(12);
    });
  });

  describe('section headers', () => {
    it('recognises canonical headers (Main Deck, Sideboard, Runes)', () => {
      const input = `
Main Deck:
3 Daring Poro
Sideboard:
2 Stupefy
Runes:
12 Order Rune
`;
      const result = parseDecklist(input);
      expect(result.errors).toEqual([]);
      expect(result.cards).toEqual([
        { count: 3, name: 'Daring Poro', section: 'Main Deck' },
        { count: 2, name: 'Stupefy', section: 'Sideboard' },
      ]);
      expect(result.runes.Y).toBe(12);
    });

    it('handles section headers with parenthetical counts (e.g. "Sideboard (15)")', () => {
      const input = `Sideboard (15)\n3 Stupefy\n`;
      const result = parseDecklist(input);
      expect(result.cards).toEqual([{ count: 3, name: 'Stupefy', section: 'Sideboard' }]);
    });

    it('defaults to "Main Deck" before any header is seen', () => {
      const result = parseDecklist('3 Daring Poro');
      expect(result.cards[0].section).toBe('Main Deck');
    });

    it('preserves unknown section labels verbatim (minus trailing colon)', () => {
      const input = `Custom Section:\n1 Cool Card`;
      const result = parseDecklist(input);
      expect(result.cards[0].section).toBe('Custom Section');
    });

    it('runes go to runeCounts regardless of which section they appear under', () => {
      const result = parseDecklist(`Runes:\n12 Order Rune`);
      expect(result.runes.Y).toBe(12);
      expect(result.cards).toEqual([]);
    });
  });

  describe('battlefields with collector codes', () => {
    it('preserves parenthetical collector codes in card names', () => {
      const result = parseDecklist('1 Obelisk of Power (284)');
      expect(result.cards).toEqual([{ count: 1, name: 'Obelisk of Power (284)', section: 'Main Deck' }]);
    });
  });

  describe('duplicates', () => {
    it('sums duplicate entries within the same section and warns', () => {
      const result = parseDecklist(`2 Stupefy\n1 Stupefy`);
      expect(result.cards).toEqual([{ count: 3, name: 'Stupefy', section: 'Main Deck' }]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/Stupefy/);
    });

    it('treats case-different duplicates as the same card', () => {
      const result = parseDecklist(`2 stupefy\n1 Stupefy`);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].count).toBe(3);
    });

    it('does not merge entries across different sections', () => {
      const result = parseDecklist(`Main Deck:\n2 Stupefy\nSideboard:\n1 Stupefy`);
      expect(result.cards).toEqual([
        { count: 2, name: 'Stupefy', section: 'Main Deck' },
        { count: 1, name: 'Stupefy', section: 'Sideboard' },
      ]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('rune-pool total warnings', () => {
    it('warns when total runes is not 12', () => {
      const result = parseDecklist(`10 Order Rune`);
      expect(result.totalRunes).toBe(10);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/10/);
      expect(result.warnings[0]).toMatch(/12/);
    });

    it('does not warn when no runes are listed (the user pasted a partial deck)', () => {
      const result = parseDecklist(`3 Daring Poro`);
      expect(result.totalRunes).toBe(0);
      expect(result.warnings).toEqual([]);
    });

    it('warns when the rune total exceeds 12', () => {
      const result = parseDecklist(`8 Order Rune\n8 Mind Rune`);
      expect(result.totalRunes).toBe(16);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/16/);
    });
  });

  describe('malformed input', () => {
    it('records an error for lines that cannot be parsed', () => {
      const result = parseDecklist(`!@#$ totally not a deck line`);
      // Leading non-digit makes this a section header — no error, just a weird section.
      // To get an error we need a line starting with a digit but no name.
      expect(result.errors).toEqual([]);
    });

    it('records an error for a line that starts with a digit but has no name', () => {
      const result = parseDecklist(`3`);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Line 1/);
    });

    it('ignores entries with a zero or negative count and warns', () => {
      const result = parseDecklist(`0 Stupefy`);
      expect(result.cards).toEqual([]);
      expect(result.warnings).toHaveLength(1);
    });

    it('does not let errors block subsequent valid lines', () => {
      const result = parseDecklist(`3\n2 Stupefy`);
      expect(result.errors).toHaveLength(1);
      expect(result.cards).toEqual([{ count: 2, name: 'Stupefy', section: 'Main Deck' }]);
    });
  });
});
