<template>
	<div class="word-manage">
		<!-- 顶部导航 -->
		<header class="topbar">
			<div class="back-btn" @click="goBack">
				<text class="back-icon">←</text>
			</div>
			<view class="title">单词管理</view>
			<div class="placeholder"></div>
		</header>

		<!-- 单词列表 -->
		<main class="content">
			<!-- 词书标题编辑区 -->
			<div class="book-info-card">
				<div class="info-row">
					<text class="info-label">当前词书</text>
					<text class="info-value">{{ wordbook?.title }}</text>
				</div>
				<div class="info-stats">
					<text>共 {{ words.length }} 个单词</text>
				</div>
			</div>

			<div v-if="words.length > 0" class="word-list">
				<div 
					v-for="(word, index) in words" 
					:key="index"
					class="word-item"
					@click="openEdit(word)"
				>
					<div class="word-content">
						<div class="word-main">{{ word.chinese }}</div>
						<div class="word-sub">{{ word.english }}</div>
					</div>
					<div class="word-actions">
						<div class="action-icon delete" @click.stop="confirmDelete(word)">
							🗑️
						</div>
					</div>
				</div>
			</div>

			<!-- 空状态 -->
			<div v-else class="empty-state">
				<div class="empty-icon">📝</div>
				<text class="empty-text">还没有单词</text>
				<button class="empty-btn" @click="openAdd">添加第一个单词</button>
			</div>
		</main>

		<!-- 悬浮添加按钮 -->
		<button class="fab" @click="openAdd">+</button>

		<!-- 底部弹窗 (新增/编辑) -->
		<div class="bottom-sheet-container" :class="{ 'show': showBottomSheet }" @click="closeBottomSheet">
			<div class="bottom-sheet" @click.stop>
				<div class="sheet-header">
					<text class="sheet-title">{{ formType === 'add' ? '添加单词' : '编辑单词' }}</text>
					<text class="sheet-close" @click="closeBottomSheet">✕</text>
				</div>
				<div class="form-body">
					<div class="form-item">
						<text class="label">中文</text>
						<input class="input" v-model="formData.chinese" placeholder="例如：苹果" />
					</div>
					<div class="form-item">
						<text class="label">英文</text>
						<input class="input" v-model="formData.english" placeholder="例如：apple" />
					</div>
				</div>
				<div class="form-footer">
					<button class="submit-btn" @click="submitForm">保存</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import DB from '@/utils/db.js'

const wordbookId = ref(null)
const wordbook = ref(null)
const words = ref([])

// 弹窗状态
const showBottomSheet = ref(false)
const formType = ref('add') // 'add' | 'edit'
const editingWord = ref(null) // 当前编辑的单词对象（用于查找索引等）

const formData = reactive({
	chinese: '',
	english: ''
})

onLoad((options) => {
	if (options.id) {
		wordbookId.value = Number(options.id)
	}
})

onMounted(async () => {
	await DB.init()
	if (wordbookId.value) {
		loadData()
	}
})

async function loadData() {
	try {
		const book = await DB.getWordBookById(wordbookId.value)
		if (book) {
			wordbook.value = book
			words.value = book.words || []
		}
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '加载失败', icon: 'none' })
	}
}

function goBack() {
	uni.navigateBack()
}

// 打开新增
function openAdd() {
	formType.value = 'add'
	formData.chinese = ''
	formData.english = ''
	showBottomSheet.value = true
}

// 打开编辑
function openEdit(word) {
	formType.value = 'edit'
	editingWord.value = word
	formData.chinese = word.chinese
	formData.english = word.english
	showBottomSheet.value = true
}

function closeBottomSheet() {
	showBottomSheet.value = false
	editingWord.value = null
}

// 提交
async function submitForm() {
	if (!formData.chinese.trim() || !formData.english.trim()) {
		uni.showToast({ title: '请填写完整', icon: 'none' })
		return
	}

	try {
		if (formType.value === 'add') {
			await DB.addWord(wordbookId.value, {
				chinese: formData.chinese,
				english: formData.english
			})
			uni.showToast({ title: '添加成功', icon: 'success' })
		} else {
			// 编辑：需要传入旧单词对象来定位（因为没有单词ID，假设 pair 是唯一的或者通过 index，但在 DB.js 中 updateWord 好像是替换整个数组？
			// 检查 DB.js 实现：updateWord(word) -> 这里的 word 应该是包含 id 的？
			// 不，DB.js 的 updateWord 实现是：updateWord(word) -> 它是更新 wordbook 还是 word?
			// 让我们回顾 DB.js。
			// DB.js 中 addWord 是 push 到 words 数组。
			// DB.js 中 updateWord 是... 好像没有 updateWord for single word?
			// 让我们检查 DB.js。如果 DB.js 没有 updateWord(singleWord)，我们需要实现它或者用 updateWordBook。
			// 假设 DB.js 有 updateWord(word)，但 word 需要 id。
			// 现有的 JSON 结构 word 没有 id。
			// 我们可以先删除旧的，再加新的？或者更新整个 wordbook。
			
			// 简单起见，我们直接更新整个 wordbook 的 words 数组。
			// 找到要修改的词
			const idx = words.value.findIndex(w => w === editingWord.value || (w.chinese === editingWord.value.chinese && w.english === editingWord.value.english))
			if (idx !== -1) {
				words.value[idx] = {
					chinese: formData.chinese,
					english: formData.english
				}
				// 更新整个词书
				const updatedBook = { ...wordbook.value, words: words.value }
				await DB.updateWordBook(updatedBook)
				uni.showToast({ title: '已更新', icon: 'none' })
			}
		}
		
		loadData()
		closeBottomSheet()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '操作失败', icon: 'none' })
	}
}

