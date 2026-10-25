import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import MemberDirectory from '../../../pages/MemberDirectory/MemberDirectory';
import useFetchUsers from '../../../hooks/useFetchUsers';

jest.mock('../../../hooks/useFetchUsers', () => jest.fn());
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const sampleUsers = [
  {
    _id: 'user-1',
    name: 'Alice Tan',
    email: 'alice@example.com',
    course: 'Computer Science',
    year: 'Year 2',
    positions: ['Developer', '', ' '],
  },
  {
    _id: 'user-2',
    name: 'Ben Lee',
    email: 'ben@example.com',
    course: 'Mechanical Engineering',
    year: 'Year 3',
    positions: ['Designer'],
  },
  {
    _id: 'user-3',
    name: 'Cara Ng',
    email: 'cara@example.com',
    course: 'Computer Science',
    year: 'Year 2',
    positions: ['Designer', 'Treasurer'],
  },
];

const renderDirectory = (fetchResult = { data: sampleUsers }) => {
  useFetchUsers.mockReturnValue(fetchResult);
  return render(<MemberDirectory />);
};

const getCardNames = () => screen.getAllByRole('article').map(
  (card) => within(card).getByRole('heading', { level: 2 }).textContent,
);

describe('MemberDirectory', () => {
  const navigate = jest.fn();

  beforeEach(() => {
    navigate.mockClear();
    useNavigate.mockReturnValue(navigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders members and unique, non-empty role and year filter options', () => {
    renderDirectory();

    expect(screen.getByRole('heading', { name: 'Airost Members' })).toBeInTheDocument();
    expect(getCardNames()).toEqual(['Alice Tan', 'Ben Lee', 'Cara Ng']);
    expect(screen.getByLabelText('Filter by role')).toHaveTextContent('Developer');
    expect(screen.getByLabelText('Filter by role')).toHaveTextContent('Designer');
    expect(screen.getByLabelText('Filter by role')).toHaveTextContent('Treasurer');
    expect(screen.queryByRole('option', { name: ' ' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Filter by year')).toHaveTextContent('Year 2');
    expect(screen.getByLabelText('Filter by year')).toHaveTextContent('Year 3');
  });

  test('searches member names, email, course, year, and role and can clear the search', async () => {
    renderDirectory();
    const search = screen.getByRole('searchbox', { name: /Search members/ });

    await userEvent.type(search, 'TREASURER');
    expect(getCardNames()).toEqual(['Cara Ng']);
    expect(screen.getByText('Showing 1 of 3 members')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(getCardNames()).toEqual(['Alice Tan', 'Ben Lee', 'Cara Ng']);

    await userEvent.type(search, 'COMPUTER SCIENCE');
    expect(getCardNames()).toEqual(['Alice Tan', 'Cara Ng']);

    await userEvent.clear(search);
    await userEvent.type(search, 'ben@example.com');
    expect(getCardNames()).toEqual(['Ben Lee']);

    await userEvent.clear(search);
    await userEvent.type(search, 'year 2');
    expect(getCardNames()).toEqual(['Alice Tan', 'Cara Ng']);
  });

  test('navigates to a member profile from the shared search suggestions', async () => {
    renderDirectory();
    const search = screen.getByRole('searchbox', { name: /Search members/ });

    await userEvent.type(search, 'Alice');
    await userEvent.click(screen.getByRole('option', { name: /Alice Tan/ }));

    expect(navigate).toHaveBeenCalledWith('/members/alice%40example.com', {
      state: { member: sampleUsers[0] },
    });
  });

  test('filters members by role and year', async () => {
    renderDirectory();

    await userEvent.selectOptions(screen.getByLabelText('Filter by role'), 'Designer');
    expect(getCardNames()).toEqual(['Ben Lee', 'Cara Ng']);

    await userEvent.selectOptions(screen.getByLabelText('Filter by year'), 'Year 2');
    expect(getCardNames()).toEqual(['Cara Ng']);
  });

  test('sorts members by descending name and by role', () => {
    renderDirectory();
    const sort = screen.getByLabelText('Sort by');

    fireEvent.change(sort, { target: { value: 'name-desc' } });
    expect(getCardNames()).toEqual(['Cara Ng', 'Ben Lee', 'Alice Tan']);

    fireEvent.change(sort, { target: { value: 'role' } });
    expect(getCardNames()).toEqual(['Ben Lee', 'Cara Ng', 'Alice Tan']);
  });

  test('opens a member profile using an encoded email and the selected member data', async () => {
    renderDirectory();
    const aliceCard = screen.getByRole('heading', { name: 'Alice Tan' }).closest('article');

    await userEvent.click(within(aliceCard).getByRole('button', { name: /View profile/ }));

    expect(navigate).toHaveBeenCalledWith('/members/alice%40example.com', {
      state: { member: sampleUsers[0] },
    });
  });

  test('shows loading, error, and empty-result states', () => {
    const { rerender } = renderDirectory({ data: [], isLoading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading members...');
    expect(screen.getByText('Loading member directory')).toBeInTheDocument();

    useFetchUsers.mockReturnValue({ data: [], isError: true });
    rerender(<MemberDirectory />);
    expect(screen.getByRole('alert')).toHaveTextContent('Members could not be loaded.');

    useFetchUsers.mockReturnValue({ data: [] });
    rerender(<MemberDirectory />);
    expect(screen.getByRole('heading', { name: 'No members found' })).toBeInTheDocument();
    expect(screen.getByText('Showing 0 of 0 members')).toBeInTheDocument();
  });
});
