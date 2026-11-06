<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";

import Toast from "primevue/toast";
import Button from "primevue/button";

import api from "../services/api.js";
import LanguageSwitch from "../components/LanguageSwitch.vue";

const router = useRouter();
const toast = useToast();
const { locale } = useI18n();

const label = (en, km) => (String(locale.value).startsWith("km") ? km : en);

/* =========================================
   STATE
========================================= */

const categories = ref([]);
const allSubCategories = ref([]);

const selectedCategoryId = ref("");
const selectedSubCategoryIds = ref([]);
const lastSelections = ref({});
const invoiceGroups = ref([]);

const currentNumber = ref("");
const selectedPrefix = ref("");
const endNumber = ref("");
const baseValue = ref("");
const activeInput = ref("number");

const loading = ref(false);
const previewing = ref(false);
const saving = ref(false);

const busy = computed(() => loading.value || previewing.value || saving.value);

/* =========================================
   HELPERS
========================================= */

const idOf = (value) => String(value?._id ?? value?.id ?? value ?? "");

const normalizeIds = (values) =>
  [...new Set((values || []).map(idOf).filter(Boolean))].sort();

const makeGroupKey = (categoryId, ids) =>
  `${categoryId}::${normalizeIds(ids).join("|")}`;

const formatAmount = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("en-US", {
    useGrouping: false,
    maximumFractionDigits: 2,
  }).format(number);
};

const unwrapArray = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;

  for (const key of ["categories", "subCategories", "items", "records"]) {
    if (Array.isArray(body?.[key])) return body[key];

    if (Array.isArray(body?.data?.[key])) {
      return body.data[key];
    }
  }

  return [];
};

const notify = (severity, en, km, detail = "") => {
  toast.add({
    severity,
    summary: label(en, km),
    detail,
    life: 3000,
  });
};

/* =========================================
   CATEGORY DATA
========================================= */

const selectedCategory = computed(() =>
  categories.value.find((item) => idOf(item) === selectedCategoryId.value),
);

const subCategoriesForActive = computed(() =>
  allSubCategories.value.filter(
    (item) =>
      idOf(item.category ?? item.categoryId) === selectedCategoryId.value,
  ),
);

const selectedSubCategoryNames = computed(() =>
  subCategoriesForActive.value
    .filter((item) => selectedSubCategoryIds.value.includes(idOf(item)))
    .map((item) => item.name),
);

/* =========================================
   ACTIVE GROUP
========================================= */

const activeGroupKey = computed(() =>
  selectedCategoryId.value && selectedSubCategoryIds.value.length
    ? makeGroupKey(selectedCategoryId.value, selectedSubCategoryIds.value)
    : "",
);

const activeMainGroup = computed(() =>
  invoiceGroups.value.find(
    (main) => main.category === selectedCategoryId.value,
  ),
);

const activeSubGroup = computed(() =>
  activeMainGroup.value?.subGroups.find(
    (group) => group.groupKey === activeGroupKey.value,
  ),
);

const calculatorData = computed(
  () => activeSubGroup.value?.calculatorData || [],
);

const activeGroupTotal = computed(() =>
  Number(activeSubGroup.value?.groupScore || 0),
);

/* =========================================
   INVOICE SUMMARY
========================================= */

const mainGroupTotal = (main) =>
  main.subGroups.reduce((sum, group) => sum + Number(group.groupScore || 0), 0);

const invoiceCategoryCount = computed(() => invoiceGroups.value.length);

const invoiceSubGroupCount = computed(() =>
  invoiceGroups.value.reduce((sum, main) => sum + main.subGroups.length, 0),
);

const invoiceEntryCount = computed(() =>
  invoiceGroups.value.reduce(
    (sum, main) =>
      sum +
      main.subGroups.reduce((n, group) => n + group.calculatorData.length, 0),
    0,
  ),
);

const invoiceGrandTotal = computed(() =>
  invoiceGroups.value.reduce((sum, main) => sum + mainGroupTotal(main), 0),
);

/* =========================================
   LOAD DATA
========================================= */

const loadCategories = async () => {
  loading.value = true;

  try {
    const [categoriesResponse, subResponse] = await Promise.all([
      api.get("/categories"),
      api.get("/sub-categories"),
    ]);

    categories.value = unwrapArray(categoriesResponse.data);

    allSubCategories.value = unwrapArray(subResponse.data);
  } catch (error) {
    console.error("LOAD CATEGORIES ERROR:", error);

    notify(
      "error",
      "Unable to load categories",
      "មិនអាចទាញយកប្រភេទបាន",
      error.response?.data?.message || error.message,
    );
  } finally {
    loading.value = false;
  }
};

/* =========================================
   CLEAR INPUT
========================================= */

const clearCurrentInput = () => {
  currentNumber.value = "";
  selectedPrefix.value = "";
  endNumber.value = "";
  baseValue.value = "";
  activeInput.value = "number";
};

