<template>
	<div class="settings-page" :class="{ 'dark': theme.state.isDark }">
		<header class="topbar">
			<div class="back-btn" @click="goBack">
				<text class="back-icon">←</text>
			</div>
			<view class="title">设置</view>
			<div class="placeholder"></div>
		</header>

		<main class="content">
			<div class="section-title">外观</div>
			<div class="setting-item">
				<div class="setting-info">
					<text class="setting-label">深色模式</text>
					<text class="setting-desc">开启护眼深色主题</text>
				</div>
				<switch :checked="theme.state.isDark" @change="toggleTheme" color="#2c3e50" />
			</div>
		</main>
	</div>
</template>

<script setup>
import theme from '@/utils/theme.js'

function goBack() {
	uni.navigateBack()
}

function toggleTheme() {
	theme.toggle()
}
</script>

<style scoped>
.settings-page {
	min-height: 100vh;
	background: #f5f7fa;
	transition: background 0.3s;
}

.settings-page.dark {
	background: #121212;
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
	transition: background 0.3s;
}

.dark .topbar {
	background: #1e1e1e;
	box-shadow: 0 1px 0 rgba(255,255,255,0.05);
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

.dark .back-btn { color: #fff; }

.title {
	font-size: 18px;
	font-weight: 600;
	color: #1a1a1a;
}

.dark .title { color: #fff; }

.placeholder { width: 40px; }

/* 内容 */
.content {
	padding: 24px 20px;
}

.section-title {
	font-size: 14px;
	color: #718096;
	margin-bottom: 12px;
	margin-left: 4px;
}

.dark .section-title { color: #a0aec0; }

.setting-item {
	background: #fff;
	padding: 16px 20px;
	border-radius: 16px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 0 2px 8px rgba(0,0,0,0.02);
	transition: background 0.3s;
}

.dark .setting-item {
	background: #1e1e1e;
}

.setting-info {
	display: flex;
	flex-direction: column;
}

.setting-label {
	font-size: 16px;
	font-weight: 500;
	color: #1a1a1a;
	margin-bottom: 4px;
}

.dark .setting-label { color: #fff; }

.setting-desc {
	font-size: 13px;
	color: #718096;
}

.dark .setting-desc { color: #a0aec0; }
</style>
