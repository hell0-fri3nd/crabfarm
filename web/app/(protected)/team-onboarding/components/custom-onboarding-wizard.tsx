'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import CustomStepper from '@/components/custom/custom-stepper';
import { DASHBOARD_HREF } from '@/lib/navigation';
import { notify } from '@/lib/notify';

import { completeOnboarding } from '../actions/complete-onboarding';
import CustomLookStep from './custom-look-step';
import CustomPasswordStep from './custom-password-step';
import CustomPinStep from './custom-pin-step';

import type { Step } from '@/components/custom/custom-stepper';
import type { PasswordStepInput, PinStepInput } from '../types/onboarding';

type CustomOnboardingWizardProps = {
  name: string;
  email: string;
};

const STEPS: Step[] = [
  { id: 'password', title: 'Password', description: 'Sign-in' },
  { id: 'pin', title: 'PIN', description: 'Quick sign-in' },
  { id: 'look', title: 'Look', description: 'Theme' },
];

const CustomOnboardingWizard = ({ name, email }: CustomOnboardingWizardProps) => {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [password, setPassword] = useState<PasswordStepInput>();
  const [pin, setPin] = useState<PinStepInput>();

  const goBack = () => setStepIndex((current) => Math.max(current - 1, 0));

  const handlePasswordComplete = (values: PasswordStepInput) => {
    setPassword(values);
    setStepIndex(1);
  };

  const handlePinComplete = (values: PinStepInput) => {
    setPin(values);
    setStepIndex(2);
  };

  const handleFinish = async () => {
    if (!password) return setStepIndex(0);
    if (!pin) return setStepIndex(1);

    const result = await completeOnboarding(password, pin);
    if (result.ok) {
      notify.success("You're all set", { description: 'Use your new password to sign in and your PIN to unlock.' });
      router.replace(DASHBOARD_HREF);
      return;
    }

    // Send the user back to the step that holds the rejected value
    const fields = new Set(result.errors.map(({ field }) => field));
    if (fields.has('new_password') || fields.has('confirm_password')) setStepIndex(0);
    else if (fields.has('new_pin') || fields.has('confirm_pin')) setStepIndex(1);

    notify.error("Couldn't finish setting up", { description: result.errors[0]?.message ?? result.message });
  };

  return (
    <div className="flex w-full max-w-115 flex-col gap-8">
      <CustomStepper steps={STEPS} currentIndex={stepIndex} label="Onboarding progress" />

      {stepIndex === 0 && (
        <CustomPasswordStep name={name} email={email} defaultValues={password} onComplete={handlePasswordComplete} />
      )}
      {stepIndex === 1 && <CustomPinStep defaultValues={pin} onBack={goBack} onComplete={handlePinComplete} />}
      {stepIndex === 2 && <CustomLookStep onBack={goBack} onComplete={handleFinish} />}
    </div>
  );
};

export default CustomOnboardingWizard;
