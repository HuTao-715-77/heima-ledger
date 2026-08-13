<template>
  <el-container class="app">
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <div class="logo-icon">黑</div>
        <div class="logo-text">黑马记账</div>
      </div>
      <el-menu router :default-active="$route.path" class="menu">
        <el-menu-item index="/">
          <el-icon><Notebook /></el-icon>
          <span>账单</span>
        </el-menu-item>
        <el-menu-item index="/stats">
          <el-icon><TrendCharts /></el-icon>
          <span>统计</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { Notebook, TrendCharts } from '@element-plus/icons-vue'
</script>

<style>
* {
  box-sizing: border-box;
}
html,
body,
#app {
  height: 100%;
  margin: 0;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
  background: #f5f7fa;
}
.app {
  height: 100%;
}
.sidebar {
  background: #fff;
  border-right: 1px solid #e8ecf2;
  display: flex;
  flex-direction: column;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px 16px;
}
.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.menu {
  border-right: none;
}
.main {
  padding: 0;
  overflow-y: auto;
}
</style>
