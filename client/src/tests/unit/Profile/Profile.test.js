import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Profile from '../../../pages/Profile/Profile';
import EditProfile from '../../../pages/Profile/EditProfile';
import useAuth from '../../../hooks/useAuth';
import useFetchUsers from '../../../hooks/useFetchUsers';
import { makeSquarePhoto } from '../../../pages/Profile/utils/photo';

jest.mock('axios', () => ({ get: jest.fn(), patch: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(),
}));
jest.mock('../../../hooks/useAuth', () => jest.fn());
jest.mock('../../../hooks/useFetchUsers', () => jest.fn());
jest.mock('../../../pages/Profile/utils/photo', () => ({
  makeSquarePhoto: jest.fn(),
}));

const featuredProjects = [
  { _id: 'project-1', title: 'Airost Portal', description: 'A community portal.', lead: 'Jess' },
  { _id: 'project-2', title: 'Analytics App', description: 'A data dashboard.', lead: 'Ben' },
];

const member = {
  _id: 'member-1',
  name: 'Alice Tan',
  email: 'alice@example.com',
  positions: ['Developer', '', ' '],
  year: 'Year 2',
  course: 'Computer Science',
  origin: { state: 'Selangor', country: 'Malaysia' },
  description: 'Building helpful technology.',
  instagramUrl: 'https://instagram.com/alice',
  githubUrl: 'https://github.com/alice',
  linkedinUrl: 'https://linkedin.com/in/alice',
  featuredProjectIds: featuredProjects,
};

