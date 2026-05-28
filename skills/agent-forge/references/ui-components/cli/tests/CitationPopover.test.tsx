import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import {
  CitationFooter,
  CitationPopover,
  type Citation,
} from '../CitationPopover.js';

const citations: Citation[] = [
  { index: 1, title: 'Karpathy LLM wiki', source: 'https://llm-wiki.md', excerpt: 'compounding kb' },
  { index: 2, title: 'Pragmatic Programmer', source: 'book' },
];

describe('CitationPopover / CitationFooter', () => {
  it('renders body content unchanged', () => {
    const { lastFrame } = render(
      <CitationFooter citations={citations}>
        <Text>Body with marker [1] and [2].</Text>
      </CitationFooter>,
    );
    expect(lastFrame() ?? '').toContain('Body with marker [1] and [2].');
  });

  it('renders the citations footer with numbered entries', () => {
    const { lastFrame } = render(
      <CitationFooter citations={citations}>
        <Text>body</Text>
      </CitationFooter>,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('Citations');
    expect(out).toContain('[1] Karpathy LLM wiki');
    expect(out).toContain('https://llm-wiki.md');
    expect(out).toContain('compounding kb');
    expect(out).toContain('[2] Pragmatic Programmer');
  });

  it('skips the footer block when there are no citations', () => {
    const { lastFrame } = render(
      <CitationFooter citations={[]}>
        <Text>just body</Text>
      </CitationFooter>,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('just body');
    expect(out).not.toContain('Citations');
  });

  it('exports CitationPopover as an alias to CitationFooter', () => {
    expect(CitationPopover).toBe(CitationFooter);
  });
});
