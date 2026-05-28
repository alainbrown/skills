import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TodoList, type Todo } from '../TodoList';

describe('TodoList', () => {
  it('renders empty state when no todos', () => {
    render(<TodoList todos={[]} />);
    expect(screen.getByTestId('todo-list-empty')).toBeInTheDocument();
    expect(screen.getByText(/No todos yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('todo-list')).not.toBeInTheDocument();
  });

  it('renders all todos with status icons', () => {
    const todos: Todo[] = [
      { text: 'First task', status: 'pending' },
      { text: 'Second task', status: 'in_progress' },
      { text: 'Third task', status: 'completed' },
    ];
    render(<TodoList todos={todos} />);

    expect(screen.getByTestId('todo-list')).toBeInTheDocument();
    expect(screen.getByText('First task')).toBeInTheDocument();
    expect(screen.getByText('Second task')).toBeInTheDocument();
    expect(screen.getByText('Third task')).toBeInTheDocument();

    expect(screen.getByTestId('todo-row-pending')).toBeInTheDocument();
    expect(screen.getByTestId('todo-row-in_progress')).toBeInTheDocument();
    expect(screen.getByTestId('todo-row-completed')).toBeInTheDocument();
  });

  it('shows correct counts in sticky header', () => {
    const todos: Todo[] = [
      { text: 'a', status: 'pending' },
      { text: 'b', status: 'pending' },
      { text: 'c', status: 'in_progress' },
      { text: 'd', status: 'completed' },
    ];
    render(<TodoList todos={todos} />);
    const header = screen.getByTestId('todo-list-header');
    expect(header.textContent).toContain('4 todos');
    expect(header.textContent).toContain('1 in progress');
    expect(header.textContent).toContain('1 completed');
  });

  it('uses singular "todo" for a single item', () => {
    render(<TodoList todos={[{ text: 'solo', status: 'pending' }]} />);
    const header = screen.getByTestId('todo-list-header');
    expect(header.textContent).toContain('1 todo ');
    expect(header.textContent).not.toContain('1 todos');
  });

  it('applies strikethrough class to completed todos', () => {
    const todos: Todo[] = [
      { text: 'done', status: 'completed' },
      { text: 'todo', status: 'pending' },
    ];
    render(<TodoList todos={todos} />);

    const completedRow = screen.getByTestId('todo-row-completed');
    const pendingRow = screen.getByTestId('todo-row-pending');

    expect(completedRow.className).toMatch(/line-through/);
    expect(pendingRow.className).not.toMatch(/line-through/);
  });

  it('applies pulse animation class to in_progress todos', () => {
    render(<TodoList todos={[{ text: 'working', status: 'in_progress' }]} />);
    const row = screen.getByTestId('todo-row-in_progress');
    expect(row.className).toMatch(/animate-pulse/);
  });

  it('exposes an aria-label per row for screen readers', () => {
    render(<TodoList todos={[{ text: 'review PR', status: 'in_progress' }]} />);
    expect(
      screen.getByLabelText('in progress: review PR'),
    ).toBeInTheDocument();
  });

  it('honors className prop', () => {
    render(<TodoList todos={[]} className="custom-class" />);
    expect(screen.getByTestId('todo-list-empty').className).toMatch(/custom-class/);
  });
});
