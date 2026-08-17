import { gettext, ngettext, pgettext, npgettext } from 'vue-xgettext';

gettext('Hello World from a JS file!');
ngettext('JavaScript', 'JavaScripts', 5);
pgettext('js context', 'Hello World!');
npgettext('js context', 'JavaScript', 'JavaScripts', 5);
