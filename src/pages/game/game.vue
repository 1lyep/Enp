<template>
  <view class="container">
    <text class="title">加油！</text>
    
    <template v-if="!isGameStarted">
      <view class="start-screen">
        <text class="subtitle">{{ selectedWordbook ? selectedWordbook.title : '英语试炼' }}</text>
        <text class="wordbook-desc" v-if="selectedWordbook">{{ selectedWordbook.description }}</text>
        <button class="start-btn" @click="startGame">准备开始</button>
        <button class="back-btn" @click="goBack">选择其他词书</button>
      </view>
    </template>
    
    <template v-else>
      <view class="game-info">
        <view class="info-item">
          <text>得分: {{ score }}</text>
        </view>
        <view class="info-item">
          <text>用时: {{ formatTime(timer) }}</text>
        </view>
        <view class="info-item">
          <text>失误: {{ mistakes }}</text>
        </view>
      </view>
      
      <view class="game-container">
        <view class="word-column">
          <view
            v-for="word in words.chinese"
            :key="word"
            :data-word="word"
            :class="[
              'word-btn',
                { 
                  'selected': selectedChinese === word,
                  'completed': completed.includes(word),
                  'disabled': completed.includes(word),
                  'correct-match': animating.has(word),
                  'mistake': misss.has(word),
                }
            ]"
            :disabled="completed.includes(word)"
            @click="selectWord(word, 'chinese')"
            :hover-class="none"
            >
              {{ word }}
          </view> 
        </view>     
        <view class="word-column"> 
          <view
            v-for="word in shuffledEnglish"
            :key="word"
            :data-word="word"
            :class="[
            'word-btn',
            { 
              'selected': selectedEnglish === word,
              'completed': completed.includes(words.chinese[words.english.indexOf(word)]),
              'disabled': completed.includes(words.chinese[words.english.indexOf(word)]),
              'correct-match': animating.has(word),
              'mistake': misss.has(word),
            }
            ]"
            @click="selectWord(word, 'english')"
            :disabled="completed.includes(words.chinese[words.english.indexOf(word)])"
            :hover-class="none"
            >
           {{ word }}
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { ref, reactive, computed, onUnmounted, onMounted } from 'vue'

