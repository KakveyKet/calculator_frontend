<script setup>
import { useI18n } from "vue-i18n";

const { locale } = useI18n();

const setLanguage = (language) => {
  locale.value = language;

  localStorage.setItem("language", language);
};
</script>

<template>
  <div class="language-switch">
    <button
      type="button"
      class="language-button"
      :class="{
        active: locale === 'km',
      }"
      @click="setLanguage('km')"
    >
      ខ្មែរ
    </button>

    <button
      type="button"
      class="language-button"
      :class="{
        active: locale === 'en',
      }"
      @click="setLanguage('en')"
    >
      EN
    </button>
  </div>
</template>

<style scoped>
.language-switch {
  display: flex;

  align-items: center;

  gap: 2px;

  padding: 2px;

  border: 1px solid #e2e8f0;

  border-radius: 8px;

  background: #f8fafc;
}

.language-button {
  min-height: 28px;

  padding: 0 7px;

  border-radius: 6px;

  font-size: 9px;

  font-weight: 700;

  color: #64748b;
}

.language-button.active {
  background: #16a34a;

  color: white;
}
</style>
