<script setup>
import { computed, onMounted, reactive, ref } from "vue";

import { useRouter } from "vue-router";

import { useToast } from "primevue/usetoast";

import { useI18n } from "vue-i18n";

import Toast from "primevue/toast";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Select from "primevue/select";
import Tag from "primevue/tag";

import api from "../services/api.js";

import LanguageSwitch from "../components/LanguageSwitch.vue";

const router = useRouter();
const toast = useToast();

const { t, locale } = useI18n();

/* =========================================================
   DATA
========================================================= */

const users = ref([]);

const loading = ref(false);

const saving = ref(false);

const statusLoadingId = ref(null);

/* =========================================================
   PERMISSIONS
========================================================= */

const canManageSuperAdmin = ref(false);

const canManagePermissions = ref(false);

const currentUserRole = ref("USER");

/* =========================================================
   FILTERS
========================================================= */

const search = ref("");

const roleFilter = ref(null);

const statusFilter = ref(null);

/* =========================================================
   DIALOG
========================================================= */

const dialogVisible = ref(false);

const editingUser = ref(null);

/* =========================================================
   MODULES

   Use translation keys instead of fixed labels.
========================================================= */

const moduleOptions = [
  {
    labelKey: "navigation.calculator",

    value: "CALCULATOR",

    icon: "pi pi-calculator",
  },

  {
    labelKey: "navigation.invoices",

    value: "INVOICES",

    icon: "pi pi-list",
  },

  {
    labelKey: "navigation.categories",

    value: "CATEGORIES",

    icon: "pi pi-tags",
  },

  {
    labelKey: "navigation.subCategories",

    value: "SUB_CATEGORIES",

    icon: "pi pi-sitemap",
  },

  {
    labelKey: "navigation.users",

    value: "USERS",

    icon: "pi pi-users",
  },
];

/* =========================================================
   FORM
========================================================= */

const form = reactive({
  name: "",

  username: "",

  email: "",

  password: "",

  role: "USER",

  isActive: true,

  modulePermissions: [],
});

/* =========================================================
   ROLE OPTIONS
========================================================= */

const roleOptions = computed(() => {
  const options = [
    {
      label: t("users.userRole"),

      value: "USER",
    },
  ];

  if (canManageSuperAdmin.value) {
    options.push({
      label: t("users.superAdminRole"),

      value: "SUPER_ADMIN",
    });
  }

  return options;
});

/* =========================================================
   ROLE FILTER
========================================================= */

const roleFilterOptions = computed(() => {
  const options = [
    {
      label: canManageSuperAdmin.value
        ? t("users.allRoles")
        : t("users.allUsers"),

      value: null,
    },

    {
      label: t("users.userRole"),

      value: "USER",
    },
  ];

  if (canManageSuperAdmin.value) {
    options.push({
      label: t("users.superAdminRole"),

      value: "SUPER_ADMIN",
    });
  }

  return options;
});

/* =========================================================
   STATUS OPTIONS
========================================================= */

const statusOptions = computed(() => [
  {
    label: t("users.allStatus"),

    value: null,
  },

  {
    label: t("users.active"),

    value: true,
  },

  {
    label: t("users.inactive"),

    value: false,
  },
]);

/* =========================================================
   DATE LOCALE
========================================================= */

const dateLocale = computed(() => {
  return locale.value === "km" ? "km-KH" : "en-US";
});

/* =========================================================
   DATE
========================================================= */

const formatShortDate = (value) => {
  if (!value) {
    return t("users.never");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return t("users.never");
  }

  return new Intl.DateTimeFormat(dateLocale.value, {
    month: "short",

    day: "2-digit",

    year: "numeric",
  }).format(date);
};

/* =========================================================
   ROLE LABEL
========================================================= */

const roleLabel = (role) => {
  return role === "SUPER_ADMIN"
    ? t("users.superAdminRole")
    : t("users.userRole");
};

/* =========================================================
   INITIAL
========================================================= */

const initialForUser = (user) => {
  const name = String(user?.name || "").trim();

  return name ? name.charAt(0).toUpperCase() : "U";
};

/* =========================================================
   MODULE LABEL
========================================================= */

