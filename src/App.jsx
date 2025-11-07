import { useState, useEffect, useRef } from 'react'
import './App.css'
import { formatTime, parseICSFile } from './utils'

const WORK_TIME = 25 * 60 // 25分（秒）
const BREAK_TIME = 5 * 60 // 5分（秒）

// 翻訳オブジェクト
const translations = {
  ja: {
    appName: 'POMO',
    about: 'About',
    language: 'EN',
    todayDate: (date) => date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    newTaskPlaceholder: '新しいタスクを入力...',
    addButton: '追加',
    icsButton: '📅 ICSファイルから今日のTODOを読み込む',
    totalTasks: (count) => `全${count}件`,
    remainingTasks: (count) => `残り${count}件`,
    completedPomodoros: (count) => `🍅 完了: ${count}`,
    emptyState1: 'タスクがありません',
    emptyState2: '新しいタスクを追加してポモドーロを始めましょう！',
    estimateLabel: '予測:',
    workPhase: '🔥 作業中',
    breakPhase: '☕ 休憩中',
    startButton: '▶️ 開始',
    pauseButton: '⏸️ 停止',
    resetButton: '🔄 リセット',
    deleteButton: '削除',
    doneBadge: 'DONE!',
    allDoneTitle: '🎉 ALL DONE! 🎉',
    allDoneSubtitle: '全てのタスクを完了しました！',
    backButton: '← 戻る',
    aboutTitle: 'About POMO',
    aboutApp: '📝 アプリについて',
    aboutDescription: 'POMOは、ポモドーロテクニックを活用したTODO管理アプリです。タスクごとにポモドーロタイマーを設定し、効率的に作業を進めることができます。',
    aboutAuthor: '👤 作者',
    aboutHistory: '🔄 アップデート履歴',
    aboutLicense: '📄 ライセンス',
    githubRepo: '📦 GitHub Repository',
    buyCoffee: '☕ Buy me a coffee',
    version: 'v0.1',
    releaseDate: '2025-11-06',
    initialRelease: '初回リリース',
    todoFeatures: [
      'TODO追加・削除・完了機能',
      'ポモドーロタイマー（25分作業/5分休憩）',
      'ポモドーロ見積もり機能',
      '進捗表示（完了数/総数、パーセント）',
      'シングルタイマーモード',
      '全タスク完了時のお祝い演出',
      'ICSファイル読み込み機能',
      '今日の日付表示',
      'localStorageでデータ永続化',
      'Buy Me a Coffeeウィジェット追加',
      'Aboutページ追加'
    ],
    license: 'MIT License'
  },
  en: {
    appName: 'POMO',
    about: 'About',
    language: '日本語',
    todayDate: (date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    newTaskPlaceholder: 'Enter a new task...',
    addButton: 'Add',
    icsButton: '📅 Load today\'s TODOs from ICS file',
    totalTasks: (count) => `Total: ${count}`,
    remainingTasks: (count) => `Remaining: ${count}`,
    completedPomodoros: (count) => `🍅 Completed: ${count}`,
    emptyState1: 'No tasks',
    emptyState2: 'Add a new task to start pomodoro!',
    estimateLabel: 'Estimate:',
    workPhase: '🔥 Working',
    breakPhase: '☕ Break',
    startButton: '▶️ Start',
    pauseButton: '⏸️ Pause',
    resetButton: '🔄 Reset',
    deleteButton: 'Delete',
    doneBadge: 'DONE!',
    allDoneTitle: '🎉 ALL DONE! 🎉',
    allDoneSubtitle: 'All tasks completed!',
    backButton: '← Back',
    aboutTitle: 'About POMO',
    aboutApp: '📝 About the App',
    aboutDescription: 'POMO is a TODO management app that integrates the Pomodoro Technique. Set pomodoro timers for each task and work efficiently.',
    aboutAuthor: '👤 Author',
    aboutHistory: '🔄 Update History',
    aboutLicense: '📄 License',
    githubRepo: '📦 GitHub Repository',
    buyCoffee: '☕ Buy me a coffee',
    version: 'v0.1',
    releaseDate: '2025-11-06',
    initialRelease: 'Initial release',
    todoFeatures: [
      'TODO add/delete/complete functionality',
      'Pomodoro timer (25min work/5min break)',
      'Pomodoro estimation feature',
      'Progress display (completed/total, percentage)',
      'Single timer mode',
      'Celebration effect when all tasks completed',
      'ICS file import functionality',
      'Today\'s date display',
      'Data persistence with localStorage',
      'Buy Me a Coffee widget added',
      'About page added'
    ],
    license: 'MIT License'
  }
}

function App() {
  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [todayDate, setTodayDate] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const [language, setLanguage] = useState('ja') // 'ja' or 'en'
  const timersRef = useRef({})
  const celebrationTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    // 言語設定をlocalStorageから読み込み
    const storedLanguage = localStorage.getItem('language')
    if (storedLanguage) {
      setLanguage(storedLanguage)
    }

    // 今日の日付を設定
    const today = new Date()
    setTodayDate(translations[storedLanguage || language].todayDate(today))

    const storedTodos = localStorage.getItem('todos')
    if (storedTodos) {
      const loadedTodos = JSON.parse(storedTodos)
      setTodos(loadedTodos.map(todo => ({
        ...todo,
        isRunning: false,
        remainingTime: todo.remainingTime || WORK_TIME,
        currentPhase: todo.currentPhase || 'work'
      })))
    }
  }, [])

  useEffect(() => {
    const todosToSave = todos.map(({ isRunning, ...todo }) => todo)
    localStorage.setItem('todos', JSON.stringify(todosToSave))
  }, [todos])

  useEffect(() => {
    // 言語設定をlocalStorageに保存
    localStorage.setItem('language', language)
    
    // 言語が変更されたときに日付を更新
    const today = new Date()
    setTodayDate(translations[language].todayDate(today))
  }, [language])

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(timer => clearInterval(timer))
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current)
      }
    }
  }, [])

  const remainingTodos = todos.filter(todo => !todo.completed).length
  const completedTodos = todos.filter(todo => todo.completed).length
  const totalTodos = todos.length

  useEffect(() => {
    if (todos.length > 0 && completedTodos === totalTodos) {
      setShowCelebration(true)
      celebrationTimeoutRef.current = setTimeout(() => {
        setShowCelebration(false)
      }, 5000)
    } else {
      setShowCelebration(false)
    }
  }, [todos, completedTodos, totalTodos])

  const addTodo = () => {
    if (inputValue.trim() === '') return
    
    const newTodo = {
      id: Date.now(),
      text: inputValue,
      completed: false,
      estimatedPomodoros: 1,
      completedPomodoros: 0,
      remainingTime: WORK_TIME,
      currentPhase: 'work',
      isRunning: false
    }
    
    setTodos([newTodo, ...todos])
    setInputValue('')
  }

  const deleteTodo = (id) => {
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id])
      delete timersRef.current[id]
    }
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const toggleTodo = (id) => {
    const todo = todos.find(t => t.id === id)
    if (todo && !todo.completed) {
      pauseTimer(id)
    }
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const updateEstimatedPomodoros = (id, delta) => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        const newValue = Math.max(1, todo.estimatedPomodoros + delta)
        return { ...todo, estimatedPomodoros: newValue }
      }
      return todo
    }))
  }

  const startTimer = (id) => {
    if (timersRef.current[id]) return

    // 他のすべてのタイマーを停止
    Object.entries(timersRef.current).forEach(([timerId, interval]) => {
      if (Number(timerId) !== id) {
        clearInterval(interval)
        delete timersRef.current[timerId]
      }
    })

    setTodos(prevTodos => {
      const targetTodo = prevTodos.find(todo => todo.id === id)
      if (!targetTodo) return prevTodos

      const otherTodos = prevTodos.filter(todo => todo.id !== id).map(todo => ({
        ...todo,
        isRunning: false
      }))
      
      return [
        { ...targetTodo, isRunning: true },
        ...otherTodos
      ]
    })

    timersRef.current[id] = setInterval(() => {
      setTodos(prevTodos => prevTodos.map(todo => {
        if (todo.id !== id) return todo

        const newRemainingTime = todo.remainingTime - 1

        if (newRemainingTime <= 0) {
          // タイマー終了時に音声を再生
          playNotificationSound()
          
          // タイマーを自動停止
          if (timersRef.current[id]) {
            clearInterval(timersRef.current[id])
            delete timersRef.current[id]
          }
          
          if (todo.currentPhase === 'work') {
            return {
              ...todo,
              completedPomodoros: todo.completedPomodoros + 1,
              currentPhase: 'break',
              remainingTime: BREAK_TIME,
              isRunning: false
            }
          } else {
            return {
              ...todo,
              currentPhase: 'work',
              remainingTime: WORK_TIME,
              isRunning: false
            }
          }
        }

        return { ...todo, remainingTime: newRemainingTime }
      }))
    }, 1000)
  }

  const pauseTimer = (id) => {
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id])
      delete timersRef.current[id]
    }
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, isRunning: false } : todo
    ))
  }

  const resetTimer = (id) => {
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id])
      delete timersRef.current[id]
    }
    setTodos(todos.map(todo =>
      todo.id === id ? {
        ...todo,
        isRunning: false,
        remainingTime: WORK_TIME,
        currentPhase: 'work'
      } : todo
    ))
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  const playNotificationSound = () => {
    try {
      // Web Audio APIを使用して音を生成
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 1)
    } catch (error) {
      console.warn('音声通知の再生に失敗しました:', error)
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      const newTodos = parseICSFile(content)
      
      if (newTodos.length > 0) {
        // 既存のタスクをクリアして新しいタスクを設定
        setTodos(newTodos)
        if (language === 'ja') {
          alert(`${newTodos.length}件の今日のTODOを読み込みました！`)
        } else {
          alert(`Loaded ${newTodos.length} today's TODOs!`)
        }
      } else {
        if (language === 'ja') {
          alert('今日のTODOが見つかりませんでした。')
        } else {
          alert('No today\'s TODOs found.')
        }
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const createConfetti = () => {
    const confetti = []
    const colors = ['#ff6b6b', '#51cf66', '#ffa94d', '#667eea', '#ff69b4', '#00d4ff']
    for (let i = 0; i < 50; i++) {
      confetti.push(
        <div
          key={i}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      )
    }
    return confetti
  }

  if (showAbout) {
    const t = translations[language]
    return (
      <div className="app">
        <div className="container">
          <div className="about-header">
            <button className="back-button" onClick={() => setShowAbout(false)}>
              {t.backButton}
            </button>
          </div>
          <h1 className="about-title">{t.aboutTitle}</h1>
          
          <section className="about-section">
            <h2>{t.aboutApp}</h2>
            <p>{t.aboutDescription}</p>
          </section>

          <section className="about-section">
            <h2>{t.aboutAuthor}</h2>
            <p><strong>qnosuke</strong></p>
            <div className="about-links">
              <a href="https://github.com/qnosuke/pomotodo" target="_blank" rel="noopener noreferrer">
                {t.githubRepo}
              </a>
              <a href="https://buymeacoffee.com/qnosuke" target="_blank" rel="noopener noreferrer">
                {t.buyCoffee}
              </a>
            </div>
          </section>

          <section className="about-section">
            <h2>{t.aboutHistory}</h2>
            <div className="update-history">
              <div className="update-item">
                <div className="update-version">{t.version}</div>
                <div className="update-date">{t.releaseDate}</div>
                <ul className="update-list">
                  <li>{t.initialRelease}</li>
                  {t.todoFeatures.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="about-section">
            <h2>{t.aboutLicense}</h2>
            <p>{t.license}</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={`app ${showCelebration ? 'celebration-mode' : ''}`}>
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-content">
            <h1 className="celebration-title">{translations[language].allDoneTitle}</h1>
            <p className="celebration-subtitle">{translations[language].allDoneSubtitle}</p>
          </div>
          <div className="confetti-container">
            {createConfetti()}
          </div>
        </div>
      )}
      <div className="header-bar">
        <button 
          className="language-tab" 
          onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
        >
          {translations[language].language}
        </button>
        <button className="about-tab" onClick={() => setShowAbout(true)}>
          {translations[language].about}
        </button>
      </div>
      <div className="container">
        <h1 className="title">🍅 POMO</h1>
        <div className="today-date">{todayDate}</div>
        
        {totalTodos > 0 && (
          <div className="progress-summary">
            <div className="progress-fraction">
              <span className="completed-count">{completedTodos}</span>
              <span className="separator">/</span>
              <span className="total-count">{totalTodos}</span>
            </div>
            <div className="progress-percentage">
              {Math.round((completedTodos / totalTodos) * 100)}% {language === 'ja' ? '完了' : 'completed'}
            </div>
          </div>
        )}

        <div className="ics-upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button 
            className="ics-upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            {translations[language].icsButton}
          </button>
        </div>
        
        <div className="input-section">
          <input
            type="text"
            className="todo-input"
            placeholder={translations[language].newTaskPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="add-button" onClick={addTodo}>
            {translations[language].addButton}
          </button>
        </div>

        <div className="stats">
          <span>{translations[language].totalTasks(todos.length)}</span>
          <span>{translations[language].remainingTasks(remainingTodos)}</span>
          <span>{translations[language].completedPomodoros(todos.reduce((sum, todo) => sum + todo.completedPomodoros, 0))}</span>
        </div>

        <ul className="todo-list">
          {todos.map(todo => (
            <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''} ${todo.isRunning ? 'running' : ''}`}>
              <div className="todo-main">
                <div className="todo-content">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                  />
                  <span className="todo-text">
                    {todo.text}
                    {todo.completed && <span className="done-badge">{translations[language].doneBadge}</span>}
                  </span>
                </div>
                <button className="delete-button" onClick={() => deleteTodo(todo.id)}>
                  {translations[language].deleteButton}
                </button>
              </div>

              <div className="pomodoro-section">
                <div className="pomodoro-estimate">
                  <span className="label">{translations[language].estimateLabel}</span>
                  <button 
                    className="pomodoro-adjust-btn"
                    onClick={() => updateEstimatedPomodoros(todo.id, -1)}
                    disabled={todo.estimatedPomodoros <= 1 || todo.completed}
                  >
                    -
                  </button>
                  <span className="pomodoro-count">
                    🍅 {todo.completedPomodoros} / {todo.estimatedPomodoros}
                  </span>
                  <button 
                    className="pomodoro-adjust-btn"
                    onClick={() => updateEstimatedPomodoros(todo.id, 1)}
                    disabled={todo.completed}
                  >
                    +
                  </button>
                </div>

                <div className="timer-section">
                  <div className={`timer-display ${todo.currentPhase}`}>
                    <span className="phase-label">
                      {todo.currentPhase === 'work' ? translations[language].workPhase : translations[language].breakPhase}
                    </span>
                    <span className="timer-time">{formatTime(todo.remainingTime)}</span>
                  </div>
                  <div className="timer-controls">
                    {!todo.isRunning ? (
                      <button 
                        className="timer-btn start-btn"
                        onClick={() => startTimer(todo.id)}
                        disabled={todo.completed}
                      >
                        {translations[language].startButton}
                      </button>
                    ) : (
                      <button 
                        className="timer-btn pause-btn"
                        onClick={() => pauseTimer(todo.id)}
                        disabled={todo.completed}
                      >
                        {translations[language].pauseButton}
                      </button>
                    )}
                    <button 
                      className="timer-btn reset-btn"
                      onClick={() => resetTimer(todo.id)}
                      disabled={todo.completed}
                    >
                      {translations[language].resetButton}
                    </button>
                  </div>
                </div>

                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${(todo.completedPomodoros / todo.estimatedPomodoros) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        {todos.length === 0 && (
          <div className="empty-state">
            <p>{translations[language].emptyState1}</p>
            <p>{translations[language].emptyState2}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
