<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";

import Toast from "primevue/toast";
import InputNumber from "primevue/inputnumber";

import api from "../services/api.js";
import LanguageSwitch from "../components/LanguageSwitch.vue";

const router = useRouter();
const toast = useToast();

const { t } = useI18n();

/* =========================================================
   CATEGORY
========================================================= */

const categories = ref([]);
const selectedCategoryId = ref(null);
const loadingCategories = ref(false);

/* =========================================================
   SUB CATEGORY
========================================================= */

const subCategories = ref([]);
const selectedSubCategoryIds = ref([]);
const loadingSubCategories = ref(false);

/* =========================================================
   CALCULATOR
========================================================= */

const startNumber = ref("");
const endNumber = ref("");
const prefix = ref("");

const baseValue = ref(null);

const calculatorData = ref([]);

const adding = ref(false);
const saving = ref(false);
const recalculating = ref(false);

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
      summary: t("calculator.categoryError"),
      detail:
        error.response?.data?.message || t("calculator.categoryLoadFailed"),
      life: 3000,
    });
  } finally {
    loadingCategories.value = false;
  }
};

/* =========================================================
   LOAD SUB CATEGORIES
========================================================= */

const loadSubCategories = async (categoryId) => {
  if (!categoryId) {
    subCategories.value = [];
    selectedSubCategoryIds.value = [];

    return;
  }

  try {
    loadingSubCategories.value = true;

    const response = await api.get("/sub-categories", {
      params: {
        category: categoryId,
      },
    });

    subCategories.value = response.data.data || [];
  } catch (error) {
    console.error("LOAD SUB CATEGORY ERROR:", error);

    subCategories.value = [];

    toast.add({
      severity: "error",
      summary: t("calculator.subCategoryError"),
      detail:
        error.response?.data?.message || t("calculator.subCategoryLoadFailed"),
      life: 3000,
    });
  } finally {
    loadingSubCategories.value = false;
  }
};

/* =========================================================
   SELECTED CATEGORY
========================================================= */

const selectedCategory = computed(() => {
  return categories.value.find(
    (category) => String(category._id) === String(selectedCategoryId.value),
  );
});

/* =========================================================
   CLEAR CURRENT INPUT
========================================================= */

function clearCurrentInput() {
  startNumber.value = "";
  endNumber.value = "";
  prefix.value = "";
  baseValue.value = null;
}

/* =========================================================
   SELECT CATEGORY
========================================================= */

const selectCategory = async (category) => {
  if (String(selectedCategoryId.value) === String(category._id)) {
    return;
  }

  if (calculatorData.value.length) {
    calculatorData.value = [];

    clearCurrentInput();
  }

  selectedCategoryId.value = category._id;

  selectedSubCategoryIds.value = [];

  subCategories.value = [];

  await loadSubCategories(category._id);
};

/* =========================================================
   SELECTED SUB CATEGORIES
========================================================= */

const selectedSubCategories = computed(() => {
  return selectedSubCategoryIds.value
    .map((id) =>
      subCategories.value.find((item) => String(item._id) === String(id)),
    )
    .filter(Boolean)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
});

/* =========================================================
   DIGIT LENGTH
========================================================= */

const activeDigitLength = computed(() => {
  const length = startNumber.value.length;

  if (length === 2) {
    return 2;
  }

  if (length === 3) {
    return 3;
  }

  return null;
});

/* =========================================================
   SUB CATEGORY VALUE
========================================================= */

const getSubCategoryValue = (item, digitLength) => {
  if (!item) {
    return 0;
  }

  if (digitLength === 2) {
    return Number(item.number2Digit || 0);
  }

  if (digitLength === 3) {
    return Number(item.number3Digit || 0);
  }

  return 0;
};

/* =========================================================
   2 DIGIT VALUES
========================================================= */

const selected2DigitNumbers = computed(() => {
  return selectedSubCategories.value.map((item) =>
    getSubCategoryValue(item, 2),
  );
});

/* =========================================================
   3 DIGIT VALUES
========================================================= */

const selected3DigitNumbers = computed(() => {
  return selectedSubCategories.value.map((item) =>
    getSubCategoryValue(item, 3),
  );
});

/* =========================================================
   SUM
========================================================= */

const sumValues = (values) => {
  if (!Array.isArray(values) || !values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + Number(value || 0), 0);
};

/* =========================================================
   2 DIGIT TOTAL
========================================================= */

