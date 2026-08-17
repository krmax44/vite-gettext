<template>
  <Translate>
    Hello World

    <template #plural> Hello Worlds </template>
  </Translate>

  <Translate>
    Hello

    <template v-slot:plural> Hello Worlds! </template>

    World!
  </Translate>

  <Translate message="Hello World" plural="Hello Worlds" />
</template>
