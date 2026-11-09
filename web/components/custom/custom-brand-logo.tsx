import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

type CustomBrandLogoProps = {
  height?: 20 | 28 | 32 | 40 | 64;
  href?: string;
  isMarkOnly?: boolean;
  wordmarkClassName?: string;
  className?: string;
};

const GAP_RATIO = 0.3;
const WORDMARK_RATIO = 0.62;

const CustomBrandLogo = ({
  height = 28,
  href = '/',
  isMarkOnly = false,
  wordmarkClassName,
  className,
}: CustomBrandLogoProps) => (
  <Link
    href={href}
    aria-label="CrabFarm"
    className={cn('inline-flex shrink-0 items-center rounded-md font-bold tracking-tight text-foreground', className)}
    style={{ gap: height * GAP_RATIO, fontSize: height * WORDMARK_RATIO }}
  >
    <Image src="/brand/crabfarm-mark.svg" alt="" width={height} height={height} priority />
    {!isMarkOnly && (
      <span aria-hidden className={wordmarkClassName}>
        CrabFarm
      </span>
    )}
  </Link>
);

export default CustomBrandLogo;
