type Props = {
  title: string;
  summary: string;
  technologies: readonly string[];
  episode: number;
};

const DISTRACTORS = [
  "跳过边界条件，只要示例能运行即可。",
  "只记住术语名称，不需要验证它解决的问题。",
  "把所有异常和失败都留给下一话再处理。",
];

export default function EpisodeExercises({ title, summary, technologies, episode }: Props) {
  const correctAt = episode % 4;
  const options = [...DISTRACTORS];
  options.splice(correctAt, 0, summary);
  const primaryTech = technologies[0] ?? "本话知识点";

  return (
    <section className="episode-exercises" aria-labelledby="episode-exercises-title">
      <p className="eyebrow">Practice Lab · 练习区</p>
      <h2 id="episode-exercises-title">本话练习</h2>
      <p className="muted">先独立作答，再展开参考要点核对思路。</p>

      <article>
        <h3>1. 选择题</h3>
        <p>关于「{title}」，下列哪一项最符合本话的核心目标？</p>
        <ol className="exercise-options" type="A">
          {options.map((option) => <li key={option}>{option}</li>)}
        </ol>
        <details>
          <summary>查看答案与理由</summary>
          <p>答案：{String.fromCharCode(65 + correctAt)}。本话聚焦于：{summary}</p>
        </details>
      </article>

      <article>
        <h3>2. 简答题</h3>
        <p>结合豆豆咖啡站，说明「{title}」解决了什么具体问题；请写出一条“输入 → 处理 → 结果”的完整路径，并指出一个需要防住的边界或故障点。</p>
        <details>
          <summary>查看参考要点</summary>
          <p>回答应包含本话的技术作用、它在咖啡站中的落点，以及至少一个错误输入、资源不足、并发或运行失败等真实边界。</p>
        </details>
      </article>

      <article>
        <h3>3. 代码题</h3>
        <p>围绕 <code>{primaryTech}</code> 写一个可独立验证的最小实现：给出明确输入和输出，补一个边界分支，并用断言、测试或可复现命令证明它的行为正确。</p>
        <details>
          <summary>查看验收标准</summary>
          <p>代码或配置片段需要可运行/可执行；不能只贴概念。正常路径和至少一条异常或边界路径都应有可验证的结果。</p>
        </details>
      </article>
    </section>
  );
}
