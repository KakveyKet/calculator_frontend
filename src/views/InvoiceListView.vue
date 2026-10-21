<script setup>
import { computed, onMounted, ref } from "vue";

import { useRouter } from "vue-router";

import { useToast } from "primevue/usetoast";

import { useI18n } from "vue-i18n";

import Toast from "primevue/toast";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

import api from "../services/api.js";

import LanguageSwitch from "../components/LanguageSwitch.vue";

const router = useRouter();
const toast = useToast();

const { t, locale } = useI18n();

/* =========================================================
   STATE
========================================================= */

const records = ref([]);

const loading = ref(false);

const deletingId = ref(null);

const search = ref("");

const detailVisible = ref(false);

const selectedRecord = ref(null);

/* =========================================================
   KHMER MONTHS
========================================================= */

const khmerMonths = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];

/* =========================================================
   FORMAT KHMER DATE
========================================================= */

const formatKhmerDate = (date, withTime = false) => {
  const day = String(date.getDate()).padStart(2, "0");

  const month = khmerMonths[date.getMonth()];

  const year = date.getFullYear();

  if (!withTime) {
    return `${day} ${month} ${year}`;
  }

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",

    minute: "2-digit",

    hour12: true,
  }).format(date);

  return `${day} ${month} ${year}, ${time}`;
};

/* =========================================================
   FORMAT NUMBER
========================================================= */

const formatAmount = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    useGrouping: false,

    maximumFractionDigits: 2,
  }).format(number);
};

/* =========================================================
   FULL DATE
========================================================= */

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  /* =====================================================
     KHMER
  ===================================================== */

  if (locale.value === "km") {
    return formatKhmerDate(date, true);
  }

  /* =====================================================
     ENGLISH
  ===================================================== */

  return new Intl.DateTimeFormat("en-US", {
    month: "short",

    day: "2-digit",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

    hour12: true,
  }).format(date);
};

/* =========================================================
   TABLE / CARD DATE
========================================================= */

const formatTableDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  /* =====================================================
     KHMER
  ===================================================== */

  if (locale.value === "km") {
    return formatKhmerDate(date, false);
  }

  /* =====================================================
     ENGLISH
  ===================================================== */

  return new Intl.DateTimeFormat("en-US", {
    month: "short",

    day: "2-digit",

    year: "numeric",
  }).format(date);
};

/* =========================================================
   CALCULATOR ROWS
========================================================= */

const getLines = (record) => {
  if (Array.isArray(record?.calculatorData)) {
    return record.calculatorData;
  }

  if (Array.isArray(record?.items)) {
    return record.items;
  }

  if (Array.isArray(record?.calculations)) {
    return record.calculations;
  }

  return [];
};

/* =========================================================
   CATEGORY NAME
========================================================= */

const categoryName = (record) => {
  if (!record) {
    return "—";
  }

  /* =====================================================
     POPULATED CATEGORY
  ===================================================== */

  if (
    record.category &&
    typeof record.category === "object" &&
    record.category.name
  ) {
    return record.category.name;
  }

  /* =====================================================
     CATEGORY SNAPSHOT
  ===================================================== */

  if (record.categoryName) {
    return record.categoryName;
  }

  /* =====================================================
     OLD CATEGORIES ARRAY
  ===================================================== */

  if (Array.isArray(record.categories)) {
    for (const category of record.categories) {
      if (category && typeof category === "object" && category.name) {
        return category.name;
      }
    }
  }

  /* =====================================================
     CATEGORY FROM SUB CATEGORY
  ===================================================== */

  if (Array.isArray(record.subCategories)) {
    for (const subCategory of record.subCategories) {
      if (
        subCategory?.category &&
        typeof subCategory.category === "object" &&
        subCategory.category.name
      ) {
        return subCategory.category.name;
      }
    }
  }

  return "—";
};

/* =========================================================
   SUB CATEGORY NAMES
========================================================= */

