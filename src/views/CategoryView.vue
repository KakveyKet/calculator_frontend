<script setup>
import { computed, onMounted, reactive, ref } from "vue";

import { useRouter } from "vue-router";

import { useToast } from "primevue/usetoast";

import { useConfirm } from "primevue/useconfirm";

import { useI18n } from "vue-i18n";

import Toast from "primevue/toast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Dialog from "primevue/dialog";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import ConfirmDialog from "primevue/confirmdialog";

import api from "../services/api.js";

import LanguageSwitch from "../components/LanguageSwitch.vue";

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const { t } = useI18n();

/* =========================================================
   STATE
========================================================= */

const categories = ref([]);

const loading = ref(false);
const saving = ref(false);

const search = ref("");

const dialogVisible = ref(false);

const editingId = ref(null);

const form = reactive({
  name: "",
  number: null,
});

/* =========================================================
   COMPUTED
========================================================= */

const isEditing = computed(() => {
  return editingId.value !== null;
});

const dialogTitle = computed(() => {
  return isEditing.value ? t("category.editTitle") : t("category.createTitle");
});

/* =========================================================
   LOAD
========================================================= */

const loadCategories = async () => {
  try {
    loading.value = true;

    const { data } = await api.get("/categories", {
      params: {
        search: search.value || undefined,
      },
    });

    categories.value = data.data || [];
  } catch (error) {
    console.error("LOAD CATEGORY ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("common.error"),

      detail: error.response?.data?.message || t("category.loadFailed"),

      life: 3000,
    });
  } finally {
    loading.value = false;
  }
};

/* =========================================================
   RESET FORM
========================================================= */

const resetForm = () => {
  editingId.value = null;

  form.name = "";
  form.number = null;
};

/* =========================================================
   CREATE DIALOG
========================================================= */

const openCreateDialog = () => {
  resetForm();

  dialogVisible.value = true;
};

/* =========================================================
   EDIT DIALOG
========================================================= */

const openEditDialog = (category) => {
  editingId.value = category._id;

  form.name = category.name;

  form.number = category.number;

  dialogVisible.value = true;
};

/* =========================================================
   CLOSE DIALOG
========================================================= */

const closeDialog = () => {
  dialogVisible.value = false;

  resetForm();
};

/* =========================================================
   SAVE
========================================================= */

const saveCategory = async () => {
  /* =====================================================
       VALIDATE NAME
    ===================================================== */

  if (!form.name.trim()) {
    toast.add({
      severity: "warn",

      summary: t("category.nameRequired"),

      detail: t("category.enterName"),

      life: 2500,
    });

    return;
  }

  /* =====================================================
       VALIDATE NUMBER
    ===================================================== */

  if (form.number === null || form.number === undefined) {
    toast.add({
      severity: "warn",

      summary: t("category.numberRequired"),

      detail: t("category.enterNumber"),

      life: 2500,
    });

    return;
  }

  try {
    saving.value = true;

    const payload = {
      name: form.name.trim(),

      number: form.number,
    };

    /* ===================================================
         UPDATE
      =================================================== */

    if (isEditing.value) {
      await api.put(
        `/categories/${editingId.value}`,

        payload,
      );

      toast.add({
        severity: "success",

        summary: t("category.updated"),

        detail: t("category.updateSuccess"),

        life: 2200,
      });
    } else {
      /* =================================================
           CREATE
        ================================================= */

      await api.post(
        "/categories",

        payload,
      );

      toast.add({
        severity: "success",

        summary: t("category.created"),

        detail: t("category.createSuccess"),

        life: 2200,
      });
    }

    closeDialog();

    await loadCategories();
  } catch (error) {
    console.error("SAVE CATEGORY ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("common.error"),

      detail: error.response?.data?.message || t("category.saveFailed"),

      life: 3000,
    });
  } finally {
    saving.value = false;
  }
};

/* =========================================================
   DELETE
========================================================= */

const confirmDelete = (category) => {
  confirm.require({
    message: t("category.deleteMessage", {
      name: category.name,
    }),

    header: t("category.deleteTitle"),

    icon: "pi pi-exclamation-triangle",

    rejectLabel: t("common.cancel"),

    acceptLabel: t("common.delete"),

    rejectProps: {
      severity: "secondary",

      text: true,
    },

    acceptProps: {
      severity: "danger",
    },

    accept: async () => {
      try {
        await api.delete(`/categories/${category._id}`);

        toast.add({
          severity: "success",

          summary: t("category.deleted"),

          detail: t("category.deleteSuccess"),

          life: 2200,
        });

        await loadCategories();
      } catch (error) {
        console.error("DELETE CATEGORY ERROR:", error);

        toast.add({
          severity: "error",

          summary: t("common.error"),

          detail: error.response?.data?.message || t("category.deleteFailed"),

          life: 3000,
        });
      }
    },
  });
};

/* =========================================================
   NAVIGATION
========================================================= */

const goBack = () => {
  router.push("/");
};

/* =========================================================
   INIT
========================================================= */