/* =========================================
   CATEGORY SELECTION
========================================= */

const selectCategory = (value) => {
  if (busy.value) return;

  const id = idOf(value);

  if (id === selectedCategoryId.value) return;

  if (selectedCategoryId.value) {
    lastSelections.value[selectedCategoryId.value] = [
      ...selectedSubCategoryIds.value,
    ];
  }

  selectedCategoryId.value = id;

  selectedSubCategoryIds.value = [...(lastSelections.value[id] || [])];

  clearCurrentInput();
};

const toggleSubCategory = (value) => {
  if (busy.value || !selectedCategoryId.value) {
    return;
  }

  const id = idOf(value);

  selectedSubCategoryIds.value = selectedSubCategoryIds.value.includes(id)
    ? selectedSubCategoryIds.value.filter((item) => item !== id)
    : [...selectedSubCategoryIds.value, id];

  lastSelections.value[selectedCategoryId.value] = [
    ...selectedSubCategoryIds.value,
  ];

  clearCurrentInput();
};

const clearSubCategorySelection = () => {
  if (busy.value) return;

  selectedSubCategoryIds.value = [];

  if (selectedCategoryId.value) {
    lastSelections.value[selectedCategoryId.value] = [];
  }

  clearCurrentInput();
};

/* =========================================
   CALCULATOR KEYPAD
========================================= */

const appendDigits = (digit) => {
  if (busy.value || !/^\d$/.test(String(digit))) {
    return;
  }

  const value = String(digit);

  if (activeInput.value === "amount") {
    if (baseValue.value.length < 12) {
      baseValue.value += value;
    }
  } else if (activeInput.value === "end") {
    if (endNumber.value.length < 3) {
      endNumber.value += value;
    }

    if (
      currentNumber.value.length >= 2 &&
      endNumber.value.length >= currentNumber.value.length
    ) {
      activeInput.value = "amount";
    }
  } else if (currentNumber.value.length < 3) {
    currentNumber.value += value;
  }
};

const selectPrefix = (prefix) => {
  if (busy.value) return;

  if (!/^\d{2,3}$/.test(currentNumber.value)) {
    notify(
      "warn",
      "Enter a 2 or 3 digit number first",
      "សូមបញ្ចូលលេខ ២ ឬ ៣ ខ្ទង់ជាមុន",
    );
    return;
  }

  if (selectedPrefix.value !== prefix) {
    endNumber.value = "";
    baseValue.value = "";
  }

  selectedPrefix.value = prefix;

  activeInput.value = prefix === ">" ? "end" : "amount";
};

const backspace = () => {
  if (busy.value) return;

  if (activeInput.value === "amount") {
    if (baseValue.value) {
      baseValue.value = baseValue.value.slice(0, -1);
    } else {
      activeInput.value = selectedPrefix.value === ">" ? "end" : "number";
    }
  } else if (activeInput.value === "end") {
    if (endNumber.value) {
      endNumber.value = endNumber.value.slice(0, -1);
    } else {
      activeInput.value = "number";
    }
  } else {
    currentNumber.value = currentNumber.value.slice(0, -1);
  }
};

const rawExpression = computed(() => {
  if (!currentNumber.value) return "";

  if (selectedPrefix.value === ">") {
    return `${currentNumber.value}>${endNumber.value}`;
  }

  if (selectedPrefix.value === "x") {
    return `${currentNumber.value}x`;
  }

  if (selectedPrefix.value === ":") {
    return `${currentNumber.value}:`;
  }

  return currentNumber.value;
});

/* =========================================
   PREVIEW CALCULATION
========================================= */

const parsePreviewLines = (response) => {
  const body = response?.data ?? response;

  const result = body?.data?.data ?? body?.data ?? body;

  if (Array.isArray(result)) return result;

  for (const key of ["calculatorData", "lines", "items", "calculations"]) {
    if (Array.isArray(result?.[key])) {
      return result[key];
    }
  }

  throw new Error("Preview response has no calculation rows.");
};

const previewRows = async (categoryId, ids, rows) => {
  const response = await api.post("/number-cal/preview", {
    category: categoryId,

    subCategories: normalizeIds(ids),

    calculatorData: rows.map((row) => ({
      raw: String(row.raw || "").trim(),
      baseValue: Number(row.baseValue),
    })),
  });

  const result = parsePreviewLines(response);

  if (result.length !== rows.length) {
    throw new Error("Preview row count mismatch.");
  }

  return result.map((item, index) => {
    const score = Number(
      item.score ?? item.calculatedScore ?? item.totalScore ?? item.result,
    );

    if (!Number.isFinite(score)) {
      throw new Error("Invalid preview result.");
    }

    return {
      ...item,
      raw: rows[index].raw,
      baseValue: Number(rows[index].baseValue),
      score,
    };
  });
};

/* =========================================
   STAGE GROUP
========================================= */

