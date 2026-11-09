'use client';

import { REGEXP_ONLY_DIGITS } from 'input-otp';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PIN_LENGTH } from '@/types/pin';

type CustomPinFieldProps = {
  id: string;
  value: string;
  isInvalid: boolean;
  describedBy?: string;
  isAutoFocus?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

const PIN_SLOTS = Array.from({ length: PIN_LENGTH }, (_, index) => index);

const CustomPinField = ({ id, value, isInvalid, describedBy, isAutoFocus = false, onChange, onBlur }: CustomPinFieldProps) => (
  <InputOTP
    id={id}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    autoFocus={isAutoFocus}
    maxLength={PIN_LENGTH}
    pattern={REGEXP_ONLY_DIGITS}
    inputMode="numeric"
    autoComplete="one-time-code"
    aria-invalid={isInvalid}
    aria-describedby={describedBy}
  >
    <InputOTPGroup className="gap-2">
      {PIN_SLOTS.map((slot) => (
        <InputOTPSlot
          key={slot}
          index={slot}
          aria-invalid={isInvalid}
          className="size-12 rounded-lg border-l bg-card text-lg font-semibold first:rounded-l-lg last:rounded-r-lg"
        />
      ))}
    </InputOTPGroup>
  </InputOTP>
);

export default CustomPinField;
