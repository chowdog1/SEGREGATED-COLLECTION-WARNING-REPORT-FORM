import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import ReportForm from "./views/ReportForm.vue";
import ReportsList from "./views/ReportsList.vue";
import "./style.css";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: ReportForm },
    { path: "/reports", component: ReportsList },
  ],
});

createApp(App).use(router).mount("#app");
