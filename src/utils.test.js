import { formatTime, parseICSFile } from './utils';

describe('formatTime', () => {
  test('0秒を00:00に変換する', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  test('59秒を00:59に変換する', () => {
    expect(formatTime(59)).toBe('00:59');
  });

  test('60秒を01:00に変換する', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  test('119秒を01:59に変換する', () => {
    expect(formatTime(119)).toBe('01:59');
  });

  test('600秒を10:00に変換する', () => {
    expect(formatTime(600)).toBe('10:00');
  });

  test('1500秒を25:00に変換する', () => {
    expect(formatTime(1500)).toBe('25:00');
  });

  test('3599秒を59:59に変換する', () => {
    expect(formatTime(3599)).toBe('59:59');
  });
});

describe('parseICSFile', () => {
  test('空の内容に対して空の配列を返す', () => {
    const content = '';
    const result = parseICSFile(content);
    expect(result).toEqual([]);
  });

  test('今日の日付のTODOを正しく抽出する', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const content = `BEGIN:VCALENDAR
BEGIN:VTODO
SUMMARY:テストタスク
DUE;VALUE=DATE:${todayStr}
STATUS:NEEDS-ACTION
DESCRIPTION:PT1H
END:VTODO
END:VCALENDAR`;

    const result = parseICSFile(content);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      text: 'テストタスク',
      completed: false,
      estimatedPomodoros: 2, // 1時間 = 2ポモドーロ
      currentPhase: 'work',
      isRunning: false
    });
  });

  test('完了済みのTODOを除外する', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const content = `BEGIN:VCALENDAR
BEGIN:VTODO
SUMMARY:完了済みタスク
DUE;VALUE=DATE:${todayStr}
STATUS:COMPLETED
END:VTODO
END:VCALENDAR`;

    const result = parseICSFile(content);
    expect(result).toEqual([]);
  });

  test('今日以外の日付のTODOを除外する', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0].replace(/-/g, '');
    
    const content = `BEGIN:VCALENDAR
BEGIN:VTODO
SUMMARY:明日のタスク
DUE;VALUE=DATE:${tomorrowStr}
STATUS:NEEDS-ACTION
END:VTODO
END:VCALENDAR`;

    const result = parseICSFile(content);
    expect(result).toEqual([]);
  });

  test('複数のTODOを正しく抽出する', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const content = `BEGIN:VCALENDAR
BEGIN:VTODO
SUMMARY:タスク1
DUE;VALUE=DATE:${todayStr}
STATUS:NEEDS-ACTION
END:VTODO
BEGIN:VTODO
SUMMARY:タスク2
DUE;VALUE=DATE:${todayStr}
STATUS:NEEDS-ACTION
DESCRIPTION:PT2H
END:VTODO
END:VCALENDAR`;

    const result = parseICSFile(content);
    
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('タスク1');
    expect(result[0].estimatedPomodoros).toBe(1); // デフォルト値
    expect(result[1].text).toBe('タスク2');
    expect(result[1].estimatedPomodoros).toBe(4); // 2時間 = 4ポモドーロ
  });

  test('時間情報からポモドーロ数を正しく推定する', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const content = `BEGIN:VCALENDAR
BEGIN:VTODO
SUMMARY:30分タスク
DUE;VALUE=DATE:${todayStr}
STATUS:NEEDS-ACTION
DESCRIPTION:PT0.5H
END:VTODO
BEGIN:VTODO
SUMMARY:3時間タスク
DUE;VALUE=DATE:${todayStr}
STATUS:NEEDS-ACTION
DESCRIPTION:PT3H
END:VTODO
END:VCALENDAR`;

    const result = parseICSFile(content);
    
    expect(result[0].estimatedPomodoros).toBe(1); // 0.5時間 = 1ポモドーロ
    expect(result[1].estimatedPomodoros).toBe(6); // 3時間 = 6ポモドーロ
  });

  test('ICSファイルの重複読み込み問題 - 同じ内容を二度読み込んでも重複しない', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const content = `BEGIN:VCALENDAR
BEGIN:VTODO
SUMMARY:テストタスク
DUE;VALUE=DATE:${todayStr}
STATUS:NEEDS-ACTION
END:VTODO
END:VCALENDAR`;

    // 同じ内容を二度パース
    const result1 = parseICSFile(content);
    const result2 = parseICSFile(content);
    
    // 両方とも同じ結果を返す
    expect(result1).toHaveLength(1);
    expect(result2).toHaveLength(1);
    expect(result1[0].text).toBe('テストタスク');
    expect(result2[0].text).toBe('テストタスク');
    
    // IDが異なることを確認（重複しない）
    expect(result1[0].id).not.toBe(result2[0].id);
  });
});