const getSubCategoryNames = (record) => {
  if (!Array.isArray(record?.subCategories)) {
    return [];
  }

  return record.subCategories
    .map((item) => {
      if (item && typeof item === "object") {
        return item.name || item.subCategoryName || "";
      }

      return "";
    })
    .filter(Boolean);
};

/* =========================================================
   SUB CATEGORY TEXT
========================================================= */

const subCategoryText = (record) => {
  const names = getSubCategoryNames(record);

  if (!names.length) {
    return "—";
  }

  return names.join(", ");
};

/* =========================================================
   EXPRESSION
========================================================= */

const expressionText = (item) => {
  if (!item) {
    return "";
  }

  if (item.raw) {
    return String(item.raw).trim().replace(/:\s*$/, "");
  }

  const number = String(item.number ?? "");

  const prefix = item.prefix || ":";

  if (prefix === ">") {
    return `${number}>${item.endNumber ?? ""}`;
  }

  if (prefix === "x") {
    return `${number}x`;
  }

  return number;
};

/* =========================================================
   ENTERED AMOUNT
========================================================= */

const lineAmount = (item) => {
  return Number(item?.baseValue ?? item?.amount ?? item?.value ?? 0);
};

/* =========================================================
   SCORE
========================================================= */

const lineScore = (item) => {
  return Number(
    item?.score ??
      item?.calculatedScore ??
      item?.totalScore ??
      item?.result ??
      0,
  );
};

/* =========================================================
   TOTAL
========================================================= */

const recordTotal = (record) => {
  if (!record) {
    return 0;
  }

  const calculatedTotal = getLines(record).reduce(
    (total, item) => total + lineScore(item),

    0,
  );

  const savedTotal = Number(record.grandScore);

  if (Number.isFinite(savedTotal) && savedTotal !== 0) {
    return savedTotal;
  }

  return calculatedTotal;
};

/* =========================================================
   FILTER
========================================================= */

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  if (!keyword) {
    return records.value;
  }

  return records.value.filter((record) => {
    const searchable = [
      categoryName(record),

      subCategoryText(record),

      formatTableDate(record.createdAt),

      recordTotal(record),

      ...getLines(record).map((item) => expressionText(item)),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(keyword);
  });
});

/* =========================================================
   LOAD RECORDS
========================================================= */

const loadRecords = async () => {
  try {
    loading.value = true;

    const response = await api.get("/number-cal");

    console.log("INVOICE RESPONSE:", response.data);

    if (Array.isArray(response.data?.data)) {
      records.value = response.data.data;

      return;
    }

    if (Array.isArray(response.data)) {
      records.value = response.data;

      return;
    }

    if (Array.isArray(response.data?.records)) {
      records.value = response.data.records;

      return;
    }

    records.value = [];
  } catch (error) {
    console.error("LOAD INVOICE ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("invoice.loadFailed"),

      detail: error.response?.data?.message || t("invoice.loadFailedDetail"),

      life: 2500,
    });
  } finally {
    loading.value = false;
  }
};

/* =========================================================
   OPEN DETAIL
========================================================= */

const openDetail = (record) => {
  selectedRecord.value = record;

  detailVisible.value = true;
};

/* =========================================================
   CLOSE DETAIL
========================================================= */

const closeDetail = () => {
  detailVisible.value = false;

  selectedRecord.value = null;
};

/* =========================================================
   DELETE
========================================================= */