const stageGroup = (categoryId, selectedIds, rows) => {
  const ids = normalizeIds(selectedIds);

  const key = makeGroupKey(categoryId, ids);

  let main = invoiceGroups.value.find((item) => item.category === categoryId);

  const existingIndex =
    main?.subGroups.findIndex((item) => item.groupKey === key) ?? -1;

  if (!rows.length) {
    if (main && existingIndex >= 0) {
      main.subGroups.splice(existingIndex, 1);
    }

    if (main && !main.subGroups.length) {
      invoiceGroups.value = invoiceGroups.value.filter(
        (item) => item.category !== categoryId,
      );
    }

    return;
  }

  if (!main) {
    const category = categories.value.find((item) => idOf(item) === categoryId);

    main = {
      category: categoryId,
      categoryName: category?.name || categoryId,
      subGroups: [],
    };

    invoiceGroups.value.push(main);
  }

  const subCategoryNames = allSubCategories.value
    .filter((item) => ids.includes(idOf(item)))
    .map((item) => item.name);

  const group = {
    groupKey: key,
    subCategories: ids,
    subCategoryNames,

    calculatorData: rows.map((item) => ({
      ...item,
    })),

    groupScore: rows.reduce((sum, item) => sum + Number(item.score || 0), 0),
  };

  if (existingIndex >= 0) {
    main.subGroups.splice(existingIndex, 1, group);
  } else {
    main.subGroups.push(group);
  }
};

/* =========================================
   ADD ENTRY
========================================= */

const addEntry = async () => {
  if (busy.value) return;

  if (!selectedCategoryId.value) {
    notify("warn", "Select a main category", "សូមជ្រើសរើសប្រភេទមេ");
    return;
  }

  if (!selectedSubCategoryIds.value.length) {
    notify(
      "warn",
      "Select at least one subcategory",
      "សូមជ្រើសរើសប្រភេទរងយ៉ាងហោចណាស់មួយ",
    );
    return;
  }

  if (!/^\d{2,3}$/.test(currentNumber.value)) {
    notify("warn", "Enter a 2 or 3 digit number", "សូមបញ្ចូលលេខ ២ ឬ ៣ ខ្ទង់");
    return;
  }

  if (!selectedPrefix.value) {
    notify("warn", "Choose an operator", "សូមជ្រើសរើសសញ្ញាគណនា");
    return;
  }

  if (
    selectedPrefix.value === ">" &&
    (endNumber.value.length !== currentNumber.value.length ||
      Number(endNumber.value) < Number(currentNumber.value))
  ) {
    notify("warn", "Check ending number", "សូមពិនិត្យលេខបញ្ចប់");
    return;
  }

  const amount = Number(baseValue.value);

  if (!baseValue.value || !Number.isFinite(amount) || amount <= 0) {
    notify("warn", "Enter a valid amount", "សូមបញ្ចូលចំនួនឱ្យបានត្រឹមត្រូវ");

    activeInput.value = "amount";
    return;
  }

  const rows = [
    ...calculatorData.value.map((item) => ({
      raw: item.raw,
      baseValue: Number(item.baseValue),
    })),
    {
      raw: rawExpression.value,
      baseValue: amount,
    },
  ];

  previewing.value = true;

  try {
    const calculated = await previewRows(
      selectedCategoryId.value,
      selectedSubCategoryIds.value,
      rows,
    );

    stageGroup(
      selectedCategoryId.value,
      selectedSubCategoryIds.value,
      calculated,
    );

    clearCurrentInput();
  } catch (error) {
    console.error("PREVIEW ERROR:", error);

    notify(
      "error",
      "Unable to add entry",
      "មិនអាចបន្ថែមទិន្នន័យបាន",
      error.response?.data?.message || error.message,
    );
  } finally {
    previewing.value = false;
  }
};

/* =========================================
   DELETE ENTRY / GROUP
========================================= */

const removeEntry = (index) => {
  if (busy.value || !activeSubGroup.value) {
    return;
  }

  stageGroup(
    selectedCategoryId.value,
    selectedSubCategoryIds.value,
    calculatorData.value.filter((_, i) => i !== index),
  );
};

const removeSubGroup = (categoryId, ids) => {
  if (busy.value) return;

  stageGroup(categoryId, ids, []);
};

const removeMainGroup = (categoryId) => {
  if (busy.value) return;

  invoiceGroups.value = invoiceGroups.value.filter(
    (item) => item.category !== categoryId,
  );
};

