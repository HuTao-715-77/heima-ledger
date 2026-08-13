// 金额以"分"为单位存库，这里转换为展示用的字符串
export function fmtMoney(cents) {
  return (cents / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 今天的 YYYY-MM-DD
export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

// 当前月的 YYYY-MM
export function currentMonth() {
  return todayStr().slice(0, 7)
}

// 月份加减（'2026-08' ± n 个月）
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// 显示 '2026年8月'
export function fmtMonth(month) {
  const [y, m] = month.split('-')
  return `${y}年${Number(m)}月`
}

// 显示 '2026-08-12'
export function fmtDateCN(date) {
  const [y, m, d] = date.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

// 星期几
export function weekday(date) {
  return '星期' + '日一二三四五六'[new Date(date + 'T00:00:00').getDay()]
}

// 分类配色（按分类 id 取色，同一大类下的记录颜色一致）
const CAT_COLORS = [
  '#5A8DEE', '#7AC96F', '#F5B942', '#EF7B7B', '#9B7EDE',
  '#4DBFC0', '#E88FB0', '#8BA88B', '#F2A166', '#67A3A3'
]
export function catColor(id) {
  return CAT_COLORS[((id ?? 0) % CAT_COLORS.length + CAT_COLORS.length) % CAT_COLORS.length]
}
