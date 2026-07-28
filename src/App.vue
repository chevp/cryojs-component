<script setup lang="ts">
import CryoScene from './components/CryoScene.vue'

const params = new URLSearchParams(window.location.search)
const url = params.get('url') ?? undefined
</script>

<template>
  <CryoScene :url="url" />
</template>
