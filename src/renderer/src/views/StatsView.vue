<template>
  <div class="stats">
    <div class="top-bar">
      <span class="title">统计报表</span>
      <el-date-picker
        v-model="month"
        type="month"
        :clearable="false"
        value-format="YYYY-MM"
        @change="refresh"
      />
    </div>

    <!-- 汇总卡片 -->
    <div class="cards">
      <div class="card">
        <div class="card-label">当月支出</div>
        <div class="card-value expense">¥{{ fmtMoney(summary.expense) }}</div>
      </div>
      <div class="card">
        <div class="card-label">当月收入</div>
        <div class="card-value income">¥{{ fmtMoney(summary.income) }}</div>
      </div>
      <div class="card">
        <div class="card-label">当月结余</div>
        <div class="card-value" :class="{ negative: summary.balance < 0 }">
          ¥{{ fmtMoney(summary.balance) }}
        </div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="charts">
      <div class="chart-card">
        <div class="chart-title">当月支出分类占比</div>
        <div ref="pieRef" class="chart"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">近 6 个月支出趋势</div>
        <div ref="barRef" class="chart"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { api } from '../api'
import { fmtMoney, currentMonth, shiftMonth, catColor } from '../utils'

const month = ref(currentMonth())
const summary = ref({ expense: 0, income: 0, balance: 0 })
const pieRef = ref(null)
const barRef = ref(null)
let pieChart = null
let barChart = null

function initCharts() {
  pieChart = echarts.init(pieRef.value)
  barChart = echarts.init(barRef.value)
  window.addEventListener('resize', onResize)
}

function onResize() {
  pieChart?.resize()
  barChart?.resize()
}

async function refresh() {
  const [s, stats, trend] = await Promise.all([
    api.getSummary(month.value),
    api.getCategoryStats(month.value, 'expense'),
    api.getTrend(shiftMonth(month.value, -5))
  ])
  summary.value = s

  // 饼图：支出分类占比
  const pieTotal = stats.reduce((a, b) => a + b.total, 0)
  const pct = (v) => (pieTotal > 0 ? ((v / pieTotal) * 100).toFixed(1) : '0')
  pieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.name}：¥${fmtMoney(p.value)}（${pct(p.value)}%）`
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { fontSize: 12 },
      itemWidth: 12,
      itemHeight: 12
    },
    color: stats.map((_, i) => catColor(i + 1)),
    series: [
      {
        name: '支出占比',
        type: 'pie',
        radius: ['38%', '58%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: stats.map((d) => ({ name: d.name, value: d.total })),
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 600,
            formatter: (p) => `${p.name}\n¥${fmtMoney(p.value)}`
          }
        }
      }
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '37%',
        style: {
          text: pieTotal === 0 ? '' : '支出总额',
          fill: '#909399',
          fontSize: 12,
          textAlign: 'center'
        }
      },
      {
        type: 'text',
        left: 'center',
        top: '45%',
        style: {
          text: pieTotal === 0 ? '暂无数据' : `¥${fmtMoney(pieTotal)}`,
          fill: '#303133',
          fontSize: 16,
          fontWeight: 700,
          textAlign: 'center'
        }
      }
    ]
  })

  // 柱状图：近 6 个月支出趋势（无数据的月份补 0）
  const months = []
  for (let i = 5; i >= 0; i--) {
    months.push(shiftMonth(month.value, -i))
  }
  const trendMap = new Map(trend.map((t) => [t.month, t.total]))
  barChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (ps) => `${ps[0].axisValue} 支出<br/>¥${fmtMoney(ps[0].value ?? 0)}`
    },
    grid: { left: 60, right: 16, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: months.map((m) => `${Number(m.split('-')[1])}月`),
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { color: '#909399' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#909399', formatter: (v) => `¥${(v / 100).toFixed(0)}` },
      splitLine: { lineStyle: { color: '#f0f2f5' } }
    },
    series: [
      {
        name: '支出',
        type: 'bar',
        data: months.map((m) => trendMap.get(m) ?? 0),
        barWidth: 32,
        itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] }
      }
    ]
  })
}

onMounted(() => {
  initCharts()
  refresh()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  pieChart?.dispose()
  barChart?.dispose()
})
</script>

<style scoped>
.stats {
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
.title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
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
  font-size: 24px;
  font-weight: 700;
  color: #409eff;
}
.card-value.expense {
  color: #f56c6c;
}
.card-value.income {
  color: #67c23a;
}
.card-value.negative {
  color: #f56c6c;
}
.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.chart-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #eef1f6;
  padding: 16px;
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}
.chart {
  width: 100%;
  height: 320px;
}
</style>