const deleteRecord = async (record) => {
  if (!record?._id) {
    return;
  }

  try {
    deletingId.value = record._id;

    await api.delete(`/number-cal/${record._id}`);

    records.value = records.value.filter((item) => item._id !== record._id);

    if (selectedRecord.value?._id === record._id) {
      closeDetail();
    }

    toast.add({
      severity: "success",

      summary: t("invoice.deleted"),

      detail: t("invoice.deleteSuccess"),

      life: 1500,
    });
  } catch (error) {
    console.error("DELETE ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("invoice.deleteFailed"),

      detail: error.response?.data?.message || t("invoice.deleteFailedDetail"),

      life: 2500,
    });
  } finally {
    deletingId.value = null;
  }
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
  loadRecords();
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
            {{ $t("invoice.title") }}
          </h1>

          <p class="text-[9px] text-slate-400">
            {{ $t("invoice.savedRecords") }}
          </p>
        </div>

        <!-- LANGUAGE -->

        <LanguageSwitch />
      </div>
    </header>

    <!-- ===================================================
         MAIN
    ==================================================== -->

    <main class="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <!-- =================================================
           SEARCH
      ================================================== -->

      <div class="mb-3">
        <div class="relative">
          <i class="pi pi-search search-icon" />

          <InputText
            v-model="search"
            :placeholder="$t('invoice.searchPlaceholder')"
            class="search-input w-full"
          />
        </div>
      </div>

      <!-- =================================================
           LOADING
      ================================================== -->

      <section
        v-if="loading"
        class="rounded-xl border border-slate-200 bg-white py-16 text-center"
      >
        <i class="pi pi-spin pi-spinner text-xl text-green-600" />

        <p class="mt-2 text-xs text-slate-400">
          {{ $t("invoice.loading") }}
        </p>
      </section>

      <!-- =================================================
           EMPTY
      ================================================== -->

      <section
        v-else-if="!filteredRecords.length"
        class="rounded-xl border border-slate-200 bg-white py-16 text-center"
      >
        <i class="pi pi-file text-2xl text-slate-300" />

        <p class="mt-2 text-sm font-semibold text-slate-700">
          {{ $t("invoice.noRecords") }}
        </p>
      </section>

      <!-- =================================================
           RECORDS
      ================================================== -->

      <template v-else>
        <!-- =================================================
             DESKTOP TABLE
        ================================================== -->

        <section
          class="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block"
        >
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px]">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th class="table-heading">
                    {{ $t("invoice.category") }}
                  </th>

                  <th class="table-heading">
                    {{ $t("invoice.subCategories") }}
                  </th>

                  <th class="table-heading">
                    {{ $t("invoice.date") }}
                  </th>

                  <th class="table-heading text-right">
                    {{ $t("invoice.total") }}
                  </th>

                  <th class="table-heading text-center">
                    {{ $t("invoice.action") }}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="record in filteredRecords"
                  :key="record._id"
                  class="invoice-row"
                  @click="openDetail(record)"
                >
                  <!-- CATEGORY -->

                  <td class="table-cell">
                    <div class="flex items-center gap-3">
                      <div class="category-icon">
                        <i class="pi pi-tag" />
                      </div>

                      <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-800">
                          {{ categoryName(record) }}
                        </p>

                        <p class="mt-0.5 text-[9px] text-slate-400">
                          {{ getLines(record).length }}

                          {{ $t("invoice.entries") }}
                        </p>
                      </div>
                    </div>
                  </td>

                  <!-- SUB CATEGORY -->

                  <td class="table-cell">
                    <span class="text-xs text-slate-600">
                      {{ subCategoryText(record) }}
                    </span>
                  </td>

                  <!-- DATE -->

                  <td class="table-cell text-slate-500">
                    {{ formatTableDate(record.createdAt) }}
                  </td>

                  <!-- TOTAL -->

                  <td class="table-cell text-right">
                    <strong class="text-sm font-bold text-slate-900">
                      {{ formatAmount(recordTotal(record)) }}
                    </strong>
                  </td>

                  <!-- ACTION -->

                  <td class="table-cell">
                    <div class="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        class="action-button view"
                        :title="$t('invoice.viewDetail')"
                        @click.stop="openDetail(record)"
                      >
                        <i class="pi pi-eye" />
                      </button>

                      <button
                        type="button"
                        class="action-button delete"
                        :title="$t('common.delete')"
                        :disabled="deletingId === record._id"
                        @click.stop="deleteRecord(record)"
                      >
                        <i
                          v-if="deletingId !== record._id"
                          class="pi pi-trash"
                        />

                        <i v-else class="pi pi-spin pi-spinner" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- =================================================
             MOBILE CARDS
        ================================================== -->

        <section class="space-y-2 sm:hidden">
          <article
            v-for="record in filteredRecords"
            :key="record._id"
            class="invoice-card"
            @click="openDetail(record)"
          >
            <!-- TOP -->

            <div class="flex items-start justify-between gap-3">
              <!-- CATEGORY -->

              <div class="flex min-w-0 items-center gap-2.5">
                <div class="mobile-category-icon">
                  <i class="pi pi-tag" />
                </div>

                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-slate-900">
                    {{ categoryName(record) }}
                  </p>

                  <p class="mt-0.5 text-[9px] text-slate-400">
                    {{ getLines(record).length }}

                    {{ $t("invoice.entries") }}
                  </p>
                </div>
              </div>

              <!-- TOTAL -->

              <div class="shrink-0 text-right">
                <p class="mobile-label">
                  {{ $t("invoice.total") }}
                </p>

                <strong class="mobile-total">
                  {{ formatAmount(recordTotal(record)) }}
                </strong>
              </div>
            </div>

            <!-- INFO -->

            <div class="mt-3 grid grid-cols-2 gap-2">
              <!-- SUB CATEGORY -->

              <div class="mobile-info-box">
                <p class="mobile-label">
                  {{ $t("invoice.subCategories") }}
                </p>

                <p class="mt-1 truncate text-xs font-semibold text-slate-700">
                  {{ subCategoryText(record) }}
                </p>
              </div>

              <!-- DATE -->

              <div class="mobile-info-box">
                <p class="mobile-label">
                  {{ $t("invoice.date") }}
                </p>

                <p class="mt-1 text-xs font-semibold text-slate-700">
                  {{ formatTableDate(record.createdAt) }}
                </p>
              </div>
            </div>

            <!-- CALCULATION PREVIEW -->

            <div
              v-if="getLines(record).length"
              class="mt-3 border-t border-slate-100 pt-3"
            >
              <div
                v-for="(item, index) in getLines(record).slice(0, 2)"
                :key="item._id || index"
                class="mobile-calculation-row"
              >
                <span class="font-semibold text-slate-700">
                  {{ expressionText(item) }}
                </span>

                <span class="text-slate-400"> : </span>

                <span class="text-slate-500">
                  {{ formatAmount(lineAmount(item)) }}
                </span>

                <strong class="ml-auto text-slate-900">
                  {{ formatAmount(lineScore(item)) }}
                </strong>
              </div>

              <p
                v-if="getLines(record).length > 2"
                class="mt-1 text-[9px] text-slate-400"
              >
                +{{ getLines(record).length - 2 }}

                {{ $t("invoice.entries") }}
              </p>
            </div>

            <!-- ACTION -->

            <div
              class="mt-3 flex items-center justify-between border-t border-slate-100 pt-2"
            >
              <button
                type="button"
                class="mobile-view-button"
                @click.stop="openDetail(record)"
              >
                <i class="pi pi-eye" />

                <span>
                  {{ $t("invoice.viewDetail") }}
                </span>
              </button>

              <button
                type="button"
                class="mobile-delete-button"
                :disabled="deletingId === record._id"
                @click.stop="deleteRecord(record)"
              >
                <i v-if="deletingId !== record._id" class="pi pi-trash" />

                <i v-else class="pi pi-spin pi-spinner" />

                <span>
                  {{ $t("common.delete") }}
                </span>
              </button>
            </div>
          </article>
        </section>
      </template>
    </main>

    <!-- ===================================================
         DETAIL
    ==================================================== -->

    <Dialog
      v-model:visible="detailVisible"
      modal
      :draggable="false"
      :show-header="false"
      :style="{
        width: 'min(94vw, 540px)',
      }"
    >
      <div v-if="selectedRecord" class="invoice-detail">
        <!-- HEADER -->

        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">
              {{ $t("invoice.detail") }}
            </h2>

            <p class="mt-1 text-xs text-slate-400">
              {{ formatDate(selectedRecord.createdAt) }}
            </p>
          </div>

          <button
            type="button"
            class="close-button"
            :title="$t('common.close')"
            @click="closeDetail"
          >
            <i class="pi pi-times" />
          </button>
        </div>

        <!-- CATEGORY -->

        <div class="mt-7 border-t-2 border-slate-900 pt-3">
          <h3 class="text-3xl font-black tracking-tight text-slate-900">
            {{ categoryName(selectedRecord) }}
          </h3>

          <p
            v-if="getSubCategoryNames(selectedRecord).length"
            class="mt-1 text-xs text-slate-500"
          >
            <span class="font-semibold text-slate-700">
              {{ getSubCategoryNames(selectedRecord).join(", ") }}
            </span>
          </p>
        </div>

        <!-- CALCULATIONS -->

        <div class="mt-5">
          <table class="w-full">
            <tbody>
              <tr
                v-for="(item, index) in getLines(selectedRecord)"
                :key="item._id || index"
              >
                <td class="py-1.5">
                  <div class="flex items-baseline">
                    <span class="detail-expression">
                      {{ expressionText(item) }}
                    </span>

                    <span class="detail-colon"> : </span>

                    <span class="detail-amount">
                      {{ formatAmount(lineAmount(item)) }}
                    </span>
                  </div>
                </td>

                <td class="py-1.5 text-right">
                  <strong class="detail-score">
                    {{ formatAmount(lineScore(item)) }}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TOTAL -->

        <div
          class="mt-5 flex items-center justify-between border-t-2 border-slate-900 pt-4"
        >
          <span class="text-xl font-bold text-slate-900">
            {{ $t("invoice.total") }}
            :
          </span>

          <strong class="text-3xl font-black text-slate-900">
            {{ formatAmount(recordTotal(selectedRecord)) }}
          </strong>
        </div>

        <!-- CLOSE -->

        <div class="mt-8 flex justify-end">
          <Button
            :label="$t('common.close')"
            severity="secondary"
            text
            @click="closeDetail"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
