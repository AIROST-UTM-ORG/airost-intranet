const AppError = require('../../../src/shared/errors/AppError');
const {
  validateCreateOrUpdateProjectBoard,
  validateProjectIdParam,
  validateUpdateTask,
} = require('../../../src/features/projects/project.validation');

describe('project request validation', () => {
  test('normalizes project IDs and strips client-controlled task ownership fields', () => {
    const result = validateCreateOrUpdateProjectBoard({
      body: {
        projectId: '12',
        tasks: [{
          task_id: '  task-1  ',
          title: 'Task title',
          createdBy: 'spoofed@example.com',
          _id: 'untrusted-subdocument-id',
        }],
      },
    });

    expect(result.sanitizedData).toEqual({
      projectId: 12,
      tasks: [{ task_id: 'task-1', title: 'Task title' }],
    });
  });

  test('rejects missing, blank, and duplicate task IDs', () => {
    const invalidPayloads = [
      { projectId: 1, tasks: [{ title: 'No ID' }] },
      { projectId: 1, tasks: [{ task_id: '  ' }] },
      { projectId: 1, tasks: [{ task_id: 'same' }, { task_id: 'same' }] },
    ];

    for (const body of invalidPayloads) {
      expect(() => validateCreateOrUpdateProjectBoard({ body })).toThrow(AppError);
      try {
        validateCreateOrUpdateProjectBoard({ body });
      } catch (error) {
        expect(error.code).toBe('VALIDATION_ERROR');
      }
    }
  });

  test('accepts only editable task fields and strips forged ownership from single-task updates', () => {
    const result = validateUpdateTask({
      body: {
        projectId: 4,
        changedBy: 'spoofed-actor',
        tasks: {
          task_id: 'task-4',
          title: 'Updated title',
          createdBy: 'spoofed-owner',
          _id: 'spoofed-id',
        },
      },
    });

    expect(result.sanitizedData).toEqual({
      projectId: 4,
      tasks: { task_id: 'task-4', title: 'Updated title' },
    });
    expect(() => validateUpdateTask({
      body: { projectId: 4, tasks: { task_id: 'task-4', positions: ['admin'] } },
    })).toThrow(AppError);
  });

  test.each(['abc', '1.5', '0', '-2', '9007199254740992'])(
    'rejects invalid route project ID %s',
    (projectId) => {
      expect(() => validateProjectIdParam('id')({ params: { id: projectId } })).toThrow(AppError);
    },
  );
});
