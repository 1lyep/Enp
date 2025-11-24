<template>
	<div class="game-page" :class="{ 'dark': theme.state.isDark }">
		<!-- 顶部导航 -->
		<header class="header">
			<div class="header-btn close-btn" @click="goBack">
				<text class="icon">✕</text>
			</div>
			
			<div class="timer-pill">
				<text class="timer-icon">⏱️</text>
				<text class="timer-text">{{ formatTime(timer) }}</text>
			</div>
			
			<div class="counter">
				<text class="current">{{ completed.length }}</text>
				<text class="total">/{{ words.chinese.length }}</text>
			</div>
		</header>

		<!-- 进度条 -->
		<div class="progress-container">
			<div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
		</div>

		<!-- 标题 -->
		<div class="game-title">Match the Words</div>

		<!-- 游戏区域 -->
		<main class="game-board">
			<!-- 左侧：中文 -->
			<div class="grid-column">
				<div 
					v-for="(word, index) in shuffledChinese" 
					:key="'left-'+index"
					class="word-card"
					:class="{ 
						'selected': selectedChinese === word,
						'completed': completed.includes(word),
						'correct-match': animating.has(word),
						'mistake': misss.has(word)
					}"
					@click="selectWord(word, 'chinese')"
				>
					<text class="word-text">{{ word }}</text>
				</div>
			</div>
			
			<!-- 右侧：英文 -->
			<div class="grid-column">
				<div 
					v-for="(word, index) in shuffledEnglish" 
					:key="'right-'+index"
					class="word-card"
					:class="{ 
						'selected': selectedEnglish === word,
						'completed': isEnglishCompleted(word),
						'correct-match': animating.has(word),
						'mistake': misss.has(word)
					}"
					@click="selectWord(word, 'english')"
				>
					<text class="word-text">{{ word }}</text>
				</div>
			</div>
		</main>
	</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import theme from '@/utils/theme.js'

// --- 原始逻辑恢复 ---
const words = reactive({
	chinese: [],
	english: []
})
const animating = ref(new Set())
const misss = ref(new Set())

// 选中的词书数据
const selectedWordbook = ref(null)

// 模拟的单词数据库 (实际会从 storage 加载)
const wordDatabase = reactive([])

// 游戏状态
const selectedChinese = ref(null)
const selectedEnglish = ref(null)
const midChinese = ref(null)
const midEnglish = ref(null)
const score = ref(0)
const completed = ref([]) // 存储已完成的中文词
const mistakes = ref(0)
const timer = ref(0)
const isGameStarted = ref(false)
const timerInterval = ref(null)

// 随机打乱单词顺序
const shuffledChinese = ref([])
const shuffledEnglish = ref([])

// 批量替换逻辑
const pendingReplacement = ref([])
const REPLACE_THRESHOLD = 3 

// 计算属性
const isGameCompleted = computed(() => wordDatabase.length === 0 && completed.value.length === words.chinese.length)

const progressPercentage = computed(() => {
	// 简单进度：已完成 / (已完成 + 剩余数据库 + 当前屏幕上未完成)
	return (completed.value.length / (completed.value.length + wordDatabase.length + (words.chinese.length - completed.value.length))) * 100
})

onMounted(() => {
	initGame()
})

onUnmounted(() => {
	if (timerInterval.value) {
		clearInterval(timerInterval.value)
	}
})

function initGame() {
	try {
		const storedWordbook = uni.getStorageSync('selectedWordbook')
		
		if (storedWordbook && storedWordbook.words && storedWordbook.words.length > 0) {
			selectedWordbook.value = storedWordbook
			
			// 清空原有数据库，添加词书中的单词
			wordDatabase.splice(0, wordDatabase.length)
			storedWordbook.words.forEach(word => {
				wordDatabase.push(word)
			})
			
			// 初始化显示 5 个
			const initialBatch = wordDatabase.splice(0, 5)
			
			const chineseWords = initialBatch.map(w => w.chinese)
			const englishWords = initialBatch.map(w => w.english)
			
			words.chinese = chineseWords
			words.english = englishWords
			
			// 更新乱序单词列表
			shuffledChinese.value = shuffle([...words.chinese])
			shuffledEnglish.value = shuffle([...words.english])
			
			startGame()
		}
	} catch (error) {
		console.error('加载词书数据失败:', error)
	}
}

// Fisher-Yates 洗牌算法
function shuffle(arr) {
	let i = arr.length
	while (i) {
		let j = Math.floor(Math.random() * i--)
		;[arr[j], arr[i]] = [arr[i], arr[j]]
	}
	return arr
}

