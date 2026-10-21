import { createApp } from "vue";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import InputNumber from "primevue/inputnumber";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n/index.js";

import "primeicons/primeicons.css";
import "./style.css";

const app = createApp(App);

app.use(router);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: ".app-dark",
      cssLayer: false,
    },
  },
});
app.use(i18n);
app.use(ToastService);
app.use(ConfirmationService);

app.component("InputNumber", InputNumber);
app.mount("#app");
