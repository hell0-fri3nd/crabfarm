type DetailRow = {
  label: string;
  value: string | null;
  isCode?: boolean;
};

type CustomDetailListProps = {
  rows: DetailRow[];
};

const CustomDetailList = ({ rows }: CustomDetailListProps) => {
  const filled = rows.filter(({ value }) => value);
  if (filled.length === 0) return null;

  return (
    <dl className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      {filled.map(({ label, value, isCode }) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className={isCode ? 'font-mono break-all' : 'break-words'}>{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default CustomDetailList;
