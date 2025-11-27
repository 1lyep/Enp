<template>
	<div class="words-index" :class="{ 'dark': theme.state.isDark }">
		<!-- 顶部导航 -->
		<header class="topbar">
			<view class="left-actions">
				<view class="action-btn" @click="goBack">
					<text class="icon">←</text>
				</view>
			</view>
			<view class="title">选择词书</view>
			<view class="right-actions">
				<view class="action-btn" @click="openAddModal">
					<text class="plus-icon">+</text>
				</view>
			</view>
		</header>

		<main class="content">
			<div v-if="wordbooks.length > 0" class="cards">
				<div 
					v-for="wordbook in wordbooks" 
					:key="wordbook.id"
					class="card"
					@click="onCardClick(wordbook)"
					@longpress="openMenu(wordbook)"
				>
					<div class="card-left">
						<div class="card-icon">{{ wordbook.icon || '📖' }}</div>
						<div class="card-info">
							<div class="card-title">{{ wordbook.title }}</div>
							<div class="card-meta">
								<text class="count">共 {{ wordbook.wordCount || 0 }} 词</text>
							</div>
						</div>
					</div>
					
					<div class="card-right">
						<div class="action-pill" @click.stop="selectWordbook(wordbook)">
							<text class="action-text">选择</text>
						</div>
					</div>
				</div>
			</div>
			
			<!-- 空状态 -->
			<div v-else class="empty-state">
				<div class="empty-icon">📚</div>
				<text class="empty-title">还没有词书</text>
				<text class="empty-desc">创建一个词书开始你的学习之旅吧</text>
				<button class="empty-btn" @click="openAddModal">创建第一个词书</button>
			</div>
		</main>

		<!-- 底部弹窗容器 (ActionSheet & Form) -->
		<div class="bottom-sheet-container" :class="{ 'show': showBottomSheet }" @click="closeBottomSheet">
			<div class="bottom-sheet" @click.stop>
				<!-- 1. 菜单模式 -->
				<div v-if="sheetMode === 'menu'" class="sheet-menu">
					<div class="sheet-header">
						<text class="sheet-title">{{ activeWordbook?.title }}</text>
					</div>
					<div class="menu-list">
						<div class="menu-item" @click="onMenuAction('play')">
							<text class="menu-icon">🎮</text>
							<text class="menu-text">开始练习</text>
						</div>
						<div class="menu-item" @click="onMenuAction('manage')">
							<text class="menu-icon">📝</text>
							<text class="menu-text">管理单词</text>
						</div>
						<div class="menu-item" @click="onMenuAction('edit')">
							<text class="menu-icon">✏️</text>
							<text class="menu-text">修改信息</text>
						</div>
						<div class="menu-item delete" @click="onMenuAction('delete')">
							<text class="menu-icon">🗑️</text>
							<text class="menu-text">删除词书</text>
						</div>
					</div>
					<div class="sheet-cancel" @click="closeBottomSheet">取消</div>
				</div>

				<!-- 2. 表单模式 (新增/编辑) -->
				<div v-if="sheetMode === 'form'" class="sheet-form">
					<div class="sheet-header">
						<text class="sheet-title">{{ formType === 'add' ? '新建词书' : '编辑词书' }}</text>
						<text class="sheet-close" @click="closeBottomSheet">✕</text>
					</div>
					<div class="form-body">
						<div class="form-item">
							<text class="label">名称</text>
							<input class="input" v-model="formData.title" placeholder="给词书起个名字" />
						</div>
						<div class="form-item">
							<text class="label">描述</text>
							<input class="input" v-model="formData.description" placeholder="简单描述一下 (可选)" />
						</div>
						<div class="form-item">
							<text class="label">难度</text>
							<div class="difficulty-options">
								<div 
									v-for="diff in difficultyOptions" 
									:key="diff.value"
									class="diff-chip"
									:class="{ active: formData.difficulty === diff.value }"
									@click="formData.difficulty = diff.value"
								>
									{{ diff.label }}
								</div>
							</div>
						</div>
					</div>
					<div class="form-footer">
						<button class="submit-btn" @click="submitForm">保存</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import DB from '@/utils/db.js'
