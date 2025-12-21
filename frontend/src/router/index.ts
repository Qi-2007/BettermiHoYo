import DefaultLayout from '@/layouts/DefaultLayout.vue'; // 引入布局
import { useAuthStore } from '@/stores/auth';
import AccountDetailView from '@/views/AccountDetailView.vue'; // 引入新组件
import AdminDashboardView from '@/views/AdminDashboardView.vue'; // 引入新页面
import CalendarView from '@/views/CalendarView.vue'; // 引入日历视图
import HomeView from '@/views/HomeView.vue';
import LoginView from '@/views/LoginView.vue';
import RegisterView from '@/views/RegisterView.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { guest: true } },
    { path: '/register', name: 'register', component: RegisterView, meta: { guest: true } },
    {
      path: '/',
      component: DefaultLayout, // 使用布局组件
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'home', component: HomeView },
        { path: 'account/:id', name: 'account-detail', component: AccountDetailView }, // 新增路由
        { path: 'calendar', name: 'calendar', component: CalendarView },
        { path: 'admin', name: 'admin', component: AdminDashboardView, meta: { requiresAdmin: true } } // 新增管理员路由
      ]
    }
  ]
});

// 全局路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.user?.role === 'admin';

  // 1. 如果试图访问需要管理员的页面，但不是管理员 -> 跳到首页
  if (to.meta.requiresAdmin && !isAdmin) {
    next({ name: 'home' });
  }
  // 2. 如果试图访问需要登录的页面...
  else if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } 
  // 3. 如果已登录，试图访问登录或注册页...
  else if (to.meta.guest && isAuthenticated) {
    next('/');
  } 
  // 4. 其他情况放行
  else {
    next();
  }
});

export default router;