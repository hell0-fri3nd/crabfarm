import { ScrollText } from 'lucide-react';

type CustomSourceChipProps = {
  label: string;
};

const CustomSourceChip = ({ label }: CustomSourceChipProps) => (
  <li className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
    <ScrollText className="size-3.5" aria-hidden />
    {label}
  </li>
);

export default CustomSourceChip;
