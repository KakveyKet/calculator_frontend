<script setup>
import { computed, onMounted, ref } from "vue";
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

/* =====================================================
   STATE
===================================================== */

const categories = ref([]);
const allSubCategories = ref([]);

const selectedCategoryId = ref("");
const selectedSubCategoryIds = ref([]);
const lastSelections = ref({});

/*
  Invoice draft:

  [
    {
      category: "...",
      categoryName: "...",
      subGroups: [
        {
          groupKey: "...",
          subCategories: ["id1", "id2"],
          subCategoryNames: ["ABCD", "AC"],
          calculatorData: [],
          groupScore: 0
        }
      ]
    }
  ]
*/
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

/* =====================================================
   HELPERS
===================================================== */

const idOf = (value) => String(value?._id ?? value?.id ?? value ?? "");

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
    life: 2500,
  });
};

/*
  Selection order does not matter.

  ABCD + AC + AB
  AB + ABCD + AC

  Both resolve to the same group.
*/
const normalizeIds = (values) =>
  [...new Set((values || []).map(idOf).filter(Boolean))].sort();

const makeGroupKey = (categoryId, ids) =>
  `${categoryId}::${normalizeIds(ids).join("|")}`;

/* =====================================================
   CATEGORY DATA
===================================================== */

const selectedCategory = computed(() =>
  categories.value.find((item) => idOf(item) === selectedCategoryId.value),
);

const subCategoriesForActive = computed(() => {
  if (!selectedCategoryId.value) return [];

  return allSubCategories.value.filter(
    (item) =>
      idOf(item.category ?? item.categoryId) === selectedCategoryId.value,
  );
});

const selectedSubCategoryNames = computed(() =>
  subCategoriesForActive.value
    .filter((item) => selectedSubCategoryIds.value.includes(idOf(item)))
    .map((item) => item.name),
);

/* =====================================================
   ACTIVE GROUP
===================================================== */

const activeGroupKey = computed(() => {
  if (!selectedCategoryId.value || !selectedSubCategoryIds.value.length) {
    return "";
  }

  return makeGroupKey(selectedCategoryId.value, selectedSubCategoryIds.value);
});

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

/* =====================================================
   INVOICE SUMMARY
===================================================== */

const mainGroupTotal = (main) =>
  main.subGroups.reduce(
    (total, group) => total + Number(group.groupScore || 0),
    0,
  );

const invoiceCategoryCount = computed(() => invoiceGroups.value.length);

const invoiceSubGroupCount = computed(() =>
  invoiceGroups.value.reduce((total, main) => total + main.subGroups.length, 0),
);

const invoiceEntryCount = computed(() =>
  invoiceGroups.value.reduce(
    (total, main) =>
      total +
      main.subGroups.reduce(
        (count, group) => count + group.calculatorData.length,
        0,
      ),
    0,
  ),
);

const invoiceGrandTotal = computed(() =>
  invoiceGroups.value.reduce((total, main) => total + mainGroupTotal(main), 0),
);

/* =====================================================
   LOAD
===================================================== */

