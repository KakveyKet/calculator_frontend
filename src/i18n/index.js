import { createI18n } from "vue-i18n";

import en from "./locales/en.js";
import km from "./locales/km.js";

/* =========================================================
   LANGUAGE

   Default = Khmer
   If user previously selected a language,
   keep that selection.
========================================================= */

const savedLanguage = localStorage.getItem("language");

const defaultLanguage =
  savedLanguage === "en" || savedLanguage === "km" ? savedLanguage : "km";

/* =========================================================
   I18N
========================================================= */

const i18n = createI18n({
  legacy: false,

  locale: defaultLanguage,

  fallbackLocale: "km",

  messages: {
    en,
    km,
  },
});

export default i18n;
