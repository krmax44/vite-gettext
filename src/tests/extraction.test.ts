import path from 'node:path';
import { expect, onTestFinished, test } from 'vitest';
import { VueXGetText } from '..';
import { glob, readFile, unlink } from 'node:fs/promises';

test('extraction', async () => {
  const tmpPo = path.resolve(__dirname, 'e2e-temp.po');

  onTestFinished(() => {
    unlink(tmpPo).catch();
  });

  expect.assertions(2);

  async function extract() {
    const fixtures = glob(path.join(__dirname, './fixtures/*'));
    const paths = await Array.fromAsync(fixtures);
    const vueXGetText = new VueXGetText(
      paths,
      path.resolve(__dirname, '../../'),
      tmpPo,
    );

    await vueXGetText.extractMessages();

    const messages = (await readFile(tmpPo, 'utf-8')).replace(
      /^"POT-Creation-Date: .+"$/gm,
      '',
    );
    await expect(messages).toMatchFileSnapshot('snapshots/extracted.po');
  }

  await extract(); // create po initially
  await extract(); // update po
});
