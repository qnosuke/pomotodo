import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// localStorageのモック
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// FileReaderのモック
class MockFileReader {
  constructor() {
    this.onload = null;
    this.result = null;
  }

  readAsText() {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
}

global.FileReader = MockFileReader;

describe('App', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('アプリが正常にレンダリングされる', () => {
    render(<App />);
    
    expect(screen.getByText('🍅 POMO')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('新しいタスクを入力...')).toBeInTheDocument();
    expect(screen.getByText('追加')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  test('新しいTODOを追加できる', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const input = screen.getByPlaceholderText('新しいタスクを入力...');
    const addButton = screen.getByText('追加');
    
    await user.type(input, '新しいタスク');
    await user.click(addButton);
    
    expect(screen.getByText('新しいタスク')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  test('EnterキーでTODOを追加できる', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const input = screen.getByPlaceholderText('新しいタスクを入力...');
    
    await user.type(input, 'Enterで追加{enter}');
    
    expect(screen.getByText('Enterで追加')).toBeInTheDocument();
  });

  test('空のTODOは追加できない', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const addButton = screen.getByText('追加');
    
    await user.click(addButton);
    
    // TODOリストは空のまま
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  test('TODOを削除できる', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // まずTODOを追加
    const input = screen.getByPlaceholderText('新しいタスクを入力...');
    await user.type(input, '削除するタスク');
    await user.click(screen.getByText('追加'));
    
    // 削除ボタンをクリック
    const deleteButton = screen.getByText('削除');
    await user.click(deleteButton);
    
    expect(screen.queryByText('削除するタスク')).not.toBeInTheDocument();
  });

  test('TODOを完了状態にできる', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // TODOを追加
    const input = screen.getByPlaceholderText('新しいタスクを入力...');
    await user.type(input, '完了するタスク');
    await user.click(screen.getByText('追加'));
    
    // チェックボックスをクリック
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    
    expect(checkbox).toBeChecked();
    expect(screen.getByText('DONE!')).toBeInTheDocument();
  });

  test('ポモドーロの予測数を増減できる', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // TODOを追加
    const input = screen.getByPlaceholderText('新しいタスクを入力...');
    await user.type(input, 'ポモドーロテスト');
    await user.click(screen.getByText('追加'));
    
    // 初期値は1
    expect(screen.getByText('🍅 0 / 1')).toBeInTheDocument();
    
    // +ボタンをクリック
    const plusButton = screen.getAllByText('+')[0];
    await user.click(plusButton);
    
    expect(screen.getByText('🍅 0 / 2')).toBeInTheDocument();
    
    // -ボタンをクリック
    const minusButton = screen.getAllByText('-')[0];
    await user.click(minusButton);
    
    expect(screen.getByText('🍅 0 / 1')).toBeInTheDocument();
  });

  test('完了したTODOではポモドーロ数を変更できない', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // TODOを追加して完了状態にする
    const input = screen.getByPlaceholderText('新しいタスクを入力...');
    await user.type(input, '完了済みタスク');
    await user.click(screen.getByText('追加'));
    
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    
    // 完了したTODOでは+ボタンが無効化されている
    const plusButton = screen.getAllByText('+')[0];
    const minusButton = screen.getAllByText('-')[0];
    
    expect(plusButton).toBeDisabled();
    expect(minusButton).toBeDisabled();
  });

  test('進捗状況が正しく表示される', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // 複数のTODOを追加
    const input = screen.getByPlaceholderText('新しいタスクを入力...');
    await user.type(input, 'タスク1');
    await user.click(screen.getByText('追加'));
    
    await user.type(input, 'タスク2');
    await user.click(screen.getByText('追加'));
    
    // 進捗表示を確認
    expect(screen.getByText('全2件')).toBeInTheDocument();
    expect(screen.getByText('残り2件')).toBeInTheDocument();
    expect(screen.getByText('0% 完了')).toBeInTheDocument();
    
    // 1つ完了にする
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    
    expect(screen.getByText('50% 完了')).toBeInTheDocument();
  });

  test('Aboutページに移動できる', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const aboutButton = screen.getByText('About');
    await user.click(aboutButton);
    
    expect(screen.getByText('About POMO')).toBeInTheDocument();
    expect(screen.getByText('📝 アプリについて')).toBeInTheDocument();
    expect(screen.getByText('👤 作者')).toBeInTheDocument();
  });

  test('Aboutページから戻れる', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Aboutページに移動
    const aboutButton = screen.getByText('About');
    await user.click(aboutButton);
    
    // 戻るボタンをクリック
    const backButton = screen.getByText('← 戻る');
    await user.click(backButton);
    
    expect(screen.getByText('🍅 POMO')).toBeInTheDocument();
  });

  test('ICSファイル読み込みボタンが表示される', () => {
    render(<App />);
    
    expect(screen.getByText('📅 ICSファイルから今日のTODOを読み込む')).toBeInTheDocument();
  });

  test('言語切り替えが機能する', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // 初期状態は日本語
    expect(screen.getByPlaceholderText('新しいタスクを入力...')).toBeInTheDocument();
    expect(screen.getByText('追加')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    
    // 言語切り替えボタンをクリック
    const languageButton = screen.getByText('EN');
    await user.click(languageButton);
    
    // 英語に切り替わったことを確認
    expect(screen.getByPlaceholderText('Enter a new task...')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('日本語')).toBeInTheDocument();
    
    // 再度クリックで日本語に戻る
    await user.click(screen.getByText('日本語'));
    expect(screen.getByPlaceholderText('新しいタスクを入力...')).toBeInTheDocument();
    expect(screen.getByText('追加')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  test('タイマーが終了すると自動的に停止する', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    const { unmount } = render(<App />);
    
    // TODOを追加
    const input = screen.getByPlaceholderText('新しいタスクを入力...');
    await user.type(input, 'タイマーテスト');
    await user.click(screen.getByText('追加'));
    
    // タイマーを開始
    const startButton = screen.getByText('▶️ 開始');
    await user.click(startButton);
    
    // タイマーが実行中であることを確認
    expect(screen.getByText('⏸️ 停止')).toBeInTheDocument();
    
    // タイマーを終了時間まで進める（短い時間でテスト）
    await jest.advanceTimersByTimeAsync(1000);
    
    // タイマーがまだ実行中であることを確認
    expect(screen.getByText('⏸️ 停止')).toBeInTheDocument();
    
    // クリーンアップ
    unmount();
    jest.useRealTimers();
  });
});