import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BurnBarrel from '../../../pages/ProjectTracking/components/BurnBarrel';
import usePBMRefresh from '../../../pages/ProjectTracking/hooks/usePBMRefresh';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
}));
jest.mock('../../../pages/ProjectTracking/hooks/usePBMRefresh');

describe('BurnBarrel', () => {
  const mockMutate = jest.fn();
  let setCards;

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setCards = jest.fn();
    mockMutate.mockImplementation((updatedCards, callbacks) => {
      callbacks?.onSuccess?.();
    });
    usePBMRefresh.mockReturnValue({
      mutate: mockMutate,
    });
  });

  const cards = [
    { _id: 'card-1', title: 'Task 1', createdBy: 'creator@example.com' },
    { _id: 'card-2', title: 'Task 2', createdBy: 'other@example.com' },
  ];

  const triggerDrop = (container, cardId) => {
    const dropZone = container.querySelector('.place-content-center');
    fireEvent.drop(dropZone, {
      dataTransfer: {
        getData: (key) => (key === 'cardId' ? cardId : ''),
      },
    });
  };

  test('blocks unauthorized non-creator, non-admin members with an error notification', async () => {
    const unauthorizedUser = {
      email: 'member@example.com',
      positions: ['member'],
    };

    const { container } = render(
      <BurnBarrel
        setCards={setCards}
        cards={cards}
        projectId="42"
        user={unauthorizedUser}
      />
    );

    triggerDrop(container, 'card-1');

    expect(
      await screen.findByText('Only creator or admin can delete this')
    ).toBeInTheDocument();
    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    expect(setCards).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('allows task creator to delete task and passes filtered updatedCards to setCards and mutate', async () => {
    const creatorUser = {
      email: 'creator@example.com',
      positions: ['member'],
    };

    const { container } = render(
      <BurnBarrel
        setCards={setCards}
        cards={cards}
        projectId="42"
        user={creatorUser}
      />
    );

    triggerDrop(container, 'card-1');

    expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);

    const expectedFiltered = [{ _id: 'card-2', title: 'Task 2', createdBy: 'other@example.com' }];

    expect(setCards).toHaveBeenCalledTimes(1);
    expect(setCards).toHaveBeenCalledWith(expectedFiltered);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(expectedFiltered, expect.any(Object));

    expect(
      await screen.findByText('Task deleted successfully')
    ).toBeInTheDocument();
  });

  test('allows admin with positions array to delete tasks created by others', async () => {
    const adminUser = {
      email: 'admin@example.com',
      positions: ['admin'],
    };

    const { container } = render(
      <BurnBarrel
        setCards={setCards}
        cards={cards}
        projectId="42"
        user={adminUser}
      />
    );

    triggerDrop(container, 'card-2');

    expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);

    const expectedFiltered = [{ _id: 'card-1', title: 'Task 1', createdBy: 'creator@example.com' }];
    expect(setCards).toHaveBeenCalledWith(expectedFiltered);
    expect(mockMutate).toHaveBeenCalledWith(expectedFiltered, expect.any(Object));
  });

  test('allows admin with legacy string position to delete tasks created by others', async () => {
    const legacyAdminUser = {
      email: 'admin@example.com',
      position: 'admin',
    };

    const { container } = render(
      <BurnBarrel
        setCards={setCards}
        cards={cards}
        projectId="42"
        user={legacyAdminUser}
      />
    );

    triggerDrop(container, 'card-2');

    expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);

    const expectedFiltered = [{ _id: 'card-1', title: 'Task 1', createdBy: 'creator@example.com' }];
    expect(setCards).toHaveBeenCalledWith(expectedFiltered);
    expect(mockMutate).toHaveBeenCalledWith(expectedFiltered, expect.any(Object));
  });

  test('cancelling delete in modal closes dialog without calling mutation or setCards', async () => {
    const creatorUser = {
      email: 'creator@example.com',
      positions: ['member'],
    };

    const { container } = render(
      <BurnBarrel
        setCards={setCards}
        cards={cards}
        projectId="42"
        user={creatorUser}
      />
    );

    triggerDrop(container, 'card-1');

    expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(document.querySelector('.ant-modal-wrap')).toHaveStyle('display: none');
    });

    expect(setCards).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('does not update local cards or show success toast if mutation fails', async () => {
    mockMutate.mockImplementation((updatedCards, callbacks) => {
      callbacks?.onError?.(new Error('Network error'));
    });

    const creatorUser = {
      email: 'creator@example.com',
      positions: ['member'],
    };

    const { container } = render(
      <BurnBarrel
        setCards={setCards}
        cards={cards}
        projectId="42"
        user={creatorUser}
      />
    );

    triggerDrop(container, 'card-1');

    expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);

    const expectedFiltered = [{ _id: 'card-2', title: 'Task 2', createdBy: 'other@example.com' }];
    expect(mockMutate).toHaveBeenCalledWith(expectedFiltered, expect.any(Object));
    expect(setCards).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Failed to delete task. Please try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Task deleted successfully')).not.toBeInTheDocument();
  });
});
