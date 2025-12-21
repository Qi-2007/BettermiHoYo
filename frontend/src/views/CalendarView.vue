<script setup lang="ts">
import api from '@/services/accountApi'; // 使用统一的 api 服务
import { useAuthStore } from '@/stores/auth';
import { ElMessage } from 'element-plus';
import { Calendar } from 'v-calendar';
import 'v-calendar/dist/style.css';
import { computed, onMounted, ref, watch } from 'vue';

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

// 将 Date 对象格式化为 YYYY-MM
const toYYYYMM = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};


// 获取日历高亮数据
const fetchCalendarData = async (date: Date) => {
  calendarLoading.value = true;
  try {
    const response = await api.getCalendar(toYYYYMM(date));
    attributes.value = response.data.map((item: any) => {
      let color = 'gray';
      if (item.status === 'SUCCESS') color = 'green';
      if (item.status === 'FAILED') color = 'red';
      if (item.status === 'PENDING' || item.status === 'RUNNING') color = 'orange';

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

// 新增：日历日期点击事件处理函数
const onDayClick = (day: any) => {
  // day 对象是 v-calendar 传出的，我们只需要里面的 .date 属性
  selectedDate.value = day.date;
  // 当这行代码执行后，下面的 watch 就会被自动触发
};

// --- Watchers ---
// 当用户切换日历月份时，重新加载高亮数据
watch(() => month.value, (newMonth) => {
  fetchCalendarData(newMonth);
});

// 当用户点击选择新日期时，重新加载表格数据
watch(() => selectedDate.value, (newDate) => {
  if (newDate) {
    fetchTasksForDate(newDate);
  }
}, { immediate: true }); // immediate: true 确保页面首次加载时就执行一次


// 页面首次加载时获取当前月份的数据
onMounted(() => {
  fetchCalendarData(month.value);
});

</script>

<template>
  <el-row :gutter="20">
    <!-- 左侧日历 -->
    <el-col :span="14">
      <el-card>
        <template #header>
          <span>任务完成日历</span>
        </template>
        <div v-loading="calendarLoading">
          <Calendar
            v-model:update-page="month"
            :v-model="selectedDate"
            @dayclick="onDayClick"
            :attributes="attributes"
            :is-expanded="true"
            title-position="left"
            class="custom-calendar"
          />
        </div>
      </el-card>
    </el-col>

    <!-- 右侧详情表格 -->
    <el-col :span="10">
      <el-card>
        <template #header>
          <span>{{ toYYYYMMDD(selectedDate) }} 任务详情</span>
        </template>
        <el-table :data="selectedDayTasks" v-loading="tableLoading" stripe height="500px">
          <el-table-column v-if="isAdmin" prop="owner" label="所属用户" width="100" />
          <el-table-column prop="game_type" label="游戏" width="100" />
          <el-table-column prop="game_username" label="游戏账号" />
          <el-table-column prop="status" label="状态" width="100" />
          <el-table-column prop="log_details" label="日志" />
        </el-table>
      </el-card>
    </el-col>
  </el-row>
</template>

<style>
.calendar-container {
  padding: 10px;
}
.custom-calendar.vc-container {
  border-radius: 0;
  border-width: 0;
  width: 100%;
}
</style>