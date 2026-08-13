<template>
  <el-dialog
    :model-value="visible"
    :title="record ? '编辑账单' : '记一笔'"
    width="480px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
    @open="onOpen"
    @closed="onClosed"
  >
    <!-- 支出 / 收入 -->
    <el-radio-group v-model="form.type" class="type-toggle" @change="onTypeChange">
      <el-radio-button value="expense">支出</el-radio-button>
      <el-radio-button value="income">收入</el-radio-button>
    </el-radio-group>

    <!-- 金额 -->
    <div class="amount-row">
      <span class="label">金额</span>
      <el-input
        v-model="amountText"
        placeholder="0.00"
        class="amount-input"
        maxlength="10"
        @keyup.enter="save"
      >
        <template #prefix>¥</template>
      </el-input>
      <span class="unit">元</span>
    </div>

    <!-- 分类（两级选择） -->
    <div class="cat-row">
      <span class="label">分类</span>
      <div class="cat-body">
        <!-- 支出：一级大类 -->
        <div v-if="isExpense && parents.length" class="cat-line">
          <el-tag
            v-for="p in parents"
            :key="p.id"
            :effect="form.parentId === p.id ? 'dark' : 'plain'"
            class="cat-tag"
            @click="pickParent(p)"
          >
            {{ p.name }}
          </el-tag>
          <el-tag class="cat-tag add-tag" effect="plain" type="info" @click="addSub('parent')">
            + 新建
          </el-tag>
        </div>
        <!-- 二级小类（收入则是一级类） -->
        <div v-if="children.length" class="cat-line">
          <el-tag
            v-for="c in children"
            :key="c.id"
            :effect="form.categoryId === c.id ? 'dark' : 'plain'"
            :type="form.categoryId === c.id ? 'success' : 'info'"
            class="cat-tag"
            @click="form.categoryId = c.id"
          >
            {{ c.name }}
          </el-tag>
          <el-tag class="cat-tag add-tag" effect="plain" type="info" @click="addSub('child')">
            + 新建
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 日期 -->
    <div class="date-row">
      <span class="label">日期</span>
      <el-date-picker
        v-model="form.date"
        type="date"
        :clearable="false"
        value-format="YYYY-MM-DD"
        placeholder="选择日期"
      />
    </div>

    <!-- 备注 -->
    <div class="note-row">
      <span class="label">备注</span>
      <el-input v-model="form.note" placeholder="选填，如：和同事聚餐" maxlength="50" />
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api'
import { todayStr } from '../utils'

const props = defineProps({
  visible: Boolean,
  // 传入 record 表示编辑；null 表示新增
  record: { type: Object, default: null }
})
const emit = defineEmits(['update:visible', 'saved'])

const form = ref({ type: 'expense', date: todayStr(), note: '', parentId: null, categoryId: null })
const amountText = ref('')
const allCats = ref([]) // 当前类型全部分类
const saving = ref(false)

const isExpense = computed(() => form.value.type === 'expense')
const parents = computed(() => allCats.value.filter((c) => c.parent_id === null))
const children = computed(() =>
  isExpense.value
    ? allCats.value.filter((c) => c.parent_id === form.value.parentId)
    : parents.value
)

const TYPE_CN = { expense: '支出', income: '收入' }

async function loadCategories() {
  allCats.value = await api.getCategories(form.value.type)
}

// 打开弹窗
async function onOpen() {
  if (props.record) {
    const r = props.record
    form.value = {
      type: r.type,
      date: r.date,
      note: r.note,
      parentId: r.parentId ?? null,
      categoryId: r.categoryId ?? null
    }
    amountText.value = (r.amountCents / 100).toFixed(2)
  } else {
    form.value = { type: 'expense', date: todayStr(), note: '', parentId: null, categoryId: null }
    amountText.value = ''
  }
  await loadCategories()
}

function onClosed() {
  form.value = { type: 'expense', date: todayStr(), note: '', parentId: null, categoryId: null }
  amountText.value = ''
  allCats.value = []
}

async function onTypeChange() {
  form.value.parentId = null
  form.value.categoryId = null
  await loadCategories()
}

function pickParent(p) {
  form.value.parentId = p.id
  form.value.categoryId = null
}

function currentParentName() {
  return parents.value.find((p) => p.id === form.value.parentId)?.name ?? ''
}

// 新建分类：支出可新建大类或小类；收入只有一级
async function addSub(level) {
  if (isExpense.value && level === 'child' && !form.value.parentId) {
    ElMessage.warning('请先选择所属的一级大类')
    return
  }
  const msg =
    level === 'parent'
      ? '请输入新的一级大类名称（如：美容护理）'
      : `请输入「${currentParentName()}」下的新小类名称（如：咖啡）`
  try {
    const { value } = await ElMessageBox.prompt(msg, '新建分类', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPattern: /^\S{1,10}$/,
      inputErrorMessage: '名称需为 1~10 个字符且不含空格'
    })
    const parentIdVal = isExpense.value && level === 'child' ? form.value.parentId : null
    const created = await api.addCategory({
      type: form.value.type,
      parentId: parentIdVal,
      name: value.trim()
    })
    await loadCategories()
    if (isExpense.value && level === 'parent') {
      pickParent(created) // 新建大类后立即选中，方便继续选小类
    } else {
      form.value.categoryId = created.id
    }
    ElMessage.success('分类已创建')
  } catch {
    /* 用户取消输入 */
  }
}

function validate() {
  if (!/^\d+(\.\d{1,2})?$/.test(amountText.value) || Number(amountText.value) <= 0) {
    ElMessage.warning('请输入正确的金额，最多两位小数')
    return false
  }
  if (!form.value.categoryId) {
    ElMessage.warning('请选择分类')
    return false
  }
  if (!form.value.date) {
    ElMessage.warning('请选择日期')
    return false
  }
  return true
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    const data = {
      type: form.value.type,
      amountCents: Math.round(parseFloat(amountText.value) * 100),
      categoryId: form.value.categoryId,
      date: form.value.date,
      note: form.value.note.trim()
    }
    if (props.record) {
      await api.updateRecord({ ...data, id: props.record.id })
      ElMessage.success('已保存修改')
    } else {
      await api.addRecord(data)
      ElMessage.success(`已记录${TYPE_CN[data.type]} ¥${(data.amountCents / 100).toFixed(2)}`)
    }
    emit('update:visible', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.type-toggle {
  width: 100%;
  margin-bottom: 16px;
  --el-radio-button-checked-bg-color: #67c23a;
  --el-radio-button-checked-border-color: #67c23a;
}
.type-toggle :deep(.el-radio-button__inner) {
  width: 200px;
  font-size: 15px;
}
.amount-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.label {
  width: 52px;
  color: #606266;
  font-size: 14px;
  flex-shrink: 0;
}
.amount-input {
  width: 160px;
}
.amount-input :deep(input) {
  font-size: 18px;
  text-align: right;
}
.unit {
  margin-left: 8px;
  color: #909399;
}
.cat-row {
  display: flex;
  margin-bottom: 16px;
}
.cat-body {
  flex: 1;
}
.cat-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.cat-tag {
  cursor: pointer;
  border-radius: 6px;
  padding: 0 12px;
  height: 28px;
  line-height: 26px;
}
.add-tag {
  border-style: dashed;
}
.date-row,
.note-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
</style>
