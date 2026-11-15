import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import Board from '../../../pages/ProjectTracking/components/Board';
import { AuthContext } from '../../../context/authContext';
import { API_URL } from '../../../config/api';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
}));
jest.mock('../../../hooks/useFetchUsers', () => () => ({ data: [] }));
jest.mock('../../../pages/Projects/hooks/useGetProjects', () => () => ({
  data: [{ projectId: 42, title: 'AIROST Platform' }],
}));

jest.mock('../../../pages/ProjectTracking/components/Column', () => {
  return function MockColumn({ title, column, cards }) {
    const columnCards = cards.filter((c) => c.column === column);
    return (
      <div data-testid={`column-${column}`}>
        {title}: {columnCards.length} cards
        <ul>
          {columnCards.map((c) => (
            <li key={c._id}>{c.title}</li>
          ))}
        </ul>
      </div>
    );
  };
});

jest.mock('../../../pages/ProjectTracking/components/BurnBarrel', () => {
  return function MockBurnBarrel({ cards }) {
    return <div data-testid="burn-barrel">BurnBarrel: {cards.length} cards</div>;
  };
});

describe('Board component', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderBoard = (projectId = '42') => {
    return render(
      <AuthContext.Provider
        value={{
          user: { email: 'admin@airost.com', positions: ['admin'] },
          loading: false,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/projects/tracking/${projectId}`]}>
            <Routes>
              <Route path="/projects/tracking/:projectId" element={<Board />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AuthContext.Provider>
    );
  };

  test('scopes queryKey to ["projectBoard", projectId] and renders fetched cards via useEffect', async () => {
    const mockTasks = [
      { _id: 't-1', title: 'Setup database', column: 'backlog' },
      { _id: 't-2', title: 'Write unit tests', column: 'todo' },
    ];

    axios.get.mockResolvedValueOnce({
      data: {
        projectId: '42',
        tasks: mockTasks,
      },
    });

    renderBoard('42');

    expect(axios.get).toHaveBeenCalledWith(`${API_URL}/api/projects/tracking/42`);

    // Verify tasks are synced via useEffect into cards and passed to columns
    await waitFor(() => {
      expect(screen.getByText('Setup database')).toBeInTheDocument();
      expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    });

    // Verify queryKey is scoped in queryClient to ["projectBoard", "42"]
    const scopedQuery = queryClient.getQueryState(['projectBoard', '42']);
    expect(scopedQuery).toBeDefined();
    expect(scopedQuery.status).toBe('success');
    expect(scopedQuery.data).toEqual({
      projectId: '42',
      tasks: mockTasks,
    });

    // Ensure unscoped queryKey ["projectBoard"] does not exist
    expect(queryClient.getQueryState(['projectBoard'])).toBeUndefined();
  });

  test('propagates query errors so TanStack Query enters error state instead of swallowing them', async () => {
    const networkError = new Error('Network failure loading board');
    axios.get.mockRejectedValueOnce(networkError);

    renderBoard('42');

    // Wait for the query to transition to error state
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['projectBoard', '42']);
      expect(queryState).toBeDefined();
      expect(queryState.status).toBe('error');
      expect(queryState.error).toEqual(networkError);
    });

    // Ensure unscoped query is not used
    expect(queryClient.getQueryState(['projectBoard'])).toBeUndefined();
  });

  test('updates cards when switching between project boards or cache updates', async () => {
    const project42Tasks = [{ _id: 't-1', title: 'Task 42', column: 'backlog' }];
    axios.get.mockResolvedValueOnce({
      data: { projectId: '42', tasks: project42Tasks },
    });

    // Seed cached data for project 43
    const project43Tasks = [{ _id: 't-2', title: 'Task 43', column: 'todo' }];
    queryClient.setQueryData(['projectBoard', '43'], {
      projectId: '43',
      tasks: project43Tasks,
    });

    render(
      <AuthContext.Provider
        value={{
          user: { email: 'admin@airost.com', positions: ['admin'] },
          loading: false,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/projects/tracking/42']}>
            <Link to="/projects/tracking/43">Switch to Project 43</Link>
            <Routes>
              <Route path="/projects/tracking/:projectId" element={<Board />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Task 42')).toBeInTheDocument();
    });

    // Navigate to project 43
    fireEvent.click(screen.getByText('Switch to Project 43'));

    // Verify useEffect synced cards from the cached project 43 query data
    await waitFor(() => {
      expect(screen.getByText('Task 43')).toBeInTheDocument();
      expect(screen.queryByText('Task 42')).not.toBeInTheDocument();
    });
  });
});
