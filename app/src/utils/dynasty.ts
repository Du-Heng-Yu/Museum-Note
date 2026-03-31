import { DYNASTY_RANGES } from '../constants/dynasties';

export function parseYearText(rawText: string): number | null {
  const value = rawText.trim();
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function inferDynastyByYear(year: number): string | null {
  const match = DYNASTY_RANGES.find((range) => year >= range.startYear && year <= range.endYear);
  return match ? match.name : null;
}

export function inferStartYearByDynasty(dynasty: string): number | null {
  const match = DYNASTY_RANGES.find((range) => range.name === dynasty);
  return match ? match.startYear : null;
}

export function formatYearLabel(year: number | null): string {
  if (year === null || year === undefined) {
    return '年代未填';
  }
  if (year < 0) {
    return `公元前${Math.abs(year)}年`;
  }
  return `${year}年`;
}
