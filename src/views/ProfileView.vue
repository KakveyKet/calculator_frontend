<script setup>
import { computed, onMounted } from "vue";

import { useRouter } from "vue-router";

import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import Tag from "primevue/tag";

import { authState, logout, refreshCurrentUser } from "../stores/auth.js";

import LanguageSwitch from "../components/LanguageSwitch.vue";

const router = useRouter();

const { t } = useI18n();

/* =========================================================
   USER
========================================================= */

const user = computed(() => {
  return authState.user;
});

/* =========================================================
   ROLE
========================================================= */

const roleLabel = computed(() => {
  return user.value?.role === "SUPER_ADMIN"
    ? t("profile.superAdmin")
    : t("profile.user");
});

/* =========================================================
   MODULE NAMES

   Use translation keys.
========================================================= */

const moduleNames = {
  CALCULATOR: "navigation.calculator",

  INVOICES: "navigation.invoices",

  CATEGORIES: "navigation.categories",

  SUB_CATEGORIES: "navigation.subCategories",

  USERS: "navigation.users",
};

/* =========================================================
   MODULE ACCESS
========================================================= */

const permissions = computed(() => {
  /* =====================================================
       SUPER ADMIN
    ===================================================== */

  if (user.value?.role === "SUPER_ADMIN") {
    return Object.values(moduleNames).map((key) => t(key));
  }

  /* =====================================================
       USER PERMISSIONS
    ===================================================== */

  const items =
    user.value?.effectiveModulePermissions ||
    user.value?.modulePermissions ||
    [];

  return items.map((permission) => {
    const key = moduleNames[permission];

    return key ? t(key) : permission;
  });
});

/* =========================================================
   BACK
========================================================= */

const goBack = () => {
  router.push("/");
};

/* =========================================================
   LOGOUT
========================================================= */

const signOut = async () => {
  logout();

  await router.replace("/login");
};

/* =========================================================
   LOAD CURRENT USER
========================================================= */

onMounted(async () => {
  try {
    await refreshCurrentUser();
  } catch (error) {
    console.error("PROFILE ERROR:", error);

    if (error.response?.status === 401) {
      logout();

      await router.replace("/login");
    }
  }
});
</script>

<template>
  <main class="min-h-screen bg-slate-50 px-4 py-6">
    <section class="mx-auto max-w-xl">
      <!-- =================================================
           HEADER
      ================================================== -->

      <div class="mb-4 flex items-center justify-between gap-2">
        <!-- BACK -->

        <button
          type="button"
          class="back-button"
          :title="$t('common.back')"
          @click="goBack"
        >
          <i class="pi pi-arrow-left" />
        </button>

        <!-- TITLE -->

        <h1 class="min-w-0 flex-1 text-center text-sm font-bold text-slate-900">
          {{ $t("profile.title") }}
        </h1>

        <!-- LANGUAGE -->

        <LanguageSwitch />
      </div>

      <!-- =================================================
           PROFILE CARD
      ================================================== -->

      <div
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <!-- =================================================
             ACCOUNT
        ================================================== -->

        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-xs text-slate-400">
              {{ $t("profile.account") }}
            </p>

            <h2 class="mt-1 truncate text-xl font-bold text-slate-900">
              {{ user?.name || $t("profile.user") }}
            </h2>

            <p
              v-if="user?.username"
              class="mt-1 truncate text-xs text-slate-400"
            >
              @{{ user.username }}
            </p>

            <p class="mt-1 break-all text-sm text-slate-500">
              {{ user?.email || "—" }}
            </p>
          </div>

          <!-- ROLE -->

          <Tag
            :severity="user?.role === 'SUPER_ADMIN' ? 'warn' : 'info'"
            :value="roleLabel"
          />
        </div>

        <!-- =================================================
             MODULE ACCESS
        ================================================== -->

        <div class="mt-6 border-t border-slate-100 pt-5">
          <p class="text-xs font-semibold text-slate-700">
            {{ $t("profile.moduleAccess") }}
          </p>

          <p class="mt-1 text-[10px] text-slate-400">
            {{
              user?.role === "SUPER_ADMIN"
                ? $t("profile.superAdminAccessDescription")
                : $t("profile.moduleAccessDescription")
            }}
          </p>

          <div v-if="permissions.length" class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="permission in permissions"
              :key="permission"
              class="rounded-md bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700"
            >
              {{ permission }}
            </span>
          </div>

          <p v-else class="mt-2 text-xs text-slate-400">
            {{ $t("profile.noModuleAccess") }}
          </p>
        </div>

        <!-- =================================================
             ACCOUNT INFO
        ================================================== -->

        <div class="mt-6 border-t border-slate-100 pt-5">
          <p class="text-xs font-semibold text-slate-700">
            {{ $t("profile.accountInformation") }}
          </p>

          <div class="mt-3 space-y-3">
            <!-- NAME -->

            <div class="info-row">
              <span>
                {{ $t("profile.name") }}
              </span>

              <strong>
                {{ user?.name || "—" }}
              </strong>
            </div>

            <!-- USERNAME -->

            <div class="info-row">
              <span>
                {{ $t("profile.username") }}
              </span>

              <strong>
                {{ user?.username ? `@${user.username}` : "—" }}
              </strong>
            </div>

            <!-- EMAIL -->

            <div class="info-row">
              <span>
                {{ $t("profile.email") }}
              </span>

              <strong class="break-all text-right">
                {{ user?.email || "—" }}
              </strong>
            </div>

            <!-- ROLE -->

            <div class="info-row">
              <span>
                {{ $t("profile.role") }}
              </span>

              <strong>
                {{ roleLabel }}
              </strong>
            </div>
          </div>
        </div>

        <!-- =================================================
             LOGOUT
        ================================================== -->

        <div class="mt-6 border-t border-slate-100 pt-5">
          <Button
            :label="$t('profile.logout')"
            icon="pi pi-sign-out"
            severity="danger"
            outlined
            class="w-full sm:w-auto"
            @click="signOut"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ========================================================
   BACK
======================================================== */

.back-button {
  display: flex;

  width: 36px;
  height: 36px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  border-radius: 9px;

  color: #64748b;

  transition: background-color 0.15s;
}

.back-button:hover {
  background: #f1f5f9;
}

/* ========================================================
   INFO
======================================================== */

.info-row {
  display: flex;

  align-items: flex-start;
  justify-content: space-between;

  gap: 16px;

  padding-bottom: 10px;

  border-bottom: 1px solid #f1f5f9;
}

.info-row:last-child {
  padding-bottom: 0;

  border-bottom: 0;
}

.info-row span {
  flex-shrink: 0;

  font-size: 10px;

  color: #94a3b8;
}

.info-row strong {
  min-width: 0;

  font-size: 11px;

  font-weight: 600;

  color: #334155;
}
</style>
