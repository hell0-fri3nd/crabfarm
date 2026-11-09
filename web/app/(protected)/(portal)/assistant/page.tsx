import type { Metadata } from 'next';

import { PREVIEW_USER } from '@/lib/preview';

import CustomAssistant from './components/custom-assistant';
import {
  PREVIEW_CONTEXT_READINGS,
  SUGGESTED_QUESTIONS,
} from './lib/preview-assistant';

export const metadata: Metadata = { title: 'Assistant' };

const AssistantPage = () => (
  <CustomAssistant
    userName={PREVIEW_USER.name}
    readings={PREVIEW_CONTEXT_READINGS}
    suggestions={SUGGESTED_QUESTIONS}
  />
);

export default AssistantPage;