onMounted(() => {
  loadCategories();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <Toast />

    <ConfirmDialog />

    <!-- ===================================================
         HEADER
    ==================================================== -->

    <header class="border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8"
      >
        <!-- LEFT -->

        <div class="flex min-w-0 items-center gap-3">
          <!-- BACK -->

          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
            :title="$t('common.back')"
            @click="goBack"
          >
            <i class="pi pi-arrow-left" />
          </button>

          <!-- TITLE -->

          <div class="min-w-0">
            <h1 class="truncate text-xl font-bold text-slate-900 sm:text-2xl">
              {{ $t("category.title") }}
            </h1>

            <p class="mt-1 text-xs text-slate-500 sm:text-sm">
              {{ $t("category.description") }}
            </p>
          </div>
        </div>

        <!-- RIGHT -->

        <div class="flex shrink-0 items-center gap-2">
          <!-- LANGUAGE -->

          <LanguageSwitch />

          <!-- ADD -->

          <Button
            :label="$t('category.add')"
            icon="pi pi-plus"
            size="small"
            @click="openCreateDialog"
          />
        </div>
      </div>
    </header>

    <!-- ===================================================
         MAIN
    ==================================================== -->

    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
      <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <!-- =================================================
             TOOLBAR
        ================================================== -->

        <div
          class="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <!-- SEARCH INPUT -->

          <div class="relative w-full sm:max-w-sm">
            <i
              class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <InputText
              v-model="search"
              :placeholder="$t('category.searchPlaceholder')"
              class="w-full pl-10"
              @keyup.enter="loadCategories"
            />
          </div>

          <!-- SEARCH BUTTON -->

          <Button
            :label="$t('common.search')"
            icon="pi pi-search"
            severity="secondary"
            outlined
            @click="loadCategories"
          />
        </div>

        <!-- =================================================
             TABLE
        ================================================== -->

        <DataTable
          :value="categories"
          :loading="loading"
          paginator
          :rows="10"
          :rows-per-page-options="[10, 20, 50]"
          responsive-layout="scroll"
          striped-rows
          class="w-full"
        >
          <!-- EMPTY -->

          <template #empty>
            <div class="py-10 text-center">
              <i class="pi pi-folder-open text-3xl text-slate-300" />

              <p class="mt-3 text-sm text-slate-500">
                {{ $t("category.noCategories") }}
              </p>
            </div>
          </template>

          <!-- NUMBER INDEX -->

          <Column header="#" style="width: 70px">
            <template #body="{ index }">
              {{ index + 1 }}
            </template>
          </Column>

          <!-- =================================================
               NAME
          ================================================== -->

          <Column field="name" :header="$t('category.name')">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[var(--p-primary-color)]"
                >
                  <i class="pi pi-tag" />
                </div>

                <span class="font-medium text-slate-800">
                  {{ data.name }}
                </span>
              </div>
            </template>
          </Column>

          <!-- =================================================
               NUMBER
          ================================================== -->

          <Column field="number" :header="$t('category.number')">
            <template #body="{ data }">
              <span class="font-semibold text-slate-700">
                {{ data.number }}
              </span>
            </template>
          </Column>

          <!-- =================================================
               ACTIONS
          ================================================== -->

          <Column :header="$t('common.actions')" style="width: 140px">
            <template #body="{ data }">
              <div class="flex gap-2">
                <!-- EDIT -->

                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  rounded
                  :title="$t('common.edit')"
                  @click="openEditDialog(data)"
                />

                <!-- DELETE -->

                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  :title="$t('common.delete')"
                  @click="confirmDelete(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </main>

    <!-- ===================================================
         CREATE / EDIT DIALOG
    ==================================================== -->

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="dialogTitle"
      :style="{
        width: '95vw',

        maxWidth: '460px',
      }"
      @hide="resetForm"
    >
      <div class="space-y-5 pt-2">
        <!-- =================================================
             CATEGORY NAME
        ================================================== -->

        <div>
          <label
            for="categoryName"
            class="mb-2 block text-sm font-medium text-slate-700"
          >
            {{ $t("category.name") }}
          </label>

          <InputText
            id="categoryName"
            v-model="form.name"
            class="w-full"
            :placeholder="$t('category.namePlaceholder')"
            autofocus
          />
        </div>

        <!-- =================================================
             NUMBER
        ================================================== -->

        <div>
          <label
            for="categoryNumber"
            class="mb-2 block text-sm font-medium text-slate-700"
          >
            {{ $t("category.number") }}
          </label>

          <InputNumber
            id="categoryNumber"
            v-model="form.number"
            class="w-full"
            input-class="w-full"
            :min="1"
            :use-grouping="false"
            :placeholder="$t('category.numberPlaceholder')"
          />
        </div>
      </div>

      <!-- =================================================
           FOOTER
      ================================================== -->

      <template #footer>
        <!-- CANCEL -->

        <Button
          :label="$t('common.cancel')"
          severity="secondary"
          text
          @click="closeDialog"
        />

        <!-- CREATE / UPDATE -->

        <Button
          :label="isEditing ? $t('common.update') : $t('common.create')"
          :icon="saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
          :disabled="saving"
          @click="saveCategory"
        />
      </template>
    </Dialog>
  </div>
</template>
