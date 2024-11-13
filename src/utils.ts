import { Constituent, DTFilterSchema } from './types';

export const toCSV = (data: any[]) => {
  const header = Object.keys(Constituent.shape).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  return `${header}\n${rows}`;
};

// parse the `created_at=>2024-11-11T00:00:00Z` filter string into a SQL WHERE clause
export const parseFilter = (filter: DTFilterSchema | undefined) => {
  if (!filter) return { query: '', value: null };
  const carrot = filter[0];
  const dt = filter.slice(1);
  return {
    query: `created_at ${carrot === '<' ? '<' : '>'}`,
    value: dt,
  };
}

// remove all null values from array to pass as bind parameters
// without this, D1 throws a "Wrong number of parameter bindings" error
export const filterNulls = (arr: any[]) => arr.filter(val => val !== null);