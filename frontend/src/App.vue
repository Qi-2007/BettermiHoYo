<script setup lang="ts">
// 这里不再需要引入 HelloWorld 了
</script>

<template>
  <!-- 
    <router-view /> 是 Vue Router 的核心组件。
    它会根据当前浏览器的 URL 地址，
    自动渲染出我们在 router/index.ts 中配置的对应组件。
    例如，URL 是 /login，这里就显示 LoginView.vue。
    URL 是 /，这里就显示 HomeView.vue。
  -->
  <router-view />
</template>

<style>
/* 
  我们可以放一些全局样式在这里。
  比如清除所有元素的默认内外边距，让页面更好看。
*/
body, html {
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>