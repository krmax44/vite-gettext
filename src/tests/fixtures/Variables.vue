<script setup>
import { ref } from 'vue';

const message = ref('World');
</script>

<template>
  <Translate :data="{ message }"> Hello {{ message }}! </Translate>
</template>
