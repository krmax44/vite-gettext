import { z } from 'zod';
import {
  defineCommand,
  defineConfig,
  defineOptions,
  processConfig,
} from 'zodline';
import { extractionOptionsSchema } from './types';
import path from 'node:path';
import { glob } from 'node:fs/promises';
import { VueXGetText } from '.';
import { version } from '../package.json';
import { fileURLToPath } from 'node:url';

const extract = defineCommand({
  description: 'Extract messages from source code',
  options: defineOptions(extractionOptionsSchema),
  args: z.tuple([
    z.string().describe('Output .po file').default(process.cwd()),
  ]),
  action: async (options, args) => {
    options;

    const cwd = path.resolve(process.cwd(), options.cwd);

    const output = path.resolve(process.cwd(), args[0]);

    const files = glob(options.globPattern, {
      cwd,
      exclude: options.exclude,
    });

    const paths = await Array.fromAsync(files);
    // console.log(cwd, paths);
    const vueXGetText = new VueXGetText(paths, cwd, output, {
      ...options,
      cwd,
    });

    await vueXGetText.extractMessages();
  },
});

export const config = defineConfig({
  meta: { name: 'vite-gettext', version },
  commands: { extract },
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = processConfig(config, process.argv.slice(2));
  await result.command.action(result.options, result.args);
}