const selected2DigitTotal = computed(() => {
  return sumValues(selected2DigitNumbers.value);
});

/* =========================================================
   3 DIGIT TOTAL
========================================================= */

const selected3DigitTotal = computed(() => {
  return sumValues(selected3DigitNumbers.value);
});

/* =========================================================
   ACTIVE SUB CATEGORY TOTAL
========================================================= */

const activeSubCategoryTotal = computed(() => {
  if (activeDigitLength.value === 2) {
    return selected2DigitTotal.value;
  }

  if (activeDigitLength.value === 3) {
    return selected3DigitTotal.value;
  }

  return 0;
});

/* =========================================================
   QUICK MATCH
========================================================= */

const quickMatchSubCategories = computed(() => {
  const wantedNames = ["A", "B", "C", "D"];

  return wantedNames
    .map((name) =>
      subCategories.value.find(
        (item) => String(item.name).trim().toUpperCase() === name,
      ),
    )
    .filter(Boolean);
});

/* =========================================================
   QUICK COMBINATIONS
========================================================= */

const quickCombinations = computed(() => {
  const items = quickMatchSubCategories.value;

  if (!items.length) {
    return [];
  }

  const combinations = [];

  const totalMasks = 1 << items.length;

  for (let mask = 1; mask < totalMasks; mask++) {
    const selected = [];

    for (let index = 0; index < items.length; index++) {
      if (mask & (1 << index)) {
        selected.push(items[index]);
      }
    }

    combinations.push({
      label: selected
        .map((item) => String(item.name).trim().toUpperCase())
        .join(""),

      ids: selected.map((item) => String(item._id)),

      count: selected.length,
    });
  }

  return combinations.sort((a, b) => {
    if (a.count !== b.count) {
      return b.count - a.count;
    }

    return a.label.localeCompare(b.label);
  });
});

/* =========================================================
   CURRENT MATCH
========================================================= */

const currentMatchName = computed(() => {
  if (!selectedSubCategories.value.length) {
    return "—";
  }

  return selectedSubCategories.value
    .map((item) => String(item.name).trim().toUpperCase())
    .join("");
});

/* =========================================================
   QUICK ACTIVE
========================================================= */

const isQuickCombinationActive = (combination) => {
  const selected = [...selectedSubCategoryIds.value].map(String).sort();

  const target = [...combination.ids].sort();

  if (selected.length !== target.length) {
    return false;
  }

  return selected.every((id, index) => id === target[index]);
};

/* =========================================================
   APPLY QUICK MATCH
========================================================= */

const applyQuickCombination = async (combination) => {
  selectedSubCategoryIds.value = [...combination.ids];

  if (calculatorData.value.length) {
    await refreshPreview();
  }
};

/* =========================================================
   READY
========================================================= */

const calculatorReady = computed(() => {
  return (
    Boolean(selectedCategoryId.value) && selectedSubCategoryIds.value.length > 0
  );
});

/* =========================================================
   EXPRESSION
========================================================= */

const expression = computed(() => {
  if (!startNumber.value) {
    return "";
  }

  if (!prefix.value) {
    return startNumber.value;
  }

  if (prefix.value === ">") {
    return `${startNumber.value}>${endNumber.value || "..."}`;
  }

  if (prefix.value === "x") {
    return `${startNumber.value}x`;
  }

  if (prefix.value === ":") {
    return `${startNumber.value}:`;
  }

  return startNumber.value;
});

/* =========================================================
   RAW EXPRESSION
========================================================= */

const rawExpression = computed(() => {
  if (prefix.value === ">") {
    return `${startNumber.value}>${endNumber.value}`;
  }

  if (prefix.value === "x") {
    return `${startNumber.value}x`;
  }

  if (prefix.value === ":") {
    return `${startNumber.value}:`;
  }

  return startNumber.value;
});

/* =========================================================
   DISPLAY
========================================================= */

const displayExpression = computed(() => {
  if (expression.value) {
    return expression.value;
  }

  return "0";
});

/* =========================================================
   FORMAT AMOUNT
========================================================= */

