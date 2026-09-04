export const DataTable = ({
  columns,
  data,
}: {
  columns: string[];
  data: any[];
}) => (
  <table className="w-full text-xs text-left border-collapse border border-border">
    <thead>
      <tr className="bg-muted-800 text-muted-400">
        {columns.map((c: string) => (
          <th key={c} className="p-2 border border-border">
            {c}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row: any, i: number) => (
        <tr
          key={i}
          className={`${i % 2 === 0 ? "bg-muted-900" : "bg-muted-950"} hover:bg-primary-900/40 cursor-pointer`}
        >
          {Object.values(row).map((val: any, j: number) => (
            <td key={j} className="p-2 border border-border">
              {val}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