/* ========================================================
   HEADER
======================================================== */

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

.header-button:hover {
  background: #f1f5f9;
}

/* ========================================================
   SEARCH
======================================================== */

.search-icon {
  position: absolute;

  left: 12px;
  top: 50%;

  z-index: 2;

  transform: translateY(-50%);

  font-size: 11px;

  color: #94a3b8;
}

.search-input {
  min-height: 42px;

  padding-left: 34px !important;

  border-radius: 10px;

  font-size: 12px;
}

/* ========================================================
   DESKTOP TABLE
======================================================== */

.table-heading {
  padding: 11px 14px;

  text-align: left;

  font-size: 9px;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 0.03em;

  color: #94a3b8;
}

.table-cell {
  padding: 12px 14px;

  font-size: 11px;
}

.invoice-row {
  cursor: pointer;

  border-bottom: 1px solid #f1f5f9;

  transition: background-color 0.15s;
}

.invoice-row:last-child {
  border-bottom: 0;
}

.invoice-row:hover {
  background: #f8fafc;
}

/* ========================================================
   CATEGORY ICON
======================================================== */

.category-icon {
  display: flex;

  width: 34px;
  height: 34px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  border-radius: 8px;

  background: #f0fdf4;

  color: #16a34a;
}

/* ========================================================
   DESKTOP ACTION
======================================================== */

