<script setup>
import { computed, onMounted, reactive, ref } from "vue";

import { useRouter } from "vue-router";

import { useToast } from "primevue/usetoast";

import { useConfirm } from "primevue/useconfirm";

import { useI18n } from "vue-i18n";

import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Tag from "primevue/tag";

import api from "../services/api.js";

import LanguageSwitch from "../components/LanguageSwitch.vue";

const router = useRouter();

const toast = useToast();

const confirm = useConfirm();

const { t } = useI18n();

/* =========================================================
   DATA
========================================================= */

const items = ref([]);

const categories = ref([]);

const loading = ref(false);

const loadingCategories = ref(false);

const saving = ref(false);

const deletingId = ref(null);

/* =========================================================
   FILTER
========================================================= */

const search = ref("");

const selectedCategoryFilter = ref(null);

/* =========================================================
   DIALOG
========================================================= */

const dialogVisible = ref(false);

const editingId = ref(null);

/* =========================================================
   FORM
========================================================= */

const form = reactive({
  category: null,

  name: "",

  number2Digit: 1,

  number3Digit: 1,
});

/* =========================================================
   MODE
========================================================= */

const isEditing = computed(() => {
  return Boolean(editingId.value);
});

const dialogTitle = computed(() => {
  return isEditing.value
    ? t("subCategory.editTitle")
    : t("subCategory.createTitle");
});

/* =========================================================
   SORT CATEGORY
========================================================= */

const sortedCategories = computed(() => {
  return [...categories.value].sort((a, b) =>
    String(a.name).localeCompare(String(b.name)),
  );
});

/* =========================================================
   FILTERED ITEMS
========================================================= */

const filteredItems = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  return items.value.filter((item) => {
    /* =================================================
           CATEGORY FILTER
        ================================================= */

    if (selectedCategoryFilter.value) {
      const categoryId =
        typeof item.category === "object" ? item.category?._id : item.category;

      if (String(categoryId) !== String(selectedCategoryFilter.value)) {
        return false;
      }
    }

    /* =================================================
           SEARCH
        ================================================= */

    if (!keyword) {
      return true;
    }

    const categoryName =
      typeof item.category === "object" ? item.category?.name || "" : "";

    const searchable = [
      item.name,
      item.number2Digit,
      item.number3Digit,
      categoryName,
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(keyword);
  });
});

/* =========================================================
   SUMMARY
========================================================= */

const totalSubCategories = computed(() => {
  return items.value.length;
});

const filteredCount = computed(() => {
  return filteredItems.value.length;
});

/* =========================================================
   LOAD CATEGORIES
========================================================= */

const loadCategories = async () => {
  try {
    loadingCategories.value = true;

    const response = await api.get("/categories");

    categories.value = response.data.data || [];
  } catch (error) {
    console.error("LOAD CATEGORY ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("subCategory.categoryError"),

      detail:
        error.response?.data?.message || t("subCategory.categoryLoadFailed"),

      life: 3000,
    });
  } finally {
    loadingCategories.value = false;
  }
};

/* =========================================================
   LOAD SUB CATEGORIES
========================================================= */