import theme from '@/utils/theme.js'

// --- 数据 ---
const wordbooks = ref([])

// 底部弹窗状态
const showBottomSheet = ref(false)
const sheetMode = ref('menu') // 'menu' | 'form'
const formType = ref('add') // 'add' | 'edit'
const activeWordbook = ref(null) // 当前操作的词书对象

// 表单数据
const formData = reactive({
	title: '',
	description: '',
	difficulty: 'easy'
})

const difficultyOptions = [
	{ label: '简单', value: 'easy' },
	{ label: '中等', value: 'medium' },
	{ label: '困难', value: 'hard' }
]

// --- 生命周期 ---
onMounted(async () => {
	await DB.init()
	loadWordbooks()
})

onShow(() => {
	loadWordbooks()
})

// --- 方法 ---

async function loadWordbooks() {
	try {
		const books = await DB.getWordBooks()
		wordbooks.value = books
	} catch (error) {
		console.error('加载失败', error)
	}
}

function getDifficultyText(val) {
	const map = { easy: '简单', medium: '中等', hard: '困难' }
	return map[val] || '简单'
}

// 点击卡片 -> 打开菜单 (或者根据需求)
// 设计图上有"选择"按钮，点击按钮进入游戏。点击卡片本身可以进入管理或详情？
// 这里设定：点击卡片 -> 打开菜单
function onCardClick(book) {
	// openMenu(book)
	// 或者什么都不做，只响应按钮？
	// 为了方便，点击卡片也进入游戏吧，或者打开菜单
	// 按照设计，右侧有按钮，通常意味着左侧点击是详情或无操作
	// 让我们让点击卡片打开菜单，点击按钮选择
	openMenu(book)
}

// 打开菜单
function openMenu(book) {
	activeWordbook.value = book
	sheetMode.value = 'menu'
	showBottomSheet.value = true
}

// 菜单操作
function onMenuAction(action) {
	if (!activeWordbook.value) return

	switch (action) {
		case 'play':
			selectWordbook(activeWordbook.value)
			closeBottomSheet()
			break
		case 'manage':
			uni.navigateTo({
				url: `/pages/game/wordManage?id=${activeWordbook.value.id}`
			})
			closeBottomSheet()
			break
		case 'edit':
			openEditForm(activeWordbook.value)
			break
		case 'delete':
			confirmDelete(activeWordbook.value)
			break
	}
}

// 打开新增表单
function openAddModal() {
	activeWordbook.value = null
	formType.value = 'add'
	sheetMode.value = 'form'
	
	// 重置表单
	formData.title = ''
	formData.description = ''
	formData.difficulty = 'easy'
	
	showBottomSheet.value = true
}

// 打开编辑表单
function openEditForm(book) {
	formType.value = 'edit'
	sheetMode.value = 'form'
	
	// 填充表单
	formData.title = book.title
	formData.description = book.description
	formData.difficulty = book.difficulty
}

// 提交表单
async function submitForm() {
	if (!formData.title.trim()) {
		uni.showToast({ title: '请输入名称', icon: 'none' })
		return
	}

	try {
		if (formType.value === 'add') {
			const newBook = {
				title: formData.title,
				description: formData.description || '自定义词书',
				icon: '📖',
				difficulty: formData.difficulty,
			}
			await DB.addWordBook(newBook)
			uni.showToast({ title: '创建成功', icon: 'success' })
		} else {
			// 编辑
			const updatedBook = {
				...activeWordbook.value,
				title: formData.title,
				description: formData.description,
				difficulty: formData.difficulty
			}
			await DB.updateWordBook(updatedBook)
			uni.showToast({ title: '已更新', icon: 'none' })
		}
		
		loadWordbooks()
		closeBottomSheet()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '操作失败', icon: 'none' })
	}
}

