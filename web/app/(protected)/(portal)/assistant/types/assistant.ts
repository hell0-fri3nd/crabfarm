import { z } from 'zod';

import { severitySchema } from '@/types/severity';

export const chatRoleSchema = z.enum(['user', 'assistant']);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const chatSourceSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type ChatSource = z.infer<typeof chatSourceSchema>;

export const actionProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  confirm_title: z.string(),
  confirm_body: z.string(),
  confirm_label: z.string(),
  pending_label: z.string(),
  success_title: z.string(),
});
export type ActionProposal = z.infer<typeof actionProposalSchema>;

export const scriptedReplySchema = z.object({
  intro: z.string(),
  steps: z.array(z.string()),
  sources: z.array(chatSourceSchema),
  proposal: actionProposalSchema.nullable(),
});
export type ScriptedReply = z.infer<typeof scriptedReplySchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: chatRoleSchema,
  text: z.string(),
  reply: scriptedReplySchema.nullable(),
  shown_words: z.number().int().min(0),
  status: z.enum(['streaming', 'done', 'stopped']),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatPromptSchema = z
  .string()
  .trim()
  .min(1, 'Type a question first.')
  .max(2000, 'Keep it under 2,000 characters.');

export const contextReadingSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  severity: severitySchema.nullable(),
});
export type ContextReading = z.infer<typeof contextReadingSchema>;
