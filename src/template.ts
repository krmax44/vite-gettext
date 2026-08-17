import {
  NodeTypes,
  type AttributeNode,
  type DirectiveNode,
  type ElementNode,
  type Node,
  type SimpleExpressionNode,
} from '@vue/compiler-core';
import { Translation } from './translation';
import { ExtractionWarning, type GettextFunctions } from './types';
import type { SFCParseResult } from 'vue/compiler-sfc';
import { walk } from './walk';

export class TemplateTranslation extends Translation {
  pluralNode?: ElementNode;

  constructor(public rootNode: ElementNode) {
    super();

    this.pluralNode = this.findPluralTemplate();
    this.message = this.getMessage(rootNode);
    this.context = this.getContext();

    if (this.pluralNode) {
      this.plural = this.getMessage(this.pluralNode, 'plural');
    } else {
      this.plural = this.getPropMessage(rootNode, 'plural');
    }
  }

  getPropMessage(node: ElementNode, keyword: string) {
    const prop = node.props.find(
      (p) => p.type == NodeTypes.ATTRIBUTE && p.name == keyword,
    ) as AttributeNode | undefined;

    return prop?.value?.content;
  }

  getMessage(node: ElementNode, keyword = 'message') {
    const propMessage = this.getPropMessage(node, keyword);
    if (propMessage) return propMessage;

    const contentChildren = node.children.filter(
      (child) => child.type != NodeTypes.ELEMENT,
    );
    const message = contentChildren
      .map((c) => c.loc.source)
      .join('')
      .trim();

    if (!message) {
      throw new ExtractionWarning(
        '<Translation> was provided with no message. Make sure to not use prop bindings.',
        node.loc,
      );
    }

    return message;
  }

  findPluralTemplate() {
    const checkProp = (_prop: AttributeNode | DirectiveNode) => {
      if (_prop.type == NodeTypes.DIRECTIVE) {
        const prop = _prop as DirectiveNode;

        return (
          prop.name === 'slot' &&
          (prop.arg as SimpleExpressionNode)?.content == 'plural'
        );
      }
    };

    return this.rootNode.children.find((child) => {
      if (child.type === NodeTypes.ELEMENT) {
        const el = child as ElementNode;

        if (el.tag == 'template' && el.props.some(checkProp)) {
          return true;
        }
      }
    }) as ElementNode | undefined;
  }

  getContext() {
    const prop = this.rootNode.props.find((prop) => prop.name == 'context');
    if (prop?.type === NodeTypes.ATTRIBUTE) {
      return prop.value?.content;
    }
  }

  gettextCall(gettextFunctions?: GettextFunctions) {
    if (this.plural && this.context) {
      return {
        method: gettextFunctions?.npgettext ?? 'npgettext',
        args: [this.context, this.message, this.plural, 1],
      };
    } else if (this.plural) {
      return {
        method: gettextFunctions?.ngettext ?? 'ngettext',
        args: [this.message, this.plural, 1],
      };
    } else if (this.context) {
      return {
        method: gettextFunctions?.pgettext ?? 'pgettext',
        args: [this.context, this.message],
      };
    } else {
      return {
        method: gettextFunctions?.gettext ?? 'gettext',
        args: [this.message],
      };
    }
  }
}

export function extract(parseResult: SFCParseResult) {
  const program = parseResult.descriptor.template?.ast;

  if (!program) throw Error('Invalid parser result');

  const state = {
    translations: [] as TemplateTranslation[],
  };

  walk(program as Node, state, {
    [NodeTypes.ELEMENT](node: ElementNode, { next, state }) {
      if (node.tag == 'Translate') {
        state.translations.push(new TemplateTranslation(node));
      } else {
        next();
      }
    },
  });

  return state;
}
