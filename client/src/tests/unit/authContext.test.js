import React, { useContext } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, AuthProvider } from '../../context/authContext';
import apiClient, { resetAuthUnauthorizedLock } from '../../shared/api/client';

jest.mock('../../shared/api/client', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockClient,
    apiClient: mockClient,
    resetAuthUnauthorizedLock: jest.fn(),
  };
});

const TestConsumer = () => {
  const { user, loading, logout } = useContext(AuthContext);

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user-status">{user ? `User: ${user.name}` : 'No User'}</div>
      <button data-testid="logout-btn" onClick={logout}>
        Log Out
      </button>
    </div>
  );
};

describe('AuthProvider & AuthContext', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    delete window.location;
    window.location = { href: '', assign: jest.fn() };
    jest.spyOn(Storage.prototype, 'clear');
    jest.spyOn(Storage.prototype, 'removeItem');
  });

  afterEach(() => {
    window.location = originalLocation;
    jest.restoreAllMocks();
  });

  test('sets user and resets unauthorized lock when /auth/login/success returns 200 with user data', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        user: { name: 'Alice', email: 'alice@example.com' },
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('User: Alice');
    });

    expect(apiClient.get).toHaveBeenCalledWith('/auth/login/success', {
      skipAuthRedirect: true,
      headers: { Accept: 'application/json' },
    });
    expect(resetAuthUnauthorizedLock).toHaveBeenCalledTimes(1);
  });

  test('clears user without resetting lock when /auth/login/success returns 401 unauthorized', async () => {
    const err = new Error('User not authenticated');
    err.status = 401;
    err.response = { status: 401, data: { success: false, message: 'User not authenticated' } };
    apiClient.get.mockRejectedValueOnce(err);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('No User');
    });
    expect(resetAuthUnauthorizedLock).not.toHaveBeenCalled();
  });

  test('clears user state when auth:unauthorized event is dispatched', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        user: { name: 'Alice', email: 'alice@example.com' },
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('User: Alice');
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('No User');
    });
  });

  test('removes auth:unauthorized listener on unmount', async () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    apiClient.get.mockResolvedValueOnce({ data: { user: null } });

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('No User');
    });

    const addCall = addSpy.mock.calls.find(([eventName]) => eventName === 'auth:unauthorized');
    expect(addCall).toBeDefined();

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('auth:unauthorized', addCall[1]);
  });

  test('posts to /auth/logout with skipAuthRedirect, clears storage, and navigates to /login on logout', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        user: { name: 'Alice', email: 'alice@example.com' },
      },
    });
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('User: Alice');
    });

    await userEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('No User');
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', null, {
      skipAuthRedirect: true,
      headers: { Accept: 'application/json' },
    });
    expect(Storage.prototype.clear).toHaveBeenCalled();
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('user');
    expect(window.location.href).toBe('/login');
  });
});
