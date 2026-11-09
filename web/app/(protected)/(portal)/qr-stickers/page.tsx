import type { Metadata } from 'next';

import CustomQrStickersWorkspace from './components/custom-qr-stickers-workspace';
import { PREVIEW_BATCHES, PREVIEW_DOWNLOADS } from './lib/preview-qr-stickers';

export const metadata: Metadata = { title: 'QR stickers' };

const QrStickersPage = () => (
  <div className="mx-auto w-full max-w-6xl">
    <CustomQrStickersWorkspace batches={PREVIEW_BATCHES} downloads={PREVIEW_DOWNLOADS} />
  </div>
);

export default QrStickersPage;