const moduleName = (permission) => {
  const module = moduleOptions.find((item) => item.value === permission);

  if (!module) {
    return permission;
  }

  return t(module.labelKey);
};

/* =========================================================
   FILTERED USERS
========================================================= */

const filteredUsers = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  return users.value.filter((user) => {
    /* ROLE */

    if (roleFilter.value && user.role !== roleFilter.value) {
      return false;
    }

    /* STATUS */

    if (statusFilter.value !== null && user.isActive !== statusFilter.value) {
      return false;
    }

    /* SEARCH */

    if (!keyword) {
      return true;
    }

    const searchable = [
      user.name,

      user.username,

      user.email,

      user.role,

      ...(user.modulePermissions || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(keyword);
  });
});

/* =========================================================
   COUNTS
========================================================= */

const activeCount = computed(() => {
  return users.value.filter((user) => user.isActive).length;
});

const inactiveCount = computed(() => {
  return users.value.filter((user) => !user.isActive).length;
});

/* =========================================================
   LOAD USERS
========================================================= */

const loadUsers = async () => {
  try {
    loading.value = true;

    const response = await api.get("/users");

    users.value = response.data.data || [];

    canManageSuperAdmin.value = Boolean(
      response.data.permissions?.canManageSuperAdmin,
    );

    canManagePermissions.value = Boolean(
      response.data.permissions?.canManagePermissions,
    );

    currentUserRole.value =
      response.data.permissions?.currentUserRole || "USER";
  } catch (error) {
    console.error("LOAD USERS ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("users.loadFailed"),

      detail: error.response?.data?.message || t("users.loadFailedDetail"),

      life: 3000,
    });
  } finally {
    loading.value = false;
  }
};

/* =========================================================
   RESET
========================================================= */

const resetForm = () => {
  form.name = "";

  form.username = "";

  form.email = "";

  form.password = "";

  form.role = "USER";

  form.isActive = true;

  form.modulePermissions = [];
};

/* =========================================================
   CREATE
========================================================= */

const openCreate = () => {
  editingUser.value = null;

  resetForm();

  dialogVisible.value = true;
};

/* =========================================================
   EDIT
========================================================= */

const openEdit = (user) => {
  if (user.role === "SUPER_ADMIN" && !canManageSuperAdmin.value) {
    toast.add({
      severity: "warn",

      summary: t("users.notAllowed"),

      detail: t("users.cannotManageSuperAdmin"),

      life: 1800,
    });

    return;
  }

  editingUser.value = user;

  form.name = user.name || "";

  form.username = user.username || "";

  form.email = user.email || "";

  form.password = "";

  form.role = user.role || "USER";

  form.isActive = user.isActive !== false;

  form.modulePermissions = Array.isArray(user.modulePermissions)
    ? [...user.modulePermissions]
    : [];

  dialogVisible.value = true;
};

/* =========================================================
   CLOSE DIALOG
========================================================= */

const closeDialog = () => {
  dialogVisible.value = false;

  editingUser.value = null;

  resetForm();
};

/* =========================================================
   MODULES
========================================================= */

const hasModule = (permission) => {
  return form.modulePermissions.includes(permission);
};

const toggleModule = (permission) => {
  if (!canManagePermissions.value) {
    return;
  }

  if (hasModule(permission)) {
    form.modulePermissions = form.modulePermissions.filter(
      (item) => item !== permission,
    );

    return;
  }

  form.modulePermissions = [...form.modulePermissions, permission];
};

const selectAllModules = () => {
  form.modulePermissions = moduleOptions.map((module) => module.value);
};

const clearModules = () => {
  form.modulePermissions = [];
};

/* =========================================================
   VALIDATE
========================================================= */

const validateForm = () => {
  /* NAME */

  if (!form.name.trim()) {
    return t("users.validationName");
  }

  /* USERNAME */

  if (!editingUser.value && !form.username.trim()) {
    return t("users.validationUsername");
  }

  if (form.username.trim() && form.username.trim().length < 3) {
    return t("users.validationUsernameLength");
  }

  if (/\s/.test(form.username.trim())) {
    return t("users.validationUsernameSpaces");
  }

  /* EMAIL */

  if (!form.email.trim()) {
    return t("users.validationEmail");
  }

  /* CREATE PASSWORD */

  if (!editingUser.value && form.password.length < 8) {
    return t("users.validationPassword");
  }

  /* EDIT PASSWORD */

  if (editingUser.value && form.password && form.password.length < 8) {
    return t("users.validationPassword");
  }

  return null;
};

