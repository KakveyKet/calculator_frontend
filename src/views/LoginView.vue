<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Message from "primevue/message";

import { login } from "../stores/auth.js";

import LanguageSwitch from "../components/LanguageSwitch.vue";

const router = useRouter();

const { t } = useI18n();

const loading = ref(false);
const error = ref("");

/* =========================================================
   FORM
========================================================= */

const form = reactive({
  identifier: "",
  password: "",
});

/* =========================================================
   LOGIN
========================================================= */

async function submit() {
  error.value = "";

  /* =====================================================
     IDENTIFIER
  ===================================================== */

  if (!form.identifier.trim()) {
    error.value = t("auth.enterUsernameOrEmail");

    return;
  }

  /* =====================================================
     PASSWORD
  ===================================================== */

  if (!form.password) {
    error.value = t("auth.enterPassword");

    return;
  }

  try {
    loading.value = true;

    await login({
      identifier: form.identifier.trim(),

      password: form.password,
    });

    /* ===================================================
       ALWAYS GO TO DASHBOARD
    =================================================== */

    await router.replace("/");
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    error.value =
      err.response?.data?.message || err.message || t("auth.loginFailed");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main
    class="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8"
  >
    <!-- ===================================================
         LANGUAGE SWITCH
    ==================================================== -->

    <div class="absolute right-4 top-4">
      <LanguageSwitch />
    </div>

    <section class="w-full max-w-sm">
      <!-- =================================================
           HEADER
      ================================================== -->

      <div class="mb-6 text-center">
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white"
        >
          <i class="pi pi-lock text-lg" />
        </div>

        <h1 class="mt-4 text-2xl font-bold text-slate-900">
          {{ $t("auth.signIn") }}
        </h1>

        <p class="mt-1 text-sm text-slate-500">
          {{ $t("auth.signInDescription") }}
        </p>
      </div>

      <!-- =================================================
           LOGIN CARD
      ================================================== -->

      <div
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <!-- =================================================
             ERROR
        ================================================== -->

        <Message v-if="error" severity="error" :closable="false" class="mb-4">
          {{ error }}
        </Message>

        <!-- =================================================
             FORM
        ================================================== -->

        <form class="space-y-5" @submit.prevent="submit">
          <!-- ===============================================
               USERNAME / EMAIL
          ================================================ -->

          <div>
            <label
              for="identifier"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              {{ $t("auth.usernameOrEmail") }}
            </label>

            <InputText
              id="identifier"
              v-model="form.identifier"
              type="text"
              autocomplete="username"
              :placeholder="$t('auth.usernameOrEmailPlaceholder')"
              class="login-input w-full"
              :disabled="loading"
              autofocus
            />
          </div>

          <!-- ===============================================
               PASSWORD
          ================================================ -->

          <div>
            <label
              for="password"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              {{ $t("auth.password") }}
            </label>

            <Password
              input-id="password"
              v-model="form.password"
              class="login-password w-full"
              input-class="w-full"
              :feedback="false"
              toggle-mask
              autocomplete="current-password"
              :placeholder="$t('auth.passwordPlaceholder')"
              :disabled="loading"
            />
          </div>

          <!-- ===============================================
               SIGN IN
          ================================================ -->

          <Button
            type="submit"
            :label="$t('auth.signIn')"
            icon="pi pi-sign-in"
            class="signin-button w-full"
            :loading="loading"
          />
        </form>
      </div>

      <!-- =================================================
           FOOTER
      ================================================== -->

      <p class="mt-5 text-center text-[10px] text-slate-400">
        {{ $t("auth.secureLogin") }}
      </p>
    </section>
  </main>
</template>

<style scoped>
/* ========================================================
   INPUT
======================================================== */

.login-input {
  width: 100% !important;

  min-height: 48px !important;

  padding-left: 14px !important;
  padding-right: 14px !important;

  border-radius: 10px !important;

  font-size: 14px !important;
}

/* ========================================================
   PASSWORD
======================================================== */

.login-password {
  width: 100%;
}

.login-password :deep(.p-password) {
  width: 100%;
}

.login-password :deep(.p-password-input) {
  width: 100% !important;

  min-height: 48px !important;

  padding-left: 14px !important;

  /*
   * Space for PrimeVue eye icon
   */
  padding-right: 44px !important;

  border-radius: 10px !important;

  font-size: 14px !important;
}

/* ========================================================
   PASSWORD EYE ICON
======================================================== */

.login-password :deep(.p-password-toggle-mask-icon) {
  right: 14px !important;
}

/* ========================================================
   SIGN IN
======================================================== */

.signin-button {
  min-height: 48px;

  border-radius: 9px;
}

/* ========================================================
   FOCUS
======================================================== */

.login-input:focus,
.login-password :deep(.p-password-input:focus) {
  border-color: #22c55e !important;

  box-shadow: 0 0 0 1px #22c55e !important;
}

/* ========================================================
   MOBILE
======================================================== */

@media (max-width: 390px) {
  .login-input,
  .login-password :deep(.p-password-input) {
    min-height: 46px !important;

    font-size: 13px !important;
  }

  .signin-button {
    min-height: 46px;
  }
}
</style>
