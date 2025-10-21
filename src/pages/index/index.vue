<template>
  <view class="content">
    <image class="logo" src="/static/logo.png"></image>
    <view class="text-area">
      <text class="title">欢迎来到英语试炼</text>
    </view>
    <button class="start-btn" @click="startGame">开始</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      title: '欢迎来到单词学习'
    }
  },
  methods: {
    startGame() {
      uni.navigateTo({
        url: '/pages/game/wordsIndex'
      })
    }
  }
}
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.logo {
  height: 200px;
  width: 200px;
  margin-top: 40px;
  margin-bottom: 40px;
}

.text-area {
  margin-bottom: 40px;
}

.title {
  font-size: 24px;
  color: #333;
  font-weight: bold;
}

.start-btn {
  margin-top: 20px;
  background-color: #4CAF50;
  color: white;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 18px;
}
</style>


<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo {
  height: 200rpx;
  width: 200rpx;
  margin-top: 200rpx;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 50rpx;
}

.text-area {
  display: flex;
  justify-content: center;
}

.title {
  font-size: 36rpx;
  color: #8f8f94;
}
</style>
