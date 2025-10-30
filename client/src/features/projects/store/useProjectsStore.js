import { defineStore } from 'pinia'
import api from '../../../lib/api'
import { toast } from 'vue-sonner'

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    ownedProjects: [],
    sharedProjects: [],
    currentProject: null
  }),
  actions: {
    async fetchProjects() {
      const { data } = await api.get('/projects')
      this.ownedProjects = data.owned || []
      this.sharedProjects = data.shared || []
    },
    selectProject(p) {
      this.currentProject = p
    },
    async createProject(payload) {
      try {
        const { data } = await api.post('/projects', payload)
        this.ownedProjects.push(data)
        toast.success('Proyecto creado')
        return data
      } catch (e) {
        toast.error(e.response?.data?.message || 'Error creando proyecto')
        throw e
      }
    },
    async joinProject(code) {
      try {
        const { data } = await api.post(`/projects/join`, { code })
        this.sharedProjects.push(data)
        toast.success('Entraste al proyecto')
        return data
      } catch (e) {
        toast.error(e.response?.data?.message || 'Error al unirse')
        throw e
      }
    }
  }
})