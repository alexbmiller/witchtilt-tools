/**
 * Riftbound decklist parser (SPEC_decks_v0.1 §2-§3).
 *
 * Input: a pasted decklist as text. Output: structured cards + rune counts +
 * warnings/errors. The math layer never sees the raw text.
 *
 * Format (verified 2026-05-11 against Mobalytics tournament exports and Riot's
 * official organized-play deck recaps):
 *
 *   - Each non-blank, non-comment line is either a section header or
 *     `<count> <card name>`.
 *   - Lines whose name matches `<Domain> Rune` (case-insensitive, where
 *     Domain ∈ Fury|Mind|Chaos|Body|Calm|Order) are runes, summed into
 *     RuneCounts by color. Domain ↔ color mapping is canonical per SPEC §1.
 *   - Comments: lines starting with `//` or `#` are ignored.
 *   - Blank lines are ignored.
 *   - A line that doesn't start with a digit is treated as a section header
 *     (e.g., `Main Deck`, `Sideboard`, `Sideboard:`, `Sideboard (15)`,
 *     `Champions`, `Battlefields`). The label becomes the section tag for
 *     every subsequent card entry until the next header. Default section
 *     is "Main Deck" if no header has been seen yet.
 *   - Duplicate entries within the same section are summed with a warning.
 *   - Rune-pool total is reported as `totalRunes`; a warning fires if it's
 *     nonzero and ≠ 12 (standard pool size).
 *
 * Sideboards never affect mana-curve math — the curve only reads `runes`,
 * which is independent of section. We surface sideboard entries so the UI
 * can list them, nothing more.
 */

import { COLORS, type Color } from './cost-parser';

export interface DeckEntry {
  count: number;
  name: string;
  section: string;
}

export type RuneCounts = Record<Color, number>;

export interface ParsedDeck {
  cards: DeckEntry[];
  runes: RuneCounts;
  totalCards: number;
  totalRunes: number;
  warnings: string[];
  errors: string[];
}

const RUNE_DOMAIN_TO_COLOR: Readonly<Record<string, Color>> = {
  fury: 'R',
  mind: 'B',
  chaos: 'P',
  body: 'O',
  calm: 'G',
  order: 'Y',
};

const SECTION_LABEL_NORMALISATION: Readonly<Record<string, string>> = {
  'main deck': 'Main Deck',
  maindeck: 'Main Deck',
  main: 'Main Deck',
  sideboard: 'Sideboard',
  side: 'Sideboard',
  runes: 'Runes',
  'rune deck': 'Runes',
  'rune pool': 'Runes',
  champions: 'Champions',
  champion: 'Champions',
  legends: 'Legends',
  legend: 'Legends',
  battlefields: 'Battlefields',
  battlefield: 'Battlefields',
  spells: 'Spells',
  units: 'Units',
};

const DEFAULT_SECTION = 'Main Deck';

function emptyRunes(): RuneCounts {
  return { R: 0, B: 0, P: 0, O: 0, G: 0, Y: 0 };
}

function normaliseSectionLabel(raw: string): string {
  const cleaned = raw
    .replace(/[:()]/g, ' ')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (cleaned in SECTION_LABEL_NORMALISATION) {
    return SECTION_LABEL_NORMALISATION[cleaned];
  }
  return raw.replace(/[:]+$/, '').trim();
}

function matchRune(name: string): { kind: 'known'; color: Color } | { kind: 'unknown'; domain: string } | null {
  const m = name.match(/^(\S+)\s+Rune$/i);
  if (!m) return null;
  const domain = m[1].toLowerCase();
  const color = RUNE_DOMAIN_TO_COLOR[domain];
  if (color) return { kind: 'known', color };
  return { kind: 'unknown', domain: m[1] };
}

export function parseDecklist(input: string): ParsedDeck {
  const cards: DeckEntry[] = [];
  const runes = emptyRunes();
  const warnings: string[] = [];
  const errors: string[] = [];

  let currentSection = DEFAULT_SECTION;

  const lines = input.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (line === '') continue;
    if (line.startsWith('//') || line.startsWith('#')) continue;

    if (!/^\d/.test(line)) {
      currentSection = normaliseSectionLabel(line);
      continue;
    }

    const match = line.match(/^(\d+)\s+(.+?)\s*$/);
    if (!match) {
      errors.push(`Line ${i + 1}: couldn't parse "${raw}".`);
      continue;
    }

    const count = parseInt(match[1], 10);
    const name = match[2];

    if (count <= 0) {
      warnings.push(`Line ${i + 1}: ignored (count was ${count}).`);
      continue;
    }

    const rune = matchRune(name);
    if (rune) {
      if (rune.kind === 'known') {
        runes[rune.color] += count;
      } else {
        warnings.push(`Line ${i + 1}: unknown rune domain "${rune.domain}" — excluded from rune count.`);
      }
      continue;
    }

    cards.push({ count, name, section: currentSection });
  }

  const merged = mergeDuplicates(cards, warnings);

  const totalCards = merged.reduce((acc, e) => acc + e.count, 0);
  const totalRunes = COLORS.reduce((acc, c) => acc + runes[c], 0);

  if (totalRunes > 0 && totalRunes !== 12) {
    warnings.push(
      `Rune pool has ${totalRunes} card${totalRunes === 1 ? '' : 's'}; standard is 12. Probabilities below assume ${totalRunes}.`,
    );
  }

  return { cards: merged, runes, totalCards, totalRunes, warnings, errors };
}

function mergeDuplicates(entries: DeckEntry[], warnings: string[]): DeckEntry[] {
  const seen = new Map<string, DeckEntry>();
  const order: string[] = [];
  for (const entry of entries) {
    const key = `${entry.section}::${entry.name.toLowerCase()}`;
    const existing = seen.get(key);
    if (existing) {
      existing.count += entry.count;
      warnings.push(
        `Duplicate entry "${entry.name}" in ${entry.section} — summed counts to ${existing.count}.`,
      );
    } else {
      const copy = { ...entry };
      seen.set(key, copy);
      order.push(key);
    }
  }
  return order.map((k) => seen.get(k)!);
}
