// ===== 黑马记账 · 数据库层（SQLite） =====
// 使用 Electron 内置的 node:sqlite（Node 24 自带），无需任何外部编译
import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// 数据库文件放在系统应用数据目录下（不同电脑位置不同，用户无需关心）
const dataDir = path.join(app.getPath('userData'), 'data')
fs.mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(path.join(dataDir, 'ledger.db'))
db.exec('PRAGMA journal_mode = WAL')

// ===== 表结构 =====
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                          -- 'expense' 支出 | 'income' 收入
    parent_id INTEGER,                           -- NULL = 一级大类；否则为二级小类
    name TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0        -- 1 = 内置分类
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                          -- 'expense' | 'income'
    amount_cents INTEGER NOT NULL,               -- 金额（单位：分），用整数避免小数误差
    category_id INTEGER NOT NULL REFERENCES categories(id),
    date TEXT NOT NULL,                          -- 'YYYY-MM-DD'
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
`)

// ===== 默认分类（首次启动自动写入） =====
const DEFAULT_EXPENSE = {
  餐饮: ['早餐', '午餐', '晚餐', '外卖', '零食饮料', '聚餐请客'],
  交通出行: ['公交地铁', '打车', '共享单车', '火车/飞机', '加油', '停车过路费'],
  居住: ['房租/房贷', '水电燃气', '物业费', '家具家电', '维修保洁'],
  购物消费: ['日用品', '服饰鞋包', '美妆护肤', '电子产品', '母婴用品'],
  娱乐休闲: ['电影演出', '游戏娱乐', '运动健身', '旅行游玩', '宠物'],
  医疗健康: ['门诊挂号', '买药', '体检', '保险', '保健养生'],
  学习教育: ['书籍资料', '课程培训', '文具办公', '考试报名'],
  人情往来: ['红包礼金', '送礼', '孝敬父母', '慈善捐赠'],
  通讯网络: ['话费流量', '宽带'],
  其他: ['会员订阅', '手续费', '税费', '临时杂项']
}
const DEFAULT_INCOME = ['工资', '奖金', '理财收益', '兼职外快', '红包', '其他收入']

function seedCategories() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM categories').get()
  if (c > 0) return
  const insert = db.prepare(
    'INSERT INTO categories (type, parent_id, name, sort, is_default) VALUES (?, ?, ?, ?, 1)'
  )
  db.exec('BEGIN')
  try {
    let sort = 0
    for (const [parent, children] of Object.entries(DEFAULT_EXPENSE)) {
      const { lastInsertRowid } = insert.run('expense', null, parent, sort++)
      children.forEach((name, i) => insert.run('expense', lastInsertRowid, name, i))
    }
    DEFAULT_INCOME.forEach((name, i) => insert.run('income', null, name, i))
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

seedCategories()

// ===== 查询函数 =====
export function getCategories(type) {
  return db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY sort, id').all(type)
}

export function addCategory({ type, parentId, name }) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO categories (type, parent_id, name) VALUES (?, ?, ?)')
    .run(type, parentId ?? null, name)
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(lastInsertRowid)
}

export function addRecord({ type, amountCents, categoryId, date, note }) {
  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO records (type, amount_cents, category_id, date, note) VALUES (?, ?, ?, ?, ?)'
    )
    .run(type, amountCents, categoryId, date, note ?? '')
  return db.prepare('SELECT * FROM records WHERE id = ?').get(lastInsertRowid)
}

export function updateRecord({ id, type, amountCents, categoryId, date, note }) {
  db.prepare(
    'UPDATE records SET type = ?, amount_cents = ?, category_id = ?, date = ?, note = ? WHERE id = ?'
  ).run(type, amountCents, categoryId, date, note ?? '', id)
  return db.prepare('SELECT * FROM records WHERE id = ?').get(id)
}

export function deleteRecord(id) {
  db.prepare('DELETE FROM records WHERE id = ?').run(id)
}

const RECORD_SELECT = `
  SELECT r.id, r.type, r.amount_cents AS amountCents, r.date, r.note,
         r.category_id AS categoryId,
         c.name AS categoryName, p.name AS parentName, c.parent_id AS parentId
  FROM records r
  JOIN categories c ON r.category_id = c.id
  LEFT JOIN categories p ON c.parent_id = p.id
`

export function getRecordsByMonth(month) {
  return db
    .prepare(`${RECORD_SELECT} WHERE substr(r.date, 1, 7) = ? ORDER BY r.date DESC, r.id DESC`)
    .all(month)
}

export function getSummary(month) {
  const rows = db
    .prepare(
      `SELECT type, SUM(amount_cents) AS total FROM records
       WHERE substr(date, 1, 7) = ? GROUP BY type`
    )
    .all(month)
  const sum = rows.reduce((acc, r) => ({ ...acc, [r.type]: r.total }), {})
  return {
    expense: sum.expense ?? 0,
    income: sum.income ?? 0,
    balance: (sum.income ?? 0) - (sum.expense ?? 0)
  }
}

// 分类占比（统计页饼图用）：按一级大类聚合
export function getCategoryStats(month, type) {
  return db
    .prepare(
      `SELECT COALESCE(p.name, c.name) AS name, SUM(r.amount_cents) AS total
       FROM records r
       JOIN categories c ON r.category_id = c.id
       LEFT JOIN categories p ON c.parent_id = p.id
       WHERE substr(r.date, 1, 7) = ? AND r.type = ?
       GROUP BY COALESCE(p.name, c.name) ORDER BY total DESC`
    )
    .all(month, type)
}

// 近 N 个月支出趋势（统计页柱状图用）
export function getTrend(startMonth) {
  return db
    .prepare(
      `SELECT substr(date, 1, 7) AS month, SUM(amount_cents) AS total
       FROM records WHERE type = 'expense' AND substr(date, 1, 7) >= ?
       GROUP BY month ORDER BY month`
    )
    .all(startMonth)
}