const editGroup = (categoryId, ids) => {
  if (busy.value) return;

  selectedCategoryId.value = categoryId;
  selectedSubCategoryIds.value = [...ids];

  lastSelections.value[categoryId] = [...ids];

  clearCurrentInput();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

/* =========================================
   RESET INVOICE
========================================= */

const resetInvoice = () => {
  if (busy.value || !invoiceGroups.value.length) {
    return;
  }

  if (
    !window.confirm(
      label(
        "Delete all unsaved invoice entries?",
        "តើអ្នកចង់លុបទិន្នន័យព្រាងទាំងអស់មែនទេ?",
      ),
    )
  ) {
    return;
  }

  invoiceGroups.value = [];
  lastSelections.value = {};

  selectedCategoryId.value = "";
  selectedSubCategoryIds.value = [];

  clearCurrentInput();
};

/* =========================================
   SAVE INVOICE
========================================= */

const saveCalculation = async () => {
  if (busy.value || !invoiceGroups.value.length) {
    return;
  }

  saving.value = true;

  try {
    const payload = {
      groups: invoiceGroups.value.map((main) => ({
        category: main.category,
        categoryName: main.categoryName,

        subGroups: main.subGroups.map((group) => ({
          subCategories: [...group.subCategories],

          subCategoryNames: [...group.subCategoryNames],

          calculatorData: group.calculatorData.map((item) => ({
            raw: String(item.raw).trim(),
            baseValue: Number(item.baseValue),
          })),
        })),
      })),
    };

    await api.post("/batch-invoices", payload);

    invoiceGroups.value = [];
    lastSelections.value = {};

    selectedCategoryId.value = "";
    selectedSubCategoryIds.value = [];

    clearCurrentInput();

    notify(
      "success",
      "Invoice saved successfully",
      "បានរក្សាទុកវិក្កយបត្រដោយជោគជ័យ",
    );

    await router.push("/invoices");
  } catch (error) {
    console.error("SAVE INVOICE ERROR:", error);

    notify(
      "error",
      "Unable to save invoice",
      "មិនអាចរក្សាទុកវិក្កយបត្របាន",
      error.response?.data?.message || error.message,
    );
  } finally {
    saving.value = false;
  }
};

/* =========================================
   KEYBOARD SUPPORT
========================================= */

const onKeydown = (event) => {
  if (busy.value) return;

  const target = event.target;

  if (
    target instanceof HTMLElement &&
    target.closest("input, textarea, select, [contenteditable='true']")
  ) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    appendDigits(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    backspace();
  } else if ([">", ":", "x", "X", "*"].includes(event.key)) {
    event.preventDefault();

    selectPrefix(event.key === "*" || event.key === "X" ? "x" : event.key);
  } else if (event.key === "Enter") {
    event.preventDefault();
    addEntry();
  } else if (event.key === "Escape") {
    clearCurrentInput();
  }
};

onMounted(() => {
  loadCategories();

  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="calculator-page min-h-screen bg-slate-50 text-slate-800">
    <Toast />

    <!-- HEADER -->
    <header
      class="page-header sticky top-0 z-30 border-b border-slate-200 bg-white"
    >
      <div
        class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-5 sm:py-3"
      >
        <button
          type="button"
          class="header-button"
          :aria-label="label('Back', 'ត្រឡប់ក្រោយ')"
          @click="router.push('/')"
        >
          <i class="pi pi-arrow-left" />
        </button>

        <div class="min-w-0 text-center">
          <h1 class="text-sm font-bold sm:text-base">
            {{ label("Calculator", "គណនា") }}
          </h1>

          <p class="text-[10px] text-slate-400">
            {{ invoiceCategoryCount }}
            {{ label("categories", "ប្រភេទ") }}
            ·
            {{ invoiceSubGroupCount }}
            {{ label("groups", "ក្រុម") }}
          </p>
        </div>

        <LanguageSwitch />
      </div>
    </header>

    <main class="page-main mx-auto max-w-6xl px-3 pb-5 pt-3 sm:px-5 sm:pt-4">
      <!-- CATEGORY SELECTION -->
      <section
        class="category-section mb-3 rounded-xl border border-slate-200 bg-white p-3"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="input-label">
              {{ label("Main Category", "ប្រភេទមេ") }}
            </label>

            <select
              class="category-select"
              :value="selectedCategoryId"
              :disabled="busy"
              @change="selectCategory($event.target.value)"
            >
              <option value="">
                {{ label("Select Category", "ជ្រើសរើសប្រភេទ") }}
              </option>

              <option
                v-for="category in categories"
                :key="idOf(category)"
                :value="idOf(category)"
              >
                {{ category.name }}
              </option>
            </select>
          </div>

          <!-- SUBCATEGORIES -->
          <div class="min-w-0">
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <label class="input-label !mb-0">
                {{
                  label(
                    "Sub Categories (Multi-select)",
                    "ប្រភេទរង (ជ្រើសរើសច្រើន)",
                  )
                }}
              </label>

              <button
                v-if="selectedSubCategoryIds.length"
                type="button"
                class="shrink-0 text-[11px] font-semibold text-red-500"
                :disabled="busy"
                @click="clearSubCategorySelection"
              >
                {{ label("Clear", "សម្អាត") }}
              </button>
            </div>

            <div class="subcategory-viewport flex min-h-10 gap-1.5">
              <button
                v-for="sub in subCategoriesForActive"
                :key="idOf(sub)"
                type="button"
                class="sub-category-button"
                :class="{
                  active: selectedSubCategoryIds.includes(idOf(sub)),
                }"
                :disabled="busy"
                @click="toggleSubCategory(idOf(sub))"
              >
                <i
                  v-if="selectedSubCategoryIds.includes(idOf(sub))"
                  class="pi pi-check mr-1 text-[9px]"
                />

                {{ sub.name }}
              </button>
            </div>

            <p
              v-if="selectedCategoryId"
              class="selected-line mt-1 text-[11px] text-slate-500"
            >
              {{ label("Selected:", "បានជ្រើសរើស:") }}
              {{ selectedSubCategoryNames.join(", ") || "—" }}
            </p>
          </div>
        </div>
      </section>

      <!-- PRE-SAVED GROUPS -->
      <div
        v-if="invoiceGroups.length"
        class="draft-strip mb-3 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2"
      >
        <span class="shrink-0 text-xs font-semibold text-green-800">
          {{ label("Pre-saved groups", "ក្រុមដែលបានរក្សាទុកបណ្តោះអាសន្ន") }}:
        </span>

        <template v-for="main in invoiceGroups" :key="main.category">
          <button
            v-for="group in main.subGroups"
            :key="group.groupKey"
            type="button"
            class="draft-chip shrink-0"
            :class="{
              active: activeGroupKey === group.groupKey,
            }"
            :disabled="busy"
            @click="editGroup(main.category, group.subCategories)"
          >
            {{ main.categoryName }}
            /
            {{ group.subCategoryNames.join(" + ") }}
            ({{ group.calculatorData.length }})
          </button>
        </template>
      </div>

      <!-- ORIGINAL TWO-COLUMN CALCULATOR -->
      <div class="calculator-layout">
        <!-- ENTRY PANEL -->
        <section class="entry-panel">
          <div class="entry-toolbar">
            <button
              type="button"
              class="toolbar-button"
              :disabled="busy"
              :aria-label="label('Clear input', 'សម្អាតការបញ្ចូល')"
              @click="clearCurrentInput"
            >
              <i class="pi pi-refresh" />
            </button>

            <strong
              class="max-w-[65%] truncate text-center text-xs text-slate-600"
            >
              {{ selectedCategory?.name || label("Entries", "ទិន្នន័យ") }}

              <span v-if="selectedSubCategoryNames.length">
                /
                {{ selectedSubCategoryNames.join(", ") }}
              </span>
            </strong>

            <button
              type="button"
              class="toolbar-button danger"
              :disabled="busy"
              :aria-label="label('Reset invoice', 'សម្អាតវិក្កយបត្រ')"
              @click="resetInvoice"
            >
              <i class="pi pi-trash" />
            </button>
          </div>

          <!-- SCROLLABLE ENTRIES -->
          <div class="entry-list">
            <div
              v-for="(item, index) in calculatorData"
              :key="`${index}-${item.raw}`"
              class="entry-row"
            >
              <div class="entry-content">
                <span class="entry-expression" :title="item.raw">
                  {{ item.raw }}
                </span>

                <span class="entry-colon"> : </span>

                <strong class="entry-amount">
                  {{ formatAmount(item.baseValue) }}
                </strong>

                <button
                  type="button"
                  class="entry-delete-button"
                  :disabled="busy"
                  :aria-label="label('Delete entry', 'លុបទិន្នន័យ')"
                  @click="removeEntry(index)"
                >
                  <i class="pi pi-trash" />
                </button>
              </div>
            </div>

            <p
              v-if="!calculatorData.length"
              class="px-2 py-8 text-center text-xs text-slate-400"
            >
              {{
                label("Enter numbers to begin", "សូមបញ្ចូលលេខដើម្បីចាប់ផ្តើម")
              }}
            </p>
          </div>

          <!-- ENTRY TOTAL -->
          <div class="entry-footer">
            <strong>
              {{ formatAmount(activeGroupTotal) }}
            </strong>

            <p class="mt-1 text-[10px] text-slate-400">
              {{ calculatorData.length }}
              {{ label("entries", "ទិន្នន័យ") }}
            </p>
          </div>
        </section>

        <!-- KEYPAD PANEL -->
        <section class="control-panel">
          <div class="number-display">
            <div class="number-heading mb-3 flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500">
                {{ label("Number", "លេខ") }}
              </span>

              <button
                type="button"
                class="text-xs font-semibold text-slate-400"
                :disabled="busy"
                @click="clearCurrentInput"
              >
                {{ label("Clear", "សម្អាត") }}
              </button>
            </div>

            <!-- NUMBER -->
            <button
              type="button"
              class="display-field"
              :class="{
                selected: activeInput === 'number',
              }"
              :disabled="busy"
              @click="activeInput = 'number'"
            >
              {{ currentNumber || "00" }}
            </button>

            <!-- OPERATORS -->
            <div class="operator-row mt-3 grid grid-cols-3 gap-2">
              <button
                v-for="operator in ['>', 'x', ':']"
                :key="operator"
                type="button"
                class="operator-button"
                :class="{
                  active: selectedPrefix === operator,
                }"
                :disabled="busy"
                @click="selectPrefix(operator)"
              >
                {{ operator }}
              </button>
            </div>

            <!-- END NUMBER -->
            <div v-if="selectedPrefix === '>'" class="extra-field mt-3">
              <label class="input-label">
                {{ label("End Number", "លេខបញ្ចប់") }}
              </label>

              <button
                type="button"
                class="display-field"
                :class="{
                  selected: activeInput === 'end',
                }"
                :disabled="busy"
                @click="activeInput = 'end'"
              >
                {{ endNumber || "00" }}
              </button>
            </div>

            <!-- AMOUNT -->
            <div class="extra-field mt-3">
              <label class="input-label">
                {{ label("Amount", "ចំនួន") }}
              </label>

              <button
                type="button"
                class="display-field"
                :class="{
                  selected: activeInput === 'amount',
                }"
                :disabled="busy"
                @click="activeInput = 'amount'"
              >
                {{ baseValue || "0" }}
              </button>
            </div>

            <!-- CURRENT EXPRESSION -->
            <div
              class="expression-preview mt-3 rounded-lg bg-slate-50 p-2 text-right"
            >
              <span class="font-bold text-slate-700">
                {{ rawExpression || "—" }}
                :
                {{ baseValue || "0" }}
              </span>
            </div>
          </div>

          <!-- KEYPAD -->
          <div class="keypad">
            <button
              v-for="digit in ['7', '8', '9', '4', '5', '6', '1', '2', '3']"
              :key="digit"
              type="button"
              class="keypad-button"
              :disabled="busy"
              @click="appendDigits(digit)"
            >
              {{ digit }}
            </button>

            <button
              type="button"
              class="keypad-button"
              :disabled="busy"
              :aria-label="label('Clear input', 'សម្អាតការបញ្ចូល')"
              @click="clearCurrentInput"
            >
              <i class="pi pi-times" />
            </button>

            <button
              type="button"
              class="keypad-button"
              :disabled="busy"
              @click="appendDigits('0')"
            >
              0
            </button>

            <button
              type="button"
              class="keypad-button"
              :disabled="busy"
              :aria-label="label('Backspace', 'លុបលេខចុងក្រោយ')"
              @click="backspace"
            >
              <i class="pi pi-delete-left" />
            </button>
          </div>

          <!-- ADD ENTRY -->
          <Button
            type="button"
            icon="pi pi-plus"
            :label="label('Add', 'បន្ថែម')"
            class="add-button mt-3 w-full"
            :loading="previewing"
            :disabled="busy"
            @click="addEntry"
          />
        </section>
      </div>

      <!-- INVOICE DRAFT -->
      <section
        v-if="invoiceGroups.length"
        class="invoice-draft mt-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
      >
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-800">
            {{ label("Invoice Draft", "ព្រាងវិក្កយបត្រ") }}
          </h2>

          <span class="text-xs text-slate-400">
            {{ invoiceEntryCount }}
            {{ label("entries", "ទិន្នន័យ") }}
          </span>
        </div>

        <div
          v-for="main in invoiceGroups"
          :key="main.category"
          class="mb-4 last:mb-0"
        >
          <!-- MAIN CATEGORY -->
          <div
            class="flex items-center justify-between border-b border-slate-200 pb-2"
          >
            <h3 class="text-sm font-bold text-slate-900">
              {{ main.categoryName }}
            </h3>

            <div class="flex items-center gap-3">
              <strong class="text-sm">
                {{ formatAmount(mainGroupTotal(main)) }}
              </strong>

              <button
                type="button"
                class="text-red-500"
                :disabled="busy"
                :aria-label="label('Remove category', 'លុបប្រភេទ')"
                @click="removeMainGroup(main.category)"
              >
                <i class="pi pi-trash" />
              </button>
            </div>
          </div>

          <!-- SUBGROUPS -->
          <div
            v-for="group in main.subGroups"
            :key="group.groupKey"
            class="flex items-center gap-2 border-b border-slate-50 py-2 pl-2"
          >
            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              :disabled="busy"
              @click="editGroup(main.category, group.subCategories)"
            >
              <p class="break-words text-xs font-bold text-slate-700">
                {{ group.subCategoryNames.join(", ") }}
              </p>

              <p class="mt-0.5 text-[10px] text-slate-400">
                {{ group.calculatorData.length }}
                {{ label("entries", "ទិន្នន័យ") }}
              </p>
            </button>

            <strong class="text-xs text-slate-800">
              {{ formatAmount(group.groupScore) }}
            </strong>

            <button
              type="button"
              class="rounded-lg p-2 text-red-500 hover:bg-red-50"
              :disabled="busy"
              :aria-label="label('Remove group', 'លុបក្រុម')"
              @click="removeSubGroup(main.category, group.subCategories)"
            >
              <i class="pi pi-trash" />
            </button>
          </div>
        </div>
      </section>

      <!-- STICKY SAVE -->
      <section
        class="save-section z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
      >
        <div class="min-w-0">
          <p class="text-[10px] text-slate-400">
            {{ label("Invoice Total", "សរុបវិក្កយបត្រ") }}
          </p>

          <strong class="invoice-total text-2xl font-black text-slate-900">
            {{ formatAmount(invoiceGrandTotal) }}
          </strong>
        </div>

        <Button
          type="button"
          icon="pi pi-save"
          :label="label('Save Invoice', 'រក្សាទុកវិក្កយបត្រ')"
          :disabled="busy || !invoiceGroups.length"
          :loading="saving"
          @click="saveCalculation"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
