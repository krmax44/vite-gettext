import type { SFCParseResult } from 'vue/compiler-sfc';
import type { TemplateTranslation } from './template';
import type { GettextFunctions } from './types';
import type { SourceLocation } from '@vue/compiler-core';

interface SerializerBlock {
  loc: SourceLocation;
  content: string;
}

export class SFCSerializer {
  blocks: SerializerBlock[] = [];

  constructor(
    public parseResult: SFCParseResult,
    public translations: TemplateTranslation[],
    public gettextFunctions?: GettextFunctions,
  ) {
    this.serializeTemplate();
    this.serializeScripts();
    this.blocks.sort((a, b) => a.loc.start.line - b.loc.start.line);
  }

  public serialize() {
    let lines = 1;
    let output = '';

    for (const { loc, content } of this.blocks) {
      const diff = loc.start.line - lines;
      const lineCount = content.split('\n').length - 1;

      output += '\n'.repeat(diff);
      output += content;

      lines += diff + lineCount;
    }

    return output;
  }

  private serializeTemplate() {
    for (const translation of this.translations) {
      const { method, args: _args } = translation.gettextCall(
        this.gettextFunctions,
      );

      const serializeString = (s: string) =>
        `\`${s.replaceAll('`', '\`').replaceAll('${', '\${')}\``;

      const args = _args.map((a) =>
        typeof a === 'string' ? serializeString(a) : a,
      );

      const call = `${method}(${args.join(', ')})`;

      this.blocks.push({
        loc: translation.rootNode.loc,
        content: call,
      });
    }
  }

  private serializeScripts() {
    const scripts = [
      this.parseResult.descriptor.script,
      this.parseResult.descriptor.scriptSetup,
    ].filter((s) => s != null);

    for (const script of scripts) {
      this.blocks.push({
        loc: script.loc,
        content: script.content,
      });
    }
  }
}