const formatAmount = (value) => {
  return new Intl.NumberFormat("en-US", {
    useGrouping: false,

    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
};

/* =========================================================
   TOTAL BASE VALUE
========================================================= */

const currentTotalBaseValue = computed(() => {
  return calculatorData.value.reduce(
    (total, entry) => total + Number(entry.baseValue || 0),
    0,
  );
});

/* =========================================================
   PAYLOAD
========================================================= */

const buildPayload = () => ({
  category: selectedCategoryId.value,

  subCategories: selectedSubCategoryIds.value.map(String),

  calculatorData: calculatorData.value.map((entry) => ({
    raw: String(entry.raw || "").trim(),

    baseValue: Number(entry.baseValue),
  })),
});

/* =========================================================
   SELECTION WARNING
========================================================= */

const showSelectionWarning = () => {
  if (!selectedCategoryId.value) {
    toast.add({
      severity: "warn",

      summary: t("calculator.selectCategory"),

      detail: t("calculator.selectCategoryFirst"),

      life: 1400,
    });

    return;
  }

  if (!selectedSubCategoryIds.value.length) {
    toast.add({
      severity: "warn",

      summary: t("calculator.selectMatch"),

      detail: t("calculator.selectMatchFirst"),

      life: 1400,
    });
  }
};

/* =========================================================
   APPEND DIGITS
========================================================= */

const appendDigits = (digits) => {
  if (!calculatorReady.value) {
    showSelectionWarning();

    return;
  }

  const value = String(digits);

  /* RANGE END */

  if (prefix.value === ">") {
    const remaining = 3 - endNumber.value.length;

    if (remaining <= 0) {
      return;
    }

    endNumber.value += value.slice(0, remaining);

    return;
  }

  /* START NUMBER */

  const remaining = 3 - startNumber.value.length;

  if (remaining <= 0) {
    return;
  }

  startNumber.value += value.slice(0, remaining);
};

/* =========================================================
   SELECT PREFIX
========================================================= */

const selectPrefix = (value) => {
  if (!calculatorReady.value) {
    showSelectionWarning();

    return;
  }

  if (startNumber.value.length !== 2 && startNumber.value.length !== 3) {
    toast.add({
      severity: "warn",

      summary: t("calculator.enterNumber"),

      detail: t("calculator.enterNumberFirst"),

      life: 1400,
    });

    return;
  }

  prefix.value = value;

  if (value !== ">") {
    endNumber.value = "";
  }
};

/* =========================================================
   BACKSPACE
========================================================= */

const backspace = () => {
  if (prefix.value === ">" && endNumber.value) {
    endNumber.value = endNumber.value.slice(0, -1);

    return;
  }

  if (prefix.value) {
    prefix.value = "";

    endNumber.value = "";

    return;
  }

  startNumber.value = startNumber.value.slice(0, -1);
};

/* =========================================================
   RESET ALL
========================================================= */

const resetCalculator = () => {
  calculatorData.value = [];

  clearCurrentInput();
};

/* =========================================================
   VALIDATE
========================================================= */

const validateCurrentEntry = () => {
  if (!calculatorReady.value) {
    return t("calculator.selectCategoryAndMatch");
  }

  if (startNumber.value.length !== 2 && startNumber.value.length !== 3) {
    return t("calculator.numberLengthError");
  }

  if (activeSubCategoryTotal.value <= 0) {
    return t("calculator.invalidSelectedValues");
  }

  if (!prefix.value) {
    return t("calculator.selectOperator");
  }

  if (
    !Number.isFinite(Number(baseValue.value)) ||
    Number(baseValue.value) <= 0
  ) {
    return t("calculator.enterAmount");
  }

  if (prefix.value === ">") {
    if (!endNumber.value) {
      return t("calculator.enterEndingNumber");
    }

    if (startNumber.value.length !== endNumber.value.length) {
      return t("calculator.sameDigitLength");
    }

    if (Number(endNumber.value) < Number(startNumber.value)) {
      return t("calculator.endNumberError");
    }
  }

  return null;
};

/* =========================================================
   REFRESH PREVIEW
========================================================= */

const refreshPreview = async () => {
  if (!calculatorData.value.length || !calculatorReady.value) {
    return;
  }

  try {
    recalculating.value = true;

    const response = await api.post("/number-cal/preview", buildPayload());

    calculatorData.value = response.data.data?.calculatorData || [];
  } catch (error) {
    console.error("REFRESH ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("common.error"),

      detail: error.response?.data?.message || t("calculator.refreshFailed"),

      life: 2200,
    });
  } finally {
    recalculating.value = false;
  }
};

/* =========================================================
   ADD ENTRY
========================================================= */

const addEntry = async () => {
  const validationError = validateCurrentEntry();

  if (validationError) {
    toast.add({
      severity: "warn",

      summary: t("calculator.checkInput"),

      detail: validationError,

      life: 1600,
    });

    return;
  }

  const previous = [...calculatorData.value];

  try {
    adding.value = true;

    calculatorData.value.push({
      raw: rawExpression.value,

      baseValue: Number(baseValue.value),
    });

    const response = await api.post("/number-cal/preview", buildPayload());

    calculatorData.value = response.data.data?.calculatorData || [];

    clearCurrentInput();
  } catch (error) {
    calculatorData.value = previous;

    console.error("ADD ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("calculator.unableToAdd"),

      detail: error.response?.data?.message || t("calculator.addFailed"),

      life: 2200,
    });
  } finally {
    adding.value = false;
  }
};