/* =========================================
   MAIN PAGE
========================================= */

.calculator-page {
  min-width: 320px;
}

.page-header {
  min-height: 50px;
}

.page-main {
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}

/* =========================================
   HEADER
========================================= */

.header-button {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: #64748b;
}

/* =========================================
   CATEGORY
========================================= */

.input-label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.category-select {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: white;
  font-size: 13px;
}

.subcategory-viewport {
  overflow-x: auto;
  overflow-y: hidden;
  flex-wrap: nowrap;
  padding-bottom: 2px;
  scrollbar-width: thin;
}

.sub-category-button {
  flex-shrink: 0;
  min-height: 34px;
  padding: 5px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}

.sub-category-button.active {
  border-color: #22c55e;
  background: #f0fdf4;
  color: #15803d;
}

.selected-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* =========================================
   DRAFT CHIPS
========================================= */

.draft-strip {
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: thin;
}

.draft-chip {
  border: 1px solid #bbf7d0;
  border-radius: 7px;
  background: white;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
  color: #15803d;
}

.draft-chip.active {
  background: #16a34a;
  color: white;
}

/* =========================================
   TWO COLUMN LAYOUT
========================================= */

.calculator-layout {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(0, 1fr);

  gap: clamp(7px, 1.5vw, 12px);

  height: clamp(335px, calc(100dvh - 245px), 620px);
}

