import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

export type PasswordRule = {
  id: string;
  label: string;
  schema: z.ZodType<string>;
};

const containsNamePart = (password: string, name: string) => {
  const lowered = password.toLowerCase();
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length >= 3)
    .some((part) => lowered.includes(part));
};

export const createPasswordRules = (name: string): PasswordRule[] => [
  {
    id: 'length',
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    schema: z.string().min(MIN_PASSWORD_LENGTH),
  },
  {
    id: 'letters-and-number',
    label: 'Letters and a number',
    schema: z.string().regex(/[a-z]/i).regex(/\d/),
  },
  {
    id: 'not-name',
    label: 'Not your name',
    schema: z
      .string()
      .min(1)
      .refine((password) => !containsNamePart(password, name)),
  },
];

export const isRuleMet = ({ schema }: PasswordRule, password: string) => schema.safeParse(password).success;

export const createNewPasswordSchema = (name: string) => {
  const rules = createPasswordRules(name);

  return z
    .string()
    .max(MAX_PASSWORD_LENGTH, `Use at most ${MAX_PASSWORD_LENGTH} characters.`)
    .refine((password) => rules.every((rule) => isRuleMet(rule, password)), {
      message: 'Meet every rule below the field.',
    });
};
