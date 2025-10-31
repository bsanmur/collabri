import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../features/auth/store/useAuthStore";

const routes = [
  {
    path: "/auth/login",
    name: "Login",
    component: () => import("../features/auth/views/LoginView.vue"),
  },
  {
    path: "/auth/register",
    name: "Register",
    component: () => import("../features/auth/views/RegisterView.vue"),
  },
  {
    path: "/projects",
    component: () => import("../features/projects/views/ProjectLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: ":id?",
        name: "ProjectKanban",
        component: () => import("../features/projects/views/KanbanView.vue"),
      },
      {
        path: ":id/reports",
        name: "ProjectReports",
        component: () => import("../features/projects/views/ReportsView.vue"),
      },
      {
        path: ":id/collaborators",
        name: "ProjectCollaborators",
        component: () =>
          import("../features/projects/views/CollaboratorsView.vue"),
      },
    ],
  },
  { path: "/", redirect: "/projects" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  console.log("Navegando a:", to.name);
  
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    console.log("Redirigiendo a Login");
    
    return next({ name: "Login" });
  }
  // si ya está autenticado y quiere ir a /auth/*, redirigir a /projects
  if ((to.name === 'Login' || to.name === 'Register') && auth.isAuthenticated) {
    console.log("Redirigiendo a /projects");
    return next({ path: '/projects' });
  }
  next();
});

export default router;