/* =========================================================
   DELETE ONE ENTRY

   Only removes the selected calculation row.
========================================================= */

const removeEntry = (index) => {
  calculatorData.value.splice(index, 1);
};

/* =========================================================
   SAVE
========================================================= */

const saveCalculation = async () => {
  if (!calculatorData.value.length) {
    toast.add({
      severity: "warn",

      summary: t("calculator.noEntries"),

      detail: t("calculator.addAtLeastOne"),

      life: 1400,
    });

    return;
  }

  try {
    saving.value = true;

    await api.post("/number-cal", buildPayload());

    toast.add({
      severity: "success",

      summary: t("calculator.saved"),

      detail: t("calculator.savedSuccessfully"),

      life: 1400,
    });

    calculatorData.value = [];

    clearCurrentInput();
  } catch (error) {
    console.error("SAVE ERROR:", error);

    toast.add({
      severity: "error",

      summary: t("calculator.saveFailed"),

      detail: error.response?.data?.message || t("calculator.unableToSave"),

      life: 2200,
    });
  } finally {
    saving.value = false;
  }
};

/* =========================================================
   NAVIGATION
========================================================= */

const goBack = () => {
  router.push("/");
};

const goToInvoices = () => {
  router.push("/invoices");
};

/* =========================================================
   INIT
========================================================= */

