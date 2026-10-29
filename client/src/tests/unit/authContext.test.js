import React, { useContext } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, AuthProvider } from '../../context/authContext';

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
    delete window.location;
    window.location = { href: '', assign: jest.fn() };
    jest.spyOn(Storage.prototype, 'clear');
    jest.spyOn(Storage.prototype, 'removeItem');
  });

  afterEach(() => {
    window.location = originalLocation;
    jest.restoreAllMocks();
  });

  test('sets user when /auth/login/success returns 200 with user data', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: { name: 'Alice', email: 'alice@example.com' },
      }),
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
  });

  test('clears user when /auth/login/success returns 401 unauthorized', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        message: 'User not authenticated',
      }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('No User');
    });
  });

  test('clears user state and storage, then navigates to logout URL on logout', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: { name: 'Alice', email: 'alice@example.com' },
      }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('User: Alice');
    });

    await act(async () => {
      await userEvent.click(screen.getByTestId('logout-btn'));
    });

    expect(Storage.prototype.clear).toHaveBeenCalled();
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('user');
    expect(window.location.href).toMatch(/\/auth\/logout$/);
    expect(screen.getByTestId('user-status')).toHaveTextContent('No User');
  });
});
