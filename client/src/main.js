import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import ReportForm from "./views/ReportForm.vue";
import ReportsList from "./views/ReportsList.vue";
import Dashboard from "./views/Dashboard.vue";
import "./style.css";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: ReportForm },
    { path: "/reports", component: ReportsList },
    { path: "/dashboard", component: Dashboard },
  ],
});

createApp(App).use(router).mount("#app");
