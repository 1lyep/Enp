// 数据库工具类
// #ifdef APP-PLUS
const dbName = 'word_game.db'
const dbPath = '_doc/' + dbName
// #endif

const DB = {
    // 初始化数据库
    async init() {
        // #ifdef APP-PLUS
        return new Promise((resolve, reject) => {
            plus.sqlite.openDatabase({
                name: dbName,
                path: dbPath,
                success: () => {
                    this.createTables().then(resolve).catch(reject)
                },
                fail: (e) => {
                    console.error('Open database failed: ' + JSON.stringify(e))
                    // 如果已经打开，尝试继续
                    this.createTables().then(resolve).catch(reject)
                }
            })
        })
        // #endif

        // #ifndef APP-PLUS
        // H5 环境下检查是否需要初始化默认数据
        const books = uni.getStorageSync('wordbooks_db')
        if (!books) {
            await this.seedDefaultData()
        }
        return Promise.resolve()
        // #endif
    },

    // 创建表结构
    async createTables() {
        // #ifdef APP-PLUS
        const sqlWordBooks = `
			CREATE TABLE IF NOT EXISTS wordbooks (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				title TEXT NOT NULL,
				description TEXT,
				icon TEXT,
				difficulty TEXT,
				progress INTEGER DEFAULT 0,
				gradient TEXT,
				create_time INTEGER
			)
		`
        const sqlWords = `
			CREATE TABLE IF NOT EXISTS words (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				book_id INTEGER,
				chinese TEXT NOT NULL,
				english TEXT NOT NULL,
				FOREIGN KEY(book_id) REFERENCES wordbooks(id) ON DELETE CASCADE
			)
		`

        try {
            await this.executeSql(sqlWordBooks)
            await this.executeSql(sqlWords)

            // 检查是否为空，如果为空则注入初始数据
            const res = await this.selectSql('SELECT count(*) as count FROM wordbooks')
            if (res[0].count === 0) {
                await this.seedDefaultData()
            }
        } catch (e) {
            console.error('Create tables failed', e)
            throw e
        }
        // #endif
    },

    // 注入默认数据
    async seedDefaultData() {
        const defaultBooks = [
            {
                title: "基础词汇",
                description: "日常生活中的常用词汇",
                icon: "📚",
                difficulty: "easy",
                gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                words: [
                    { chinese: "苹果", english: "apple" },
                    { chinese: "香蕉", english: "banana" },
                    { chinese: "橙子", english: "orange" },
                    { chinese: "电脑", english: "computer" },
                    { chinese: "手机", english: "phone" }
                ]
            },
            {
                title: "动物世界",
                description: "各种动物的英文名称",
                icon: "🐾",
                difficulty: "medium",
                gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                words: [
                    { chinese: "猫", english: "cat" },
                    { chinese: "狗", english: "dog" },
                    { chinese: "鸟", english: "bird" },
                    { chinese: "老虎", english: "tiger" }
                ]
            }
        ]

        for (const book of defaultBooks) {
            const bookId = await this.addWordBook({
                title: book.title,
                description: book.description,
                icon: book.icon,
                difficulty: book.difficulty,
                gradient: book.gradient
            })

            for (const word of book.words) {
                await this.addWord(bookId, word)
            }
        }
    },

    // 获取所有词书（不含单词详情，只含统计）
    async getWordBooks() {
        // #ifdef APP-PLUS
        {
            const sql = `
				SELECT b.*, (SELECT count(*) FROM words w WHERE w.book_id = b.id) as wordCount 
				FROM wordbooks b
				ORDER BY b.id DESC
			`
            return this.selectSql(sql)
        }
        // #endif

        // #ifndef APP-PLUS
        {
            const books = uni.getStorageSync('wordbooks_db') || []
            return books.map(b => ({
                ...b,
                wordCount: (uni.getStorageSync('words_db_' + b.id) || []).length
            }))
        }
        // #endif
    },

    // 获取单个词书详情（包含所有单词）
    async getWordBookById(id) {
        // #ifdef APP-PLUS
        {
            const books = await this.selectSql(`SELECT * FROM wordbooks WHERE id = ${id}`)
            if (books.length === 0) return null
            const book = books[0]

            const words = await this.selectSql(`SELECT * FROM words WHERE book_id = ${id}`)
            book.words = words
            return book
        }
        // #endif

        // #ifndef APP-PLUS
        {
            const books = uni.getStorageSync('wordbooks_db') || []
            const book = books.find(b => b.id == id)
            if (!book) return null

            const words = uni.getStorageSync('words_db_' + id) || []
            return { ...book, words }
        }
        // #endif
    },

    // 添加词书
    async addWordBook(book) {
        // #ifdef APP-PLUS
        {
            const sql = `
				INSERT INTO wordbooks (title, description, icon, difficulty, gradient, create_time)
				VALUES ('${book.title}', '${book.description}', '${book.icon}', '${book.difficulty}', '${book.gradient}', ${Date.now()})
			`
            await this.executeSql(sql)
            // 获取刚插入的 ID
            const res = await this.selectSql('SELECT last_insert_rowid() as id')
            return res[0].id
        }
        // #endif

        // #ifndef APP-PLUS
        {
            const books = uni.getStorageSync('wordbooks_db') || []
            const newId = Date.now()
            const newBook = { ...book, id: newId, create_time: Date.now() }
            books.unshift(newBook)
            uni.setStorageSync('wordbooks_db', books)
            uni.setStorageSync('words_db_' + newId, [])
            return newId
        }
        // #endif
    },

    // 更新词书信息
    async updateWordBook(book) {
        // #ifdef APP-PLUS
        {
            const sql = `
				UPDATE wordbooks 
				SET title = '${book.title}', 
					description = '${book.description}', 
					difficulty = '${book.difficulty}'
				WHERE id = ${book.id}
			`
            return this.executeSql(sql)
        }
        // #endif

        // #ifndef APP-PLUS
        {
            const books = uni.getStorageSync('wordbooks_db') || []
            const idx = books.findIndex(b => b.id == book.id)
            if (idx > -1) {
                books[idx] = { ...books[idx], ...book }
                uni.setStorageSync('wordbooks_db', books)
            }
        }
        // #endif
    },

    // 删除词书
    async deleteWordBook(id) {
        // #ifdef APP-PLUS
        {
            await this.executeSql(`DELETE FROM words WHERE book_id = ${id}`)
            await this.executeSql(`DELETE FROM wordbooks WHERE id = ${id}`)
        }
        // #endif

        // #ifndef APP-PLUS
        {
            const books = uni.getStorageSync('wordbooks_db') || []
            const newBooks = books.filter(b => b.id != id)
            uni.setStorageSync('wordbooks_db', newBooks)
            uni.removeStorageSync('words_db_' + id)
        }
        // #endif
    },

    // 添加单词
    async addWord(bookId, word) {
        // #ifdef APP-PLUS
        {
            const sql = `
				INSERT INTO words (book_id, chinese, english)
				VALUES (${bookId}, '${word.chinese}', '${word.english}')
			`
            return this.executeSql(sql)
        }
        // #endif

        // #ifndef APP-PLUS
        {
            const words = uni.getStorageSync('words_db_' + bookId) || []
            words.push({ ...word, id: Date.now() })
            uni.setStorageSync('words_db_' + bookId, words)
        }
        // #endif
    },

    // 更新单词
    async updateWord(word) {
        // #ifdef APP-PLUS
        {
            const sql = `
				UPDATE words 
				SET chinese = '${word.chinese}', english = '${word.english}'
				WHERE id = ${word.id}
			`
            return this.executeSql(sql)
        }
        // #endif

        // #ifndef APP-PLUS
        {
            // 在 H5 模拟中，我们需要知道 bookId 才能找到对应的 storage key。
            if (!word.bookId) {
                console.error('H5 updateWord requires bookId')
                return
            }
            const words = uni.getStorageSync('words_db_' + word.bookId) || []
            const idx = words.findIndex(w => w.id == word.id)
            if (idx > -1) {
                words[idx] = { ...words[idx], ...word }
                uni.setStorageSync('words_db_' + word.bookId, words)
            }
        }
        // #endif
    },

    // 删除单词
    async deleteWord(bookId, wordId) {
        // #ifdef APP-PLUS
        {
            const sql = `DELETE FROM words WHERE id = ${wordId}`
            return this.executeSql(sql)
        }
        // #endif

        // #ifndef APP-PLUS
        {
            const words = uni.getStorageSync('words_db_' + bookId) || []
            const newWords = words.filter(w => w.id != wordId)
            uni.setStorageSync('words_db_' + bookId, newWords)
        }
        // #endif
    },

    // 通用 SQL 执行 (App Only)
    // #ifdef APP-PLUS
    executeSql(sql) {
        return new Promise((resolve, reject) => {
            plus.sqlite.executeSql({
                name: dbName,
                sql: sql,
                success: (e) => resolve(e),
                fail: (e) => {
                    console.error('Execute SQL failed: ' + sql, e)
                    reject(e)
                }
            })
        })
    },
    selectSql(sql) {
        return new Promise((resolve, reject) => {
            plus.sqlite.selectSql({
                name: dbName,
                sql: sql,
                success: (e) => resolve(e),
                fail: (e) => {
                    console.error('Select SQL failed: ' + sql, e)
                    reject(e)
                }
            })
        })
    }
    // #endif
}

export default DB
