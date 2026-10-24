import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileDetails from '../../../pages/Profile/components/ProfileDetails';
import ProfileHero from '../../../pages/Profile/components/ProfileHero';
import ProfileSearch from '../../../pages/MemberDirectory/components/ProfileSearch';
import MemberCard from '../../../pages/MemberDirectory/components/MemberCard';

describe('ProfileSearch', () => {
  test('shows matching member names and selects a result without leaving on input', async () => {
    const onSelectMember = jest.fn();
    const matchingMember = { name: 'Alex Lee', email: 'alex@example.com' };
    render(
      <ProfileSearch
        users={[
          matchingMember,
          { name: 'Jordan Lee', email: 'jordan@example.com' },
          { name: 'Current Member', email: 'current@example.com' },
        ]}
        currentMemberEmail="current@example.com"
        onSelectMember={onSelectMember}
      />,
    );

    const searchInput = screen.getByRole('searchbox', { name: 'Search other club members' });
    await userEvent.type(searchInput, 'alex');

    expect(screen.getByRole('option', { name: /Alex Lee/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Jordan Lee/ })).not.toBeInTheDocument();
    expect(onSelectMember).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('option', { name: /Alex Lee/ }));
    expect(onSelectMember).toHaveBeenCalledWith(matchingMember);
  });

  test('closes suggestions when the user clicks outside the search', async () => {
    render(
      <ProfileSearch
        users={[{ name: 'Alex Lee', email: 'alex@example.com' }]}
        onSelectMember={jest.fn()}
      />,
    );
    const searchInput = screen.getByRole('searchbox', { name: 'Search other club members' });

    await userEvent.type(searchInput, 'alex');
    expect(screen.getByRole('option', { name: /Alex Lee/ })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('option', { name: /Alex Lee/ })).not.toBeInTheDocument();
    expect(searchInput).toHaveAttribute('aria-expanded', 'false');

    fireEvent.focus(searchInput);
    expect(screen.getByRole('option', { name: /Alex Lee/ })).toBeInTheDocument();
  });
});

describe('ProfileDetails', () => {
  test('shows a fallback member label and renders each supplied detail', () => {
    render(
      <ProfileDetails
        details={[
          ['Course', 'Computer Science'],
          ['Year', 'Year 2'],
        ]}
      />,
    );

    expect(screen.getByText('Core information for this member')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('Year 2')).toBeInTheDocument();
  });
});

describe('ProfileHero', () => {
  test('shows fallback profile content when optional member fields are missing', () => {
    render(<ProfileHero member={{}} />);

    expect(screen.getByRole('heading', { name: 'Airost member' })).toBeInTheDocument();
    expect(screen.getByText('This member is part of the Airost club.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit profile' })).not.toBeInTheDocument();
    expect(document.querySelector('.profile-photo')).toBeInTheDocument();
  });

  test('renders member photo, description, contact, social links, and handles edit', async () => {
    const onEdit = jest.fn();
    render(
      <ProfileHero
        member={{
          name: '',
          email: 'member@example.com',
          photo: 'https://example.com/photo.jpg',
          description: 'Member bio',
          instagram: 'https://instagram.com/member',
          github: 'member',
          linkedin: 'member',
        }}
        location="Kuala Lumpur"
        onEdit={onEdit}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Airost member' })).toBeInTheDocument();
    expect(screen.getByAltText('Member profile')).toHaveAttribute('src', 'https://example.com/photo.jpg');
    expect(screen.getByText('Member bio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'member@example.com' })).toHaveAttribute(
      'href',
      'mailto:member@example.com',
    );
    expect(screen.getByText('Kuala Lumpur')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/member',
    );
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/member',
    );
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://linkedin.com/member',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe('MemberCard', () => {
  test('renders member information and invokes the profile callback', async () => {
    const onViewProfile = jest.fn();
    render(
      <MemberCard
        member={{
          name: 'Alex Lee',
          email: 'alex@example.com',
          course: 'Aerospace Engineering',
          year: 'Year 3',
          description: 'Designing aircraft.',
          photo: 'https://example.com/alex.jpg',
          verified: true,
        }}
        positions={['Engineer', 'Team lead']}
        onViewProfile={onViewProfile}
      />,
    );

    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.com/alex.jpg');
    expect(screen.getByRole('heading', { name: 'Alex Lee' })).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Aerospace Engineering')).toBeInTheDocument();
    expect(screen.getByText('Year 3')).toBeInTheDocument();
    expect(screen.getByText('Designing aircraft.')).toBeInTheDocument();
    expect(screen.getByText('Verified member')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /View profile/ }));
    expect(onViewProfile).toHaveBeenCalledTimes(1);
  });

  test.each([
    {
      title: 'uses alternate position text when the description is empty',
      positions: ['Designer', 'Treasurer', 'Volunteer'],
      expectedDescription: 'Treasurer | Volunteer',
      expectedRole: 'Designer',
    },
    {
      title: 'uses generic fallbacks when both position and description are empty',
      positions: [],
      expectedDescription: 'Airost club member',
      expectedRole: 'Airost member',
    },
  ])('$title', ({ positions, expectedDescription, expectedRole }) => {
    render(
      <MemberCard
        member={{ name: '', course: '', year: '', description: '', verified: false }}
        positions={positions}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Airost member' })).toBeInTheDocument();
    const card = screen.getByRole('article');
    expect(card.querySelector('.member-identity p')).toHaveTextContent(expectedRole);
    expect(within(card).getAllByText('Not listed')).toHaveLength(2);
    expect(within(card).getByText(expectedDescription)).toBeInTheDocument();
    expect(card.querySelector('.member-card-footer span')).toHaveTextContent('Airost member');
    expect(within(card).getByRole('button', { name: /View profile/ })).toBeDisabled();
    expect(card.querySelector('.member-avatar')).toBeInTheDocument();
  });
});
