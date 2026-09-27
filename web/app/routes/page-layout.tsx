// src/routes/ProtectedLayout.tsx
import ProtectedRoutes from '../components/layout/protected-routes';
import { Outlet } from 'react-router';
import AppLayout from '~/components/layout/app-layout';
import Bubbles from "~/components/custom/bubbles";
import type { BreadcrumbItem } from '~/types';
import Footer from '~/routes/footer';
import { Assistant } from '~/components/assistant-ui/assistant';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Dashboard',
    href: '/page/dashboard',
  },
  {
    title: 'Config',
    href: '/page/configuration',
  },
  {
    title: 'Weigh and Scan',
    href: '/page/weigh-and-scan',
  }

];

export default function PageLayout() {
  return (
    <ProtectedRoutes>
      <AppLayout breadcrumbs={breadcrumbs}>
        <Bubbles />
        <Outlet />
        <Footer />
        <Assistant />
      </AppLayout>

    </ProtectedRoutes>
  );
}