function startGame() {
	score.value = 0
	completed.value = []
	mistakes.value = 0
	timer.value = 0
	isGameStarted.value = true
	
	// 启动计时器
	timerInterval.value = setInterval(() => {
		timer.value++
	}, 1000)
}

function selectWord(word, type) {
	// 如果已完成，不可点击
	if (type === 'chinese' && completed.value.includes(word)) return
	if (type === 'english' && isEnglishCompleted(word)) return

	if (type === 'chinese') {
		selectedChinese.value = selectedChinese.value === word ? null : word
	} else if (type === 'english') {
		selectedEnglish.value = selectedEnglish.value === word ? null : word
	}

	// 检查匹配
	if (selectedChinese.value && selectedEnglish.value) {
		checkMatch()
	}
}

function isEnglishCompleted(engWord) {
	// 找到对应的中文
	const idx = words.english.indexOf(engWord)
	if (idx === -1) return false
	const cnWord = words.chinese[idx]
	return completed.value.includes(cnWord)
}

function checkMatch() {
	const chineseIndex = words.chinese.indexOf(selectedChinese.value)
	const englishIndex = words.english.indexOf(selectedEnglish.value)

	if (chineseIndex === englishIndex && chineseIndex !== -1) {
		// 匹配成功
		score.value += 10
		completed.value.push(selectedChinese.value)
		
		// 加入待替换队列
		pendingReplacement.value.push({
			chinese: selectedChinese.value,
			english: selectedEnglish.value
		})

		// 动画
		const newSet = new Set(animating.value)
		newSet.add(selectedChinese.value)
		newSet.add(selectedEnglish.value)
		animating.value = newSet
		
		midChinese.value = selectedChinese.value
		midEnglish.value = selectedEnglish.value
		selectedChinese.value = null
		selectedEnglish.value = null

		setTimeout(() => {
			const newSet = new Set(animating.value)
			newSet.delete(midChinese.value)
			newSet.delete(midEnglish.value)
			animating.value = newSet

			// 检查替换
			if (pendingReplacement.value.length >= REPLACE_THRESHOLD) {
				replaceBatchOfWords()
			}

			if (isGameCompleted.value) {
				finishGame()
			}

			midChinese.value = null
			midEnglish.value = null
		}, 500)
	} else {
		// 匹配失败
		mistakes.value++
		const newSet = new Set(misss.value)
		newSet.add(selectedChinese.value)
		newSet.add(selectedEnglish.value)
		misss.value = newSet
		
		midChinese.value = selectedChinese.value
		midEnglish.value = selectedEnglish.value
		selectedChinese.value = null
		selectedEnglish.value = null
		
		setTimeout(() => {
			const newSet = new Set(misss.value)
			newSet.delete(midChinese.value)
			newSet.delete(midEnglish.value)
			misss.value = newSet
			midChinese.value = null
			midEnglish.value = null
		}, 300)
	}
}

function replaceBatchOfWords() {
	const wordsToReplace = [...pendingReplacement.value]
	pendingReplacement.value = []

	const newWords = []
	// 从数据库取新词
	for (let i = 0; i < wordsToReplace.length; i++) {
		if (wordDatabase.length > 0) {
			newWords.push(wordDatabase.shift()) // 取出并移除
		}
	}

	if (newWords.length === 0) return

	const oldChineseWordsForCleanup = new Set()

	for (let i = 0; i < wordsToReplace.length && i < newWords.length; i++) {
		const oldPair = wordsToReplace[i]
		const newPair = newWords[i]

		oldChineseWordsForCleanup.add(oldPair.chinese)

		// 替换主数据源
		const masterIndex = words.chinese.indexOf(oldPair.chinese)
		if (masterIndex > -1) {
			words.chinese[masterIndex] = newPair.chinese
			words.english[masterIndex] = newPair.english
		}

		// 替换乱序中文列表
		const shuffledCnIndex = shuffledChinese.value.indexOf(oldPair.chinese)
		if (shuffledCnIndex > -1) {
			shuffledChinese.value[shuffledCnIndex] = newPair.chinese
			
			// 随机交换中文位置
			const randomIdx = Math.floor(Math.random() * shuffledChinese.value.length)
			;[shuffledChinese.value[shuffledCnIndex], shuffledChinese.value[randomIdx]] = 
			[shuffledChinese.value[randomIdx], shuffledChinese.value[shuffledCnIndex]]
		}

		// 替换乱序英文列表
		const shuffledEnIndex = shuffledEnglish.value.indexOf(oldPair.english)
		if (shuffledEnIndex > -1) {
			shuffledEnglish.value[shuffledEnIndex] = newPair.english
			
			// 随机交换英文位置
			const randomIdx = Math.floor(Math.random() * shuffledEnglish.value.length)
			;[shuffledEnglish.value[shuffledEnIndex], shuffledEnglish.value[randomIdx]] = 
			[shuffledEnglish.value[randomIdx], shuffledEnglish.value[shuffledEnIndex]]
		}
	}

	// 从 completed 中移除旧词，这样新词就是"未完成"状态
	completed.value = completed.value.filter(word => !oldChineseWordsForCleanup.has(word))
}