onMounted(() => {
  loadCategories();
});
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <Toast />

    <!-- ===================================================
         HEADER
    ==================================================== -->

    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex max-w-md items-center justify-between gap-1 px-2 py-2"
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

        <h1
          class="min-w-0 flex-1 truncate text-center text-sm font-bold text-slate-900"
        >
          {{ $t("calculator.title") }}
        </h1>

        <!-- RIGHT -->

        <div class="flex items-center gap-1">
          <LanguageSwitch />

          <button
            type="button"
            class="header-button"
            :title="$t('navigation.invoices')"
            @click="goToInvoices"
          >
            <i class="pi pi-list" />
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-md p-1.5">
      <!-- =================================================
           CATEGORY
      ================================================== -->

      <section class="mb-1.5 rounded-xl border border-slate-200 bg-white p-1.5">
        <div v-if="loadingCategories" class="py-2 text-center">
          <i class="pi pi-spin pi-spinner text-xs text-green-600" />
        </div>

        <div v-else class="no-scroll flex gap-1 overflow-x-auto">
          <button
            v-for="category in categories"
            :key="category._id"
            type="button"
            class="category-button"
            :class="{
              active: String(selectedCategoryId) === String(category._id),
            }"
            @click="selectCategory(category)"
          >
            {{ category.name }}
          </button>
        </div>
      </section>

      <!-- =================================================
           MAIN SCREEN
      ================================================== -->

      <section class="screen-grid mb-1.5">
        <!-- =================================================
             LEFT ENTRY LIST
        ================================================== -->

        <div class="entry-panel">
          <!-- =================================================
               TOOLBAR
          ================================================== -->

          <div class="entry-toolbar">
            <button
              type="button"
              class="tool-button"
              :title="$t('calculator.reset')"
              @click="resetCalculator"
            >
              <i class="pi pi-refresh" />
            </button>

            <!-- CLEAR ALL -->

            <button
              type="button"
              class="tool-button danger"
              :disabled="!calculatorData.length"
              :title="$t('common.delete')"
              @click="resetCalculator"
            >
              <i class="pi pi-trash" />
            </button>
          </div>

          <!-- =================================================
               ENTRY LIST
          ================================================== -->

          <div class="entry-list">
            <!-- EMPTY -->

            <div
              v-if="!calculatorData.length"
              class="flex h-full items-center justify-center"
            >
              <span class="text-[9px] text-slate-300"> — </span>
            </div>

            <!-- =================================================
                 ROW

                 Example:
                 12x      : 10       trash
            ================================================== -->

            <div
              v-for="(item, index) in calculatorData"
              :key="item._id || `${item.raw}-${index}`"
              class="entry-row"
            >
              <div class="entry-content">
                <!-- EXPRESSION -->

                <span class="entry-expression">
                  {{ item.raw }}
                </span>

                <!-- COLON -->

                <span class="entry-colon"> : </span>

                <!-- AMOUNT -->

                <strong class="entry-amount">
                  {{ formatAmount(item.baseValue) }}
                </strong>

                <!-- DELETE ONE -->

                <button
                  type="button"
                  class="entry-delete-button"
                  :title="$t('common.delete')"
                  @click.stop="removeEntry(index)"
                >
                  <i class="pi pi-trash" />
                </button>
              </div>
            </div>
          </div>

          <!-- =================================================
               TOTAL
          ================================================== -->

          <div class="entry-total">
            <strong>
              {{ formatAmount(currentTotalBaseValue) }}
            </strong>

            <span>
              {{ calculatorData.length }}

              {{ $t("calculator.entries") }}
            </span>
          </div>
        </div>

        <!-- =================================================
             RIGHT CONTROL
        ================================================== -->

        <div class="control-panel">
          <!-- CATEGORY / MATCH -->

          <div class="control-top">
            <span class="category-name">
              {{ selectedCategory?.name || "—" }}
            </span>

            <span class="match-name">
              {{ currentMatchName }}
            </span>
          </div>

          <!-- =================================================
               NUMBER DISPLAY
          ================================================== -->

          <div class="number-screen">
            <span class="number-expression">
              {{ displayExpression }}
            </span>
          </div>

          <!-- =================================================
               AMOUNT
          ================================================== -->

          <InputNumber
            v-model="baseValue"
            :disabled="!calculatorReady"
            :min="0.01"
            :use-grouping="false"
            :max-fraction-digits="0"
            placeholder="0"
            class="amount-input w-full"
          />

          <!-- =================================================
               DIGIT TOTALS
          ================================================== -->

          <div class="digit-row">
            <div
              class="digit-item"
              :class="{
                active: activeDigitLength === 2,
              }"
            >
              <span> 2D </span>

              <strong>
                {{ selected2DigitTotal }}
              </strong>
            </div>

            <div
              class="digit-item"
              :class="{
                active: activeDigitLength === 3,
              }"
            >
              <span> 3D </span>

              <strong>
                {{ selected3DigitTotal }}
              </strong>
            </div>
          </div>

          <!-- SELECTED MATCH -->

          <div class="selected-info">
            <span>
              {{ currentMatchName }}
            </span>

            <strong v-if="activeDigitLength">
              {{ activeSubCategoryTotal }}
            </strong>

            <strong v-else> — </strong>
          </div>
        </div>
      </section>

      <!-- =================================================
           ABCD COMBINATIONS
      ================================================== -->

      <section
        v-if="
          selectedCategoryId &&
          !loadingSubCategories &&
          quickCombinations.length
        "
        class="mb-1.5"
      >
        <div class="no-scroll flex gap-1 overflow-x-auto">
          <button
            v-for="combination in quickCombinations"
            :key="combination.label"
            type="button"
            class="quick-button"
            :class="{
              active: isQuickCombinationActive(combination),
            }"
            @click="applyQuickCombination(combination)"
          >
            {{ combination.label }}
          </button>
        </div>
      </section>

      <!-- =================================================
           KEYPAD
      ================================================== -->

      <section
        class="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <div
          class="keypad"
          :class="{
            'pointer-events-none opacity-40': !calculatorReady,
          }"
        >
          <!-- =================================================
               ROW 1
          ================================================== -->

          <button
            type="button"
            class="key function-key"
            @click="clearCurrentInput"
          >
            {{ $t("calculator.clear") }}
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('7')"
          >
            7
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('8')"
          >
            8
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('9')"
          >
            9
          </button>

          <button type="button" class="key icon-key" @click="backspace">
            <i class="pi pi-arrow-left" />
          </button>

          <!-- =================================================
               ROW 2
          ================================================== -->

          <button
            type="button"
            class="key operator-key"
            :class="{
              active: prefix === '>',
            }"
            @click="selectPrefix('>')"
          >
            &gt;
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('4')"
          >
            4
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('5')"
          >
            5
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('6')"
          >
            6
          </button>

          <button
            type="button"
            class="key operator-key"
            :class="{
              active: prefix === 'x',
            }"
            @click="selectPrefix('x')"
          >
            ×
          </button>

          <!-- =================================================
               ROW 3
          ================================================== -->

          <button
            type="button"
            class="key operator-key"
            :class="{
              active: prefix === ':',
            }"
            @click="selectPrefix(':')"
          >
            :
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('1')"
          >
            1
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('2')"
          >
            2
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('3')"
          >
            3
          </button>

          <button
            type="button"
            class="key add-key"
            :disabled="adding || recalculating"
            @click="addEntry"
          >
            <i v-if="adding" class="pi pi-spin pi-spinner" />

            <i v-else class="pi pi-arrow-down" />
          </button>

          <!-- =================================================
               ROW 4
          ================================================== -->

          <button
            type="button"
            class="key function-key"
            @click="resetCalculator"
          >
            {{ $t("calculator.reset") }}
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('0')"
          >
            0
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('00')"
          >
            00
          </button>

          <button
            type="button"
            class="key number-key"
            @click="appendDigits('000')"
          >
            000
          </button>

          <button
            type="button"
            class="key save-key"
            :disabled="saving || !calculatorData.length"
            @click="saveCalculation"
          >
            <i v-if="saving" class="pi pi-spin pi-spinner" />

            <i v-else class="pi pi-save" />
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* ========================================================
   HEADER
