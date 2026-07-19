import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './services/api'
import { useAuthStore } from './stores/useAuthStore'

const app = createApp(App)
app.use(createPinia())
setUnauthorizedHandler(() => useAuthStore().logout())
app.use(router)
app.mount('#app')
