import { createPinia } from 'pinia'
import { createApp } from 'vue'

// Import Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus) // Use Element Plus

app.mount('#app')