/**
 * Minimal markdown → Ink renderer.
 *
 * We use `marked.lexer()` to tokenize and then map tokens to Ink primitives
 * (Box / Text) directly. This avoids passing ANSI-coded output from
 * marked-terminal into <Text>, which Ink would re-tokenize and strip.
 *
 * Supported (the 90% case for assistant responses):
 *   - headings (1–3 depth → bold + size hint)
 *   - paragraphs with `**bold**`, `*em*`, `` `code` ``
 *   - fenced code blocks
 *   - unordered/ordered lists (one level)
 *   - inline links (printed as "text (url)")
 *   - blockquotes
 *
 * Anything more exotic falls back to the raw text. The streaming path renders
 * partial buffers verbatim — only the post-stream finalization renders Markdown.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { marked, type Tokens } from 'marked';

/** Token types we know how to render — anything else uses raw text fallback. */
type MdToken = Tokens.Generic;

export function renderMarkdown(source: string): React.ReactNode {
  let tokens: MdToken[];
  try {
    tokens = marked.lexer(source);
  } catch {
    return <Text>{source}</Text>;
  }
  return (
    <Box flexDirection="column">
      {tokens.map((tok, i) => (
        <BlockToken key={i} token={tok} />
      ))}
    </Box>
  );
}

function BlockToken({ token }: { token: MdToken }): React.JSX.Element | null {
  switch (token.type) {
    case 'heading': {
      const t = token as Tokens.Heading;
      return (
        <Box marginTop={1}>
          <Text bold color="cyan">
            {'#'.repeat(Math.min(t.depth, 6))} {renderInline(t.tokens ?? [{ type: 'text', text: t.text, raw: t.text }] as MdToken[])}
          </Text>
        </Box>
      );
    }
    case 'paragraph': {
      const t = token as Tokens.Paragraph;
      return (
        <Box>
          <Text>{renderInline(t.tokens ?? [])}</Text>
        </Box>
      );
    }
    case 'code': {
      const t = token as Tokens.Code;
      return (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
          marginTop={1}
          marginBottom={1}
        >
          {t.lang ? (
            <Text dimColor>{t.lang}</Text>
          ) : null}
          <Text>{t.text}</Text>
        </Box>
      );
    }
    case 'blockquote': {
      const t = token as Tokens.Blockquote;
      return (
        <Box marginLeft={2}>
          <Text dimColor italic>
            {t.tokens ? renderInline(t.tokens as MdToken[]) : t.text}
          </Text>
        </Box>
      );
    }
    case 'list': {
      const t = token as Tokens.List;
      return (
        <Box flexDirection="column">
          {t.items.map((item, i) => (
            <Box key={i}>
              <Text>
                {t.ordered ? `${Number(t.start ?? 1) + i}.` : '•'}{' '}
                {item.tokens
                  ? renderInline(
                      // Lists nest "text" tokens that themselves have inner tokens; flatten.
                      item.tokens.flatMap((tt) =>
                        (tt as Tokens.Generic).type === 'text' && (tt as Tokens.Text).tokens
                          ? ((tt as Tokens.Text).tokens as MdToken[])
                          : [tt as MdToken],
                      ),
                    )
                  : item.text}
              </Text>
            </Box>
          ))}
        </Box>
      );
    }
    case 'space':
      return null;
    case 'hr':
      return (
        <Box marginY={1}>
          <Text dimColor>{'─'.repeat(40)}</Text>
        </Box>
      );
    default: {
      // Unknown block — fall back to raw text.
      const raw = (token as Tokens.Generic).raw;
      if (!raw) return null;
      return (
        <Box>
          <Text>{raw}</Text>
        </Box>
      );
    }
  }
}

/** Render an inline-token list to a single React node (composed Text children). */
function renderInline(tokens: MdToken[]): React.ReactNode {
  return tokens.map((tok, i) => <InlineToken key={i} token={tok} />);
}

function InlineToken({ token }: { token: MdToken }): React.JSX.Element {
  switch (token.type) {
    case 'text': {
      const t = token as Tokens.Text;
      if (t.tokens && t.tokens.length > 0) {
        return <>{renderInline(t.tokens as MdToken[])}</>;
      }
      return <Text>{t.text}</Text>;
    }
    case 'strong': {
      const t = token as Tokens.Strong;
      return <Text bold>{renderInline((t.tokens as MdToken[]) ?? [{ type: 'text', text: t.text, raw: t.raw } as MdToken])}</Text>;
    }
    case 'em': {
      const t = token as Tokens.Em;
      return <Text italic>{renderInline((t.tokens as MdToken[]) ?? [{ type: 'text', text: t.text, raw: t.raw } as MdToken])}</Text>;
    }
    case 'codespan': {
      const t = token as Tokens.Codespan;
      return <Text backgroundColor="gray" color="white">{` ${t.text} `}</Text>;
    }
    case 'link': {
      const t = token as Tokens.Link;
      return (
        <Text>
          {renderInline((t.tokens as MdToken[]) ?? [{ type: 'text', text: t.text, raw: t.raw } as MdToken])}
          <Text dimColor> ({t.href})</Text>
        </Text>
      );
    }
    case 'br':
      return <Text>{'\n'}</Text>;
    default:
      return <Text>{(token as Tokens.Generic).raw ?? ''}</Text>;
  }
}