/* =========================================================
   SAVE
========================================================= */

const saveUser = async () => {
  const validationError = validateForm();

  if (validationError) {
    toast.add({
      severity: "warn",

      summary: t("users.checkForm"),

      detail: validationError,

      life: 1800,
    });

    return;
  }

  try {
    saving.value = true;

    const payload = {
      name: form.name.trim(),

      email: form.email.trim().toLowerCase(),

      role: canManageSuperAdmin.value ? form.role : "USER",

      isActive: form.isActive,
    };

    /* =====================================================
         USERNAME
      ===================================================== */

    if (form.username.trim()) {
      payload.username = form.username.trim().toLowerCase();
    } else if (editingUser.value) {
      payload.username = null;
    }

    /* =====================================================
         PASSWORD
      ===================================================== */

    if (form.password) {
      payload.password = form.password;
    }

    /* =====================================================
         MODULE PERMISSIONS
      ===================================================== */

    if (canManagePermissions.value && form.role === "USER") {
      payload.modulePermissions = [...form.modulePermissions];
    }

    if (form.role === "SUPER_ADMIN" && canManagePermissions.value) {
      payload.modulePermissions = [];
    }

    /* =====================================================
         UPDATE
      ===================================================== */

    if (editingUser.value) {
      const response = await api.put(
        `/users/${editingUser.value._id}`,

        payload,
      );

      const updated = response.data.data;

      users.value = users.value.map((user) =>
        user._id === updated._id ? updated : user,
      );

      toast.add({
        severity: "success",

        summary: t("users.updated"),

        detail: t("users.updateSuccess"),

        life: 1600,
      });
    } else {
      /* ===================================================
           CREATE
        =================================================== */

      const response = await api.post(
        "/users",

        payload,
      );

      const created = response.data.data;

      users.value.unshift(created);

      toast.add({
        severity: "success",

        summary: t("users.created"),

        detail: t("users.createSuccess"),

        life: 1600,
      });
    }

    closeDialog();
  } catch (error) {
    console.error("SAVE USER ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("users.saveFailed"),

      detail: error.response?.data?.message || t("users.saveFailedDetail"),

      life: 2500,
    });
  } finally {
    saving.value = false;
  }
};

/* =========================================================
   STATUS
========================================================= */

const toggleStatus = async (user) => {
  try {
    statusLoadingId.value = user._id;

    const response = await api.patch(
      `/users/${user._id}/status`,

      {
        isActive: !user.isActive,
      },
    );

    const updated = response.data.data;

    users.value = users.value.map((item) =>
      item._id === updated._id ? updated : item,
    );

    toast.add({
      severity: "success",

      summary: updated.isActive ? t("users.activated") : t("users.deactivated"),

      detail: updated.isActive
        ? t("users.activateSuccess")
        : t("users.deactivateSuccess"),

      life: 1500,
    });
  } catch (error) {
    console.error("STATUS ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("users.statusUpdateFailed"),

      detail:
        error.response?.data?.message || t("users.statusUpdateFailedDetail"),

      life: 2200,
    });
  } finally {
    statusLoadingId.value = null;
  }
};

/* =========================================================
   FILTER
========================================================= */

const clearFilters = () => {
  search.value = "";

  roleFilter.value = null;

  statusFilter.value = null;
};

/* =========================================================
   BACK
========================================================= */

const goBack = () => {
  router.push("/");
};