======================================================== */

.header-button {
  display: flex;

  width: 32px;
  height: 32px;

  flex-shrink: 0;

  align-items: center;
  justify-content: center;

  border-radius: 8px;

  color: #64748b;
}

/* ========================================================
   SCROLL
======================================================== */

.no-scroll {
  scrollbar-width: none;
}

.no-scroll::-webkit-scrollbar {
  display: none;
}

/* ========================================================
   CATEGORY
======================================================== */

.category-button {
  min-width: 52px;
  min-height: 32px;

  flex-shrink: 0;

  padding: 4px 8px;

  border: 1px solid #e2e8f0;

  border-radius: 8px;

  background: white;

  font-size: 9px;

  font-weight: 700;

  color: #475569;
}

.category-button.active {
  border-color: #16a34a;

  background: #16a34a;

  color: white;
}

/* ========================================================
   MAIN SCREEN
======================================================== */

.screen-grid {
  display: grid;

  grid-template-columns:
    minmax(0, 1.12fr)
    minmax(0, 0.88fr);

  gap: 4px;
}

/* ========================================================
   ENTRY PANEL
======================================================== */

.entry-panel {
  display: flex;

  min-height: 245px;

  overflow: hidden;

  flex-direction: column;

  border: 1px solid #e2e8f0;

  border-radius: 11px;

  background: white;
}

/* ========================================================
   ENTRY TOOLBAR
======================================================== */

.entry-toolbar {
  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 5px 6px;

  border-bottom: 1px solid #e2e8f0;
}

.tool-button {
  display: flex;

  width: 27px;
  height: 27px;

  align-items: center;
  justify-content: center;

  border-radius: 7px;

  font-size: 11px;

  color: #64748b;
}

.tool-button:active:not(:disabled) {
  background: #f1f5f9;
}

.tool-button.danger {
  color: #ef4444;
}

.tool-button:disabled {
  cursor: default;

  opacity: 0.3;
}

/* ========================================================
   ENTRY LIST
======================================================== */

.entry-list {
  flex: 1;

  min-height: 170px;
  max-height: 260px;

  overflow-y: auto;

  padding: 4px 6px;
}

/* ========================================================
   ENTRY ROW

   Layout:
   expression | : | amount | delete
======================================================== */

.entry-row {
  width: 100%;

  border-bottom: 1px solid #f1f5f9;
}

.entry-row:last-child {
  border-bottom: 0;
}

.entry-content {
  display: grid;

  width: 100%;

  grid-template-columns:
    minmax(0, 1fr)
    auto
    auto
    25px;

  align-items: center;

  gap: 4px;

  min-height: 32px;

  padding: 3px 0;
}

/* EXPRESSION */

.entry-expression {
  min-width: 0;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  font-size: 11px;

  font-weight: 700;

  color: #1e293b;
}

/* COLON */

