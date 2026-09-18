export function firstRow<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) {
    throw new Error('Expected a row to be returned from the query');
  }
  return row;
}
