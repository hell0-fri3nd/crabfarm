import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    name: string | '';
    email: string | null;
    avatar?: string;
    roles?: string | '';
}

export interface SensorData {
    Icon: LucideIcon;
    description: string;
    value: string;
    rangesDescription: string;
    percentage: number;
    key: string;
    maxValue: number;
    warningRanges?: [number, number][];
    dangerRanges?: [number, number][];
}

export type ApiResponse = {
  status_code: number;
  detail: string;
};
