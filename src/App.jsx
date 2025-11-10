import { useState, useEffect, useRef } from 'react'
import './App.css'

const WORK_TIME = 25 * 60 // 作業時間：25分 = 1500秒
const BREAK_TIME = 5 * 60 // 休憩時間：5分 = 300秒

function App() {
  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [todayDate, setTodayDate] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const timersRef = useRef({})
  const celebrationTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    // 今日の日付を設定
    const today = new Date()
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    setTodayDate(today.toLocaleDateString('ja-JP', options))

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
    return () => {
      console.log('Cleaning up timers on unmount')
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
    // 既にタイマーが起動している場合は何もしない
    if (timersRef.current[id]) {
      console.log(`Timer already running for todo ${id}`)
      return
    }

    // 他のすべてのタイマーを停止
    Object.entries(timersRef.current).forEach(([timerId, interval]) => {
      if (Number(timerId) !== id) {
        console.log(`Clearing timer for todo ${timerId}`)
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

    console.log(`Starting timer for todo ${id}`)
    timersRef.current[id] = setInterval(() => {
      setTodos(prevTodos => prevTodos.map(todo => {
        if (todo.id !== id) return todo

        const newRemainingTime = todo.remainingTime - 1
        
        // デバッグ用ログ
        console.log(`Timer tick for todo ${id}: ${todo.remainingTime} -> ${newRemainingTime}`)

        if (newRemainingTime <= 0) {
          if (todo.currentPhase === 'work') {
            console.log(`Work phase completed for todo ${id}`)
            return {
              ...todo,
              completedPomodoros: todo.completedPomodoros + 1,
              currentPhase: 'break',
              remainingTime: BREAK_TIME
            }
          } else {
            console.log(`Break phase completed for todo ${id}`)
            return {
              ...todo,
              currentPhase: 'work',
              remainingTime: WORK_TIME
            }
          }
        }

        return { ...todo, remainingTime: newRemainingTime }
      }))
    }, 1000)
  }

  const pauseTimer = (id) => {
    if (timersRef.current[id]) {
      console.log(`Pausing timer for todo ${id}`)
      clearInterval(timersRef.current[id])
      delete timersRef.current[id]
    }
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, isRunning: false } : todo
    ))
  }

  const resetTimer = (id) => {
    if (timersRef.current[id]) {
      console.log(`Resetting timer for todo ${id}`)
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const parseICSFile = (content) => {
    const todos = []
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '')

    const vtodoBlocks = content.split('BEGIN:VTODO').slice(1)

    vtodoBlocks.forEach(block => {
      const lines = block.split('\n')
      let summary = ''
      let dueDate = ''
      let status = ''
      let description = ''

      lines.forEach(line => {
        if (line.startsWith('SUMMARY:')) {
          summary = line.substring(8).trim()
        } else if (line.startsWith('DUE;VALUE=DATE:')) {
          dueDate = line.substring(15).trim()
        } else if (line.startsWith('STATUS:')) {
          status = line.substring(7).trim()
        } else if (line.startsWith('DESCRIPTION:')) {
          description = line.substring(12).trim()
        }
      })

      // 今日の日付のTODOのみ、かつ未完了のもの
      if (dueDate === todayStr && status !== 'COMPLETED' && summary) {
        // 時間情報からポモドーロ数を推定
        let estimatedPomodoros = 1
        const timeMatch = description.match(/PT(\d+)H/)
        if (timeMatch) {
          const hours = parseInt(timeMatch[1])
          estimatedPomodoros = Math.ceil(hours * 2) // 1時間 = 2ポモドーロ
        }

        todos.push({
          id: Date.now() + Math.random(),
          text: summary,
          completed: false,
          estimatedPomodoros: estimatedPomodoros,
          completedPomodoros: 0,
          remainingTime: WORK_TIME,
          currentPhase: 'work',
          isRunning: false
        })
      }
    })

    return todos
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      const newTodos = parseICSFile(content)
      
      if (newTodos.length > 0) {
        setTodos([...newTodos, ...todos])
        alert(`${newTodos.length}件の今日のTODOを読み込みました！`)
      } else {
        alert('今日のTODOが見つかりませんでした。')
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
    return (
      <div className="app">
        <div className="container">
          <div className="about-header">
            <button className="back-button" onClick={() => setShowAbout(false)}>
              ← 戻る
            </button>
          </div>
          <h1 className="about-title">About PomoTODO</h1>
          
          <section className="about-section">
            <h2>📝 アプリについて</h2>
            <p>PomoTODOは、ポモドーロテクニックを活用したTODO管理アプリです。タスクごとにポモドーロタイマーを設定し、効率的に作業を進めることができます。</p>
          </section>

          <section className="about-section">
            <h2>👤 作者</h2>
            <p><strong>qnosuke</strong></p>
            <div className="about-links">
              <a href="https://github.com/qnosuke/pomotodo" target="_blank" rel="noopener noreferrer">
                📦 GitHub Repository
              </a>
              <a href="https://buymeacoffee.com/qnosuke" target="_blank" rel="noopener noreferrer">
                ☕ Buy me a coffee
              </a>
            </div>
          </section>

          <section className="about-section">
            <h2>🔄 アップデート履歴</h2>
            <div className="update-history">
              <div className="update-item">
                <div className="update-version">v0.1</div>
                <div className="update-date">2025-11-06</div>
                <ul className="update-list">
                  <li>初回リリース</li>
                  <li>TODO追加・削除・完了機能</li>
                  <li>ポモドーロタイマー（25分作業/5分休憩）</li>
                  <li>ポモドーロ見積もり機能</li>
                  <li>進捗表示（完了数/総数、パーセント）</li>
                  <li>シングルタイマーモード</li>
                  <li>全タスク完了時のお祝い演出</li>
                  <li>ICSファイル読み込み機能</li>
                  <li>今日の日付表示</li>
                  <li>localStorageでデータ永続化</li>
                  <li>Buy Me a Coffeeウィジェット追加</li>
                  <li>Aboutページ追加</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="about-section">
            <h2>📄 ライセンス</h2>
            <p>MIT License</p>
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
            <h1 className="celebration-title">🎉 ALL DONE! 🎉</h1>
            <p className="celebration-subtitle">全てのタスクを完了しました！</p>
          </div>
          <div className="confetti-container">
            {createConfetti()}
          </div>
        </div>
      )}
      <div className="header-bar">
        <button className="about-tab" onClick={() => setShowAbout(true)}>
          About
        </button>
      </div>
      <div className="container">
        <h1 className="title">🍅 PomoTODO</h1>
        <div className="today-date">{todayDate}</div>
        
        {totalTodos > 0 && (
          <div className="progress-summary">
            <div className="progress-fraction">
              <span className="completed-count">{completedTodos}</span>
              <span className="separator">/</span>
              <span className="total-count">{totalTodos}</span>
            </div>
            <div className="progress-percentage">
              {Math.round((completedTodos / totalTodos) * 100)}% 完了
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
            📅 ICSファイルから今日のTODOを読み込む
          </button>
        </div>
        
        <div className="input-section">
          <input
            type="text"
            className="todo-input"
            placeholder="新しいタスクを入力..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="add-button" onClick={addTodo}>
            追加
          </button>
        </div>

        <div className="stats">
          <span>全{todos.length}件</span>
          <span>残り{remainingTodos}件</span>
          <span>🍅 完了: {todos.reduce((sum, todo) => sum + todo.completedPomodoros, 0)}</span>
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
                    {todo.completed && <span className="done-badge">DONE!</span>}
                  </span>
                </div>
                <button className="delete-button" onClick={() => deleteTodo(todo.id)}>
                  削除
                </button>
              </div>

              <div className="pomodoro-section">
                <div className="pomodoro-estimate">
                  <span className="label">予測:</span>
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
                  {/* デバッグ用ログ */}
                  {console.log(`Todo ID: ${todo.id}, isRunning: ${todo.isRunning}, currentPhase: ${todo.currentPhase}`)}
                  <div className={`timer-display ${todo.currentPhase}`}>
                    <span className="phase-label">
                      {todo.isRunning && todo.currentPhase === 'work' && '🔥 作業中'}
                      {todo.isRunning && todo.currentPhase === 'break' && '☕ 休憩中'}
                      {!todo.isRunning && todo.currentPhase === 'work' && '作業'}
                      {!todo.isRunning && todo.currentPhase === 'break' && '休憩'}
                      {todo.isRunning && <span className="working-indicator"> (作業中)</span>}
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
                        ▶️ 開始
                      </button>
                    ) : (
                      <button 
                        className="timer-btn pause-btn"
                        onClick={() => pauseTimer(todo.id)}
                        disabled={todo.completed}
                      >
                        ⏸️ 停止
                      </button>
                    )}
                    <button 
                      className="timer-btn reset-btn"
                      onClick={() => resetTimer(todo.id)}
                      disabled={todo.completed}
                    >
                      🔄 リセット
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
            <p>タスクがありません</p>
            <p>新しいタスクを追加してポモドーロを始めましょう！</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