/* =========================================================
   INIT
========================================================= */

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <Toast />

    <!-- ===================================================
         HEADER
    ==================================================== -->

    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-5"
      >
        <!-- BACK -->

        <button
          type="button"
          class="header-button"
          :title="$t('common.back')"
          @click="goBack"
        >
          <i class="pi pi-arrow-left" />
        </button>

        <!-- TITLE -->

        <div class="min-w-0 flex-1 text-center">
          <h1 class="truncate text-sm font-bold text-slate-900 sm:text-base">
            {{ $t("users.title") }}
          </h1>

          <p class="truncate text-[9px] text-slate-400">
            {{ $t("users.subtitle") }}
          </p>
        </div>

        <!-- RIGHT -->

        <div class="flex shrink-0 items-center gap-1.5">
          <LanguageSwitch />

          <button
            type="button"
            class="header-button add"
            :title="$t('users.createUser')"
            @click="openCreate"
          >
            <i class="pi pi-plus" />
          </button>
        </div>
      </div>
    </header>

    <!-- ===================================================
         MAIN
    ==================================================== -->

    <main class="mx-auto max-w-6xl p-2 sm:p-5">
      <!-- =================================================
           SUMMARY
      ================================================== -->

      <section class="mb-2 grid grid-cols-3 gap-1.5">
        <!-- USERS -->

        <div class="summary-card">
          <span>
            {{ $t("users.users") }}
          </span>

          <strong>
            {{ users.length }}
          </strong>
        </div>

        <!-- ACTIVE -->

        <div class="summary-card active">
          <span>
            {{ $t("users.active") }}
          </span>

          <strong>
            {{ activeCount }}
          </strong>
        </div>

        <!-- INACTIVE -->

        <div class="summary-card">
          <span>
            {{ $t("users.inactive") }}
          </span>

          <strong>
            {{ inactiveCount }}
          </strong>
        </div>
      </section>

      <!-- =================================================
           FILTER
      ================================================== -->

      <section class="mb-2 rounded-xl border border-slate-200 bg-white p-2">
        <div class="grid gap-2 sm:grid-cols-[1fr_170px_170px_auto]">
          <!-- SEARCH -->

          <InputText
            v-model="search"
            :placeholder="$t('users.searchPlaceholder')"
            class="w-full"
          />

          <!-- ROLE -->

          <Select
            v-model="roleFilter"
            :options="roleFilterOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('users.role')"
            class="w-full"
          />

          <!-- STATUS -->

          <Select
            v-model="statusFilter"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('users.status')"
            class="w-full"
          />

          <!-- CLEAR -->

          <Button
            icon="pi pi-filter-slash"
            severity="secondary"
            outlined
            :title="$t('common.clear')"
            @click="clearFilters"
          />
        </div>
      </section>

      <!-- =================================================
           LOADING
      ================================================== -->

      <section
        v-if="loading"
        class="rounded-xl border border-slate-200 bg-white p-10 text-center"
      >
        <i class="pi pi-spin pi-spinner text-xl text-green-600" />

        <p class="mt-2 text-xs text-slate-400">
          {{ $t("users.loading") }}
        </p>
      </section>

      <!-- =================================================
           EMPTY
      ================================================== -->

      <section
        v-else-if="!filteredUsers.length"
        class="rounded-xl border border-slate-200 bg-white p-10 text-center"
      >
        <i class="pi pi-users text-2xl text-slate-300" />

        <p class="mt-2 text-sm font-semibold text-slate-700">
          {{ $t("users.noUsers") }}
        </p>
      </section>

      <!-- =================================================
           DESKTOP
      ================================================== -->

      <section
        v-else
        class="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px]">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50">
                <th class="table-heading">
                  {{ $t("users.user") }}
                </th>

                <th class="table-heading">
                  {{ $t("users.role") }}
                </th>

                <th class="table-heading">
                  {{ $t("users.modules") }}
                </th>

                <th class="table-heading">
                  {{ $t("users.status") }}
                </th>

                <th class="table-heading">
                  {{ $t("users.lastLogin") }}
                </th>

                <th class="table-heading text-right">
                  {{ $t("common.actions") }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="user in filteredUsers"
                :key="user._id"
                class="user-row"
              >
                <!-- USER -->

                <td class="table-cell">
                  <div class="flex items-center gap-3">
                    <div class="avatar">
                      {{ initialForUser(user) }}
                    </div>

                    <div class="min-w-0">
                      <p class="font-semibold text-slate-800">
                        {{ user.name }}
                      </p>

                      <p
                        v-if="user.username"
                        class="text-[10px] font-medium text-green-600"
                      >
                        @{{ user.username }}
                      </p>

                      <p class="text-[10px] text-slate-400">
                        {{ user.email }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- ROLE -->

                <td class="table-cell">
                  <Tag
                    :severity="user.role === 'SUPER_ADMIN' ? 'warn' : 'info'"
                    :value="roleLabel(user.role)"
                  />
                </td>

                <!-- MODULES -->

                <td class="table-cell">
                  <span
                    v-if="user.role === 'SUPER_ADMIN'"
                    class="text-xs font-semibold text-green-700"
                  >
                    {{ $t("users.allModules") }}
                  </span>

                  <div v-else class="flex max-w-[300px] flex-wrap gap-1">
                    <span
                      v-for="permission in user.modulePermissions || []"
                      :key="permission"
                      class="module-badge"
                    >
                      {{ moduleName(permission) }}
                    </span>

                    <span
                      v-if="!user.modulePermissions?.length"
                      class="text-[10px] text-slate-400"
                    >
                      {{ $t("users.noAccess") }}
                    </span>
                  </div>
                </td>

                <!-- STATUS -->

                <td class="table-cell">
                  <Tag
                    :severity="user.isActive ? 'success' : 'secondary'"
                    :value="
                      user.isActive ? $t('users.active') : $t('users.inactive')
                    "
                  />
                </td>

                <!-- LAST LOGIN -->

                <td class="table-cell text-slate-500">
                  {{ formatShortDate(user.lastLoginAt) }}
                </td>

                <!-- ACTION -->

                <td class="table-cell">
                  <div class="flex justify-end gap-1">
                    <Button
                      icon="pi pi-pencil"
                      size="small"
                      text
                      rounded
                      :title="$t('common.edit')"
                      @click="openEdit(user)"
                    />

                    <Button
                      :icon="user.isActive ? 'pi pi-ban' : 'pi pi-check'"
                      :severity="user.isActive ? 'danger' : 'success'"
                      size="small"
                      text
                      rounded
                      :title="
                        user.isActive ? $t('users.disable') : $t('users.enable')
                      "
                      :loading="statusLoadingId === user._id"
                      @click="toggleStatus(user)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- =================================================
           MOBILE
      ================================================== -->

      <section
        v-if="!loading && filteredUsers.length"
        class="space-y-2 sm:hidden"
      >
        <article
          v-for="user in filteredUsers"
          :key="user._id"
          class="rounded-xl border border-slate-200 bg-white p-3"
        >
          <div class="flex items-start gap-2">
            <div class="avatar shrink-0">
              {{ initialForUser(user) }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold">
                    {{ user.name }}
                  </p>

                  <p
                    v-if="user.username"
                    class="truncate text-[10px] font-medium text-green-600"
                  >
                    @{{ user.username }}
                  </p>

                  <p class="truncate text-[10px] text-slate-400">
                    {{ user.email }}
                  </p>
                </div>

                <Tag
                  :severity="user.isActive ? 'success' : 'secondary'"
                  :value="
                    user.isActive ? $t('users.active') : $t('users.inactive')
                  "
                />
              </div>

              <!-- ROLE -->

              <div class="mt-2">
                <Tag
                  :severity="user.role === 'SUPER_ADMIN' ? 'warn' : 'info'"
                  :value="roleLabel(user.role)"
                />
              </div>

              <!-- MODULES -->

              <div class="mt-2 flex flex-wrap gap-1">
                <span v-if="user.role === 'SUPER_ADMIN'" class="module-badge">
                  {{ $t("users.allModules") }}
                </span>

                <template v-else>
                  <span
                    v-for="permission in user.modulePermissions || []"
                    :key="permission"
                    class="module-badge"
                  >
                    {{ moduleName(permission) }}
                  </span>

                  <span
                    v-if="!user.modulePermissions?.length"
                    class="text-[9px] text-slate-400"
                  >
                    {{ $t("users.noModuleAccess") }}
                  </span>
                </template>
              </div>

              <!-- ACTIONS -->

              <div
                class="mt-2 flex justify-end gap-1 border-t border-slate-100 pt-2"
              >
                <Button
                  :label="$t('common.edit')"
                  icon="pi pi-pencil"
                  size="small"
                  text
                  @click="openEdit(user)"
                />

                <Button
                  :label="
                    user.isActive ? $t('users.disable') : $t('users.enable')
                  "
                  :severity="user.isActive ? 'danger' : 'success'"
                  size="small"
                  text
                  :loading="statusLoadingId === user._id"
                  @click="toggleStatus(user)"
                />
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>

    <!-- ===================================================
         CREATE / EDIT
    ==================================================== -->

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :draggable="false"
      :style="{
        width: 'min(94vw, 540px)',
      }"
      @hide="closeDialog"
    >
      <!-- HEADER -->

      <template #header>
        <div>
          <p class="text-sm font-bold text-slate-900">
            {{ editingUser ? $t("users.updateUser") : $t("users.createUser") }}
          </p>

          <p class="text-[9px] text-slate-400">
            {{ $t("users.dialogDescription") }}
          </p>
        </div>
      </template>

      <div class="space-y-3">
        <!-- =================================================
             NAME
        ================================================== -->

        <div>
          <label class="form-label">
            {{ $t("users.name") }}
          </label>

          <InputText
            v-model="form.name"
            class="mt-1 w-full"
            :placeholder="$t('users.fullNamePlaceholder')"
          />
        </div>

        <!-- =================================================
             USERNAME
        ================================================== -->

        <div>
          <label class="form-label">
            {{ $t("users.username") }}
          </label>

          <InputText
            v-model="form.username"
            class="mt-1 w-full"
            autocomplete="off"
            :placeholder="$t('users.usernamePlaceholder')"
          />

          <p class="mt-1 text-[9px] text-slate-400">
            {{ $t("users.usernameHelp") }}
          </p>
        </div>

        <!-- =================================================
             EMAIL
        ================================================== -->

        <div>
          <label class="form-label">
            {{ $t("users.email") }}
          </label>

          <InputText
            v-model="form.email"
            type="email"
            class="mt-1 w-full"
            placeholder="user@example.com"
          />
        </div>

        <!-- =================================================
             PASSWORD
        ================================================== -->

        <div>
          <label class="form-label">
            {{ $t("users.password") }}
          </label>

          <Password
            v-model="form.password"
            :feedback="false"
            toggle-mask
            class="mt-1 w-full"
            input-class="w-full"
            :placeholder="
              editingUser
                ? $t('users.keepPasswordPlaceholder')
                : $t('users.passwordPlaceholder')
            "
          />

          <p v-if="editingUser" class="mt-1 text-[9px] text-slate-400">
            {{ $t("users.keepPasswordHelp") }}
          </p>
        </div>

        <!-- =================================================
             ROLE
        ================================================== -->

        <div>
          <label class="form-label">
            {{ $t("users.role") }}
          </label>

          <Select
            v-model="form.role"
            :options="roleOptions"
            option-label="label"
            option-value="value"
            class="mt-1 w-full"
          />
        </div>

        <!-- =================================================
             MODULES
        ================================================== -->

        <div v-if="canManagePermissions && form.role === 'USER'">
          <div class="flex items-center justify-between gap-2">
            <div>
              <label class="form-label">
                {{ $t("users.moduleAccess") }}
              </label>

              <p class="mt-0.5 text-[9px] text-slate-400">
                {{ $t("users.moduleAccessDescription") }}
              </p>
            </div>

            <div class="flex shrink-0 gap-1">
              <Button
                :label="$t('users.all')"
                size="small"
                text
                @click="selectAllModules"
              />

              <Button
                :label="$t('common.clear')"
                size="small"
                severity="secondary"
                text
                @click="clearModules"
              />
            </div>
          </div>

          <!-- MODULE OPTIONS -->

          <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              v-for="module in moduleOptions"
              :key="module.value"
              type="button"
              class="module-option"
              :class="{
                active: hasModule(module.value),
              }"
              @click="toggleModule(module.value)"
            >
              <div class="flex items-center gap-2">
                <div class="module-icon">
                  <i :class="module.icon" />
                </div>

                <span>
                  {{ $t(module.labelKey) }}
                </span>
              </div>

              <i v-if="hasModule(module.value)" class="pi pi-check" />
            </button>
          </div>
        </div>

        <!-- =================================================
             STATUS
        ================================================== -->

        <div
          class="flex items-center justify-between rounded-lg border border-slate-200 p-3"
        >
          <div>
            <p class="text-xs font-semibold text-slate-700">
              {{ $t("users.activeAccount") }}
            </p>

            <p class="mt-0.5 text-[9px] text-slate-400">
              {{ $t("users.activeAccountDescription") }}
            </p>
          </div>

          <button
            type="button"
            class="status-switch"
            :class="{
              active: form.isActive,
            }"
            @click="form.isActive = !form.isActive"
          >
            <span />
          </button>
        </div>
      </div>

      <!-- =================================================
           FOOTER
      ================================================== -->

      <template #footer>
        <Button
          :label="$t('common.cancel')"
          severity="secondary"
          text
          @click="closeDialog"
        />

        <Button
          :label="editingUser ? $t('common.update') : $t('common.create')"
          :icon="editingUser ? 'pi pi-check' : 'pi pi-plus'"
          :loading="saving"
          @click="saveUser"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.header-button {
  display: flex;

  width: 36px;
  height: 36px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  border-radius: 9px;

  color: #64748b;
}

