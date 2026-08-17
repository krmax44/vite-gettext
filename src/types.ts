import { z } from 'zod';
import type { SourceLocation } from '@vue/compiler-core';

export const gettextFunctionsSchema = z.object({
  gettext: z.string().default('gettext'),
  ngettext: z.string().default('ngettext'),
  pgettext: z.string().default('pgettext'),
  npgettext: z.string().default('npgettext'),
});

export type GettextFunctions = z.infer<typeof gettextFunctionsSchema>;

export const extractionOptionsSchema = z.object({
  functions: z
    .record(
      gettextFunctionsSchema.keyof(),
      z.union([z.string(), z.array(z.string())]),
    )
    .optional()
    .describe('Map gettext functions, i.e. gettext() → $gt()'),
  fuzzy: z.boolean().default(false).describe('Fuzzy message matching'),
  omitHeader: z.boolean().default(false).describe('Omit gettext header'),
  noObsolete: z.boolean().default(false).describe('Remove obsolete messages'),
  globPattern: z
    .string()
    .default('**/*.{js,ts,vue}')
    .describe('Files to scan for messages'),
  exclude: z
    .array(z.string())
    .default(['**/node_modules', '**/.git'])
    .describe('Files to exclude when scanning'),
  cwd: z
    .string()
    .default(process.cwd())
    .describe('Root directory (defaults to cwd)'),
  encoding: z.string().default('UTF-8').describe('Character encoding'),
});

export type ExtractionOptions = z.infer<typeof extractionOptionsSchema>;

export interface Warning {
  message: string;
  file: string;
  line: number;
}

export class ExtractionWarning extends Error {
  constructor(
    public override message: string,
    public loc: SourceLocation,
  ) {
    super(message);
  }
}
