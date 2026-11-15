import { Suspense } from 'react';

import CustomSessionLoading from './components/custom-session-loading';

const ProtectedLayout = ({ children }: LayoutProps<'/'>) => (
  <Suspense fallback={<CustomSessionLoading />}>{children}</Suspense>
);

export default ProtectedLayout;
