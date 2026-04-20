import { parseNaturalLanguage } from './filter.service';

describe('parseNaturalLanguage', () => {
  describe('empty / trivial input', () => {
    it('returns empty filters and empty remainder for blank string', () => {
      const { filters, remainder } = parseNaturalLanguage('');
      expect(filters).toEqual({});
      expect(remainder).toBe('');
    });

    it('returns empty filters and empty remainder for whitespace-only string', () => {
      const { filters, remainder } = parseNaturalLanguage('   ');
      expect(filters).toEqual({});
      expect(remainder).toBe('');
    });
  });

  describe('gender detection', () => {
    it('detects "female"', () => {
      expect(parseNaturalLanguage('female users').filters.filterGender).toBe('female');
    });

    it('detects "women"', () => {
      expect(parseNaturalLanguage('show me women').filters.filterGender).toBe('female');
    });

    it('detects "male"', () => {
      expect(parseNaturalLanguage('male users').filters.filterGender).toBe('male');
    });

    it('detects "men"', () => {
      expect(parseNaturalLanguage('men over 30').filters.filterGender).toBe('male');
    });

    it('"female" takes precedence over "male" if both appear', () => {
      expect(parseNaturalLanguage('female and male').filters.filterGender).toBe('female');
    });

    it('does not set gender when neither keyword present', () => {
      expect(parseNaturalLanguage('users from Germany').filters.filterGender).toBeUndefined();
    });

    it('does not leak gender keyword into remainder', () => {
      const { remainder } = parseNaturalLanguage('female users');
      expect(remainder).toBe('');
    });

    it('"men" keyword does not match names containing "men" in remainder', () => {
      // "men" is consumed as a gender filter — should not appear in remainder
      const { filters, remainder } = parseNaturalLanguage('men');
      expect(filters.filterGender).toBe('male');
      expect(remainder).toBe('');
    });
  });

  describe('age parsing', () => {
    it('parses "between X and Y"', () => {
      const { filters } = parseNaturalLanguage('between 20 and 40');
      expect(filters.filterAgeMin).toBe(20);
      expect(filters.filterAgeMax).toBe(40);
    });

    it('parses "at least N"', () => {
      expect(parseNaturalLanguage('at least 25').filters.filterAgeMin).toBe(25);
    });

    it('parses "at most N"', () => {
      expect(parseNaturalLanguage('at most 50').filters.filterAgeMax).toBe(50);
    });

    it('parses "under N" as max = N - 1', () => {
      expect(parseNaturalLanguage('under 30').filters.filterAgeMax).toBe(29);
    });

    it('parses "over N" as min = N + 1', () => {
      expect(parseNaturalLanguage('over 40').filters.filterAgeMin).toBe(41);
    });

    it('parses "older than N" as min = N + 1', () => {
      expect(parseNaturalLanguage('older than 60').filters.filterAgeMin).toBe(61);
    });

    it('does not leak age tokens into remainder', () => {
      const { remainder } = parseNaturalLanguage('under 30');
      expect(remainder).toBe('');
    });
  });

  describe('nationality detection', () => {
    it('detects "german"', () => {
      expect(parseNaturalLanguage('german users').filters.filterNats).toEqual(['DE']);
    });

    it('detects "canada"', () => {
      expect(parseNaturalLanguage('users from canada').filters.filterNats).toEqual(['CA']);
    });

    it('detects "iranian" before matching shorter "iran"', () => {
      // "iranian" must not be partly-matched by "iran"
      expect(parseNaturalLanguage('iranian users').filters.filterNats).toEqual(['IR']);
    });

    it('detects "iran" when used alone', () => {
      expect(parseNaturalLanguage('users from iran').filters.filterNats).toEqual(['IR']);
    });

    it('does not leak nationality keyword into remainder', () => {
      const { remainder } = parseNaturalLanguage('german users');
      expect(remainder).toBe('');
    });
  });

  describe('group-by directive', () => {
    it('parses "grouped by age"', () => {
      expect(parseNaturalLanguage('grouped by age').filters.groupBy).toBe('age');
    });

    it('parses "grouped by nationality"', () => {
      expect(parseNaturalLanguage('grouped by nationality').filters.groupBy).toBe('nationality');
    });

    it('parses "grouped by nat"', () => {
      expect(parseNaturalLanguage('grouped by nat').filters.groupBy).toBe('nationality');
    });

    it('parses "group by letter"', () => {
      expect(parseNaturalLanguage('group by letter').filters.groupBy).toBe('letter');
    });
  });

  describe('sort directive', () => {
    it('parses "oldest" as age-desc', () => {
      expect(parseNaturalLanguage('oldest users').filters.sortBy).toBe('age-desc');
    });

    it('parses "youngest" as age-asc', () => {
      expect(parseNaturalLanguage('youngest users').filters.sortBy).toBe('age-asc');
    });

    it('parses "most senior" as age-desc', () => {
      expect(parseNaturalLanguage('most senior').filters.sortBy).toBe('age-desc');
    });
  });

  describe('remainder (unrecognised tokens become keyword search)', () => {
    it('returns unrecognised words as remainder', () => {
      const { remainder } = parseNaturalLanguage('Berlin');
      expect(remainder).toBe('berlin');
    });

    it('strips stop words from remainder', () => {
      const { remainder } = parseNaturalLanguage('users from Berlin');
      // "users" and "from" are stop words; "berlin" stays
      expect(remainder).toBe('berlin');
    });

    it('combines multiple unrecognised tokens', () => {
      const { remainder } = parseNaturalLanguage('John Smith');
      expect(remainder).toBe('john smith');
    });
  });

  describe('combined queries', () => {
    it('handles "female users under 30 from germany"', () => {
      const { filters, remainder } = parseNaturalLanguage('female users under 30 from germany');
      expect(filters.filterGender).toBe('female');
      expect(filters.filterAgeMax).toBe(29);
      expect(filters.filterNats).toEqual(['DE']);
      expect(remainder).toBe('');
    });

    it('handles "men over 40 from canada"', () => {
      const { filters } = parseNaturalLanguage('men over 40 from canada');
      expect(filters.filterGender).toBe('male');
      expect(filters.filterAgeMin).toBe(41);
      expect(filters.filterNats).toEqual(['CA']);
    });
  });
});
