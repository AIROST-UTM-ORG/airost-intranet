/**
 * Unit tests for the ProjectList component.
 *
 * Verifies that:
 * - All project titles are rendered
 * - The Delete button is shown only for admin users
 * - The Delete button triggers the onDeleteProject callback with confirmation
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProjectList from '../../components/ProjectList';
import { AuthContext } from '../../context/authContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

const sampleProjects = [
  { projectId: 1, title: 'Alpha Project', lead: 'Alice', category: 'Dev' },
  { projectId: 2, title: 'Beta Project', lead: 'Bob', category: 'Design' },
];

const renderProjectList = (authValue, onDeleteProject = jest.fn()) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <ProjectList projects={sampleProjects} onDeleteProject={onDeleteProject} />
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ProjectList', () => {
  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders all project titles', () => {
    renderProjectList({ user: { positions: ['member'] } });
    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByText('Beta Project')).toBeInTheDocument();
  });

  test('does NOT show delete buttons for non-admin users', () => {
    renderProjectList({ user: { positions: ['member'] } });
    expect(screen.queryAllByText(/delete project/i).length).toBe(0);
  });

  test('shows delete buttons for admin users', () => {
    renderProjectList({ user: { positions: ['admin'] } });
    const deleteButtons = screen.getAllByText(/delete project/i);
    expect(deleteButtons.length).toBe(sampleProjects.length);
  });

  test('calls onDeleteProject with the correct projectId after confirmation', async () => {
    const onDeleteProject = jest.fn();
    renderProjectList({ user: { positions: ['admin'] } }, onDeleteProject);

    const deleteButtons = screen.getAllByText(/delete project/i);
    await userEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(onDeleteProject).toHaveBeenCalledWith(sampleProjects[0].projectId);
  });

  test('does NOT call onDeleteProject when user cancels the confirmation dialog', async () => {
    window.confirm.mockReturnValue(false);

    const onDeleteProject = jest.fn();
    renderProjectList({ user: { positions: ['admin'] } }, onDeleteProject);

    const deleteButtons = screen.getAllByText(/delete project/i);
    await userEvent.click(deleteButtons[0]);

    expect(onDeleteProject).not.toHaveBeenCalled();
  });

  test('renders lead information in the project description', () => {
    renderProjectList({ user: { positions: ['member'] } });
    expect(screen.getByText(/lead by alice/i)).toBeInTheDocument();
  });

  test('renders correctly when user is null (unauthenticated)', () => {
    renderProjectList({ user: null });
    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.queryAllByText(/delete project/i).length).toBe(0);
  });
});