.entry-panel,
.control-panel {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
}

/* =========================================
   ENTRY PANEL
========================================= */

.entry-panel {
  display: flex;
  flex-direction: column;
}

.entry-toolbar {
  display: flex;
  min-height: 48px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 10px;
}

.toolbar-button {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  font-size: 18px;
  color: #64748b;
}

.toolbar-button.danger {
  color: #ef4444;
}

.entry-list {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 5px 12px;
}

.entry-row {
  border-bottom: 1px solid #f1f5f9;
}

.entry-content {
  display: grid;
  min-height: 35px;
  grid-template-columns:
    minmax(0, 1fr)
    auto auto 25px;
  align-items: center;
  gap: 5px;
  padding: 3px 0;
}

.entry-expression {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}

.entry-colon {
  font-size: 11px;
  color: #64748b;
}

.entry-amount {
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
  text-align: right;
  overflow-wrap: anywhere;
}

.entry-delete-button {
  display: flex;
  width: 24px;
  height: 27px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #ef4444;
  font-size: 10px;
}

.entry-footer {
  flex: 0 0 auto;
  border-top: 1px solid #e2e8f0;
  padding: 10px 12px;
}

.entry-footer strong {
  font-size: 17px;
  font-weight: 800;
  color: #1e293b;
}

/* =========================================
   CONTROL PANEL
========================================= */

