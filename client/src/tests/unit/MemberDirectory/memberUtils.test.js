import { getPositions } from '../../../pages/MemberDirectory/utils/memberUtils';

describe('getPositions', () => {
  test('returns a non-empty position string as a one-item array', () => {
    expect(getPositions('Developer')).toEqual(['Developer']);
  });

  test('filters empty and whitespace-only values from an array', () => {
    expect(getPositions(['Developer', '', '  ', 'Designer'])).toEqual(['Developer', 'Designer']);
  });

  test('returns an empty array for empty, null, or missing positions', () => {
    expect(getPositions('')).toEqual([]);
    expect(getPositions(null)).toEqual([]);
    expect(getPositions(undefined)).toEqual([]);
  });

  test('ignores non-string values', () => {
    expect(getPositions(['Developer', null, 2, false])).toEqual(['Developer']);
  });
});