.action-button {
  display: inline-flex;

  width: 32px;
  height: 32px;

  align-items: center;
  justify-content: center;

  border-radius: 8px;

  font-size: 12px;
}

.action-button.view {
  color: #475569;
}

.action-button.view:hover {
  background: #f1f5f9;

  color: #0f172a;
}

.action-button.delete {
  color: #ef4444;
}

.action-button.delete:hover {
  background: #fef2f2;

  color: #dc2626;
}

.action-button:disabled {
  cursor: not-allowed;

  opacity: 0.5;
}

/* ========================================================
   MOBILE CARD
======================================================== */

.invoice-card {
  cursor: pointer;

  padding: 14px;

  border: 1px solid #e2e8f0;

  border-radius: 14px;

  background: white;

  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);

  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
}

.invoice-card:active {
  border-color: #bbf7d0;

  background: #fafafa;

  transform: scale(0.995);
}

/* ========================================================
   MOBILE CATEGORY ICON
======================================================== */

.mobile-category-icon {
  display: flex;

  width: 38px;
  height: 38px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  border-radius: 10px;

  background: #f0fdf4;

  color: #16a34a;

  font-size: 14px;
}

/* ========================================================
   MOBILE LABEL
======================================================== */

.mobile-label {
  font-size: 8px;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 0.03em;

  color: #94a3b8;
}

