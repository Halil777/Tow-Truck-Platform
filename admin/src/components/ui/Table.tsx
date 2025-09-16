import { useMemo, useState } from 'react';

type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sort?: (a: T, b: T) => number;
};

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
};

export default function Table<T extends Record<string, any>>({ data, columns, pageSize = 10 }: Props<T>) {
  const [page, setPage] = useState(1);
  const [sortIndex, setSortIndex] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (sortIndex == null) return data;
    const col = columns[sortIndex];
    const arr = [...data];
    const cmp = col.sort || ((a: any, b: any) => {
      const va = a[col.key as string];
      const vb = b[col.key as string];
      if (va == null) return -1;
      if (vb == null) return 1;
      return String(va).localeCompare(String(vb));
    });
    arr.sort((a, b) => (sortDir === 'asc' ? cmp(a, b) : cmp(b, a)));
    return arr;
  }, [data, columns, sortIndex, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const start = (page - 1) * pageSize;
  const rows = sorted.slice(start, start + pageSize);

  const toggleSort = (idx: number) => {
    if (sortIndex === idx) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortIndex(idx);
      setSortDir('asc');
    }
  };

  return (
    <div className="stack">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} onClick={() => toggleSort(i)} style={{ cursor: 'pointer' }}>
                {c.header} {sortIndex === i ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c, j) => (
                <td key={j}>{c.render ? c.render(r) : String(r[c.key as string] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="muted">Page {page} / {totalPages}</div>
        <div className="row">
          <button onClick={() => setPage(1)} disabled={page === 1}>{'<<'}</button>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>{'<'}</button>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>{'>'}</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>{'>>'}</button>
        </div>
      </div>
    </div>
  );
}

