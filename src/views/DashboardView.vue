<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import api from "../services/api.js";

import { logout } from "../stores/auth.js";

import LanguageSwitch from "../components/LanguageSwitch.vue";

const router = useRouter();

const { t, locale } = useI18n();

/* =========================================================
   SYSTEM BRAND
========================================================= */

const SYSTEM_NAME = "Soda";

const SYSTEM_LOGO =
  "https://res.cloudinary.com/e0brilgp/image/upload/v1792760260/logo.jpg";

/* =========================================================
   STATE
========================================================= */

const currentUser = ref(null);

const loading = ref(true);

const loadError = ref("");

/* =========================================================
   MODULES
========================================================= */

const modules = [
  {
    permission: "CALCULATOR",

    titleEn: "Calculator",

    titleKm: "គណនា",

    descriptionKey: "dashboard.calculatorDescription",

    icon: "pi pi-calculator",

    route: "/calculator",
  },

  {
    permission: "INVOICES",

    titleEn: "Invoice List",

    titleKm: "បញ្ជីវិក្កយបត្រ",

    descriptionKey: "dashboard.invoicesDescription",

    icon: "pi pi-list",

    route: "/invoices",
  },

  {
    permission: "CATEGORIES",

    titleEn: "Categories",

    titleKm: "ប្រភេទ",

    descriptionKey: "dashboard.categoriesDescription",

    icon: "pi pi-tags",

    route: "/categories",
  },

  {
    permission: "SUB_CATEGORIES",

    titleEn: "Sub Categories",

    titleKm: "ប្រភេទរង",

    descriptionKey: "dashboard.subCategoriesDescription",

    icon: "pi pi-sitemap",

    route: "/sub-categories",
  },

  {
    permission: "USERS",

    titleEn: "User Management",

    titleKm: "គ្រប់គ្រងអ្នកប្រើប្រាស់",

    descriptionKey: "dashboard.usersDescription",

    icon: "pi pi-users",

    route: "/users",
  },
];

/* =========================================================
   MODULE TITLE

   Dashboard only translation.
========================================================= */

const moduleTitle = (module) => {
  if (locale.value === "km") {
    return module.titleKm;
  }

  return module.titleEn;
};

/* =========================================================
   PERMISSIONS
========================================================= */

const currentPermissions = computed(() => {
  if (!currentUser.value) {
    return [];
  }

  /* =====================================================
     SUPER ADMIN
  ===================================================== */

  if (currentUser.value.role === "SUPER_ADMIN") {
    return modules.map((module) => module.permission);
  }

  /* =====================================================
     EFFECTIVE MODULE PERMISSIONS
  ===================================================== */

  if (Array.isArray(currentUser.value.effectiveModulePermissions)) {
    return currentUser.value.effectiveModulePermissions;
  }

  /* =====================================================
     NORMAL MODULE PERMISSIONS
  ===================================================== */

  if (Array.isArray(currentUser.value.modulePermissions)) {
    return currentUser.value.modulePermissions;
  }

  return [];
});

/* =========================================================
   VISIBLE MODULES
========================================================= */

const visibleModules = computed(() => {
  return modules.filter((module) =>
    currentPermissions.value.includes(module.permission),
  );
});

/* =========================================================
   INITIALS
========================================================= */