/* ========================================================
   MOBILE TOTAL
======================================================== */

.mobile-total {
  display: block;

  margin-top: 2px;

  font-size: 18px;

  line-height: 1;

  font-weight: 900;

  color: #0f172a;
}

/* ========================================================
   MOBILE INFO
======================================================== */

.mobile-info-box {
  min-width: 0;

  padding: 9px 10px;

  border-radius: 9px;

  background: #f8fafc;
}

/* ========================================================
   MOBILE CALCULATION
======================================================== */

.mobile-calculation-row {
  display: flex;

  align-items: baseline;

  gap: 5px;

  min-height: 25px;

  font-size: 11px;
}

/* ========================================================
   MOBILE VIEW BUTTON
======================================================== */

.mobile-view-button {
  display: inline-flex;

  min-height: 32px;

  align-items: center;
  justify-content: center;

  gap: 6px;

  padding: 0 8px;

  border-radius: 8px;

  font-size: 10px;

  font-weight: 600;

  color: #15803d;
}

.mobile-view-button:active {
  background: #f0fdf4;
}

/* ========================================================
   MOBILE DELETE
======================================================== */

.mobile-delete-button {
  display: inline-flex;

  min-height: 32px;

  align-items: center;
  justify-content: center;

  gap: 6px;

  padding: 0 8px;

  border-radius: 8px;

  font-size: 10px;

  font-weight: 600;

  color: #ef4444;
}

.mobile-delete-button:active:not(:disabled) {
  background: #fef2f2;
}

.mobile-delete-button:disabled {
  cursor: not-allowed;

  opacity: 0.5;
}

/* ========================================================
   DIALOG
======================================================== */

:deep(.p-dialog) {
  overflow: hidden;

  border-radius: 16px;
}

:deep(.p-dialog-content) {
  padding: 0 !important;
}

.invoice-detail {
  padding: 28px;
}

/* ========================================================
   CLOSE
======================================================== */

.close-button {
  display: flex;

  width: 36px;
  height: 36px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  border-radius: 8px;

  color: #64748b;

  font-size: 18px;
}

.close-button:hover {
  background: #f1f5f9;
}

/* ========================================================
   DETAIL
======================================================== */

.detail-expression {
  font-size: 25px;

  line-height: 1.25;

  font-weight: 800;

  color: #0f172a;
}

.detail-colon {
  margin-left: 6px;
  margin-right: 7px;

  font-size: 22px;

  font-weight: 800;

  color: #0f172a;
}

.detail-amount {
  font-size: 20px;

  font-weight: 700;

  color: #64748b;
}

.detail-score {
  font-size: 25px;

  line-height: 1.25;

  font-weight: 900;

  color: #0f172a;
}

/* ========================================================
   SMALL MOBILE
======================================================== */

@media (max-width: 380px) {
  .invoice-card {
    padding: 11px;
  }

  .mobile-category-icon {
    width: 34px;
    height: 34px;

    font-size: 12px;
  }

  .mobile-total {
    font-size: 16px;
  }

  .mobile-info-box {
    padding: 8px;
  }

  .mobile-calculation-row {
    font-size: 10px;
  }
}

/* ========================================================
   DIALOG MOBILE
======================================================== */

@media (max-width: 480px) {
  .invoice-detail {
    padding: 20px;
  }

  .detail-expression {
    font-size: 21px;
  }

  .detail-colon {
    margin-left: 4px;
    margin-right: 5px;

    font-size: 19px;
  }

  .detail-amount {
    font-size: 17px;
  }

  .detail-score {
    font-size: 21px;
  }
}
</style>