// 删除
function confirmDelete(word) {
	uni.showModal({
		title: '删除单词',
		content: `确定删除 "${word.chinese}" 吗？`,
		confirmColor: '#ff4d4f',
		success: async (res) => {
			if (res.confirm) {
				try {
					// DB.js 有 deleteWord(bookId, wordId)? 
					// 如果 word 没有 id，DB.js 可能是通过 filter 删除。
					// 让我们假设 DB.js 的 deleteWord 是可用的，或者我们手动更新。
					// 为了稳妥，手动更新 words 数组并保存 wordbook。
					const newWords = words.value.filter(w => w !== word)
					const updatedBook = { ...wordbook.value, words: newWords }
					await DB.updateWordBook(updatedBook)
					
					loadData()
					uni.showToast({ title: '已删除', icon: 'none' })
				} catch (e) {
					uni.showToast({ title: '删除失败', icon: 'none' })
				}
			}
		}
	})
}
</script>

<style scoped>
.word-manage {
	min-height: 100vh;
	background: #f5f7fa;
	padding-bottom: 80px;
}

/* 顶部导航 */
.topbar {
	background: #fff;
	height: 56px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 16px;
	padding-top: env(safe-area-inset-top);
	position: sticky;
	top: 0;
	z-index: 100;
	box-shadow: 0 1px 0 rgba(0,0,0,0.05);
}

.back-btn {
	width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24px;
	color: #333;
}

.title {
	font-size: 18px;
	font-weight: 600;
	color: #1a1a1a;
}

.placeholder { width: 40px; }

/* 内容区 */
.content {
	padding: 20px;
}

.book-info-card {
	background: #fff;
	border-radius: 12px;
	padding: 16px;
	margin-bottom: 20px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.info-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
}

.info-label { font-size: 14px; color: #718096; }
.info-value { font-size: 16px; font-weight: 600; color: #2d3748; }
.info-stats { font-size: 12px; color: #a0aec0; text-align: right; }

/* 单词列表 */
.word-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.word-item {
	background: #fff;
	border-radius: 12px;
	padding: 16px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 0 2px 6px rgba(0,0,0,0.02);
	transition: all 0.2s;
}
.word-item:active { background: #f7fafc; transform: scale(0.99); }

.word-content {
	flex: 1;
}

.word-main {
	font-size: 17px;
	font-weight: 600;
	color: #1a1a1a;
	margin-bottom: 4px;
}

.word-sub {
	font-size: 14px;
	color: #718096;
	font-family: monospace; /* 英文等宽字体更好看 */
}

.word-actions {
	padding-left: 16px;
}

.action-icon {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: #fff0f0;
	font-size: 18px;
}
.action-icon:active { background: #fed7d7; }

/* 空状态 */
.empty-state {
	padding-top: 60px;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
.empty-text { font-size: 15px; color: #718096; margin-bottom: 24px; }
.empty-btn {
	background: #2c3e50;
	color: #fff;
	font-size: 14px;
	padding: 10px 24px;
	border-radius: 100px;
	border: none;
}

/* 悬浮按钮 */
.fab {
	position: fixed;
	right: 20px;
	bottom: calc(20px + env(safe-area-inset-bottom));
	width: 56px;
	height: 56px;
	border-radius: 50%;
	background: #2c3e50;
	color: #fff;
	font-size: 32px;
	line-height: 56px; /* 垂直居中 */
	text-align: center;
	box-shadow: 0 4px 16px rgba(44, 62, 80, 0.3);
	border: none;
	z-index: 90;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}
.fab:active { transform: scale(0.95); }

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
	display: flex;
	flex-direction: column;
}

.bottom-sheet-container.show .bottom-sheet {
	transform: translateY(0);
}

.sheet-header {
	padding: 20px 24px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid #f0f0f0;
}

.sheet-title {
	font-size: 18px;
	font-weight: 600;
	color: #1a1a1a;
}

.sheet-close {
	font-size: 20px;
	color: #a0aec0;
	padding: 4px;
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

.form-footer {
	padding: 16px 24px;
	border-top: 1px solid #f0f0f0;
}

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
.submit-btn:active { opacity: 0.9; }
</style>
