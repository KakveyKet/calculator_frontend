import { createRouter, createWebHistory } from "vue-router";
import { authState } from "../stores/auth.js";
import LoginView from "../views/LoginView.vue";
// import MainView from "../views/MainView.vue";
import ProfileView from "../views/ProfileView.vue";
import ForbiddenView from "../views/ForbiddenView.vue";
import DashboardView from "../views/DashboardView.vue";
import SubCategoryView from "../views/SubCategoryView.vue";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { guestOnly: true },
    },

    {
      path: "/categories",
      name: "categories",
      component: () => import("../views/CategoryView.vue"),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: "/sub-categories",
      name: "sub-categories",
      component: SubCategoryView,

      meta: {
        requiresAuth: true,
      },
    },
    {
      path: "/profile",
      name: "profile",
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: "/403",
      name: "forbidden",
      component: ForbiddenView,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/login",
    },
    {
      path: "/",
      name: "dashboard",
      component: DashboardView,
      meta: {
        requiresAuth: true,
        role: "SUPER_ADMIN",
      },
    },

    {
      path: "/calculator",
      name: "calculator",
      component: () => import("../views/CalculatorView.vue"),
      meta: {
        requiresAuth: true,
      },
    },

    {
      path: "/invoices",
      name: "invoices",
      component: () => import("../views/InvoiceListView.vue"),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: "/users",
      name: "users",
      component: () => import("../views/UsersView.vue"),
    },
  ],
});

router.beforeEach((to) => {
  const user = authState.user;
  const token = authState.token;

  if (to.meta.requiresAuth && (!token || !user)) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && token && user) {
    return user.role === "SUPER_ADMIN" ? { name: "main" } : { name: "profile" };
  }

  if (to.meta.roles?.length && !to.meta.roles.includes(user?.role)) {
    return { name: "forbidden" };
  }

  return true;
});

export default router;