.control-panel {
  display: flex;
  flex-direction: column;
  padding: clamp(6px, 1.25vw, 12px);
}

.number-display {
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 9px;
  scrollbar-width: thin;
}

.display-field {
  display: block;
  width: 100%;

  min-height: clamp(34px, 4.9dvh, 46px);

  padding: 5px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #f8fafc;
  text-align: right;

  font-size: clamp(18px, 2vw, 23px);

  font-weight: 800;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.display-field.selected {
  border-color: #22c55e;
  background: #f0fdf4;
}

/* =========================================
   OPERATORS
========================================= */

.operator-button {
  min-height: clamp(31px, 4.3dvh, 38px);

  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #334155;

  font-size: clamp(16px, 2.1vw, 19px);

  font-weight: 800;
}

.operator-button.active {
  border-color: #16a34a;
  background: #f0fdf4;
  color: #15803d;
}

.expression-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

/* =========================================
   KEYPAD
========================================= */

.keypad {
  display: grid;

  flex: 1 0 112px;
  min-height: 112px;

  grid-template-columns: repeat(3, minmax(0, 1fr));

  grid-template-rows: repeat(4, minmax(0, 1fr));

  gap: clamp(4px, 0.75vw, 8px);

  margin-top: clamp(5px, 0.85dvh, 12px);
}

.keypad-button {
  min-width: 0;
  min-height: 0;

  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #f8fafc;
  color: #334155;

  font-size: clamp(17px, 2.2vw, 23px);

  font-weight: 800;
  touch-action: manipulation;
}

.keypad-button:active {
  background: #dcfce7;
}

/* =========================================
   ADD BUTTON
========================================= */

.add-button {
  flex: 0 0 auto;
  min-height: 36px;

  margin-top: clamp(5px, 0.8dvh, 12px) !important;
}

/* =========================================
   STICKY SAVE
========================================= */

.save-section {
  position: fixed;

  bottom: max(8px, env(safe-area-inset-bottom));

  left: 50%;
  transform: translateX(-50%);

  width: min(calc(100% - 24px), 1152px);

  z-index: 40;

  box-shadow: 0 -5px 25px rgba(15, 23, 42, 0.09);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* =========================================
   MOBILE
========================================= */

@media (max-width: 540px) {
  .page-main {
    padding-top: 8px;
  }

  .category-section {
    padding: 9px;
    margin-bottom: 7px;
  }

  .category-section > div {
    gap: 8px;
  }

  .input-label {
    margin-bottom: 3px;
    font-size: 10px;
  }

  .category-select {
    min-height: 35px;
    font-size: 12px;
    padding: 0 9px;
  }

  .sub-category-button {
    min-height: 32px;
    padding: 4px 8px;
    font-size: 11px;
  }

  .selected-line {
    margin-top: 2px;
    font-size: 10px;
  }

  .draft-strip {
    margin-bottom: 7px;
    padding: 5px 7px;
  }

  .draft-strip > span {
    font-size: 10px;
  }

  .draft-chip {
    padding: 4px 7px;
    font-size: 10px;
  }

  .entry-toolbar {
    min-height: 41px;
    padding: 0 6px;
  }

  .toolbar-button {
    width: 27px;
    height: 29px;
  }

  .entry-list {
    padding: 3px 6px;
  }

  .entry-content {
    min-height: 31px;

    grid-template-columns:
      minmax(0, 1fr)
      auto auto 22px;

    gap: 3px;
  }

  .entry-expression,
  .entry-amount {
    font-size: clamp(10px, 2.65vw, 12px);
  }

  .entry-footer {
    padding: 7px 8px;
  }

  .entry-footer strong {
    font-size: 15px;
  }

  .number-heading {
    margin-bottom: 5px !important;
  }

  .operator-row {
    margin-top: 6px !important;
    gap: 4px;
  }

  .extra-field {
    margin-top: 6px !important;
  }

  .number-display .input-label {
    margin-bottom: 1px;
  }

  .number-display {
    padding-bottom: 5px;
  }

  .display-field {
    min-height: clamp(30px, 4.7dvh, 39px);

    padding: 3px 7px;

    font-size: clamp(16px, 4vw, 20px);
  }

  .operator-button {
    min-height: clamp(28px, 4dvh, 34px);
  }

  .expression-preview {
    margin-top: 5px !important;
    padding: 4px 6px;
    font-size: 11px;
  }

  .keypad {
    min-height: 114px;
  }

  .add-button {
    min-height: 33px;
    font-size: 12px;
  }

  .save-section {
    padding: 9px 10px;
    flex-wrap: nowrap;
    gap: 8px;
  }

  .save-section .invoice-total {
    font-size: clamp(17px, 5vw, 23px);
  }

  .save-section :deep(.p-button) {
    padding: 8px 10px;
    font-size: 12px;
  }
}

/* =========================================
   SHORT SCREEN HEIGHTS
========================================= */

@media (max-height: 690px) {
  .calculator-layout {
    height: max(300px, calc(100dvh - 243px));
  }

  .number-display .input-label {
    font-size: 10px;
  }

  .number-heading {
    margin-bottom: 4px !important;
  }

  .operator-row,
  .extra-field {
    margin-top: 4px !important;
  }

  .expression-preview {
    margin-top: 4px !important;
  }

  .keypad {
    min-height: 106px;
  }
}

@media (max-height: 550px) {
  .calculator-layout {
    height: 300px;
  }

  .page-main {
    padding-top: 5px;
  }

  .category-section {
    padding: 6px 9px;
  }

  .number-display {
    padding-bottom: 3px;
  }

  .control-panel {
    padding: 5px;
  }
}

/* =========================================
   TABLET / DESKTOP
========================================= */

@media (min-width: 768px) {
  .calculator-layout {
    height: clamp(415px, calc(100dvh - 245px), 650px);

    gap: 14px;
  }

  .control-panel {
    padding: 14px;
  }

  .keypad {
    min-height: 148px;
  }

  .keypad-button {
    font-size: 24px;
  }

  .entry-content {
    min-height: 38px;
  }
}
</style>