// 删除确认
function confirmDelete(book) {
	uni.showModal({
		title: '确认删除',
		content: `确定要删除词书 "${book.title}" 及其所有单词吗？`,
		confirmColor: '#ff4d4f',
		success: async (res) => {
			if (res.confirm) {
				try {
					await DB.deleteWordBook(book.id)
					loadWordbooks()
					closeBottomSheet()
					uni.showToast({ title: '已删除', icon: 'none' })
				} catch (e) {
					uni.showToast({ title: '删除失败', icon: 'none' })
				}
			}
		}
	})
}

// 关闭弹窗
function closeBottomSheet() {
	showBottomSheet.value = false
}

// 返回
function goBack() {
	// 如果有上一页则返回，否则去设置页或者退出？
	// 截图显示是返回箭头，通常是返回上一级
	// 如果这是首页，可能需要特殊处理
	const pages = getCurrentPages()
	if (pages.length > 1) {
		uni.navigateBack()
	} else {
		// 如果是首页，点击返回可能是去设置？或者什么都不做
		// 为了方便，这里去设置页，模拟"更多"
		uni.navigateTo({
			url: '/pages/settings/settings'
		})
	}
}

// 进入游戏逻辑
async function selectWordbook(wordbook) {
	try {
		const fullBook = await DB.getWordBookById(wordbook.id)
		if (!fullBook) {
			uni.showToast({ title: '词书不存在', icon: 'none' })
			return
		}
		uni.setStorageSync('selectedWordbook', fullBook)
		uni.navigateTo({
			url: '/pages/game/game',
			fail: () => uni.showToast({ title: '跳转失败', icon: 'none' })
		})
	} catch (error) {
		uni.showToast({ title: '进入失败', icon: 'none' })
	}
}
</script>

<style scoped>
.words-index {
	min-height: 100vh;
	background: #f0f2f5; /* Light gray bg */
	padding-bottom: 40px;
	transition: background 0.3s;
}

.words-index.dark {
	background: #121212;
}

/* 顶部导航 */
.topbar {
	background: transparent;
	height: 60px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20px;
	padding-top: env(safe-area-inset-top);
	position: sticky;
	top: 0;
	z-index: 100;
}

.title {
	font-size: 18px;
	font-weight: 700;
	color: #1a1a1a;
}