const loadCategories = async () => {
  loading.value = true;

  try {
    const [categoryResponse, subResponse] = await Promise.all([
      api.get("/categories"),
      api.get("/sub-categories"),
    ]);

    categories.value = unwrapArray(categoryResponse.data);
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

/* =====================================================
   INPUT
===================================================== */

const clearCurrentInput = () => {
  currentNumber.value = "";
  selectedPrefix.value = "";
  endNumber.value = "";
  baseValue.value = "";
  activeInput.value = "number";
};

/* =====================================================
   SELECT MAIN CATEGORY

   Never delete previous draft groups.
===================================================== */

const selectCategory = (value) => {
  if (busy.value) return;

  const categoryId = idOf(value);

  if (categoryId === selectedCategoryId.value) return;

  if (selectedCategoryId.value) {
    lastSelections.value[selectedCategoryId.value] = [
      ...selectedSubCategoryIds.value,
    ];
  }

  selectedCategoryId.value = categoryId;

  selectedSubCategoryIds.value = [...(lastSelections.value[categoryId] || [])];

  clearCurrentInput();
};

/* =====================================================
   MULTI-SELECT SUBCATEGORIES

   Each exact combination is an independent group.
===================================================== */

const toggleSubCategory = (value) => {
  if (busy.value || !selectedCategoryId.value) return;

  const id = idOf(value);

  if (selectedSubCategoryIds.value.includes(id)) {
    selectedSubCategoryIds.value = selectedSubCategoryIds.value.filter(
      (selected) => selected !== id,
    );
  } else {
    selectedSubCategoryIds.value = [...selectedSubCategoryIds.value, id];
  }

  lastSelections.value[selectedCategoryId.value] = [
    ...selectedSubCategoryIds.value,
  ];

  /*
    Existing draft rows automatically appear if this
    selection matches a previously saved combination.
  */
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

/* =====================================================
   KEYPAD
===================================================== */

const appendDigits = (digit) => {
  if (busy.value) return;

  const value = String(digit);

  if (!/^\d$/.test(value)) return;

  if (activeInput.value === "amount") {
    if (baseValue.value.length < 12) {
      baseValue.value += value;
    }
  } else if (activeInput.value === "end") {
    if (endNumber.value.length < 3) {
      endNumber.value += value;
    }
  } else if (currentNumber.value.length < 3) {
    currentNumber.value += value;
  }
};

const selectPrefix = (prefix) => {
  if (busy.value) return;

  if (!currentNumber.value) {
    notify("warn", "Enter a number first", "សូមបញ្ចូលលេខជាមុន");
    return;
  }

  selectedPrefix.value = prefix;
  activeInput.value = prefix === ">" ? "end" : "amount";
};

const backspace = () => {
  if (busy.value) return;

  if (activeInput.value === "amount") {
    baseValue.value = baseValue.value.slice(0, -1);
  } else if (activeInput.value === "end") {
    endNumber.value = endNumber.value.slice(0, -1);
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

/* =====================================================
   PREVIEW

   Reuse your existing backend calculation logic.
===================================================== */

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

    /*
      Important: an ARRAY of selected subcategories.
    */
    subCategories: normalizeIds(ids),

    calculatorData: rows.map((item) => ({
      raw: String(item.raw || "").trim(),
      baseValue: Number(item.baseValue),
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

/* =====================================================
   STAGE / PRE-SAVE GROUP

   Only updates frontend memory.
===================================================== */

const stageGroup = (categoryId, selectedIds, rows) => {
  const ids = normalizeIds(selectedIds);
  const key = makeGroupKey(categoryId, ids);

  let main = invoiceGroups.value.find((item) => item.category === categoryId);

  const existingIndex =
    main?.subGroups.findIndex((item) => item.groupKey === key) ?? -1;

  /*
    Removing the final row also removes its group.
  */
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

    calculatorData: rows.map((item) => ({ ...item })),

    groupScore: rows.reduce(
      (total, item) => total + Number(item.score || 0),
      0,
    ),
  };

  if (existingIndex >= 0) {
    main.subGroups.splice(existingIndex, 1, group);
  } else {
    main.subGroups.push(group);
  }
};

/* =====================================================
   ADD ENTRY

   This is the pre-save step.
===================================================== */

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
    notify("warn", "Select an operator", "សូមជ្រើសរើសសញ្ញាគណនា");
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

  if (!Number.isFinite(amount) || amount <= 0) {
    notify("warn", "Enter a valid amount", "សូមបញ្ចូលចំនួនឱ្យបានត្រឹមត្រូវ");
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
    const result = await previewRows(
      selectedCategoryId.value,
      selectedSubCategoryIds.value,
      rows,
    );

    stageGroup(selectedCategoryId.value, selectedSubCategoryIds.value, result);

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

/* =====================================================
   DELETE ROW / GROUP
===================================================== */

const removeEntry = (index) => {
  if (busy.value || !activeSubGroup.value) return;

  const remaining = calculatorData.value.filter(
    (_, rowIndex) => rowIndex !== index,
  );

  stageGroup(selectedCategoryId.value, selectedSubCategoryIds.value, remaining);
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

/* =====================================================
   EDIT GROUP

   Restore the selected set, not only one subcategory.
===================================================== */

const editGroup = (categoryId, ids) => {
  if (busy.value) return;

  selectedCategoryId.value = categoryId;
  selectedSubCategoryIds.value = [...ids];

  lastSelections.value[categoryId] = [...ids];

  clearCurrentInput();

  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* =====================================================
   RESET
===================================================== */

const resetInvoice = () => {
  if (busy.value) return;

  invoiceGroups.value = [];
  lastSelections.value = {};

  selectedCategoryId.value = "";
  selectedSubCategoryIds.value = [];

  clearCurrentInput();
};

/* =====================================================
   SAVE ONE INVOICE
===================================================== */

const saveCalculation = async () => {
  if (busy.value || !invoiceGroups.value.length) return;

  saving.value = true;

  try {
    const payload = {
      groups: invoiceGroups.value.map((main) => ({
        category: main.category,
        categoryName: main.categoryName,

        subGroups: main.subGroups.map((group) => ({
          /*
            Multiple subcategories belong to ONE subgroup.
          */
          subCategories: [...group.subCategories],
          subCategoryNames: [...group.subCategoryNames],

          calculatorData: group.calculatorData.map((item) => ({
            raw: String(item.raw).trim(),
            baseValue: Number(item.baseValue),
          })),
        })),
      })),
    };

    /*
      One request. One invoice document.
    */
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

onMounted(loadCategories);
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

    <main class="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <!-- MAIN CATEGORY + MULTI-SUBCATEGORY -->
      <section class="mb-3 rounded-xl border border-slate-200 bg-white p-3">
        <div class="grid gap-3 sm:grid-cols-2">
          <!-- MAIN CATEGORY -->
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

          <!-- MULTI SUBCATEGORIES -->
          <div>
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
                class="text-[10px] font-semibold text-red-500"
                :disabled="busy"
                @click="clearSubCategorySelection"
              >
                {{ label("Clear", "សម្អាត") }}
              </button>
            </div>

            <!-- SELECT MANY AT ONCE -->
            <div class="flex min-h-10 flex-wrap gap-1.5">
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
              class="mt-2 text-[10px] text-slate-500"
            >
              {{ label("Selected:", "បានជ្រើសរើស:") }}
              {{ selectedSubCategoryNames.join(", ") || "—" }}
            </p>
          </div>
        </div>
      </section>

      <!-- PRE-SAVED GROUP INDICATOR -->
      <div
        v-if="invoiceGroups.length"
        class="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2"
      >
        <span class="text-xs font-semibold text-green-800">
          {{ label("Pre-saved groups", "ក្រុមដែលបានរក្សាទុកបណ្តោះអាសន្ន") }}:
        </span>

        <template v-for="main in invoiceGroups" :key="main.category">
          <button
            v-for="group in main.subGroups"
            :key="group.groupKey"
            type="button"
            class="draft-chip"
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

      <!-- EXISTING CALCULATOR PANELS -->
      <div class="calculator-layout">
        <!-- ENTRY PANEL -->
        <section class="entry-panel">
          <div class="entry-toolbar">
            <button
              type="button"
              class="toolbar-button"
              :disabled="busy"
              @click="clearCurrentInput"
            >
              <i class="pi pi-refresh" />
            </button>

            <strong
              class="max-w-[65%] truncate text-center text-xs text-slate-600"
            >
              {{ selectedCategory?.name || label("Entries", "ទិន្នន័យ") }}

              <span v-if="selectedSubCategoryNames.length">
                / {{ selectedSubCategoryNames.join(", ") }}
              </span>
            </strong>

            <button
              type="button"
              class="toolbar-button danger"
              :disabled="busy"
              @click="resetInvoice"
            >
              <i class="pi pi-trash" />
            </button>
          </div>

          <div class="entry-list">
            <div
              v-for="(item, index) in calculatorData"
              :key="`${index}-${item.raw}`"
              class="entry-row"
            >
              <div class="entry-content">
                <span class="entry-expression">
                  {{ item.raw }}
                </span>

                <span class="entry-colon">:</span>

                <strong class="entry-amount">
                  {{ formatAmount(item.baseValue) }}
                </strong>

                <button
                  type="button"
                  class="entry-delete-button"
                  :disabled="busy"
                  @click="removeEntry(index)"
                >
                  <i class="pi pi-trash" />
                </button>
              </div>
            </div>

            <p
              v-if="!calculatorData.length"
              class="px-3 py-8 text-center text-xs text-slate-400"
            >
              {{
                label("Enter numbers to begin", "សូមបញ្ចូលលេខដើម្បីចាប់ផ្តើម")
              }}
            </p>
          </div>

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
            <div class="mb-3 flex items-center justify-between">
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

            <button
              type="button"
              class="display-field"
              :class="{
                selected: activeInput === 'number',
              }"
              @click="activeInput = 'number'"
            >
              {{ currentNumber || "00" }}
            </button>

            <div class="mt-3 grid grid-cols-3 gap-2">
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

            <div v-if="selectedPrefix === '>'" class="mt-3">
              <label class="input-label">
                {{ label("End Number", "លេខបញ្ចប់") }}
              </label>

              <button
                type="button"
                class="display-field"
                :class="{
                  selected: activeInput === 'end',
                }"
                @click="activeInput = 'end'"
              >
                {{ endNumber || "00" }}
              </button>
            </div>

            <div class="mt-3">
              <label class="input-label">
                {{ label("Amount", "ចំនួន") }}
              </label>

              <button
                type="button"
                class="display-field"
                :class="{
                  selected: activeInput === 'amount',
                }"
                @click="activeInput = 'amount'"
              >
                {{ baseValue || "0" }}
              </button>
            </div>

            <div class="mt-3 rounded-lg bg-slate-50 p-2 text-right">
              <span class="text-sm font-bold text-slate-700">
                {{ rawExpression || "—" }}
                :
                {{ baseValue || "0" }}
              </span>
            </div>
          </div>

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
              @click="backspace"
            >
              <i class="pi pi-delete-left" />
            </button>
          </div>

          <Button
            type="button"
            icon="pi pi-plus"
            :label="label('Add', 'បន្ថែម')"
            class="mt-3 w-full"
            :loading="previewing"
            :disabled="busy"
            @click="addEntry"
          />
        </section>
      </div>

      <!-- GROUPED INVOICE DRAFT -->
      <section
        v-if="invoiceGroups.length"
        class="mt-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
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
                @click="removeMainGroup(main.category)"
              >
                <i class="pi pi-trash" />
              </button>
            </div>
          </div>

          <!-- SELECTION SETS -->
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
              @click="removeSubGroup(main.category, group.subCategories)"
            >
              <i class="pi pi-trash" />
            </button>
          </div>
        </div>
      </section>

      <!-- FINAL SAVE -->
      <section
        class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
      >
        <div>
          <p class="text-[10px] text-slate-400">
            {{ label("Invoice Total", "សរុបវិក្កយបត្រ") }}
          </p>

          <strong class="text-2xl font-black text-slate-900">
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
.header-button {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: #64748b;
}

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

.sub-category-button {
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

.calculator-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.entry-panel,
.control-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: white;
}

.entry-panel {
  display: flex;
  min-height: 440px;
  flex-direction: column;
}

.entry-toolbar {
  display: flex;
  min-height: 52px;
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
  flex: 1;
  padding: 5px 12px;
}

.entry-row {
  border-bottom: 1px solid #f1f5f9;
}

.entry-content {
  display: grid;
  min-height: 33px;
  grid-template-columns: minmax(0, 1fr) auto auto 25px;
  align-items: center;
  gap: 5px;
  padding: 3px 0;
}

.entry-expression {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}

.entry-colon {
  color: #64748b;
  font-size: 11px;
}

.entry-amount {
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
}

.entry-delete-button {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #ef4444;
  font-size: 10px;
}

.entry-footer {
  border-top: 1px solid #e2e8f0;
  padding: 10px 12px;
}

.entry-footer strong {
  font-size: 17px;
  font-weight: 800;
  color: #1e293b;
}

.control-panel {
  padding: 12px;
}

.number-display {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}

.display-field {
  display: block;
  width: 100%;
  min-height: 46px;
  padding: 7px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #f8fafc;
  text-align: right;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}

.display-field.selected {
  border-color: #22c55e;
  background: #f0fdf4;
}

.operator-button {
  min-height: 38px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #334155;
  font-size: 17px;
  font-weight: 800;
}

.operator-button.active {
  border-color: #16a34a;
  background: #f0fdf4;
  color: #15803d;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.keypad-button {
  min-height: 45px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #f8fafc;
  color: #334155;
  font-size: 18px;
  font-weight: 800;
}

.keypad-button:active {
  background: #dcfce7;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 540px) {
  .calculator-layout {
    gap: 7px;
  }

  .entry-panel {
    min-height: 400px;
  }

  .control-panel {
    padding: 8px;
  }

  .entry-list {
    padding: 4px 7px;
  }

  .entry-expression,
  .entry-amount {
    font-size: 10px;
  }

  .entry-content {
    grid-template-columns: minmax(0, 1fr) auto auto 22px;
    gap: 3px;
  }

  .display-field {
    min-height: 40px;
    font-size: 17px;
  }

  .operator-button {
    min-height: 36px;
  }

  .keypad-button {
    min-height: 41px;
    font-size: 16px;
  }
}
</style>
