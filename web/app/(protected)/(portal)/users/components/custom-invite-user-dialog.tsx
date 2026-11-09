'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../lib/role-meta';
import { inviteUserSchema, roleSchema } from '../types/users';

import type { InviteUserInput } from '../types/users';

type CustomInviteUserDialogProps = {
  isOpen: boolean;
  takenEmails: string[];
  onOpenChange: (isOpen: boolean) => void;
  onInvite: (values: InviteUserInput) => void;
};

const DEFAULT_VALUES: InviteUserInput = { name: '', email: '', role: 'operator' };

const CustomInviteUserDialog = ({ isOpen, takenEmails, onOpenChange, onInvite }: CustomInviteUserDialogProps) => {
  const form = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });

  const handleOpenChange = (isNextOpen: boolean) => {
    if (!isNextOpen) form.reset(DEFAULT_VALUES);
    onOpenChange(isNextOpen);
  };

  const handleInvite = (values: InviteUserInput) => {
    if (takenEmails.includes(values.email)) {
      form.setError('email', { message: 'Someone already uses this email. Search for them in the list instead.' });
      return;
    }
    onInvite(values);
    form.reset(DEFAULT_VALUES);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>They get an email with a temporary password that works for 24 hours.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(handleInvite)}>
          <FieldGroup className="gap-6">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="invite-name">Full name</FieldLabel>
                  <Input
                    {...field}
                    id="invite-name"
                    autoComplete="name"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.invalid ? 'invite-name-error' : undefined}
                    className="h-11 bg-card"
                  />
                  <FieldError id="invite-name-error" errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      {...field}
                      id="invite-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="maria@farm.ph"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldState.invalid ? 'invite-email-error' : undefined}
                      className="h-11 bg-card pl-10"
                    />
                  </div>
                  <FieldError id="invite-email-error" errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="invite-role" aria-describedby="invite-role-hint" className="data-[size=default]:h-11 w-full bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleSchema.options.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription id="invite-role-hint">{ROLE_DESCRIPTIONS[field.value]}</FieldDescription>
                </Field>
              )}
            />
            <DialogFooter className="gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-11">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="h-11" disabled={form.formState.isSubmitting}>
                <UserPlus aria-hidden />
                Send invite
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomInviteUserDialog;
