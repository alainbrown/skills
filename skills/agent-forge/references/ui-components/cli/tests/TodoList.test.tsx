import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { TodoList, type Todo } from '../TodoList.js';

describe('TodoList', () => {
  it('renders the empty state when there are no todos', () => {
    const { lastFrame } = render(<TodoList todos={[]} />);
    const out = lastFrame() ?? '';
    expect(out).toContain('Todos');
    expect(out).toContain('0/0 done');
    expect(out).toContain('no todos');
  });

  it('renders status markers for each item and a count summary', () => {
    const todos: Todo[] = [
      { text: 'write the spec', status: 'completed' },
      { text: 'ship the feature', status: 'in_progress' },
      { text: 'tell the team', status: 'pending' },
    ];
    const { lastFrame } = render(<TodoList todos={todos} />);
    const out = lastFrame() ?? '';
    expect(out).toContain('1/3 done');
    expect(out).toContain('1 active');
    expect(out).toContain('1 pending');
    expect(out).toContain('[x] write the spec');
    expect(out).toContain('[~] ship the feature');
    expect(out).toContain('[ ] tell the team');
  });

  it('uses a custom title when provided', () => {
    const { lastFrame } = render(<TodoList todos={[]} title="Plan" />);
    expect(lastFrame() ?? '').toContain('Plan');
  });
});
