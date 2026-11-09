import Link from 'next/link';
import { History } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import type { RecentActivity } from '../types/profile';

type CustomRecentActivityCardProps = {
  items: RecentActivity[];
};

const CustomRecentActivityCard = ({ items }: CustomRecentActivityCardProps) => (
  <Card className="gap-5 rounded-2xl py-5 sm:py-6">
    <CustomCardHeading
      title="My recent activity"
      actions={
        <Button asChild variant="ghost" className="h-11 px-3 text-muted-foreground">
          <Link href="/activity">
            <History aria-hidden />
            See all
          </Link>
        </Button>
      }
    />
    <CardContent className="px-4 sm:px-6">
      <ul className="divide-y divide-border">
        {items.map(({ id, area, title, at_label }) => (
          <li key={id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
            <Badge variant="secondary" className="mt-0.5 min-w-18 justify-center">
              {area}
            </Badge>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{at_label}</p>
            </div>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export default CustomRecentActivityCard;
