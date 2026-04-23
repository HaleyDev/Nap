import { createRouter, createWebHistory } from 'vue-router'
import WishView from '@/views/WishView.vue'
import AdminView from '@/views/AdminView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: WishView },
    { path: '/admin', component: AdminView },
  ],
})

export default router
