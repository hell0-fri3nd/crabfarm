'use client';

import { useState } from 'react';

import CustomStepper from '@/components/custom/custom-stepper';
import { notify } from '@/lib/notify';

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

  const handleFinish = () => {
    notify.info('Onboarding is not connected yet', {
      description: 'Every step is valid. Finishing will save your password and PIN once the BFF is wired up.',
    });
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