function finishGame() {
	clearInterval(timerInterval.value)
	uni.showModal({
		title: '恭喜完成！',
		content: `用时：${formatTime(timer.value)}\n得分：${score.value}`,
		showCancel: false,
		success: () => goBack()
	})
}

function formatTime(s) {
	const m = Math.floor(s / 60)
	const sc = s % 60
	return `${m}:${sc.toString().padStart(2, '0')}`
}

function goBack() {
	const pages = getCurrentPages()
	if (pages.length > 1) {
		uni.navigateBack()
	} else {
		uni.reLaunch({
			url: '/pages/game/wordsIndex'
		})
	}
}
</script>

<style scoped>
.game-page {
	min-height: 100vh;
	background: #f8f9fa;
	display: flex;
	flex-direction: column;
	padding: 0 20px;
	padding-top: env(safe-area-inset-top);
	transition: background 0.3s;
}

.game-page.dark {
	background: #121212;
}

/* Header */
.header {
	height: 60px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.header-btn {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: #e9ecef;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #495057;
}

.dark .header-btn {
	background: #2d2d2d;
	color: #fff;
}

.timer-pill {
	background: #e9ecef;
	padding: 6px 16px;
	border-radius: 100px;
	display: flex;
	align-items: center;
	gap: 6px;
	color: #495057;
	font-weight: 600;
	font-size: 14px;
}

.dark .timer-pill {
	background: #2d2d2d;
	color: #fff;
}

.counter {
	font-size: 16px;
	font-weight: 700;
	color: #212529;
}

.dark .counter { color: #fff; }

/* Progress */
.progress-container {
	height: 8px;
	background: #e9ecef;
	border-radius: 4px;
	overflow: hidden;
	margin-bottom: 30px;
}

.dark .progress-container { background: #2d2d2d; }

.progress-bar {
	height: 100%;
	background: #2ecc71;
	border-radius: 4px;
	transition: width 0.3s ease;
}

/* Title */
.game-title {
	font-size: 28px;
	font-weight: 800;
	text-align: center;
	color: #212529;
	margin-bottom: 30px;
}

.dark .game-title { color: #fff; }

/* Game Board */
.game-board {
	display: flex;
	gap: 20px;
	flex: 1;
}

.grid-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.word-card {
	height: 60px;
	background: #fff;
	border-radius: 100px; /* Pill shape */
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4px 12px rgba(0,0,0,0.05);
	transition: all 0.2s;
	border: 2px solid transparent;
}

.dark .word-card {
	background: #2d2d2d;
	box-shadow: none;
}

.word-card:active { transform: scale(0.96); }

.word-card.selected {
	background: #4361ee !important;
	border-color: #4361ee;
	box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
	transform: scale(1.05);
}

.word-card.selected .word-text { color: #fff; }

/* 
  Fix for Dark Mode Green Feedback:
  Use :not(.correct-match) to ensure completed style doesn't override animation 
*/
.word-card.completed:not(.correct-match) {
	background-color: #e9ecef !important;
	box-shadow: none;
	opacity: 0.6;
}

.dark .word-card.completed:not(.correct-match) {
	background-color: #333 !important;
}

.word-card.completed .word-text {
	color: #adb5bd;
}

.word-card.correct-match {
	animation: correctMatch 0.3s forwards;
	pointer-events: none;
}

.word-card.mistake {
	animation: mistakeMatch 0.3s forwards;
}

.word-text {
	font-size: 16px;
	font-weight: 600;
	color: #212529;
}

.dark .word-text { color: #fff; }

@keyframes correctMatch {
  0% {
    background-color: #4CAF50;
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    background-color: #45a049;
    transform: scale(1);
  }
}

@keyframes mistakeMatch {
  0% {
    background-color: #f44336;
    transform: translateX(0);
  }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
  100% {
    background-color: #d32f2f;
    transform: translateX(0);
  }
}
</style>
