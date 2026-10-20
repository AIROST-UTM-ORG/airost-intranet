/**
 * Unit tests for server/utils/historyHelper.js
 *
 * These tests cover the pure helper functions (generateChangeDescription,
 * valuesAreEqual) without hitting any database. The DB-dependent functions
 * (createHistoryEntry, trackTaskChanges, etc.) are covered in the integration
 * tests (historyHelper.integration.test.js).
 */

const {
  generateChangeDescription,
  valuesAreEqual,
} = require('../../utils/historyHelper');

// ──────────────────────────────────────────────────────────────────────────────
// generateChangeDescription
// ──────────────────────────────────────────────────────────────────────────────

describe('generateChangeDescription', () => {
  test('returns "Task created" for changeType=created', () => {
    expect(generateChangeDescription('task_created', null, null, 'created')).toBe('Task created');
  });

  test('returns "Task deleted" for changeType=deleted', () => {
    expect(generateChangeDescription('task_deleted', null, null, 'deleted')).toBe('Task deleted');
  });

  describe('field=title', () => {
    test('formats title change description', () => {
      const desc = generateChangeDescription('title', 'Old Title', 'New Title', 'updated');
      expect(desc).toBe('Title changed from "Old Title" to "New Title"');
    });
  });

  describe('field=column', () => {
    test('formats column/status change description', () => {
      const desc = generateChangeDescription('column', 'Todo', 'In Progress', 'updated');
      expect(desc).toBe('Status changed from "Todo" to "In Progress"');
    });
  });

  describe('field=assignee', () => {
    test('describes assignment when no previous assignee', () => {
      const desc = generateChangeDescription('assignee', null, 'Alice', 'updated');
      expect(desc).toBe('Assigned to Alice');
    });

    test('describes unassignment when new value is null', () => {
      const desc = generateChangeDescription('assignee', 'Alice', null, 'updated');
      expect(desc).toBe('Unassigned from Alice');
    });

    test('describes reassignment when both values present', () => {
      const desc = generateChangeDescription('assignee', 'Alice', 'Bob', 'updated');
      expect(desc).toBe('Reassigned from Alice to Bob');
    });
  });

  describe('field=priority', () => {
    test('formats priority change description', () => {
      const desc = generateChangeDescription('priority', 'Low', 'High', 'updated');
      expect(desc).toBe('Priority changed from "Low" to "High"');
    });
  });

  describe('field=dueDate', () => {
    test('describes due date being set for the first time', () => {
      const newDate = '2024-12-31T00:00:00.000Z';
      const desc = generateChangeDescription('dueDate', null, newDate, 'updated');
      expect(desc).toContain('Due date set to');
    });

    test('describes due date being removed', () => {
      const oldDate = '2024-12-31T00:00:00.000Z';
      const desc = generateChangeDescription('dueDate', oldDate, null, 'updated');
      expect(desc).toBe('Due date removed');
    });

    test('describes due date being changed', () => {
      const oldDate = '2024-01-01T00:00:00.000Z';
      const newDate = '2024-12-31T00:00:00.000Z';
      const desc = generateChangeDescription('dueDate', oldDate, newDate, 'updated');
      expect(desc).toContain('Due date changed from');
    });
  });

  describe('field=description', () => {
    test('returns "Description updated" when previous description existed', () => {
      const desc = generateChangeDescription('description', 'Old desc', 'New desc', 'updated');
      expect(desc).toBe('Description updated');
    });

    test('returns "Description added" when no previous description', () => {
      const desc = generateChangeDescription('description', null, 'New desc', 'updated');
      expect(desc).toBe('Description added');
    });
  });

  test('returns "<field> updated" for an unknown field', () => {
    const desc = generateChangeDescription('unknownField', 'a', 'b', 'updated');
    expect(desc).toBe('unknownField updated');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// valuesAreEqual
// ──────────────────────────────────────────────────────────────────────────────

describe('valuesAreEqual', () => {
  test('returns true when both values are null', () => {
    expect(valuesAreEqual(null, null, 'title')).toBe(true);
  });

  test('returns false when one value is null and other is not', () => {
    expect(valuesAreEqual(null, 'something', 'title')).toBe(false);
    expect(valuesAreEqual('something', null, 'title')).toBe(false);
  });

  test('compares strings with trimming', () => {
    expect(valuesAreEqual('  hello  ', 'hello', 'title')).toBe(true);
    expect(valuesAreEqual('hello', 'world', 'title')).toBe(false);
  });

  test('compares identical strings as equal', () => {
    expect(valuesAreEqual('In Progress', 'In Progress', 'column')).toBe(true);
  });

  describe('dueDate field', () => {
    test('returns true for identical ISO dates', () => {
      const d = '2024-06-15T00:00:00.000Z';
      expect(valuesAreEqual(d, d, 'dueDate')).toBe(true);
    });

    test('returns false for different dates', () => {
      expect(
        valuesAreEqual('2024-01-01T00:00:00.000Z', '2024-12-31T00:00:00.000Z', 'dueDate')
      ).toBe(false);
    });

    test('returns true when both date values are null', () => {
      expect(valuesAreEqual(null, null, 'dueDate')).toBe(true);
    });
  });

  test('falls back to strict equality for non-string types', () => {
    expect(valuesAreEqual(42, 42, 'someNumber')).toBe(true);
    expect(valuesAreEqual(42, 43, 'someNumber')).toBe(false);
  });
});