const loadItems = async () => {
  try {
    loading.value = true;

    const response = await api.get("/sub-categories");

    items.value = response.data.data || [];
  } catch (error) {
    console.error("LOAD SUB CATEGORY ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("subCategory.loadFailed"),

      detail:
        error.response?.data?.message || t("subCategory.loadFailedDetail"),

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

  form.category = null;

  form.name = "";

  form.number2Digit = 1;

  form.number3Digit = 1;
};

/* =========================================================
   OPEN CREATE
========================================================= */

const openCreate = () => {
  resetForm();

  dialogVisible.value = true;
};

/* =========================================================
   OPEN EDIT
========================================================= */

const openEdit = (item) => {
  editingId.value = item._id;

  form.category =
    typeof item.category === "object" ? item.category?._id : item.category;

  form.name = item.name || "";

  form.number2Digit = Number(item.number2Digit ?? 1);

  form.number3Digit = Number(item.number3Digit ?? 1);

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
   VALIDATE
========================================================= */

const validateForm = () => {
  if (!form.category) {
    return t("subCategory.validationCategory");
  }

  if (!String(form.name).trim()) {
    return t("subCategory.validationName");
  }

  if (
    !Number.isFinite(Number(form.number2Digit)) ||
    Number(form.number2Digit) < 1
  ) {
    return t("subCategory.validation2Digit");
  }

  if (
    !Number.isFinite(Number(form.number3Digit)) ||
    Number(form.number3Digit) < 1
  ) {
    return t("subCategory.validation3Digit");
  }

  return null;
};

/* =========================================================
   SAVE
========================================================= */

const saveItem = async () => {
  const validationError = validateForm();

  if (validationError) {
    toast.add({
      severity: "warn",

      summary: t("subCategory.checkForm"),

      detail: validationError,

      life: 2500,
    });

    return;
  }

  const payload = {
    category: form.category,

    name: String(form.name).trim(),

    number2Digit: Number(form.number2Digit),

    number3Digit: Number(form.number3Digit),
  };

  try {
    saving.value = true;

    /* ===================================================
         UPDATE
      =================================================== */

    if (isEditing.value) {
      const response = await api.put(
        `/sub-categories/${editingId.value}`,

        payload,
      );

      const index = items.value.findIndex(
        (item) => item._id === editingId.value,
      );

      if (index !== -1) {
        items.value[index] = response.data.data;
      }

      toast.add({
        severity: "success",

        summary: t("subCategory.updated"),

        detail: t("subCategory.updateSuccess"),

        life: 2000,
      });
    } else {
      /* =================================================
           CREATE
        ================================================= */

      const response = await api.post(
        "/sub-categories",

        payload,
      );

      items.value.unshift(response.data.data);

      toast.add({
        severity: "success",

        summary: t("subCategory.created"),

        detail: t("subCategory.createSuccess"),

        life: 2000,
      });
    }

    closeDialog();
  } catch (error) {
    console.error("SAVE SUB CATEGORY ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("subCategory.saveFailed"),

      detail:
        error.response?.data?.message || t("subCategory.saveFailedDetail"),

      life: 3000,
    });
  } finally {
    saving.value = false;
  }
};

/* =========================================================
   DELETE
========================================================= */

const deleteItem = (item) => {
  confirm.require({
    header: t("subCategory.deleteTitle"),

    message: t("subCategory.deleteMessage", {
      name: item.name,
    }),

    icon: "pi pi-exclamation-triangle",

    rejectLabel: t("common.cancel"),

    acceptLabel: t("common.delete"),

    acceptClass: "p-button-danger",

    accept: async () => {
      try {
        deletingId.value = item._id;

        await api.delete(`/sub-categories/${item._id}`);

        items.value = items.value.filter((row) => row._id !== item._id);

        toast.add({
          severity: "success",

          summary: t("subCategory.deleted"),

          detail: t("subCategory.deleteSuccess"),

          life: 2000,
        });
      } catch (error) {
        console.error("DELETE SUB CATEGORY ERROR:", error);

        toast.add({
          severity: "error",

          summary: t("subCategory.deleteFailed"),

          detail:
            error.response?.data?.message ||
            t("subCategory.deleteFailedDetail"),

          life: 3000,
        });
      } finally {
        deletingId.value = null;
      }
    },
  });
};

/* =========================================================
   CATEGORY NAME
========================================================= */

const categoryName = (item) => {
  if (typeof item.category === "object") {
    return item.category?.name || "—";
  }

  return "—";
};

/* =========================================================
   SELECTED FORM CATEGORY NAME
========================================================= */

const selectedFormCategoryName = computed(() => {
  return (
    sortedCategories.value.find(
      (category) => String(category._id) === String(form.category),
    )?.name || t("subCategory.noCategory")
  );
});

/* =========================================================
   CLEAR FILTER
========================================================= */

const clearFilters = () => {
  search.value = "";

  selectedCategoryFilter.value = null;
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

onMounted(async () => {
  await Promise.all([loadCategories(), loadItems()]);
});
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <Toast />

    <ConfirmDialog />

    <!-- ===================================================
         HEADER
    ==================================================== -->

    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3 sm:px-5"
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
          <h1 class="truncate text-base font-bold text-slate-900 sm:text-lg">
            {{ $t("subCategory.title") }}
          </h1>

          <p class="text-[10px] text-slate-400">
            {{ $t("subCategory.subtitle") }}
          </p>
        </div>

        <!-- RIGHT -->

        <div class="flex shrink-0 items-center gap-1.5">
          <LanguageSwitch />

          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white active:bg-green-700"
            :title="$t('subCategory.add')"
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

    <main class="mx-auto max-w-5xl p-2 sm:p-5">
      <!-- =================================================
           SUMMARY
      ================================================== -->

      <section class="grid grid-cols-2 gap-2">
        <!-- TOTAL -->

        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p
            class="text-[9px] font-semibold uppercase tracking-wide text-slate-400"
          >
            {{ $t("subCategory.total") }}
          </p>

          <p class="mt-1 text-xl font-bold text-slate-900">
            {{ totalSubCategories }}
          </p>
        </div>

        <!-- SHOWING -->

        <div class="rounded-xl border border-green-200 bg-green-50 p-3">
          <p
            class="text-[9px] font-semibold uppercase tracking-wide text-green-600"
          >
            {{ $t("subCategory.showing") }}
          </p>

          <p class="mt-1 text-xl font-bold text-green-700">
            {{ filteredCount }}
          </p>
        </div>
      </section>

      <!-- =================================================
           FILTER
      ================================================== -->

      <section class="mt-2 rounded-xl border border-slate-200 bg-white p-3">
        <div class="grid gap-2 sm:grid-cols-[1fr_220px_auto]">
          <!-- SEARCH -->

          <div class="relative">
            <i
              class="pi pi-search absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-slate-400"
            />

            <InputText
              v-model="search"
              :placeholder="$t('subCategory.searchPlaceholder')"
              class="w-full pl-9"
            />
          </div>

          <!-- CATEGORY FILTER -->

          <Select
            v-model="selectedCategoryFilter"
            :options="sortedCategories"
            option-label="name"
            option-value="_id"
            :placeholder="$t('subCategory.allCategories')"
            show-clear
            :loading="loadingCategories"
            class="w-full"
          >
            <template #option="{ option }">
              <span class="font-medium">
                {{ option.name }}
              </span>
            </template>
          </Select>

          <!-- CLEAR -->

          <Button
            :label="$t('common.clear')"
            icon="pi pi-filter-slash"
            severity="secondary"
            outlined
            @click="clearFilters"
          />
        </div>
      </section>

      <!-- =================================================
           LOADING
      ================================================== -->

      <section
        v-if="loading"
        class="mt-2 rounded-xl border border-slate-200 bg-white p-10 text-center"
      >
        <i class="pi pi-spin pi-spinner text-2xl text-green-600" />

        <p class="mt-2 text-sm text-slate-500">
          {{ $t("subCategory.loading") }}
        </p>
      </section>

      <!-- =================================================
           EMPTY
      ================================================== -->

      <section
        v-else-if="filteredItems.length === 0"
        class="mt-2 rounded-xl border border-slate-200 bg-white p-10 text-center"
      >
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600"
        >
          <i class="pi pi-tags text-xl" />
        </div>

        <h2 class="mt-3 font-semibold text-slate-800">
          {{ $t("subCategory.noItems") }}
        </h2>

        <p class="mt-1 text-xs text-slate-400">
          {{ $t("subCategory.createFirst") }}
        </p>

        <Button
          :label="$t('subCategory.add')"
          icon="pi pi-plus"
          class="mt-4"
          @click="openCreate"
        />
      </section>

      <!-- =================================================
           DESKTOP TABLE
      ================================================== -->

      <section
        v-else
        class="mt-2 hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block"
      >
        <table class="w-full text-left">
          <thead class="border-b border-slate-200 bg-slate-50">
            <tr>
              <th class="table-header">
                {{ $t("subCategory.name") }}
              </th>

              <th class="table-header">
                {{ $t("subCategory.category") }}
              </th>

              <th class="table-header">
                {{ $t("subCategory.twoDigit") }}
              </th>

              <th class="table-header">
                {{ $t("subCategory.threeDigit") }}
              </th>

              <th class="table-header text-right">
                {{ $t("common.actions") }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item._id"
              class="border-b border-slate-100 last:border-0"
            >
              <!-- NAME -->

              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 font-bold text-green-700"
                  >
                    {{ String(item.name).charAt(0).toUpperCase() }}
                  </div>

                  <div>
                    <p class="font-semibold text-slate-900">
                      {{ item.name }}
                    </p>

                    <p class="text-[9px] text-slate-400">
                      {{ $t("subCategory.name") }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- CATEGORY -->

              <td class="px-4 py-3">
                <Tag severity="secondary">
                  {{ categoryName(item) }}
                </Tag>
              </td>

              <!-- 2 DIGIT -->

              <td class="px-4 py-3">
                <div class="value-box">
                  <span> 2D </span>

                  <strong> ×{{ item.number2Digit }} </strong>
                </div>
              </td>

              <!-- 3 DIGIT -->

              <td class="px-4 py-3">
                <div class="value-box green">
                  <span> 3D </span>

                  <strong> ×{{ item.number3Digit }} </strong>
                </div>
              </td>

              <!-- ACTION -->

              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <Button
                    icon="pi pi-pencil"
                    size="small"
                    severity="secondary"
                    text
                    :title="$t('common.edit')"
                    @click="openEdit(item)"
                  />

                  <Button
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    text
                    :title="$t('common.delete')"
                    :loading="deletingId === item._id"
                    @click="deleteItem(item)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- =================================================
           MOBILE
      ================================================== -->

      <section
        v-if="!loading && filteredItems.length"
        class="mt-2 space-y-2 sm:hidden"
      >
        <article
          v-for="item in filteredItems"
          :key="item._id"
          class="rounded-xl border border-slate-200 bg-white p-3"
        >
          <!-- TOP -->

          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 font-bold text-green-700"
              >
                {{ String(item.name).charAt(0).toUpperCase() }}
              </div>

              <div class="min-w-0">
                <p class="truncate font-bold text-slate-900">
                  {{ item.name }}
                </p>

                <p class="text-[10px] text-slate-400">
                  {{ categoryName(item) }}
                </p>
              </div>
            </div>

            <div class="flex shrink-0">
              <Button
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                text
                :title="$t('common.edit')"
                @click="openEdit(item)"
              />

              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                :title="$t('common.delete')"
                :loading="deletingId === item._id"
                @click="deleteItem(item)"
              />
            </div>
          </div>

          <!-- VALUES -->

          <div class="mt-3 grid grid-cols-2 gap-2">
            <!-- 2 DIGIT -->

            <div class="rounded-lg bg-slate-50 p-3">
              <p class="text-[9px] font-semibold uppercase text-slate-400">
                {{ $t("subCategory.twoDigitValue") }}
              </p>

              <p class="mt-1 text-xl font-bold text-slate-800">
                ×{{ item.number2Digit }}
              </p>

              <p class="mt-1 text-[9px] text-slate-400">
                {{ $t("subCategory.usedFor2Digit") }}
              </p>
            </div>

            <!-- 3 DIGIT -->

            <div class="rounded-lg bg-green-50 p-3">
              <p class="text-[9px] font-semibold uppercase text-green-600">
                {{ $t("subCategory.threeDigitValue") }}
              </p>

              <p class="mt-1 text-xl font-bold text-green-700">
                ×{{ item.number3Digit }}
              </p>

              <p class="mt-1 text-[9px] text-green-600">
                {{ $t("subCategory.usedFor3Digit") }}
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>

    <!-- ===================================================
         CREATE / EDIT DIALOG
    ==================================================== -->

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="dialogTitle"
      :style="{
        width: 'min(94vw, 520px)',
      }"
      @hide="resetForm"
    >
      <div class="space-y-4">
        <!-- =================================================
             CATEGORY
        ================================================== -->

        <div>
          <label class="form-label">
            {{ $t("subCategory.category") }}

            <span class="text-red-500"> * </span>
          </label>

          <Select
            v-model="form.category"
            :options="sortedCategories"
            option-label="name"
            option-value="_id"
            :placeholder="$t('subCategory.selectCategory')"
            filter
            :loading="loadingCategories"
            class="w-full"
          >
            <template #option="{ option }">
              <div class="flex items-center gap-2">
                <i class="pi pi-folder text-green-600" />

                <span class="font-medium">
                  {{ option.name }}
                </span>
              </div>
            </template>
          </Select>
        </div>

        <!-- =================================================
             NAME
        ================================================== -->

        <div>
          <label class="form-label">
            {{ $t("subCategory.nameLabel") }}

            <span class="text-red-500"> * </span>
          </label>

          <InputText
            v-model="form.name"
            :placeholder="$t('subCategory.namePlaceholder')"
            maxlength="100"
            class="w-full"
          />

          <p class="form-help">
            {{ $t("subCategory.nameExample") }}
          </p>
        </div>

        <!-- =================================================
             DIGIT VALUES
        ================================================== -->

        <div>
          <div class="mb-2">
            <p class="text-xs font-semibold text-slate-700">
              {{ $t("subCategory.digitValues") }}
            </p>

            <p class="mt-0.5 text-[10px] text-slate-400">
              {{ $t("subCategory.digitValuesDescription") }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- =============================================
                 2 DIGIT
            ============================================== -->

            <div class="digit-card">
              <div class="mb-3 flex items-center justify-between">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700"
                >
                  2D
                </div>

                <span class="text-[9px] text-slate-400">
                  {{ $t("subCategory.twoDigit") }}
                </span>
              </div>

              <label class="form-label">
                {{ $t("subCategory.value") }}
              </label>

              <InputNumber
                v-model="form.number2Digit"
                :min="1"
                :use-grouping="false"
                class="w-full"
                input-class="w-full text-center text-lg font-bold"
                :placeholder="$t('subCategory.twoDigitPlaceholder')"
              />

              <p class="mt-2 text-center text-[9px] text-slate-400">
                {{ $t("subCategory.applied2Digit") }}
              </p>
            </div>

            <!-- =============================================
                 3 DIGIT
            ============================================== -->

            <div class="digit-card green">
              <div class="mb-3 flex items-center justify-between">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-xs font-bold text-green-700"
                >
                  3D
                </div>

                <span class="text-[9px] text-green-600">
                  {{ $t("subCategory.threeDigit") }}
                </span>
              </div>

              <label class="form-label">
                {{ $t("subCategory.value") }}
              </label>

              <InputNumber
                v-model="form.number3Digit"
                :min="1"
                :use-grouping="false"
                class="w-full"
                input-class="w-full text-center text-lg font-bold"
                :placeholder="$t('subCategory.threeDigitPlaceholder')"
              />

              <p class="mt-2 text-center text-[9px] text-green-600">
                {{ $t("subCategory.applied3Digit") }}
              </p>
            </div>
          </div>
        </div>

        <!-- =================================================
             PREVIEW
        ================================================== -->

        <div v-if="form.name" class="rounded-xl bg-slate-50 p-3">
          <p
            class="text-[9px] font-semibold uppercase tracking-wide text-slate-400"
          >
            {{ $t("subCategory.preview") }}
          </p>

          <div class="mt-2 flex items-center justify-between gap-3">
            <div>
              <p class="font-bold text-slate-900">
                {{ form.name || $t("subCategory.name") }}
              </p>

              <p class="text-[10px] text-slate-400">
                {{ selectedFormCategoryName }}
              </p>
            </div>

            <div class="flex gap-2">
              <span class="preview-value">
                2D ×{{ form.number2Digit || 0 }}
              </span>

              <span class="preview-value green">
                3D ×{{ form.number3Digit || 0 }}
              </span>
            </div>
          </div>
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
          :disabled="saving"
          @click="closeDialog"
        />

        <Button
          :label="isEditing ? $t('common.update') : $t('common.create')"
          :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'"
          :loading="saving"
          @click="saveItem"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* ========================================================
   HEADER
======================================================== */

.header-button {
  display: flex;

  width: 40px;
  height: 40px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  border-radius: 12px;

  color: rgb(71 85 105);
}

.header-button:active {
  background: rgb(241 245 249);
}

/* ========================================================
   TABLE
======================================================== */

.table-header {
  padding: 12px 16px;

  font-size: 10px;

  font-weight: 600;

  text-transform: uppercase;

  color: rgb(100 116 139);
}

/* ========================================================
   VALUE BOX
======================================================== */

.value-box {
  display: inline-flex;

  min-width: 72px;

  flex-direction: column;

  padding: 6px 10px;

  border-radius: 8px;

  background: rgb(248 250 252);
}

.value-box span {
  font-size: 8px;

  font-weight: 600;

  color: rgb(148 163 184);
}

.value-box strong {
  margin-top: 1px;

  font-size: 14px;

  color: rgb(51 65 85);
}

.value-box.green {
  background: #f0fdf4;
}

.value-box.green span,
.value-box.green strong {
  color: #15803d;
}

/* ========================================================
   FORM
======================================================== */

.form-label {
  display: block;

  margin-bottom: 6px;

  font-size: 11px;

  font-weight: 600;

  color: rgb(71 85 105);
}

.form-help {
  margin-top: 5px;

  font-size: 9px;

  color: rgb(148 163 184);
}

/* ========================================================
   DIGIT CARD
======================================================== */

.digit-card {
  padding: 12px;

  border: 1px solid rgb(226 232 240);

  border-radius: 12px;

  background: white;
}

.digit-card.green {
  border-color: rgb(187 247 208);

  background: #f0fdf4;
}

/* ========================================================
   PREVIEW
======================================================== */

.preview-value {
  display: inline-flex;

  align-items: center;

  padding: 5px 8px;

  border-radius: 7px;

  background: rgb(226 232 240);

  font-size: 10px;

  font-weight: 700;

  color: rgb(71 85 105);
}

.preview-value.green {
  background: #dcfce7;

  color: #15803d;
}

/* ========================================================
   SMALL PHONE
======================================================== */

@media (max-width: 360px) {
  .digit-card {
    padding: 9px;
  }

  .preview-value {
    padding: 4px 6px;

    font-size: 9px;
  }
}
</style>
