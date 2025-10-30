import { defineStore } from "pinia";
import api from "../../../lib/api";
import { toast } from "vue-sonner";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || null,
    user: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    setToken(t) {
      this.token = t;
      if (t) localStorage.setItem("token", t);
      else localStorage.removeItem("token");
    },
    async login(payload) {
      try {
        const { data } = await api.post("/auth/login", payload);
        this.setToken(data.token);
        this.user = data.user;
        return data;
      } catch (e) {
        toast.error(e.response?.data?.message || "Error en login");
        throw e;
      }
    },
    async register(payload) {
      try {
        const { data } = await api.post("/auth/register", payload);
        this.setToken(data.token);
        this.user = data.user;
        return data;
      } catch (e) {
        toast.error(e.response?.data?.message || "Error en registro");
        throw e;
      }
    },
    logout() {
      this.setToken(null);
      this.user = null;
    },
  },
});
