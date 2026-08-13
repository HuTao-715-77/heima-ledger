<template>
  <div class="home">
    <!-- 顶部：月份切换 + 记一笔 -->
    <div class="top-bar">
      <div class="month-nav">
        <el-button circle text size="large" @click="shift(-1)">‹</el-button>
        <span class="month-label">{{ fmtMonth(month) }}</span>
        <el-button circle text size="large" @click="shift(1)">›</el-button>
        <el-button
          v-if="month !== currentMonth()"
          size="small"
          text
          type="primary"
          @click="month = currentMonth(); refresh()"
        >
          回到本月
        </el-button>
      </div>
      <el-button type="primary" round size="large" :icon="Plus" @click="openAdd">
        记一笔
      </el-button>
    </div>

    <!-- 汇总卡片 -->
    <div class="cards">
      <div class="card card-expense">
        <div class="card-label">本月支出</div>
        <div class="card-value">¥{{ fmtMoney(summary.expense) }}</div>
      </div>
      <div class="card card-income">
        <div class="card-label">本月收入</div>
        <div class="card-value">¥{{ fmtMoney(summary.income) }}</div>
      </div>
      <div class="card card-balance">
        <div class="card-label">本月结余</div>
        <div class="card-value" :class="{ negative: summary.balance < 0 }">
          ¥{{ fmtMoney(summary.balance) }}
        </div>
      </div>
    </div>

    <!-- 账单列表 -->
    <div class="list">
      <el-empty
        v-if="groups.length === 0"
        description="这个月还没有账单，点击右上角「记一笔」开始吧"
        :image-size="140"
      />
      <div v-for="g in groups" :key="g.date" class="day-group">
        <div class="day-header">
          <span class="day-date">{{ fmtDateCN(g.date) }}</span>
          <span class="day-week">{{ weekday(g.date) }}</span>
          <span class="spacer" />
          <span v-if="g.expense > 0" class="day-sum">支出 ¥{{ fmtMoney(g.expense) }}</span>
          <span v-if="g.income > 0" class="day-sum income">收入 ¥{{ fmtMoney(g.income) }}</span>
        </div>
        <div
          v-for="r in g.items"
          :key="r.id"
          class="record"
          @click="openEdit(r)"
        >
          <span class="dot" :style="{ background: catColor(r.parentId ?? r.categoryId) }" />
          <div class="r-main">
            <span class="r-cat">{{ r.parentName ?? r.categoryName }}</span>
            <span v-if="r.parentName" class="r-sub">{{ r.categoryName }}</span>
            <span v-if="r.note" class="r-note">{{ r.note }}</span>
          </div>
          <span class="r-amount" :class="r.type">
            {{ r.type === 'expense' ? '-' : '+' }}¥{{ fmtMoney(r.amountCents) }}
          </span>
          <el-button
            class="r-del"
            text
            size="small"
            :icon="Delete"
            @click.stop="onDelete(r)"
          />
        </div>
      </div>
    </div>

    <!-- 记一笔 / 编辑弹窗 -->
    <RecordDialog v-model:visible="dialogVisible" :record="editing" @saved="refresh" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { api } from '../api'
import RecordDialog from '../components/RecordDialog.vue'
import { fmtMoney, fmtMonth, fmtDateCN, weekday, currentMonth, shiftMonth, catColor } from '../utils'

const month = ref(currentMonth())
const summary = ref({ expense: 0, income: 0, balance: 0 })
const records = ref([])
const dialogVisible = ref(false)
const editing = ref(null)

// 按日期分组，并计算每天支出/收入小计
const groups = computed(() => {
  const map = new Map()
  for (const r of records.value) {
    if (!map.has(r.date)) {
      map.set(r.date, { date: r.date, items: [], expense: 0, income: 0 })
    }
    const g = map.get(r.date)
    g.items.push(r)
    if (r.type === 'expense') g.expense += r.amountCents
    else g.income += r.amountCents
  }
  return [...map.values()]
})

async function refresh() {
  const [s, rs] = await Promise.all([
    api.getSummary(month.value),
    api.getRecordsByMonth(month.value)
  ])
  summary.value = s
  records.value = rs
}

function shift(delta) {
  month.value = shiftMonth(month.value, delta)
}

function openAdd() {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(r) {
  editing.value = r
  dialogVisible.value = true
}

async function onDelete(r) {
  try {
    await ElMessageBox.confirm(
      `确定删除这笔账单吗？\n${r.parentName ?? r.categoryName} ${fmtMoney(r.amountCents)} 元`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return // 用户取消
  }
  await api.deleteRecord(r.id)
  ElMessage.success('已删除')
  refresh()
}

watch(month, refresh)
onMounted(refresh)
</script>

<style scoped>
.home {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px 28px 60px;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.month-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.month-label {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  min-width: 100px;
  text-align: center;
}
.spacer {
  flex: 1;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  border: 1px solid #eef1f6;
}
.card-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.card-value {
  font-size: 26px;
  font-weight: 700;
  color: #f56c6c;
}
.card-income .card-value {
  color: #67c23a;
}
.card-balance .card-value {
  color: #409eff;
}
.card-balance .card-value.negative {
  color: #f56c6c;
}
.list {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #eef1f6;
  padding: 8px 20px 16px;
}
.day-group {
  padding-top: 4px;
}
.day-header {
  display: flex;
  align-items: center;
  padding: 14px 4px 6px;
  font-size: 13px;
  color: #909399;
  border-bottom: 1px solid #f5f7fa;
}
.day-date {
  color: #606266;
  font-weight: 600;
}
.day-week {
  margin-left: 8px;
}
.day-sum {
  margin-left: 14px;
}
.day-sum.income {
  color: #67c23a;
}
.record {
  display: flex;
  align-items: center;
  padding: 11px 6px;
  border-bottom: 1px solid #fafbfd;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}
.record:hover {
  background: #f7f9fc;
}
.record:last-child {
  border-bottom: none;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}
.r-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.r-cat {
  font-size: 15px;
  color: #303133;
}
.r-sub {
  font-size: 12px;
  color: #a8abb2;
}
.r-note {
  font-size: 12px;
  color: #a8abb2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.r-amount {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  font-variant-numeric: tabular-nums;
}
.r-amount.expense {
  color: #303133;
}
.r-amount.income {
  color: #67c23a;
}
.r-del {
  visibility: hidden;
  margin-left: 6px;
}
.record:hover .r-del {
  visibility: visible;
}
</style>