const renderProfileRoutes = (initialEntry = '/profile', state) => render(
  <MemoryRouter initialEntries={[{ pathname: initialEntry, state }]}>
    <Routes>
      <Route path="/profile" element={<Profile isCurrentUser />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="/members" element={<h1>Member directory</h1>} />
      <Route path="/members/:email" element={<Profile />} />
    </Routes>
  </MemoryRouter>,
);

describe('Member profile', () => {
  const setUser = jest.fn();
  const invalidateQueries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    axios.patch.mockReset();
    axios.get.mockReset();
    axios.get.mockReturnValue(new Promise(() => {}));
    useAuth.mockReturnValue({ user: member, setUser });
    useFetchUsers.mockReturnValue({ data: [member] });
    invalidateQueries.mockResolvedValue(undefined);
    useQueryClient.mockReturnValue({ invalidateQueries });
  });

  test('renders profile details, social links, location, and featured project', () => {
    renderProfileRoutes('/members/alice%40example.com');

    expect(screen.getByRole('button', { name: 'Back to members' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to members' }).parentElement)
      .toContainElement(screen.getByRole('searchbox', { name: 'Search other club members' }));
    expect(screen.getByRole('heading', { name: 'Alice Tan' })).toBeInTheDocument();
    expect(screen.getByText('Building helpful technology.')).toBeInTheDocument();
    expect(screen.getAllByText('Selangor, Malaysia')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /alice@example.com/i })).toHaveAttribute(
      'href',
      'mailto:alice@example.com',
    );
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/alice',
    );
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/alice',
    );
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/alice',
    );
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.queryByText('  ')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Airost Portal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Analytics App' })).toBeInTheDocument();
    expect(screen.getByText('Jess')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit profile' })).not.toBeInTheDocument();
  });

  test('returns to the member directory from a member profile', async () => {
    renderProfileRoutes('/members/alice%40example.com');

    await userEvent.click(screen.getByRole('button', { name: 'Back to members' }));

    expect(await screen.findByRole('heading', { name: 'Member directory' })).toBeInTheDocument();
  });

  test('does not show the directory back button on the current user profile', () => {
    renderProfileRoutes('/profile');

    expect(screen.queryByRole('button', { name: 'Back to members' })).not.toBeInTheDocument();
  });

  test('shows loading, missing-profile, and fetch-error states', () => {
    useAuth.mockReturnValue({ user: null, setUser });
    useFetchUsers.mockReturnValue({ data: [], isLoading: true });
    const { unmount } = renderProfileRoutes('/profile');
    expect(screen.getByRole('status')).toHaveTextContent('Loading profile...');
    unmount();

    useAuth.mockReturnValue({ user: member, setUser });
    useFetchUsers.mockReturnValue({ data: [] });
    const missingProfile = renderProfileRoutes('/members/missing%40example.com');
    expect(screen.getByRole('status')).toHaveTextContent('This member profile was not found.');
    missingProfile.unmount();

    useFetchUsers.mockReturnValue({ data: [], isError: true });
    renderProfileRoutes('/members/missing%40example.com');
    expect(screen.getByRole('alert')).toHaveTextContent('The profile could not be loaded.');
  });

  test('returns to the member directory from a missing-profile state', async () => {
    useFetchUsers.mockReturnValue({ data: [] });
    renderProfileRoutes('/members/missing%40example.com');

    await userEvent.click(screen.getByRole('button', { name: 'Back to members' }));

    expect(await screen.findByRole('heading', { name: 'Member directory' })).toBeInTheDocument();
  });

  test('uses the member passed through navigation state while users are loading', () => {
    useFetchUsers.mockReturnValue({ isLoading: true });
    renderProfileRoutes('/members/alice%40example.com', { member });

    expect(screen.getByRole('heading', { name: 'Alice Tan' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('navigates to a matching member profile only after selecting a search result', async () => {
    const otherMember = { name: 'Alex Lee', email: 'alex@example.com' };
    useFetchUsers.mockReturnValue({ data: [member, otherMember] });
    renderProfileRoutes('/members/alice%40example.com');
    const search = screen.getByRole('searchbox', { name: 'Search other club members' });

    await userEvent.type(search, 'alex');
    expect(screen.getByRole('heading', { name: 'Alice Tan' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Alex Lee/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: /Alex Lee/ }));

    expect(await screen.findByRole('heading', { name: 'Alex Lee' })).toBeInTheDocument();
  });

  test('edits and saves the current profile, updates auth state, and returns to profile', async () => {
    useAuth.mockReturnValue({
      user: { ...member, featuredProjectIds: [featuredProjects[0]] },
      setUser,
    });
    axios.get.mockResolvedValueOnce({ data: featuredProjects });
    axios.patch.mockResolvedValue({ data: { ...member, name: 'Alice Tan Updated' } });
    renderProfileRoutes('/profile');

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    });
    expect(screen.getByRole('heading', { name: 'Edit profile' })).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), ' Alice Tan Updated ');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Analytics App' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        'http://localhost:4000/api/user/member-1',
        expect.objectContaining({
          name: 'Alice Tan Updated',
          featuredProjectIds: ['project-1', 'project-2'],
          origin: { state: 'Selangor', country: 'Malaysia' },
          instagramUrl: 'https://instagram.com/alice',
        }),
        { withCredentials: true },
      );
      expect(setUser).toHaveBeenCalledWith(expect.any(Function));
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['users'] });
    });
    expect(setUser.mock.calls[0][0](member)).toEqual({
      ...member,
      name: 'Alice Tan Updated',
    });
    expect(await screen.findByRole('heading', { name: 'Alice Tan' })).toBeInTheDocument();
  });

  test('displays the API error when saving fails', async () => {
    axios.patch.mockRejectedValue({
      response: { data: { message: 'Profile update rejected.' } },
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderProfileRoutes('/profile/edit');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Profile update rejected.');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    expect(invalidateQueries).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test.each([
    ['Instagram', 'https://www.linkedin.com/in/alice'],
    ['LinkedIn', 'https:leehom.com'],
    ['GitHub', 'https://leehom.com'],
  ])('warns and blocks saving an invalid %s link', async (label, value) => {
    renderProfileRoutes('/profile/edit');

    const input = screen.getByLabelText(label);
    await userEvent.clear(input);
    await userEvent.type(input, value);

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/HTTPS|valid .* link/i)).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    expect(saveButton).toBeDisabled();

    fireEvent.submit(saveButton.closest('form'));
    expect(axios.patch).not.toHaveBeenCalled();
    expect(screen.getByText('Correct the highlighted social links before saving.')).toBeInTheDocument();
  });

  test.each([
    [
      'uses the API error field when no API message is provided',
      { response: { data: { error: 'API error field.' } } },
      'API error field.',
    ],
    [
      'uses the thrown error message when no API error is provided',
      new Error('Network request failed.'),
      'Network request failed.',
    ],
    [
      'uses a fallback message when the error has no message',
      {},
      'Your profile could not be saved.',
    ],
  ])('%s', async (_description, error, expectedMessage) => {
    axios.patch.mockRejectedValueOnce(error);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderProfileRoutes('/profile/edit');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(expectedMessage);
    consoleError.mockRestore();
  });

  test('shows edit-profile loading state when the account has not loaded', () => {
    useAuth.mockReturnValue({ user: null, setUser });
    renderProfileRoutes('/profile/edit');

    expect(screen.getByRole('status')).toHaveTextContent('Loading profile...');
  });

  test('does not upload when no file is selected', () => {
    renderProfileRoutes('/profile/edit');

    fireEvent.change(document.getElementById('profile-image-file'), { target: { files: [] } });

    expect(makeSquarePhoto).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('rejects unsupported profile image files', () => {
    renderProfileRoutes('/profile/edit');
    const fileInput = document.getElementById('profile-image-file');
    const invalidFile = new File(['text'], 'notes.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent('Choose an image file to upload.');
    expect(axios.patch).not.toHaveBeenCalled();
  });

  test('rejects profile image files larger than 10 MB', () => {
    renderProfileRoutes('/profile/edit');
    const oversizedFile = new File(['image'], 'large.png', { type: 'image/png' });
    Object.defineProperty(oversizedFile, 'size', { value: 10 * 1024 * 1024 + 1 });

    fireEvent.change(document.getElementById('profile-image-file'), {
      target: { files: [oversizedFile] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Choose an image smaller than 10 MB.');
    expect(makeSquarePhoto).not.toHaveBeenCalled();
  });

  test('processes a supported image and shows its preview', async () => {
    makeSquarePhoto.mockResolvedValue('data:image/jpeg;base64,photo');
    renderProfileRoutes('/profile/edit');
    const imageFile = new File(['image'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(document.getElementById('profile-image-file'), {
      target: { files: [imageFile] },
    });

    expect(await screen.findByAltText('Profile preview')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,photo',
    );
    expect(makeSquarePhoto).toHaveBeenCalledWith(imageFile);
  });

  test('displays image-processing errors', async () => {
    makeSquarePhoto.mockRejectedValue(new Error('Image processing failed.'));
    renderProfileRoutes('/profile/edit');
    const imageFile = new File(['image'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(document.getElementById('profile-image-file'), {
      target: { files: [imageFile] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Image processing failed.');
  });

  test('requires an identifiable user and a non-empty name before saving', async () => {
    useAuth.mockReturnValue({ user: { name: 'Alice Tan' }, setUser });
    const { unmount } = renderProfileRoutes('/profile/edit');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Your account could not be identified.');
    expect(axios.patch).not.toHaveBeenCalled();
    unmount();

    useAuth.mockReturnValue({ user: { ...member, name: '   ' }, setUser });
    renderProfileRoutes('/profile/edit');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter your name before saving.');
    expect(axios.patch).not.toHaveBeenCalled();
  });

  test('clears all featured projects when saving an empty selection', async () => {
    useAuth.mockReturnValue({
      user: { ...member, featuredProjectIds: [] },
      setUser,
    });
    axios.patch.mockResolvedValue({ data: member });
    renderProfileRoutes('/profile/edit');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        'http://localhost:4000/api/user/member-1',
        expect.objectContaining({ featuredProjectIds: [] }),
        { withCredentials: true },
      );
    });
  });

  test('saves when the account uses the id field instead of _id', async () => {
    useAuth.mockReturnValue({
      user: { ...member, _id: undefined, id: 'fallback-id' },
      setUser,
    });
    axios.patch.mockResolvedValue({ data: member });
    renderProfileRoutes('/profile/edit');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        'http://localhost:4000/api/user/fallback-id',
        expect.any(Object),
        { withCredentials: true },
      );
    });
  });

  test('returns to the profile when the cancel button is clicked', async () => {
    renderProfileRoutes('/profile/edit');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('heading', { name: 'Alice Tan' })).toBeInTheDocument();
  });

  test('renders a fallback project state when no featured project exists', () => {
    useAuth.mockReturnValue({ user: { ...member, featuredProjectIds: [] }, setUser });
    renderProfileRoutes('/profile');

    const projectPanel = screen.getByRole('complementary', { name: 'Project' });
    expect(within(projectPanel).getByText('No featured project has been added to this profile.')).toBeInTheDocument();
  });
});
