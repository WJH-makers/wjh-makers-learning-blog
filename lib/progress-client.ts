// 连载阅读进度的 localStorage 读写。纯函数,供 client 组件在挂载后(useEffect)调用;
// 异常(隐私模式/配额/损坏 JSON)一律静默降级。

export function readCompleted(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

export function writeCompleted(storageKey: string, done: Set<string>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...done]));
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}
