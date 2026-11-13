import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import usePBMRefresh from '../../../pages/ProjectTracking/hooks/usePBMRefresh';
import { API_URL } from '../../../config/api';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
}));

describe('usePBMRefresh', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.spyOn(queryClient, 'invalidateQueries');
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createWrapper = () => {
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  test('invalidates only ["projectBoard", projectId] on successful update', async () => {
    axios.put.mockResolvedValueOnce({ data: { success: true } });

    const initialCards = [{ _id: 'card-1', title: 'Task 1' }];
    const { result } = renderHook(
      () => usePBMRefresh({ projectId: '42', cards: initialCards }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['projectBoard', '42'],
    });
    // Ensure it did not perform an un-scoped global invalidation
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith();
  });

  test('sends updatedCards when passed via mutate(updatedCards) to eliminate stale closure', async () => {
    axios.put.mockResolvedValueOnce({ data: { success: true } });

    const initialCards = [
      { _id: 'card-1', title: 'Task 1' },
      { _id: 'card-2', title: 'Task 2' },
    ];
    const filteredCards = [{ _id: 'card-2', title: 'Task 2' }];

    const { result } = renderHook(
      () => usePBMRefresh({ projectId: '42', cards: initialCards }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync(filteredCards);
    });

    expect(axios.put).toHaveBeenCalledTimes(1);
    expect(axios.put).toHaveBeenCalledWith(
      `${API_URL}/api/projects/tracking`,
      {
        projectId: '42',
        tasks: filteredCards,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  });

  test('falls back to initial cards when mutate is called without arguments', async () => {
    axios.put.mockResolvedValueOnce({ data: { success: true } });

    const initialCards = [{ _id: 'card-1', title: 'Task 1' }];

    const { result } = renderHook(
      () => usePBMRefresh({ projectId: '42', cards: initialCards }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(axios.put).toHaveBeenCalledWith(
      `${API_URL}/api/projects/tracking`,
      {
        projectId: '42',
        tasks: initialCards,
      },
      expect.any(Object)
    );
  });
});
