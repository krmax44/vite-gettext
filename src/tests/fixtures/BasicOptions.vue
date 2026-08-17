<script>
import { gettext, ngettext as n } from 'vue-xgettext';

gettext('Hello World from the script block!');
n('Foo', 'Bar', 5);
</script>

<template>
  <Translate message="Hello World!" />
  <Translate>Hello World! This is a test! </Translate>
</template>
