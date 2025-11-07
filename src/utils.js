/**
 * 秒数を分:秒形式の文字列に変換する
 * @param {number} seconds - 秒数
 * @returns {string} フォーマットされた時間文字列 (例: "05:30")
 */
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * ICSファイルの内容をパースしてTODOリストを抽出する
 * @param {string} content - ICSファイルの内容
 * @returns {Array} 抽出されたTODOオブジェクトの配列
 */
export const parseICSFile = (content) => {
  const todos = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');

  const vtodoBlocks = content.split('BEGIN:VTODO').slice(1);

  vtodoBlocks.forEach(block => {
    const lines = block.split('\n');
    let summary = '';
    let dueDate = '';
    let status = '';
    let description = '';

    lines.forEach(line => {
      if (line.startsWith('SUMMARY:')) {
        summary = line.substring(8).trim();
      } else if (line.startsWith('DUE;VALUE=DATE:')) {
        dueDate = line.substring(15).trim();
      } else if (line.startsWith('STATUS:')) {
        status = line.substring(7).trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        description = line.substring(12).trim();
      }
    });

    // 今日の日付のTODOのみ、かつ未完了のもの
    if (dueDate === todayStr && status !== 'COMPLETED' && summary) {
      // 時間情報からポモドーロ数を推定
      let estimatedPomodoros = 1;
      const timeMatch = description.match(/PT(\d+)H/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        estimatedPomodoros = Math.ceil(hours * 2); // 1時間 = 2ポモドーロ
      }

      todos.push({
        id: Date.now() + Math.random(),
        text: summary,
        completed: false,
        estimatedPomodoros: estimatedPomodoros,
        completedPomodoros: 0,
        remainingTime: 25 * 60, // WORK_TIME
        currentPhase: 'work',
        isRunning: false
      });
    }
  });

  return todos;
};