import {
  mkdtempDisposable,
  mkdir,
  readFile,
  writeFile,
  access,
} from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { extract } from './template';
import { parse } from 'vue/compiler-sfc';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { SFCSerializer } from './serializer';
import { extractionOptionsSchema, type ExtractionOptions } from './types';

export class VueXGetText {
  public vueFiles: string[];
  public jsTsFiles: string[];
  public options: ExtractionOptions;

  constructor(
    public files: string[],
    public root: string,
    public output: string,
    options?: ExtractionOptions,
  ) {
    this.vueFiles = files.filter((f) => f.endsWith('.vue'));
    this.jsTsFiles = files.filter(
      (f) => f.endsWith('.js') || f.endsWith('.ts'),
    );
    this.options = extractionOptionsSchema.parse(options ?? {});
  }

  async extractMessages() {
    const { path: tmp, remove: removeTmpDir } = await mkdtempDisposable(
      path.join(tmpdir(), 'vuexgettext-'),
    );

    try {
      const srcDir = path.join(tmp, 'src');

      const folders = new Set<string>();
      const rewrittenFiles = [];
      const promises = [];

      for (const file of this.vueFiles) {
        const relative = path.relative(this.root, file);
        const rewritten = path.join(srcDir, relative);
        rewrittenFiles.push(relative);
        const { dir } = path.parse(rewritten);

        // TODO: handle parent folders
        if (!folders.has(dir)) {
          await mkdir(dir, { recursive: true });
          folders.add(dir);
        }

        const code = await readFile(file, 'utf-8');
        const parsed = parse(code);
        const { translations } = extract(parsed);

        const serializer = new SFCSerializer(parsed, translations);

        promises.push(writeFile(rewritten, serializer.serialize(), 'utf-8'));
      }

      const hasVueFiles = this.vueFiles.length !== 0;
      const hasJsFiles = this.jsTsFiles.length !== 0;
      let vueFileList, jsFileList;

      if (hasVueFiles) {
        vueFileList = path.join(tmp, 'vueFileList.txt');
        promises.push(
          writeFile(vueFileList, rewrittenFiles.join('\n'), 'utf-8'),
        );
      }

      if (hasJsFiles) {
        jsFileList = path.join(tmp, 'jsFileList.txt');
        const jsFileListContent = this.jsTsFiles
          .map((file) => path.relative(this.root, file))
          .join('\n');
        promises.push(writeFile(jsFileList, jsFileListContent, 'utf-8'));
      }

      await Promise.all(promises);

      const messageFiles = [];

      if (hasVueFiles) {
        const vuePo = path.join(tmp, 'vue.po');

        const vueCode = await this.spawnXGetText(vueFileList!, vuePo, srcDir);

        if (vueCode !== 0) {
          throw Error('Could not extract messages');
        }

        messageFiles.push(vuePo);
      }

      if (hasJsFiles) {
        const jsPo = path.join(tmp, 'js.po');

        const jsCode = await this.spawnXGetText(jsFileList!, jsPo, this.root);

        if (jsCode !== 0) {
          throw Error('Could not extract messages');
        }

        messageFiles.push(jsPo);
      }

      if (messageFiles.length) {
        await this.mergeMessages(messageFiles, this.output, tmp);
      } else {
        throw new Error('No files found.');
      }
    } finally {
      await removeTmpDir();
    }
  }

  spawnXGetText(
    fileList: string,
    output: string,
    cwd: string,
    args: string[] = [],
  ) {
    if (this.options.omitHeader) {
      args.push('--omit-header');
    }

    return this.run(
      'xgettext',
      [
        '--language=JavaScript',
        '--force-po',
        '--from-code',
        this.options.encoding,
        '--files-from',
        fileList,
        // '--omit-header',
        '--output',
        output,
        ...args,
      ],
      {
        cwd,
      },
    );
  }

  async mergeMessages(files: string[], output: string, tmp: string) {
    let poExists;

    try {
      await access(output);
      poExists = true;
    } catch {
      poExists = false;
    }

    if (poExists) {
      const merged = path.join(tmp, 'merged.po');
      const cat = await this.run(
        'msgcat',
        ['--sort-by-file', '--output', merged, ...files],
        {},
      );

      if (cat != 0) {
        throw new Error('Could not merge messages');
      }

      const mergeArgs = [
        '--update',
        '--previous',
        '--backup=none',
        output,
        merged,
      ];

      if (!this.options.fuzzy) {
        mergeArgs.unshift('--no-fuzzy-matching');
      }

      const merge = await this.run('msgmerge', mergeArgs, {});

      if (merge != 0) {
        throw new Error('Could not merge messages');
      }
    } else {
      const cat = await this.run(
        'msgcat',
        ['--sort-by-file', '--output', output, ...files],
        {},
      );

      if (cat != 0) {
        throw new Error('Could not merge messages');
      }
    }
  }

  private async run(...args: Parameters<typeof spawn>) {
    const spawnedProcess = spawn(...args);

    spawnedProcess.stdout?.on('data', (d) => {
      process.stdout.write(d);
    });

    spawnedProcess.stderr?.on('data', (d) => {
      process.stderr.write(d);
    });

    const [code] = await once(spawnedProcess, 'close');
    return code;
  }
}
