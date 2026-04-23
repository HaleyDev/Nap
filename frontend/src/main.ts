import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { createRouter, createWebHistory } from 'vue-router'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './App.vue'
import './style.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#05070d',
          surface: 'rgba(10,14,24,0.82)',
          primary: '#f6c36a',
          secondary: '#d8a8ff',
          info: '#7fc7ff',
          error: '#fb7185',
          success: '#6ee7b7',
          warning: '#fbbf24',
        },
      },
    },
  },
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./views/WishView.vue'),
    },
    {
      path: '/admin',
      component: () => import('./views/AdminView.vue'),
    },
  ],
})

const app = createApp(App)
app.use(vuetify)
app.use(router)
app.mount('#app')
