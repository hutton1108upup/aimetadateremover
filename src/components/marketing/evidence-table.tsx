export function EvidenceTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: string[][] }) {
  return <div className="metadata-table-wrap evidence-table-wrap"><table className="metadata-table evidence-table">
    <caption>{caption}</caption>
    <thead><tr>{headers.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0
      ? <th scope="row" key={index}>{cell}</th>
      : <td data-label={headers[index]} key={index}>{cell}</td>)}</tr>)}</tbody>
  </table></div>;
}
