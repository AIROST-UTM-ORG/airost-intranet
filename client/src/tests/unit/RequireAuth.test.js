/**
 * Unit tests for the RequireAuth component.
 *
 * Verifies that:
 * - An authenticated user with the required position sees the protected content (Outlet)
 * - An authenticated user WITHOUT the required position is redirected to /unauthorized
 * - An unauthenticated user is redirected to /login (with state preserved)
 * - Loading state renders a spinner (not the route content)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAuth from '../../components/RequireAuth';
import { AuthContext } from '../../context/authContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Renders RequireAuth inside a MemoryRouter with a minimal route tree so that
 * <Navigate> and <Outlet> can work properly.
 */
const renderWithAuth = (authValue, initialPath = '/dashboard') => {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<RequireAuth allowedPosition={['member', 'admin']} />}>
            <Route path="/dashboard" element={<div data-testid="protected-content">Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/unauthorized" element={<div data-testid="unauthorized-page">Unauthorized</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RequireAuth', () => {
  test('renders protected content when user has an allowed position (string)', () => {
    const authValue = { user: { position: 'member' }, loading: false };
    renderWithAuth(authValue);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  test('renders protected content when user has an allowed position (array)', () => {
    const authValue = { user: { position: ['member', 'admin'] }, loading: false };
    renderWithAuth(authValue);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  test('renders protected content when user is admin', () => {
    const authValue = { user: { position: ['admin'] }, loading: false };
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route element={<RequireAuth allowedPosition={['admin']} />}>
              <Route path="/admin" element={<div data-testid="admin-content">Admin Panel</div>} />
            </Route>
            <Route path="/unauthorized" element={<div data-testid="unauthorized-page">Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  test('redirects to /unauthorized when user does not have the required position', () => {
    const authValue = { user: { position: ['member'] }, loading: false };
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route element={<RequireAuth allowedPosition={['admin']} />}>
              <Route path="/admin" element={<div data-testid="admin-content">Admin Panel</div>} />
            </Route>
            <Route path="/unauthorized" element={<div data-testid="unauthorized-page">Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  test('redirects to /login when user is null (unauthenticated)', () => {
    const authValue = { user: null, loading: false };
    renderWithAuth(authValue);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('renders a loading spinner when authentication is still loading', () => {
    const authValue = { user: null, loading: true };
    renderWithAuth(authValue);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });
});
