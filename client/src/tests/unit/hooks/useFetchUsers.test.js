import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useFetchUsers from '../../../hooks/useFetchUsers';
import apiClient from '../../../shared/api/client';

jest.mock('../../../shared/api/client', () => {
  const mockClient = {
    defaults: { baseURL: '/api', withCredentials: true },
    get: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockClient,
    apiClient: mockClient,
  };
});

const UsersConsumer = () => {
  const { data, isLoading } = useFetchUsers();
  if (isLoading) return <div>Loading...</div>;
  return <div>{data?.map((u) => u.name).join(', ')}</div>;
};

describe('useFetchUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requests /user/users through centralized apiClient (relative to baseURL "/api")', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: [{ _id: '1', name: 'Alice' }, { _id: '2', name: 'Bob' }],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UsersConsumer />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledWith('/user/users');
    expect(apiClient.defaults.baseURL).toBe('/api');
  });
});