.entry-colon {
  font-size: 10px;

  font-weight: 700;

  color: #64748b;
}

/* AMOUNT */

.entry-amount {
  min-width: 20px;

  text-align: right;

  font-size: 11px;

  font-weight: 800;

  color: #0f172a;
}

/* ========================================================
   DELETE ONE ENTRY
======================================================== */

.entry-delete-button {
  display: flex;

  width: 24px;
  height: 24px;

  align-items: center;
  justify-content: center;

  border-radius: 6px;

  font-size: 10px;

  color: #ef4444;

  transition:
    background-color 0.15s,
    color 0.15s;
}

.entry-delete-button:hover {
  background: #fef2f2;

  color: #dc2626;
}

.entry-delete-button:active {
  background: #fee2e2;
}

/* ========================================================
   ENTRY TOTAL
======================================================== */

.entry-total {
  display: flex;

  min-height: 40px;

  flex-direction: column;

  justify-content: center;

  padding: 5px 7px;

  border-top: 1px solid #e2e8f0;
}

.entry-total strong {
  font-size: 11px;

  color: #334155;
}

.entry-total span {
  margin-top: 1px;

  font-size: 8px;

  color: #94a3b8;
}

/* ========================================================
   CONTROL PANEL
======================================================== */

.control-panel {
  min-width: 0;

  padding: 7px;

  border: 1px solid #bbf7d0;

  border-radius: 11px;

  background: #f0fdf4;
}

/* ========================================================
   CONTROL TOP
======================================================== */

.control-top {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 4px;

  padding-bottom: 5px;

  border-bottom: 1px solid #bbf7d0;
}

.category-name {
  min-width: 0;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  font-size: 8px;

  font-weight: 600;

  color: #64748b;
}

.match-name {
  flex-shrink: 0;

  font-size: 10px;

  font-weight: 800;

  color: #15803d;
}

/* ========================================================
   NUMBER SCREEN
======================================================== */

.number-screen {
  display: flex;

  min-height: 58px;

  align-items: center;

  justify-content: flex-end;

  margin: 6px 0;

  padding: 5px 7px;

  border: 1px solid #dcfce7;

  border-radius: 9px;

  background: white;
}

.number-expression {
  max-width: 100%;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  font-size: 20px;

  line-height: 1;

  font-weight: 800;

  color: #0f172a;
}

/* ========================================================
   AMOUNT INPUT
======================================================== */

.amount-input :deep(input) {
  min-height: 36px;

  width: 100%;

  padding: 5px 7px;

  border-radius: 8px;

  text-align: right;

  font-size: 14px;

  font-weight: 700;
}

/* ========================================================
   DIGIT
======================================================== */

.digit-row {
  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 4px;

  margin-top: 6px;
}

.digit-item {
  display: flex;

  min-height: 36px;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  border: 1px solid #dcfce7;

  border-radius: 7px;

  background: white;
}

.digit-item span {
  font-size: 7px;

  color: #94a3b8;
}

.digit-item strong {
  margin-top: 1px;

  font-size: 10px;

  color: #475569;
}

.digit-item.active {
  border-color: #16a34a;

  background: #dcfce7;
}

.digit-item.active span,
.digit-item.active strong {
  color: #15803d;
}

/* ========================================================
   SELECTED INFO
======================================================== */

.selected-info {
  display: flex;

  min-height: 35px;

  align-items: center;

  justify-content: space-between;

  margin-top: 5px;

  padding: 4px 6px;

  border-radius: 7px;

  background: white;
}

.selected-info span {
  font-size: 9px;

  font-weight: 700;

  color: #15803d;
}

.selected-info strong {
  font-size: 11px;

  color: #15803d;
}

/* ========================================================
   QUICK MATCH
======================================================== */

.quick-button {
  min-width: 47px;
  min-height: 39px;

  flex-shrink: 0;

  padding: 4px 7px;

  border: 1px solid #d1d5db;

  border-radius: 9px;

  background: white;

  font-size: 9px;

  font-weight: 800;

  color: #475569;
}

.quick-button.active {
  border-color: #16a34a;

  background: #16a34a;

  color: white;
}

/* ========================================================
   KEYPAD
======================================================== */

.keypad {
  display: grid;

  grid-template-columns: repeat(5, minmax(0, 1fr));

  gap: 1px;

  background: #e2e8f0;
}