.header-button.add {
  color: #15803d;
}

.summary-card {
  display: flex;

  min-height: 58px;

  flex-direction: column;

  justify-content: center;

  padding: 8px 10px;

  border: 1px solid #e2e8f0;

  border-radius: 10px;

  background: white;
}

.summary-card span {
  font-size: 8px;

  text-transform: uppercase;

  color: #94a3b8;
}

.summary-card strong {
  margin-top: 2px;

  font-size: 17px;

  color: #334155;
}

.summary-card.active {
  border-color: #bbf7d0;

  background: #f0fdf4;
}

.summary-card.active span,
.summary-card.active strong {
  color: #15803d;
}

.avatar {
  display: flex;

  width: 36px;
  height: 36px;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: #dcfce7;

  font-size: 12px;

  font-weight: 800;

  color: #15803d;
}

.table-heading {
  padding: 11px 12px;

  text-align: left;

  font-size: 9px;

  font-weight: 700;

  text-transform: uppercase;

  color: #94a3b8;
}

.table-cell {
  padding: 10px 12px;

  font-size: 11px;
}

.user-row {
  border-bottom: 1px solid #f1f5f9;
}

.user-row:last-child {
  border-bottom: 0;
}

.module-badge {
  display: inline-flex;

  align-items: center;

  padding: 3px 6px;

  border-radius: 5px;

  background: #f0fdf4;

  font-size: 8px;

  font-weight: 600;

  color: #15803d;
}

