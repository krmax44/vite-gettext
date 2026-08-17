import path from 'node:path';
import { expect, onTestFinished, test } from 'vitest';
import { VueXGetText } from '..';
import { glob, readFile, unlink } from 'node:fs/promises';
import { config } from '../cli';
import { processConfig } from 'zodline';

test('extraction', async () => {
  const tmpPo = path.resolve(__dirname, 'cli-tmp.po');

  onTestFinished(() => {
    unlink(tmpPo).catch();
  });

  expect.assertions(2);

  async function extract() {
    const result = processConfig(config, [
      //   'vite-gettext',
      'extract',
      '--glob-pattern',
      './src/tests/fixtures/**/*.{vue,js,ts}',
      tmpPo,
    ]);
    await result.command.action(result.options, result.args);

    const messages = (await readFile(tmpPo, 'utf-8')).replace(
      /^"POT-Creation-Date: .+"$/gm,
      '',
    );
    await expect(messages).toMatchFileSnapshot('snapshots/extracted.po');
  }

  await extract(); // create po initially
  await extract(); // update po
});
