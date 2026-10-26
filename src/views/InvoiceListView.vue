<script setup>
import { computed, onMounted, ref, watch } from "vue";
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
const { locale } = useI18n();

/* =====================================================
   STATE
===================================================== */

const records = ref([]);
const loading = ref(false);
const deletingId = ref(null);

const search = ref("");

const detailVisible = ref(false);
const selectedRecord = ref(null);

/* =====================================================
   PAGINATION
===================================================== */

const currentPage = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 20, 50];

/* =====================================================
   TRANSLATION
===================================================== */

const label = (en, km) => (String(locale.value).startsWith("km") ? km : en);

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

/* =====================================================
   FORMAT NUMBER

   No currency symbol.
===================================================== */

const formatAmount = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("en-US", {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
};

/* =====================================================
   FORMAT DATE
===================================================== */

const formatDate = (value, withTime = false) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  if (String(locale.value).startsWith("km")) {
    const dateText =
      `${date.getDate()} ` +
      `${khmerMonths[date.getMonth()]} ` +
      `${date.getFullYear()}`;

    if (!withTime) return dateText;

    const time = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    return `${dateText}, ${time}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }
      : {}),
  }).format(date);
};

/* =====================================================
   API RESPONSE HELPERS
===================================================== */

const unwrapArray = (body) => {
  if (Array.isArray(body)) return body;

  if (Array.isArray(body?.data?.data)) {
    return body.data.data;
  }

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  if (Array.isArray(body?.records)) {
    return body.records;
  }

  if (Array.isArray(body?.items)) {
    return body.items;
  }

  return [];
};

/* =====================================================
   CALCULATION HELPERS
===================================================== */

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

const nameOf = (value, fallback = "") => {
  if (value && typeof value === "object") {
    return String(value.name || fallback);
  }

  return fallback;
};

const lineAmount = (item) =>
  Number(item?.baseValue ?? item?.amount ?? item?.value ?? 0);

const lineScore = (item) =>
  Number(
    item?.score ??
      item?.calculatedScore ??
      item?.totalScore ??
      item?.result ??
      0,
  );

const expressionText = (item) => {
  if (!item) return "";

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

const sumRows = (rows) =>
  rows.reduce((total, item) => total + lineScore(item), 0);

/* =====================================================
   NORMALIZE SUBCATEGORY GROUP
===================================================== */

const normalizeSubGroup = (sub) => {
  let names = [];

  if (Array.isArray(sub?.subCategoryNames) && sub.subCategoryNames.length) {
    names = sub.subCategoryNames;
  } else if (Array.isArray(sub?.subCategories)) {
    names = sub.subCategories.map((item) => nameOf(item, "")).filter(Boolean);
  } else if (sub?.subCategoryName) {
    names = [sub.subCategoryName];
  } else if (sub?.subCategory) {
    names = [nameOf(sub.subCategory)];
  }

  return {
    subCategoryNames: names.filter(Boolean),
    calculatorData: getLines(sub),
    groupScore: sub?.groupScore,
  };
};

/* =====================================================
   NORMALIZE INVOICE FORMATS

   Supports:
   - New grouped invoices
   - Previous grouped invoices
   - Legacy single-category invoices
===================================================== */

const getMainGroups = (record) => {
  if (!record) return [];

  if (Array.isArray(record.groups) && record.groups.length) {
    return record.groups.map((main) => {
      const mainName = main.categoryName || nameOf(main.category) || "—";

      if (Array.isArray(main.subGroups) && main.subGroups.length) {
        return {
          categoryName: mainName,
          subGroups: main.subGroups.map(normalizeSubGroup),
          groupScore: main.groupScore,
        };
      }

      const names = Array.isArray(main.subCategoryNames)
        ? main.subCategoryNames
        : Array.isArray(main.subCategories)
          ? main.subCategories.map((item) => nameOf(item, "")).filter(Boolean)
          : [];

      return {
        categoryName: mainName,
        subGroups: [
          {
            subCategoryNames: names,
            calculatorData: getLines(main),
            groupScore: main.groupScore,
          },
        ],
        groupScore: main.groupScore,
      };
    });
  }

  const mainName =
    record.categoryName ||
    nameOf(record.category) ||
    record.selectedCategory?.name ||
    "—";

  const names = Array.isArray(record.subCategories)
    ? record.subCategories.map((item) => nameOf(item, "")).filter(Boolean)
    : [];

  return [
    {
      categoryName: mainName,
      subGroups: [
        {
          subCategoryNames: names,
          calculatorData: getLines(record),
          groupScore: record.grandScore,
        },
      ],
      groupScore: record.grandScore,
    },
  ];
};

/* =====================================================
   MAIN CATEGORY NAMES
===================================================== */

const getMainCategoryNames = (record) => [
  ...new Set(
    getMainGroups(record)
      .map((main) => String(main.categoryName || "").trim())
      .filter((name) => name.length > 0 && name !== "—"),
  ),
];

const mainCategoryText = (record) => {
  const names = getMainCategoryNames(record);

  return names.length ? names.join(", ") : "—";
};

/* =====================================================
   INVOICE DETAIL TITLE

   Example:
   ព័ត៌មានវិក្កយបត្រ (យប់)
===================================================== */

const invoiceDetailTitle = (record) => {
  const title = label("Invoice Detail", "ព័ត៌មានវិក្កយបត្រ");

  const names = getMainCategoryNames(record);

  if (!names.length) return title;

  return `${title} (${names.join(", ")})`;
};

/* =====================================================
   RECEIPT GROUPS
===================================================== */

const getReceiptGroups = (record) =>
  getMainGroups(record).flatMap((main) =>
    main.subGroups
      .filter(
        (group) =>
          Array.isArray(group.calculatorData) &&
          group.calculatorData.length > 0,
      )
      .map((group) => ({
        subCategoryNames: group.subCategoryNames,
        calculatorData: group.calculatorData,
        groupScore: group.groupScore,
      })),
  );

/* =====================================================
   SUBCATEGORY TITLE
===================================================== */

const subGroupTitle = (group) => {
  const names = group?.subCategoryNames || [];

  return names.length ? names.join(", ") : label("Entries", "ទិន្នន័យ");
};

/* =====================================================
   TOTALS
===================================================== */

const subGroupTotal = (group) => {
  const saved = Number(group.groupScore);

  if (group.groupScore != null && Number.isFinite(saved)) {
    return saved;
  }

  return sumRows(group.calculatorData || []);
};

const mainGroupTotal = (main) => {
  const saved = Number(main.groupScore);

  if (main.groupScore != null && Number.isFinite(saved)) {
    return saved;
  }

  return main.subGroups.reduce(
    (total, group) => total + subGroupTotal(group),
    0,
  );
};

const recordTotal = (record) => {
  const saved = Number(record?.grandScore);

  if (record?.grandScore != null && Number.isFinite(saved)) {
    return saved;
  }

  return getMainGroups(record).reduce(
    (total, main) => total + mainGroupTotal(main),
    0,
  );
};

/* =====================================================
   INVOICE SUMMARY
===================================================== */

const receiptGroupText = (record) => {
  const groups = getReceiptGroups(record);

  if (!groups.length) return "—";

  return groups.map((group) => subGroupTitle(group)).join(" · ");
};

const entryCount = (record) =>
  getReceiptGroups(record).reduce(
    (total, group) => total + group.calculatorData.length,
    0,
  );

const previewLines = (record) =>
  getReceiptGroups(record).flatMap((group) =>
    group.calculatorData.map((item) => ({
      ...item,
      groupName: subGroupTitle(group),
    })),
  );

/* =====================================================
   SEARCH
===================================================== */

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  if (!keyword) return records.value;

  return records.value.filter((record) => {
    const lines = previewLines(record);

    const searchable = [
      mainCategoryText(record),
      receiptGroupText(record),
      formatDate(record.createdAt),
      formatAmount(recordTotal(record)),

      ...lines.flatMap((item) => [
        expressionText(item),
        String(lineAmount(item)),
        formatAmount(lineAmount(item)),
        String(lineScore(item)),
        formatAmount(lineScore(item)),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(keyword);
  });
});

/* =====================================================
   PAGINATION
===================================================== */

const totalRecords = computed(() => filteredRecords.value.length);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalRecords.value / pageSize.value)),
);

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;

  return filteredRecords.value.slice(start, start + pageSize.value);
});

const pageStart = computed(() => {
  if (!totalRecords.value) return 0;

  return (currentPage.value - 1) * pageSize.value + 1;
});

const pageEnd = computed(() =>
  Math.min(currentPage.value * pageSize.value, totalRecords.value),
);

const visiblePageNumbers = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;

  const start = Math.max(1, Math.min(current - 2, total - 4));

  const end = Math.min(total, start + 4);

  return Array.from(
    {
      length: end - start + 1,
    },
    (_, index) => start + index,
  );
});

const changePage = (page) => {
  const next = Number(page);

  if (!Number.isInteger(next)) return;

  currentPage.value = Math.min(totalPages.value, Math.max(1, next));
};

const changePageSize = (value) => {
  const next = Number(value);

  if (!pageSizeOptions.includes(next)) return;

  pageSize.value = next;
  currentPage.value = 1;
};

watch(search, () => {
  currentPage.value = 1;
});

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages;
  }
});

/* =====================================================
   LOAD INVOICES
===================================================== */

const loadRecords = async () => {
  loading.value = true;

  try {
    const [oldResult, newResult] = await Promise.allSettled([
      api.get("/number-cal"),
      api.get("/batch-invoices"),
    ]);

    if (oldResult.status === "rejected" && newResult.status === "rejected") {
      throw new Error("Unable to load invoices.");
    }

    const oldRecords =
      oldResult.status === "fulfilled"
        ? unwrapArray(oldResult.value.data).map((item) => ({
            ...item,
            _source: "legacy",
          }))
        : [];

    const newRecords =
      newResult.status === "fulfilled"
        ? unwrapArray(newResult.value.data).map((item) => ({
            ...item,
            _source: "batch",
          }))
        : [];

    records.value = [...oldRecords, ...newRecords].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    currentPage.value = 1;

    if (oldResult.status === "rejected" || newResult.status === "rejected") {
      toast.add({
        severity: "warn",
        summary: label(
          "Some invoices could not be loaded",
          "វិក្កយបត្រខ្លះមិនអាចទាញយកបាន",
        ),
        life: 2500,
      });
    }
  } catch (error) {
    console.error("LOAD INVOICE ERROR:", error);

    toast.add({
      severity: "error",
      summary: label("Unable to load invoices", "មិនអាចទាញយកវិក្កយបត្របាន"),
      detail: error.response?.data?.message || error.message,
      life: 2500,
    });
  } finally {
    loading.value = false;
  }
};

/* =====================================================
   OPEN / CLOSE DETAIL
===================================================== */

const openDetail = (record) => {
  selectedRecord.value = record;
  detailVisible.value = true;
};

const closeDetail = () => {
  detailVisible.value = false;
  selectedRecord.value = null;
};

/* =====================================================
   DELETE INVOICE
===================================================== */

const deleteRecord = async (record) => {
  if (!record?._id || deletingId.value) return;

  const endpoint =
    record._source === "batch"
      ? `/batch-invoices/${record._id}`
      : `/number-cal/${record._id}`;

  deletingId.value = record._id;

  try {
    await api.delete(endpoint);

    records.value = records.value.filter(
      (item) => !(item._id === record._id && item._source === record._source),
    );

    if (
      selectedRecord.value?._id === record._id &&
      selectedRecord.value?._source === record._source
    ) {
      closeDetail();
    }

    toast.add({
      severity: "success",
      summary: label("Deleted", "បានលុប"),
      life: 1800,
    });
  } catch (error) {
    console.error("DELETE INVOICE ERROR:", error);

    toast.add({
      severity: "error",
      summary: label("Unable to delete invoice", "មិនអាចលុបវិក្កយបត្របាន"),
      detail: error.response?.data?.message || error.message,
      life: 2500,
    });
  } finally {
    deletingId.value = null;
  }
};

onMounted(loadRecords);
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <Toast />

    <!-- HEADER -->

    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-5"
      >
        <button type="button" class="header-button" @click="router.push('/')">
          <i class="pi pi-arrow-left" />
        </button>

        <div class="min-w-0 flex-1 text-center">
          <h1 class="text-sm font-bold text-slate-900 sm:text-base">
            {{ label("Invoice List", "បញ្ជីវិក្កយបត្រ") }}
          </h1>

          <p class="text-[9px] text-slate-400">
            {{ label("Saved records", "ទិន្នន័យដែលបានរក្សាទុក") }}
          </p>
        </div>

        <LanguageSwitch />
      </div>
    </header>

    <!-- MAIN -->

    <main class="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <!-- SEARCH + PAGE SIZE -->

      <div
        class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="relative min-w-0 flex-1">
          <i class="pi pi-search search-icon" />

          <InputText
            v-model="search"
            :placeholder="label('Search invoices...', 'ស្វែងរកវិក្កយបត្រ...')"
            class="search-input w-full"
          />
        </div>

        <div class="flex items-center justify-between gap-2 sm:justify-end">
          <span class="whitespace-nowrap text-xs text-slate-500">
            {{ label("Rows per page", "ចំនួនក្នុងមួយទំព័រ") }}
          </span>

          <select
            :value="pageSize"
            class="page-size-select"
            @change="changePageSize($event.target.value)"
          >
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </div>
      </div>

      <!-- LOADING -->

      <section
        v-if="loading"
        class="rounded-xl border border-slate-200 bg-white py-16 text-center"
      >
        <i class="pi pi-spin pi-spinner text-xl text-blue-500" />

        <p class="mt-2 text-xs text-slate-400">
          {{ label("Loading...", "កំពុងទាញយក...") }}
        </p>
      </section>

      <!-- EMPTY -->

      <section
        v-else-if="!filteredRecords.length"
        class="rounded-xl border border-slate-200 bg-white py-16 text-center"
      >
        <i class="pi pi-file text-2xl text-slate-300" />

        <p class="mt-2 text-sm font-semibold text-slate-700">
          {{ label("No records found", "មិនមានទិន្នន័យ") }}
        </p>
      </section>

      <template v-else>
        <!-- DESKTOP TABLE -->

        <section
          class="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block"
        >
          <div class="overflow-x-auto">
            <table class="w-full min-w-[850px]">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th class="table-heading">
                    {{ label("Main Category", "ប្រភេទមេ") }}
                  </th>

                  <th class="table-heading">
                    {{ label("Subcategory Groups", "ក្រុមប្រភេទរង") }}
                  </th>

                  <th class="table-heading text-center">
                    {{ label("Entries", "ចំនួនទិន្នន័យ") }}
                  </th>

                  <th class="table-heading">
                    {{ label("Date", "កាលបរិច្ឆេទ") }}
                  </th>

                  <th class="table-heading text-right">
                    {{ label("Total", "សរុប") }}
                  </th>

                  <th class="table-heading text-center">
                    {{ label("Action", "សកម្មភាព") }}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="record in paginatedRecords"
                  :key="`${record._source}-${record._id}`"
                  class="invoice-row"
                  @click="openDetail(record)"
                >
                  <!-- MAIN CATEGORY -->

                  <td class="table-cell">
                    <div class="flex items-center gap-3">
                      <div class="category-icon">
                        <i class="pi pi-folder" />
                      </div>

                      <strong class="text-sm font-bold text-slate-800">
                        {{ mainCategoryText(record) }}
                      </strong>
                    </div>
                  </td>

                  <!-- SUBCATEGORY GROUPS -->

                  <td class="table-cell">
                    <p
                      class="max-w-[240px] break-words text-xs font-semibold text-slate-600"
                    >
                      {{ receiptGroupText(record) }}
                    </p>
                  </td>

                  <!-- ENTRY COUNT -->

                  <td class="table-cell text-center">
                    <span class="text-xs font-semibold text-slate-600">
                      {{ entryCount(record) }}
                    </span>
                  </td>

                  <!-- DATE -->

                  <td class="table-cell whitespace-nowrap text-slate-500">
                    {{ formatDate(record.createdAt) }}
                  </td>

                  <!-- TOTAL -->

                  <td class="table-cell text-right">
                    <strong class="text-sm font-bold text-slate-900">
                      {{ formatAmount(recordTotal(record)) }}
                    </strong>
                  </td>

                  <!-- ACTIONS -->

                  <td class="table-cell">
                    <div class="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        class="action-button view"
                        :title="label('View', 'មើល')"
                        @click.stop="openDetail(record)"
                      >
                        <i class="pi pi-eye" />
                      </button>

                      <button
                        type="button"
                        class="action-button delete"
                        :title="label('Delete', 'លុប')"
                        :disabled="deletingId === record._id"
                        @click.stop="deleteRecord(record)"
                      >
                        <i
                          :class="
                            deletingId === record._id
                              ? 'pi pi-spin pi-spinner'
                              : 'pi pi-trash'
                          "
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- MOBILE CARDS -->

        <section class="space-y-2 sm:hidden">
          <article
            v-for="record in paginatedRecords"
            :key="`${record._source}-${record._id}`"
            class="invoice-card"
            @click="openDetail(record)"
          >
            <!-- MAIN CATEGORY + TOTAL -->

            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2">
                <div class="mobile-category-icon">
                  <i class="pi pi-folder" />
                </div>

                <div class="min-w-0">
                  <p class="break-words text-sm font-bold text-slate-900">
                    {{ mainCategoryText(record) }}
                  </p>

                  <p class="mt-1 break-words text-xs text-slate-500">
                    {{ receiptGroupText(record) }}
                  </p>

                  <p class="mt-1 text-[10px] text-slate-400">
                    {{ entryCount(record) }}
                    {{ label("entries", "ទិន្នន័យ") }}
                  </p>
                </div>
              </div>

              <div class="shrink-0 text-right">
                <p class="mobile-label">
                  {{ label("Total", "សរុប") }}
                </p>

                <strong class="mobile-total">
                  {{ formatAmount(recordTotal(record)) }}
                </strong>
              </div>
            </div>

            <!-- DATE -->

            <div class="mt-3 rounded-lg bg-slate-50 px-3 py-2">
              <p class="mobile-label">
                {{ label("Date", "កាលបរិច្ឆេទ") }}
              </p>

              <p class="mt-1 text-xs font-semibold text-slate-700">
                {{ formatDate(record.createdAt) }}
              </p>
            </div>

            <!-- ENTRY PREVIEW -->

            <div
              v-if="previewLines(record).length"
              class="mt-3 border-t border-slate-100 pt-3"
            >
              <div
                v-for="(item, index) in previewLines(record).slice(0, 2)"
                :key="index"
                class="mobile-calculation-row"
              >
                <span class="max-w-[75px] truncate text-slate-400">
                  {{ item.groupName }}
                </span>

                <span class="font-semibold text-slate-800">
                  {{ expressionText(item) }}:
                  {{ formatAmount(lineAmount(item)) }}
                </span>

                <strong class="ml-auto text-blue-400">
                  {{ formatAmount(lineScore(item)) }}
                </strong>
              </div>

              <p
                v-if="entryCount(record) > 2"
                class="mt-2 text-[10px] text-slate-400"
              >
                +{{ entryCount(record) - 2 }}
                {{ label("more entries", "ទិន្នន័យផ្សេងទៀត") }}
              </p>
            </div>

            <!-- ACTIONS -->

            <div
              class="mt-3 flex items-center justify-between border-t border-slate-100 pt-2"
            >
              <button
                type="button"
                class="mobile-view-button"
                @click.stop="openDetail(record)"
              >
                <i class="pi pi-eye" />
                {{ label("View", "មើល") }}
              </button>

              <button
                type="button"
                class="mobile-delete-button"
                :disabled="deletingId === record._id"
                @click.stop="deleteRecord(record)"
              >
                <i
                  :class="
                    deletingId === record._id
                      ? 'pi pi-spin pi-spinner'
                      : 'pi pi-trash'
                  "
                />

                {{ label("Delete", "លុប") }}
              </button>
            </div>
          </article>
        </section>

        <!-- PAGINATION -->

        <div class="pagination-container">
          <p class="text-xs text-slate-500">
            {{ label("Showing", "បង្ហាញ") }}
            {{ pageStart }}–{{ pageEnd }}
            {{ label("of", "នៃ") }}
            {{ totalRecords }}
            {{ label("records", "ទិន្នន័យ") }}
          </p>

          <div class="flex flex-wrap items-center gap-1">
            <button
              type="button"
              class="page-button"
              :disabled="currentPage === 1"
              @click="changePage(1)"
            >
              <i class="pi pi-angle-double-left" />
            </button>

            <button
              type="button"
              class="page-button"
              :disabled="currentPage === 1"
              @click="changePage(currentPage - 1)"
            >
              <i class="pi pi-angle-left" />
            </button>

            <button
              v-for="page in visiblePageNumbers"
              :key="page"
              type="button"
              class="page-button"
              :class="{
                active: currentPage === page,
              }"
              @click="changePage(page)"
            >
              {{ page }}
            </button>

            <button
              type="button"
              class="page-button"
              :disabled="currentPage >= totalPages"
              @click="changePage(currentPage + 1)"
            >
              <i class="pi pi-angle-right" />
            </button>

            <button
              type="button"
              class="page-button"
              :disabled="currentPage >= totalPages"
              @click="changePage(totalPages)"
            >
              <i class="pi pi-angle-double-right" />
            </button>
          </div>
        </div>
      </template>
    </main>

    <!-- =====================================================
         INVOICE DETAIL
    ====================================================== -->

    <Dialog
      v-model:visible="detailVisible"
      modal
      :draggable="false"
      :show-header="false"
      :style="{
        width: 'min(94vw, 560px)',
      }"
    >
      <div v-if="selectedRecord" class="invoice-detail">
        <!-- HEADER -->

        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h2 class="receipt-title">
              {{ invoiceDetailTitle(selectedRecord) }}
            </h2>

            <p class="receipt-date">
              {{ formatDate(selectedRecord.createdAt, true) }}
            </p>
          </div>

          <button type="button" class="close-button" @click="closeDetail">
            <i class="pi pi-times" />
          </button>
        </div>

        <!-- RECEIPT BODY -->

        <div class="receipt-body">
          <!-- SUBCATEGORY GROUPS -->

          <section
            v-for="(group, groupIndex) in getReceiptGroups(selectedRecord)"
            :key="groupIndex"
            class="receipt-group"
          >
            <!-- GROUP HEADER -->

            <h3 class="receipt-group-title">
              {{ subGroupTitle(group) }}
            </h3>

            <!-- CALCULATION ROWS -->

            <div class="receipt-rows">
              <div
                v-for="(item, index) in group.calculatorData"
                :key="item._id || index"
                class="receipt-row"
              >
                <!-- NUMBER + AMOUNT TOGETHER -->

                <div class="receipt-entry">
                  <span class="receipt-number">
                    {{ expressionText(item) }}
                  </span>

                  <span class="receipt-colon">:</span>

                  <span class="receipt-amount">
                    {{ formatAmount(lineAmount(item)) }}
                  </span>
                </div>

                <!-- RESULT ALIGNED TO FAR RIGHT -->

                <strong class="receipt-result">
                  {{ formatAmount(lineScore(item)) }}
                </strong>
              </div>
            </div>
          </section>

          <!-- GRAND TOTAL -->

          <div class="receipt-grand-total">
            <span>
              {{ label("Total:", "សរុប:") }}
            </span>

            <strong>
              {{ formatAmount(recordTotal(selectedRecord)) }}
            </strong>
          </div>
        </div>

        <!-- CLOSE -->

        <div class="mt-8 flex justify-end">
          <Button
            :label="label('Close', 'បិទ')"
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
/* =====================================================
   HEADER
===================================================== */

.header-button {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: #64748b;
}

.header-button:hover {
  background: #f1f5f9;
}

/* =====================================================
   SEARCH
===================================================== */

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

/* =====================================================
   PAGE SIZE
===================================================== */

.page-size-select {
  min-width: 74px;
  height: 40px;
  padding: 0 10px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: white;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

/* =====================================================
   DESKTOP TABLE
===================================================== */

.table-heading {
  padding: 12px 14px;
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #94a3b8;
}

.table-cell {
  padding: 13px 14px;
  font-size: 12px;
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

/* =====================================================
   CATEGORY ICON
===================================================== */

.category-icon,
.mobile-category-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #f0fdf4;
  color: #16a34a;
}

.category-icon {
  width: 36px;
  height: 36px;
}

.mobile-category-icon {
  width: 38px;
  height: 38px;
}

/* =====================================================
   ACTION BUTTONS
===================================================== */

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
}

.action-button.delete {
  color: #ef4444;
}

.action-button.delete:hover {
  background: #fef2f2;
}

/* =====================================================
   MOBILE CARDS
===================================================== */

.invoice-card {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: white;
  cursor: pointer;
}

.mobile-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
}

.mobile-total {
  display: block;
  margin-top: 2px;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.mobile-calculation-row {
  display: flex;
  min-height: 27px;
  align-items: baseline;
  gap: 6px;
  font-size: 11px;
}

.mobile-view-button,
.mobile-delete-button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}

.mobile-view-button {
  color: #15803d;
}

.mobile-delete-button {
  color: #ef4444;
}

/* =====================================================
   PAGINATION
===================================================== */

.pagination-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 4px;
}

.page-button {
  display: inline-flex;
  min-width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.page-button:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}

.page-button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}

.page-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

/* =====================================================
   DIALOG
===================================================== */

:deep(.p-dialog) {
  overflow: hidden;
  border-radius: 16px;
}

:deep(.p-dialog-content) {
  padding: 0 !important;
}

.invoice-detail {
  padding: 26px;
  color: #0f172a;
}

.receipt-title {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.receipt-date {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.6;
}

.close-button {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 18px;
  color: #64748b;
}

.close-button:hover {
  background: #f1f5f9;
}

/* =====================================================
   RECEIPT BODY
===================================================== */

.receipt-body {
  margin-top: 22px;
}

.receipt-group {
  margin-bottom: 15px;
}

/* SUBCATEGORY HEADER */

.receipt-group-title {
  display: flex;
  min-height: 36px;
  align-items: center;
  margin: 0;
  padding: 5px 12px;
  border-radius: 7px;
  background: #f1f3f5;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 900;
  color: #111827;
  overflow-wrap: anywhere;
}

/* =====================================================
   RECEIPT ROW

   Number: Amount               Result

   Example:
   10>15: 10                       180
===================================================== */

.receipt-rows {
  padding: 0 2px;
}

.receipt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 12px;
  min-height: 46px;
  padding: 8px 10px;

  border-bottom: 1px solid #e5e7eb;
}

/* NUMBER + AMOUNT GROUP */

.receipt-entry {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;

  min-width: 0;
  gap: 0;
}

/* NUMBER */

.receipt-number {
  font-size: 17px;
  line-height: 1.35;
  font-weight: 800;
  color: #111827;

  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

/* COLON */

.receipt-colon {
  margin-right: 6px;

  font-size: 17px;
  line-height: 1.35;
  font-weight: 800;
  color: #111827;
}

/* ENTERED AMOUNT */

.receipt-amount {
  font-size: 17px;
  line-height: 1.35;
  font-weight: 800;
  color: #111827;

  font-variant-numeric: tabular-nums;
}

/* =====================================================
   INDIVIDUAL CALCULATION RESULT
   BLUE-400
===================================================== */

.receipt-result {
  flex-shrink: 0;
  margin-left: auto;

  text-align: right;
  font-size: 17px;
  line-height: 1.35;
  font-weight: 900;

  color: #60a5fa;

  font-variant-numeric: tabular-nums;
}

/* =====================================================
   GRAND TOTAL
   BLUE-600
===================================================== */

.receipt-grand-total {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;

  gap: 12px;
  margin-top: 12px;
  padding: 12px 8px 0;

  border-top: 2px solid #111827;
}

.receipt-grand-total span {
  font-size: 23px;
  font-weight: 900;
  color: #111827;
}

.receipt-grand-total strong {
  text-align: right;
  font-size: 27px;
  line-height: 1.2;
  font-weight: 900;

  color: #2563eb;

  font-variant-numeric: tabular-nums;
}

/* =====================================================
   GENERAL
===================================================== */

button:disabled {
  cursor: not-allowed;
}

/* =====================================================
   MOBILE RESPONSIVE
===================================================== */

@media (max-width: 480px) {
  .invoice-detail {
    padding: 18px;
  }

  .receipt-title {
    font-size: 16px;
    line-height: 1.7;
  }

  .receipt-date {
    font-size: 10px;
  }

  .receipt-group-title {
    min-height: 34px;
    padding: 5px 10px;
    font-size: 20px;
  }

  .receipt-row {
    gap: 8px;
    min-height: 42px;
    padding: 7px 4px;
  }

  .receipt-number,
  .receipt-colon,
  .receipt-amount,
  .receipt-result {
    font-size: 16px;
  }

  .receipt-grand-total span {
    font-size: 22px;
  }

  .receipt-grand-total strong {
    font-size: 25px;
  }

  .mobile-total {
    font-size: 16px;
  }

  .pagination-container {
    flex-direction: column;
    align-items: stretch;
  }

  .pagination-container > div {
    justify-content: center;
  }
}
</style>