.form-label {
  font-size: 10px;

  font-weight: 600;

  color: #475569;
}

.module-option {
  display: flex;

  min-height: 50px;

  align-items: center;
  justify-content: space-between;

  gap: 8px;

  padding: 8px 10px;

  border: 1px solid #e2e8f0;

  border-radius: 9px;

  background: white;

  text-align: left;

  font-size: 11px;

  font-weight: 600;

  color: #475569;
}

.module-option.active {
  border-color: #16a34a;

  background: #f0fdf4;

  color: #15803d;
}

.module-icon {
  display: flex;

  width: 30px;
  height: 30px;

  align-items: center;
  justify-content: center;

  border-radius: 7px;

  background: #f1f5f9;
}

.module-option.active .module-icon {
  background: #dcfce7;

  color: #15803d;
}

.status-switch {
  position: relative;

  width: 42px;
  height: 24px;

  flex-shrink: 0;

  border-radius: 999px;

  background: #cbd5e1;

  transition: background-color 0.15s;
}

.status-switch span {
  position: absolute;

  top: 3px;
  left: 3px;

  width: 18px;
  height: 18px;

  border-radius: 50%;

  background: white;

  transition: transform 0.15s;
}

.status-switch.active {
  background: #16a34a;
}

.status-switch.active span {
  transform: translateX(18px);
}
</style>