export default {
  setup() {
    const words = reactive({
      chinese: ['旅行者', '柔软', '五', '运动鞋', '牛奶'],
      english: ['traveler', 'soft', 'five', 'sneaker', 'milk']
    })
    const animating = ref(new Set())
    const misss = ref(new Set())

    // 选中的词书数据
    const selectedWordbook = ref(null)
    
    // 模拟的单词数据库，您可以替换为真实的API调用
    const wordDatabase = reactive([
      { chinese: '苹果', english: 'apple' },
      { chinese: '香蕉', english: 'banana' },
      { chinese: '橙子', english: 'orange' },
      { chinese: '草莓', english: 'strawberry' },
      { chinese: '西瓜', english: 'watermelon' },
      { chinese: '电脑', english: 'computer' },
      { chinese: '手机', english: 'phone' },
      { chinese: '书本', english: 'book' },
      { chinese: '桌子', english: 'desk' },
      { chinese: '椅子', english: 'chair' },
    ])
    
    // 在组件挂载时加载词书数据
    onMounted(() => {
      try {
        const storedWordbook = uni.getStorageSync('selectedWordbook')
        
        if (storedWordbook && storedWordbook.words && storedWordbook.words.length > 0) {
          selectedWordbook.value = storedWordbook
          
          // 清空原有数据库，添加词书中的单词
          wordDatabase.splice(0, wordDatabase.length)
          storedWordbook.words.forEach(word => {
            wordDatabase.push(word)
          })
          
          // 更新当前显示的单词
          const chineseWords = storedWordbook.words.map(w => w.chinese)
          const englishWords = storedWordbook.words.map(w => w.english)
          
          words.chinese.splice(0, words.chinese.length, ...chineseWords.slice(0, 5))
          words.english.splice(0, words.english.length, ...englishWords.slice(0, 5))
          
          // 更新乱序英文单词列表
          shuffledEnglish.value = [...words.english]
        } else {
          // 如果没有选中的词书，使用默认单词
          console.log('没有选中的词书，使用默认单词')
        }
      } catch (error) {
        console.error('加载词书数据失败:', error)
      }
    })

    // -- 新增逻辑：批量替换单词 --
    const pendingReplacement = ref([])
    const REPLACE_THRESHOLD = 3 // 每匹配 3 对单词后，替换这 3 对


    // 游戏状态
    const selectedChinese = ref(null)
    const selectedEnglish = ref(null)
    const midChinese = ref(null)
    const midEnglish = ref(null)
    const score = ref(0)
    const completed = ref([])
    const mistakes = ref(0)
    const timer = ref(0)
    const isGameStarted = ref(false)
    const timerInterval = ref(null)

    // 计算属性
    // 游戏完成条件：数据库为空，且当前所有单词都已匹配
    const isGameCompleted = computed(() => wordDatabase.length === 0 && completed.value.length === words.chinese.length)
    
    // 随机打乱单词顺序
    const shuffledEnglish = ref([...words.english])
    
    const startGame = () => {
      score.value = 0
      completed.value = []
      mistakes.value = 0
      timer.value = 0
      isGameStarted.value = true
      
      // 重新打乱英文单词顺序
      shuffledEnglish.value = [...words.english].sort(() => Math.random() - 0.5)
      
      // 启动计时器
      timerInterval.value = setInterval(() => {
        timer.value++
      }, 1000)
    }
    
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const selectWord = (word, type) => {
      if (type === 'chinese') {
        // 如果点的是已经选中的，再点一次就取消
        selectedChinese.value = selectedChinese.value === word ? null : word
      } else if (type === 'english') {
        selectedEnglish.value = selectedEnglish.value === word ? null : word
      }

      // 检查匹配
      if (selectedChinese.value && selectedEnglish.value) {
        checkMatch()
      }
    }

    const checkMatch = () => {
      const chineseIndex = words.chinese.indexOf(selectedChinese.value)
      const englishIndex = words.english.indexOf(selectedEnglish.value)

      if (chineseIndex === englishIndex) {
        // 先更新状态，确保两个按钮同时开始动画
        score.value += 10
        completed.value.push(selectedChinese.value)
        
        // 将匹配的词对加入等待替换的队列
        pendingReplacement.value.push({
          chinese: selectedChinese.value,
          english: selectedEnglish.value
        })

        // ✅ 把两个词加入 animating 集合
        const newSet = new Set(animating.value)
        newSet.add(selectedChinese.value)
        newSet.add(selectedEnglish.value)
        animating.value = newSet
        midChinese.value = selectedChinese.value
        midEnglish.value = selectedEnglish.value
        selectedChinese.value = null
        selectedEnglish.value = null

        setTimeout(() => {
          // 500ms 后移除
          const newSet = new Set(animating.value)
          newSet.delete(midChinese.value)
          newSet.delete(midEnglish.value)
          animating.value = newSet

          // 检查是否达到替换单词的阈值
          if (pendingReplacement.value.length >= REPLACE_THRESHOLD) {
            replaceBatchOfWords()
          }

          if (isGameCompleted.value) {
            clearInterval(timerInterval.value)
            uni.showModal({
              title: '恭喜完成！',
              content: `用时：${formatTime(timer.value)}\n得分：${score.value}\n失误：${mistakes.value}次`,
              showCancel: false
            })
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
    
    const replaceBatchOfWords = () => {
      const wordsToReplace = [...pendingReplacement.value]
      pendingReplacement.value = [] // 清空队列

      // 从数据库获取等量的新词，确保不重复
      const newWords = []
      const usedWords = new Set([...words.chinese, ...words.english]) // 当前已使用的单词
      
      for (let i = 0; i < wordsToReplace.length; i++) {
        if (wordDatabase.length > 0) {
          // 找到不在当前显示单词中的新词
          let newWord = null
          let newWordIndex = -1
          
          for (let j = 0; j < wordDatabase.length; j++) {
            const candidate = wordDatabase[j]
            if (!usedWords.has(candidate.chinese) && !usedWords.has(candidate.english)) {
              newWord = candidate
              newWordIndex = j
              break
            }
          }
          
          if (newWord) {
            newWords.push(newWord)
            wordDatabase.splice(newWordIndex, 1) // 从数据库中移除
            usedWords.add(newWord.chinese)
            usedWords.add(newWord.english)
          }
        }
      }

      if (newWords.length === 0) {
        // 数据库空了或没有合适的新词，把待替换的词放回去
        pendingReplacement.value = wordsToReplace
        return
      }

      const oldChineseWordsForCleanup = new Set()

      // 遍历待替换的词，进行替换
      for (let i = 0; i < wordsToReplace.length && i < newWords.length; i++) {
        const oldPair = wordsToReplace[i]
        const newPair = newWords[i]

        oldChineseWordsForCleanup.add(oldPair.chinese)

        // 1. 替换主数据源中的词
        const masterIndex = words.chinese.indexOf(oldPair.chinese)
        if (masterIndex > -1) {
          words.chinese[masterIndex] = newPair.chinese
          words.english[masterIndex] = newPair.english
        }

        // 2. 替换乱序列表中的词
        const shuffledIndex = shuffledEnglish.value.indexOf(oldPair.english)
        if (shuffledIndex > -1) {
          shuffledEnglish.value[shuffledIndex] = newPair.english
        }
      }

      // 3. 从 'completed' 数组中移除被替换掉的旧词
      completed.value = completed.value.filter(word => !oldChineseWordsForCleanup.has(word))
    }

    // 返回词书选择页面
    const goBack = () => {
      uni.navigateBack()
    }

    // 组件卸载时清理计时器
    onUnmounted(() => {
      if (timerInterval.value) {
        clearInterval(timerInterval.value)
      }
    })

    return {
      words,
      selectedChinese,
      selectedEnglish,
      score,
      completed,
      mistakes,
      timer,
      isGameStarted,
      isGameCompleted,
      selectedWordbook,
      formatTime,
      startGame,
      selectWord,
      shuffledEnglish,
      animating,
      checkMatch,
      misss,
      goBack
    }
  }
}
</script>

<style>
.container {
  padding: 20px;
}

.title {
  font-size: 24px;
  text-align: center;
  margin-bottom: 20px;
}

.subtitle {
  font-size: 20px;
  text-align: center;
  margin-bottom: 20px;
}

.start-screen {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.start-btn {
  padding: 15px 30px;
  font-size: 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  margin-bottom: 10px;
}

.back-btn {
  padding: 12px 24px;
  font-size: 16px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
}

.wordbook-desc {
  font-size: 14px;
  color: #666;
  text-align: center;
  margin-bottom: 20px;
  line-height: 1.4;
}

.game-info {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
}

.info-item {
  padding: 10px 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  text-align: center;
}

.game-container {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  width: 100%;
  gap: 20px;
}

.word-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  width: 100%;
  max-width: 300px;
}

.word-btn {
  width: 100%;
  min-height: 44px;
  padding: 12px;
  font-size: 16px;
  border: 2px solid #ccc;
  border-radius: 8px;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;

}


.word-btn.selected {
  background-color: #c3e3c4 !important;
  border-color: #708d72;
  transform: scale(1.05) !important;
}

.word-btn.completed {
  background-color: #ddd;
  color: #666;
}

.word-btn.disabled {
  background-color: #ddd;
  color: #666;
  pointer-events: none; /* 不能点 */
}

.word-btn.mistake {
  background-color: #f44336;
  animation: mistakeMatch 0.3s forwards;
  color: white;
}

@keyframes correctMatch {
  0% {
    background-color: #4CAF50;
    transform: scale(1);
    box-shadow: 0 0 0 rgba(76, 175, 80, 0);
  }
  70% {
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
  }
  100% {
    background-color: #45a049;
    transform: scale(1);
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.6);
  }
}

@keyframes mistakeMatch {
  0% {
    background-color: #f44336;
    transform: scale(1);
    box-shadow: 0 0 0 rgba(244, 67, 54, 0);
  }
  50% {
    background-color: #ff5252;
    transform: scale(1.1);
    box-shadow: 0 0 12px rgba(244, 67, 54, 0.9);
  }
  100% {
    background-color: #d32f2f;
    transform: scale(1);
    box-shadow: 0 0 10px rgba(244, 67, 54, 0.6);
  }
}


.correct-match {
  animation: correctMatch 0.3s forwards;
  pointer-events: none;
}
</style>

