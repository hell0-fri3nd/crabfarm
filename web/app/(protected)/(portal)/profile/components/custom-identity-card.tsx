'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Pencil, Save } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toInitials } from '@/lib/format';
import { notify } from '@/lib/notify';

import { simulateSave } from '../lib/preview-profile';
import { nameFormSchema } from '../types/profile';

import type { NameFormInput, Profile } from '../types/profile';

type CustomIdentityCardProps = {
  profile: Profile;
};

const CustomIdentityCard = ({ profile }: CustomIdentityCardProps) => {
  const [name, setName] = useState(profile.name);
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<NameFormInput>({
    resolver: zodResolver(nameFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { name },
  });

  const handleSave = async (values: NameFormInput) => {
    await simulateSave();
    setName(values.name);
    setIsEditing(false);
    notify.success('Name saved', { description: `You show up as ${values.name} across CrabFarm.` });
  };

  const handleCancel = () => {
    form.reset({ name });
    setIsEditing(false);
  };

  return (
    <Card className="flex-col gap-5 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-6">
      <Avatar className="size-16 sm:size-18">
        <AvatarFallback className="bg-primary/15 text-xl font-bold text-primary">{toInitials(name)}</AvatarFallback>
      </Avatar>

      {isEditing ? (
        <form noValidate onSubmit={form.handleSubmit(handleSave)} className="flex w-full max-w-md flex-col gap-3">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-name">Name</FieldLabel>
                <Input
                  {...field}
                  id="profile-name"
                  autoComplete="name"
                  autoFocus
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? 'profile-name-error' : undefined}
                  className="h-11 bg-card"
                />
                <FieldError id="profile-name-error" errors={[fieldState.error]} />
              </Field>
            )}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="h-11 w-full px-5 sm:w-auto" disabled={form.formState.isSubmitting}>
              <Save aria-hidden />
              {form.formState.isSubmitting ? 'Saving…' : 'Save name'}
            </Button>
            <Button type="button" variant="ghost" className="h-11 w-full sm:w-auto" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-2xl font-bold">{name}</h2>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Edit name"
              onClick={() => setIsEditing(true)}
              className="shrink-0 bg-card/60"
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4" aria-hidden />
            <span className="break-all">{profile.email}</span>
            <Badge variant="secondary" className="bg-primary/15 font-semibold text-primary">
              {profile.role}
            </Badge>
          </p>
        </div>
      )}
    </Card>
  );
};

export default CustomIdentityCard;