const initials = computed(() => {
  const name = String(currentUser.value?.name || "").trim();

  if (!name) {
    return "U";
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
});

/* =========================================================
   LOAD CURRENT USER
========================================================= */

const loadCurrentUser = async () => {
  try {
    loading.value = true;

    loadError.value = "";

    const response = await api.get("/users/me");

    currentUser.value = response.data.data;
  } catch (error) {
    console.error("LOAD CURRENT USER ERROR:", error);

    if (error.response?.status === 401) {
      logout();

      await router.replace("/login");

      return;
    }

    loadError.value =
      error.response?.data?.message || t("dashboard.loadAccountError");
  } finally {
    loading.value = false;
  }
};

/* =========================================================
   OPEN MODULE
========================================================= */

const openModule = (module) => {
  router.push(module.route);
};

/* =========================================================
   PROFILE
========================================================= */

const openProfile = () => {
  router.push("/profile");
};

/* =========================================================
   LOGOUT
========================================================= */

const signOut = async () => {
  logout();

  await router.replace("/login");
};

/* =========================================================
   INIT
========================================================= */

onMounted(() => {
  loadCurrentUser();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- ===================================================
         HEADER
    ==================================================== -->

    <header class="border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4"
      >
        <!-- =================================================
             BRAND + USER
        ================================================== -->

        <div class="flex min-w-0 items-center gap-3">
          <!-- LOGO -->

          <div class="brand-logo-wrapper">
            <img
              :src="SYSTEM_LOGO"
              :alt="`${SYSTEM_NAME} Logo`"
              class="brand-logo"
            />
          </div>

          <!-- BRAND -->

          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="truncate text-lg font-black text-slate-900 sm:text-xl">
                {{ SYSTEM_NAME }}
              </h1>
            </div>

            <p class="mt-0.5 truncate text-[10px] text-slate-500 sm:text-xs">
              {{ $t("dashboard.welcomeBack") }}

              <span class="font-semibold text-slate-700">
                {{ currentUser?.name || $t("users.user") }}
              </span>
            </p>
          </div>
        </div>

        <!-- =================================================
             RIGHT
        ================================================== -->

        <div class="flex shrink-0 items-center gap-2">
          <!-- LANGUAGE -->

          <LanguageSwitch />

          <!-- PROFILE -->

          <button
            type="button"
            class="profile-button"
            :title="$t('navigation.profile')"
            @click="openProfile"
          >
            {{ initials }}
          </button>

          <!-- LOGOUT -->

          <button
            type="button"
            class="logout-button"
            :title="$t('navigation.logout')"
            @click="signOut"
          >
            <i class="pi pi-sign-out" />

            <span class="hidden sm:inline">
              {{ $t("navigation.logout") }}
            </span>
          </button>
        </div>
      </div>
    </header>

    <!-- ===================================================
         MAIN
    ==================================================== -->

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <!-- =================================================
           PAGE INTRO
      ================================================== -->

      <div v-if="!loading && !loadError && visibleModules.length" class="mb-5">
        <h2 class="text-base font-bold text-slate-800">
          {{ $t("dashboard.modules") }}
        </h2>

        <p class="mt-1 text-xs text-slate-400">
          {{ $t("dashboard.subtitle") }}
        </p>
      </div>

      <!-- =================================================
           LOADING
      ================================================== -->

      <div v-if="loading" class="py-20 text-center">
        <i class="pi pi-spin pi-spinner text-2xl text-green-600" />

        <p class="mt-3 text-xs text-slate-400">
          {{ $t("dashboard.loading") }}
        </p>
      </div>

      <!-- =================================================
           ERROR
      ================================================== -->

      <div
        v-else-if="loadError"
        class="rounded-xl border border-red-200 bg-red-50 p-8 text-center"
      >
        <i class="pi pi-exclamation-circle text-xl text-red-500" />

        <p class="mt-2 text-sm text-red-700">
          {{ loadError }}
        </p>
      </div>

      <!-- =================================================
           NO MODULE
      ================================================== -->

      <div
        v-else-if="!visibleModules.length"
        class="rounded-xl border border-slate-200 bg-white p-10 text-center"
      >
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
        >
          <i class="pi pi-lock" />
        </div>

        <h2 class="mt-3 font-semibold text-slate-700">
          {{ $t("dashboard.noModules") }}
        </h2>

        <p class="mt-1 text-xs text-slate-400">
          {{ $t("dashboard.noModulesDescription") }}
        </p>
      </div>

      <!-- =================================================
           MODULE CARDS
      ================================================== -->

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="module in visibleModules"
          :key="module.permission"
          type="button"
          class="dashboard-card"
          @click="openModule(module)"
        >
          <!-- =================================================
               ICON
          ================================================== -->

          <div class="dashboard-icon">
            <i :class="module.icon" />
          </div>

          <!-- =================================================
               TITLE

               Dashboard specific Khmer / English translation
          ================================================== -->

          <h2 class="mt-4 text-base font-bold text-slate-800">
            {{ moduleTitle(module) }}
          </h2>

          <!-- =================================================
               DESCRIPTION
          ================================================== -->

          <p class="mt-1 text-xs leading-5 text-slate-500">
            {{ $t(module.descriptionKey) }}
          </p>

          <!-- =================================================
               OPEN
          ================================================== -->

          <div
            class="mt-4 flex items-center gap-1 text-[10px] font-semibold text-green-600"
          >
            <span>
              {{ $t("dashboard.open") }}
            </span>

            <i class="pi pi-arrow-right text-[9px]" />
          </div>
        </button>
      </div>

      <!-- =================================================
           FOOTER BRAND
      ================================================== -->

      <div
        v-if="!loading && !loadError"
        class="mt-8 flex items-center justify-center gap-2 text-[9px] text-slate-400"
      >
        <img
          :src="SYSTEM_LOGO"
          :alt="`${SYSTEM_NAME} Logo`"
          class="h-5 w-5 rounded-md object-cover"
        />

        <span>
          {{ SYSTEM_NAME }}
        </span>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ========================================================
   BRAND
======================================================== */

.brand-logo-wrapper {
  display: flex;

  width: 44px;
  height: 44px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  overflow: hidden;

  border: 1px solid #dcfce7;

  border-radius: 12px;

  background: #f0fdf4;
}

.brand-logo {
  width: 100%;
  height: 100%;

  object-fit: cover;
}

/* ========================================================
   DASHBOARD CARD
======================================================== */

.dashboard-card {
  width: 100%;

  padding: 1.25rem;

  border: 1px solid #e2e8f0;

  border-radius: 1rem;

  background: white;

  text-align: left;

  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
}

.dashboard-card:hover {
  border-color: #86efac;

  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);

  transform: translateY(-1px);
}

/* ========================================================
   MODULE ICON
======================================================== */

.dashboard-icon {
  display: flex;

  width: 52px;
  height: 52px;

  align-items: center;
  justify-content: center;

  border-radius: 12px;

  background: #f0fdf4;

  color: #16a34a;

  font-size: 22px;
}

/* ========================================================
   PROFILE
======================================================== */

.profile-button {
  display: flex;

  width: 38px;
  height: 38px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: #16a34a;

  color: white;

  font-size: 11px;

  font-weight: 700;

  transition: background-color 0.15s;
}

.profile-button:hover {
  background: #15803d;
}

/* ========================================================
   LOGOUT
======================================================== */

.logout-button {
  display: flex;

  min-height: 38px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  gap: 6px;

  padding: 0 11px;

  border: 1px solid #fecaca;

  border-radius: 9px;

  background: white;

  font-size: 12px;

  font-weight: 600;

  color: #dc2626;

  transition: background-color 0.15s;
}

.logout-button:hover {
  background: #fef2f2;
}

/* ========================================================
   MOBILE
======================================================== */

@media (max-width: 500px) {
  .logout-button {
    width: 36px;

    padding: 0;
  }

  .brand-logo-wrapper {
    width: 40px;
    height: 40px;

    border-radius: 10px;
  }
}

/* ========================================================
   SMALL MOBILE
======================================================== */

@media (max-width: 390px) {
  .profile-button,
  .logout-button {
    width: 34px;
    height: 34px;

    min-height: 34px;
  }

  .brand-logo-wrapper {
    width: 36px;
    height: 36px;

    border-radius: 9px;
  }
}
</style>
