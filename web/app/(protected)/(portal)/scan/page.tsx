import type { Metadata } from 'next';

import CustomScanWorkspace from './components/custom-scan-workspace';
import { PREVIEW_LOGGED_TODAY, PREVIEW_TEST_CODES } from './lib/preview-scan';

export const metadata: Metadata = { title: 'Scan crab' };

const ScanPage = () => (
  <div className="mx-auto w-full max-w-6xl">
    <CustomScanWorkspace loggedToday={PREVIEW_LOGGED_TODAY} testCodes={PREVIEW_TEST_CODES} isScaleConnected />
  </div>
);

export default ScanPage;
