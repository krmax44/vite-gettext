import type { Plugin } from 'vite';

export default function gettextPlugin(): Plugin {
  return {
    name: 'vite-gettext',
    enforce: 'pre',
  };
}