.dark .title { color: #fff; }

.action-btn {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	transition: all 0.2s;
}

.dark .action-btn {
	background: #2d2d2d;
	color: #fff;
}

.action-btn:active { transform: scale(0.95); }
.plus-icon { font-size: 24px; font-weight: 300; }
.icon { font-size: 20px; }

/* 内容区 */
.content {
	padding: 20px;
}

/* 卡片列表 */
.cards {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.card {
	background: #fff;
	border-radius: 100px; /* Pill shape */
	padding: 10px 20px; /* Adjust padding */
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 0 4px 12px rgba(0,0,0,0.03);
	transition: all 0.2s;
	height: 80px; /* Fixed height for consistency */
	box-sizing: border-box;
}

.dark .card {
	background: #2d2d2d;
	box-shadow: none;
}

.card:active { transform: scale(0.98); }

.card-left {
	display: flex;
	align-items: center;
	gap: 16px;
	flex: 1;
	overflow: hidden;
}

.card-icon {
	width: 48px;
	height: 48px;
	background: #eef2f7;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24px;
	flex-shrink: 0;
}

.dark .card-icon {
	background: #3d3d3d;
}

.card-info {
	display: flex;
	flex-direction: column;
	justify-content: center;
	overflow: hidden;
}

.card-title {
	font-size: 16px;
	font-weight: 700;
	color: #1a1a1a;
	margin-bottom: 4px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dark .card-title { color: #fff; }

.count {
	font-size: 12px;
	color: #8c9ba5;
}

.dark .count { color: #a0aec0; }

.card-right {
	margin-left: 12px;
	flex-shrink: 0;
}

.action-pill {
	background: #34495e;
	padding: 8px 20px;
	border-radius: 100px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.dark .action-pill {
	background: #4a5568;
}

.action-text {
	color: #fff;
	font-size: 14px;
	font-weight: 600;
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding-top: 100px;
}
.empty-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.5; }
.empty-title { font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 8px; }
.empty-desc { font-size: 14px; color: #718096; margin-bottom: 32px; }
.empty-btn {
	background: #2c3e50;
	color: #fff;
	font-size: 15px;
	padding: 12px 32px;
	border-radius: 100px;
	border: none;
	box-shadow: 0 4px 12px rgba(44, 62, 80, 0.3);
}

/* 底部弹窗 */
.bottom-sheet-container {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0,0,0,0.4);
	z-index: 999;
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.25s ease;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
}

.bottom-sheet-container.show {
	opacity: 1;
	pointer-events: auto;
}

.bottom-sheet {
	background: #fff;
	border-radius: 24px 24px 0 0;
	padding-bottom: env(safe-area-inset-bottom);
	transform: translateY(100%);
	transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
	max-height: 85vh;
	display: flex;
	flex-direction: column;
}

.dark .bottom-sheet {
	background: #1e1e1e;
}

.bottom-sheet-container.show .bottom-sheet {
	transform: translateY(0);
}

/* 菜单模式样式 */
.sheet-menu {
	padding: 10px 0;
}

.sheet-header {
	padding: 20px 24px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid #f0f0f0;
}

.dark .sheet-header { border-bottom-color: #333; }

.sheet-title {
	font-size: 18px;
	font-weight: 600;
	color: #1a1a1a;
}

.dark .sheet-title { color: #fff; }

.sheet-close {
	font-size: 20px;
	color: #a0aec0;
	padding: 4px;
}

.menu-list {
	padding: 8px 16px;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 16px;
	border-radius: 12px;
	transition: background 0.2s;
}
.menu-item:active { background: #f7fafc; }
.dark .menu-item:active { background: #333; }

.menu-icon { font-size: 20px; margin-right: 16px; width: 24px; text-align: center; }
.menu-text { font-size: 16px; color: #2d3748; font-weight: 500; }
.dark .menu-text { color: #fff; }

.menu-item.delete .menu-text { color: #e53e3e; }

.sheet-cancel {
	text-align: center;
	padding: 16px;
	color: #718096;
	font-size: 15px;
	border-top: 8px solid #f7fafc;
}
.dark .sheet-cancel { border-top-color: #333; color: #a0aec0; }

/* 表单模式样式 */
.sheet-form {
	display: flex;
	flex-direction: column;
}

.form-body {
	padding: 24px;
}

.form-item {
	margin-bottom: 24px;
}

.label {
	display: block;
	font-size: 14px;
	color: #4a5568;
	margin-bottom: 8px;
	font-weight: 500;
}
.dark .label { color: #a0aec0; }

.input {
	width: 100%;
	height: 48px;
	background: #f7fafc;
	border-radius: 12px;
	padding: 0 16px;
	font-size: 16px;
	color: #1a1a1a;
	box-sizing: border-box;
}
.dark .input { background: #333; color: #fff; }

.difficulty-options {
	display: flex;
	gap: 12px;
}

.diff-chip {
	padding: 8px 16px;
	background: #f7fafc;
	border-radius: 100px;
	font-size: 14px;
	color: #718096;
	transition: all 0.2s;
	border: 1px solid transparent;
}
.dark .diff-chip { background: #333; color: #a0aec0; }

.diff-chip.active {
	background: #ebf8ff;
	color: #3182ce;
	border-color: #bee3f8;
	font-weight: 600;
}
.dark .diff-chip.active { background: #2c5282; color: #fff; border-color: #2b6cb0; }

.form-footer {
	padding: 16px 24px;
	border-top: 1px solid #f0f0f0;
}
.dark .form-footer { border-top-color: #333; }

.submit-btn {
	width: 100%;
	height: 48px;
	background: #2c3e50;
	color: #fff;
	border-radius: 12px;
	font-size: 16px;
	font-weight: 600;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
}
.dark .submit-btn { background: #4a5568; }
.submit-btn:active { opacity: 0.9; }
</style>