.key {
  display: flex;

  min-height: 53px;

  align-items: center;
  justify-content: center;

  border: 0;

  background: white;

  font-size: 18px;

  font-weight: 700;

  color: #334155;

  touch-action: manipulation;

  user-select: none;
}

.key:active {
  background: #f0fdf4;
}

/* ========================================================
   NUMBER
======================================================== */

.number-key {
  font-size: 18px;
}

/* ========================================================
   FUNCTION
======================================================== */

.function-key {
  padding: 3px;

  font-size: 8px;

  color: #64748b;
}

/* ========================================================
   ICON
======================================================== */

.icon-key {
  font-size: 15px;

  color: #475569;
}

/* ========================================================
   OPERATORS
======================================================== */

.operator-key {
  font-size: 19px;

  color: #15803d;
}

.operator-key.active {
  background: #dcfce7;

  color: #15803d;
}

/* ========================================================
   ADD
======================================================== */

.add-key {
  background: #16a34a;

  font-size: 16px;

  color: white;
}

/* ========================================================
   SAVE
======================================================== */

.save-key {
  background: #15803d;

  font-size: 15px;

  color: white;
}

.add-key:disabled,
.save-key:disabled {
  opacity: 0.4;
}

/* ========================================================
   PHONE
======================================================== */

@media (max-width: 390px) {
  main {
    padding: 4px !important;
  }

  .screen-grid {
    gap: 3px;
  }

  .entry-panel {
    min-height: 225px;
  }

  .entry-list {
    min-height: 150px;

    padding: 3px 5px;
  }

  .entry-content {
    grid-template-columns:
      minmax(0, 1fr)
      auto
      auto
      23px;

    gap: 3px;

    min-height: 30px;
  }

  .entry-expression,
  .entry-amount {
    font-size: 10px;
  }

  .entry-delete-button {
    width: 22px;
    height: 22px;

    font-size: 9px;
  }

  .control-panel {
    padding: 5px;
  }

  .number-screen {
    min-height: 48px;

    margin: 4px 0;
  }

  .number-expression {
    font-size: 17px;
  }

  .amount-input :deep(input) {
    min-height: 32px;

    padding: 4px 5px;

    font-size: 12px;
  }

  .digit-item {
    min-height: 31px;
  }

  .selected-info {
    min-height: 30px;
  }

  .category-button {
    min-width: 48px;

    min-height: 30px;

    padding: 3px 6px;

    font-size: 8px;
  }

  .quick-button {
    min-width: 43px;

    min-height: 35px;

    padding: 3px 5px;

    font-size: 8px;
  }

  .key {
    min-height: 47px;
  }

  .number-key {
    font-size: 16px;
  }

  .operator-key {
    font-size: 17px;
  }
}

/* ========================================================
   VERY SMALL
======================================================== */

@media (max-width: 340px) {
  .entry-panel {
    min-height: 215px;
  }

  .entry-content {
    font-size: 9px;

    grid-template-columns:
      minmax(0, 1fr)
      auto
      auto
      21px;
  }

  .entry-expression,
  .entry-amount {
    font-size: 9px;
  }

  .entry-delete-button {
    width: 20px;
    height: 20px;

    font-size: 8px;
  }

  .control-panel {
    padding: 4px;
  }

  .number-screen {
    min-height: 44px;
  }

  .number-expression {
    font-size: 15px;
  }

  .key {
    min-height: 43px;
  }

  .quick-button {
    min-width: 40px;
  }
}

/* ========================================================
   TABLET
======================================================== */

@media (min-width: 640px) {
  .screen-grid {
    gap: 8px;

    grid-template-columns:
      minmax(0, 1.1fr)
      minmax(0, 0.9fr);
  }

  .entry-panel {
    min-height: 310px;
  }

  .entry-list {
    max-height: 330px;
  }

  .entry-content {
    min-height: 36px;
  }

  .entry-expression,
  .entry-amount {
    font-size: 12px;
  }

  .entry-delete-button {
    width: 26px;
    height: 26px;

    font-size: 11px;
  }

  .control-panel {
    padding: 10px;
  }

  .number-screen {
    min-height: 75px;
  }

  .number-expression {
    font-size: 26px;
  }

  .category-button {
    min-width: 65px;

    min-height: 38px;

    font-size: 11px;
  }

  .quick-button {
    min-width: 58px;

    min-height: 44px;

    font-size: 11px;
  }

  .key {
    min-height: 68px;
  }

  .number-key {
    font-size: 23px;
  }
}
</style>
