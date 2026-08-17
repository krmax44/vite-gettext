import { expect, test } from 'vitest';
import { extract } from '../template';
import path from 'node:path';
import fs from 'node:fs/promises';
import { parse } from 'vue/compiler-sfc';
import { SFCSerializer } from '../serializer';

test('template', async () => {
  for await (const fixture of fs.glob('./fixtures/Basi*.vue', {
    cwd: __dirname,
  })) {
    const src = await fs.readFile(path.join(__dirname, fixture), 'utf-8');
    const { name } = path.parse(fixture);
    const parsed = parse(src);

    const { translations } = extract(parsed);

    await expect(translations.map((t) => t.toJSON())).toMatchFileSnapshot(
      path.join('snapshots', 'extraction', name + '.js.snap'),
    );

    const serializer = new SFCSerializer(parsed, translations);

    await expect(serializer.serialize()).toMatchFileSnapshot(
      path.join('snapshots', 'serialization', name + '.js.snap'),
    );
  }
});
