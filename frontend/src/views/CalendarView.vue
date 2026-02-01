<script setup lang="ts">
import api from '@/services/accountApi'; // 使用统一的 api 服务
import { useAuthStore } from '@/stores/auth';
import { ElMessage } from 'element-plus';
import { Calendar } from 'v-calendar';
import 'v-calendar/dist/style.css';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

const goToAccountDetail = (accountId: number) => {
  // 跳转到我们在 AccountDetailView 定义的路由
  router.push({ name: 'account-detail', params: { id: accountId } });
};
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'admin');

// --- 日历状态 ---
const month = ref(new Date()); // 用于控制日历显示的月份
const attributes = ref<any[]>([]);
const calendarLoading = ref(false);

// --- 详情表格状态 ---
const selectedDate = ref(new Date()); // 用户在日历上点击的日期
const selectedDayTasks = ref<any[]>([]);
const tableLoading = ref(false);

// 将 Date 对象格式化为 YYYY-MM-DD
const toYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// 获取指定日期的任务详情
const fetchTasksForDate = async (date: Date) => {
  tableLoading.value = true;
  try {
    const response = await api.getTasksByDate(toYYYYMMDD(date));
    selectedDayTasks.value = response.data;
  } catch (error) {
    ElMessage.error('加载任务详情失败');
  } finally {
    tableLoading.value = false;
  }
};

// 日历日期点击事件处理函数
const onDayClick = (day: any) => {
  // day 对象是 v-calendar 传出的，我们只需要里面的 .date 属性
  selectedDate.value = day.date;
  // 当这行代码执行后，下面的 watch 就会被自动触发
};

// --- Watchers ---
// 当用户点击选择新日期时，重新加载表格数据
watch(() => selectedDate.value, (newDate) => {
  if (newDate) {
    fetchTasksForDate(newDate);
  }
}, { immediate: true }); // immediate: true 确保页面首次加载时就执行一次

// 当月份变化时，重新加载日历数据
const onPageMove = (pages: any[]) => {
  if (pages && pages.length > 0) {
    // page 对象包含 month 和 year，例如 { month: 11, year: 2023 }
    const page = pages[0];
    // 构造 YYYY-MM 格式字符串
    const monthStr = `${page.year}-${String(page.month).padStart(2, '0')}`;

    // 调用 API
    fetchCalendarData(monthStr);
  }
};

// 获取日历高亮数据
const fetchCalendarData = async (monthStr: string) => {
  calendarLoading.value = true;
  try {
    const response = await api.getCalendar(monthStr);
    attributes.value = response.data.map((item: any) => {
      let color = 'gray';
      if (item.status === 'SUCCESS') color = 'green';
      if (item.status === 'FAILED') color = 'red';
      if (item.status === 'PENDING' || item.status === 'RUNNING') color = 'yellow';

      return {
        key: item.date,
        // 使用 highlight 替代 dot
        highlight: {
          color: color,
          fillMode: 'solid',
        },
        dates: item.date,
        popover: { label: `状态: ${item.status}` },
      };
    });
  } catch (error) {
    ElMessage.error('加载日历数据失败');
  } finally {
    calendarLoading.value = false;
  }
};

// onMounted 时获取当前月份
onMounted(() => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  fetchCalendarData(currentMonthStr);
});

</script>

<template>
  <el-row :gutter="20">
    <!-- 日历区域：手机占满，电脑占左侧 -->
   <el-col :xs="24" :md="14" class="mb-20">
      <el-card class="calendar-card" :body-style="{ padding: '0px' }"> <!-- 直接内联样式去 padding -->
        <template #header><span>任务概览</span></template>
        <Calendar ref="calendarRef" :attributes="attributes" :is-expanded="true" title-position="left"
          class="custom-calendar-width" @dayclick="onDayClick" @did-move="onPageMove" />
      </el-card>
    </el-col>

    <!-- 详情区域：手机占满（在日历下方），电脑占右侧 -->
    <el-col :xs="24" :md="10">
      <el-card>
        <template #header>
          <span>{{ toYYYYMMDD(selectedDate) }} 详情</span>
        </template>

        <!-- PC端视图：表格 -->
        <div class="hidden-xs-only">
          <el-table :data="selectedDayTasks" stripe height="500px">
            <!-- ... 原有的列 ... -->
           <el-table-column label="账号">
              <template #default="{ row }">
                <!-- 变成蓝色链接样式，点击跳转 -->
                <span style="color: #409eff; cursor: pointer; text-decoration: underline;"
                  @click="goToAccountDetail(row.account_id)">
                  {{ row.game_username }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90" />
            <el-table-column prop="log_details" label="日志" />
          </el-table>
        </div>

        <!-- 移动端视图：卡片列表 -->
        <div class="hidden-sm-and-up">
          <div v-if="selectedDayTasks.length === 0" style="text-align: center; color: #999; padding: 20px;">
            本日无任务
          </div>
          <div v-for="(task, index) in selectedDayTasks" :key="index" class="mobile-task-card">
            <div class="mt-header">
              <span class="mt-user" style="color: #409eff;" @click="goToAccountDetail(task.account_id)">
                {{ task.game_username }}
              </span>
              <el-tag size="small" :type="task.status === 'SUCCESS' ? 'success' : 'danger'">{{ task.status }}</el-tag>
            </div>
            <div class="mt-log">{{ task.log_details || '无日志' }}</div>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<style scoped>
.mb-20 {
  margin-bottom: 20px;
}

/* 简单的响应式辅助类 */
@media (max-width: 768px) {
  .hidden-xs-only {
    display: none !important;
  }
}

@media (min-width: 769px) {
  .hidden-sm-and-up {
    display: none !important;
  }
}

.mobile-task-card {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  background: #f9f9f9;
}

.mt-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-weight: bold;
}

.mt-log {
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

.custom-calendar-width {
  width: 100%;
  border: none;
  /* 去掉日历自带边框，融合进卡片 */
}

/* 深度选择器确保日历内部元素也撑开 */
:deep(.vc-container) {
  width: 100%;
}
</style>