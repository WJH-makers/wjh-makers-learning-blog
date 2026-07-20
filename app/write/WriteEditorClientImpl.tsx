"use client";

import type { Block, PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

const DRAFT_KEY = "wjh-learning-blog:write-draft:v1";
const TOKEN_KEY = "wjh-learning-blog:admin-token";
const DEFAULT_TAGS = "Java, Git, MySQL, 复盘";

const KNOWLEDGE_CARD_TEMPLATE = [
  { type: "heading", props: { level: 2 }, content: "今天学习的概念" },
  { type: "paragraph", content: "用一句话写清楚今天真正理解了什么。" },
  { type: "heading", props: { level: 2 }, content: "为什么重要" },
  { type: "bulletListItem", content: "它解决的真实问题：" },
  { type: "bulletListItem", content: "以后可以复用的场景：" },
  { type: "heading", props: { level: 2 }, content: "核心知识点" },
  { type: "bulletListItem", content: "概念 / 原理：" },
  { type: "bulletListItem", content: "关键步骤：" },
  { type: "bulletListItem", content: "和旧知识的联系：" },
  { type: "heading", props: { level: 2 }, content: "示例 / 命令 / 代码" },
  { type: "paragraph", content: "把最小可运行示例、关键命令或代码片段放在这里。" },
  { type: "codeBlock", props: { language: "bash" }, content: "# command or code here" },
  { type: "heading", props: { level: 2 }, content: "易错点" },
  { type: "bulletListItem", content: "容易混淆：" },
  { type: "bulletListItem", content: "报错信号：" },
  { type: "bulletListItem", content: "避坑规则：" },
  { type: "heading", props: { level: 2 }, content: "练习与验证" },
  { type: "checkListItem", props: { checked: false }, content: "跑一次构建 / 测试 / 命令并记录结果。" },
  { type: "checkListItem", props: { checked: false }, content: "确认自己能不看笔记复述核心流程。" },
  { type: "heading", props: { level: 2 }, content: "明天继续" },
  { type: "bulletListItem", content: "下一步：" },
] satisfies PartialBlock[];

const TEMPLATE_MARKDOWN = `## 今天学习的概念

用一句话写清楚今天真正理解了什么。

## 为什么重要

- 它解决的真实问题：
- 以后可以复用的场景：

## 核心知识点

- 概念 / 原理：
- 关键步骤：
- 和旧知识的联系：

## 示例 / 命令 / 代码

把最小可运行示例、关键命令或代码片段放在这里。

\`\`\`bash
# command or code here
\`\`\`

## 易错点

- 容易混淆：
- 报错信号：
- 避坑规则：

## 练习与验证

- [ ] 跑一次构建 / 测试 / 命令并记录结果。
- [ ] 确认自己能不看笔记复述核心流程。

## 明天继续

- 下一步：`;

type PublishAction = (formData: FormData) => void | Promise<void>;

type WriteEditorClientProps = {
  initialDate: string;
  publishAction: PublishAction;
  deleteAction?: PublishAction;
  isAuthenticated: boolean;
  editingSlug?: string;
  initialTitle?: string;
  initialSummary?: string;
  initialTags?: string;
  initialContent?: string;
};

type Draft = {
  version: 1;
  title: string;
  summary: string;
  tags: string;
  date: string;
  blocks: Block[];
  updatedAt: string;
};

function readStoredDraft(): Draft | undefined {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!Array.isArray(parsed.blocks)) return undefined;
    return {
      version: 1,
      title: String(parsed.title ?? ""),
      summary: String(parsed.summary ?? ""),
      tags: String(parsed.tags ?? DEFAULT_TAGS),
      date: String(parsed.date ?? ""),
      blocks: parsed.blocks as Block[],
      updatedAt: String(parsed.updatedAt ?? new Date().toISOString()),
    };
  } catch {
    return undefined;
  }
}

function formatDraftTime(value?: string | null): string {
  if (!value) return "尚未保存";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function WriteEditorClient({
  initialDate,
  publishAction,
  deleteAction,
  isAuthenticated,
  editingSlug,
  initialTitle = "",
  initialSummary = "",
  initialTags = "",
  initialContent = "",
}: WriteEditorClientProps) {
  const isEditing = Boolean(editingSlug);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [date, setDate] = useState(initialDate);
  const [markdown, setMarkdown] = useState(TEMPLATE_MARKDOWN);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const [storedDraftAt, setStoredDraftAt] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState("正在准备本地写作台……");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [savedToken, setSavedToken] = useState("");
  const [rememberToken, setRememberToken] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const contentInputRef = useRef<HTMLInputElement>(null);
  const programmaticChangeUntilRef = useRef(0);
  const markdownCharCount = markdown.trim().length;
  const sectionCount = (markdown.match(/^##\s/gm) ?? []).length;

  const editor = useCreateBlockNote({
    initialContent: KNOWLEDGE_CARD_TEMPLATE,
    placeholders: {
      default: "继续补充今天的心得、证据或下一步。",
      emptyDocument: "从知识卡片模板开始记录今天的学习成果。",
      heading: "知识卡片小节",
    },
  });

  const syncMarkdown = useCallback(() => {
    const nextMarkdown = editor.blocksToMarkdownLossy(editor.document);
    setMarkdown(nextMarkdown);
    if (contentInputRef.current) {
      contentInputRef.current.value = nextMarkdown;
    }
    return nextMarkdown;
  }, [editor]);

  const markDirty = useCallback(() => {
    if (!draftLoaded) return;
    setDraftDirty(true);
  }, [draftLoaded]);

  const replaceEditorContent = useCallback(
    (blocks: PartialBlock[]) => {
      programmaticChangeUntilRef.current = Date.now() + 600;
      editor.replaceBlocks(
        editor.document.map((block) => block.id),
        blocks,
      );
      window.setTimeout(syncMarkdown, 0);
    },
    [editor, syncMarkdown],
  );

  const loadMarkdownIntoEditor = useCallback(
    async (md: string) => {
      const blocks = await editor.tryParseMarkdownToBlocks(md);
      replaceEditorContent(blocks);
    },
    [editor, replaceEditorContent],
  );

  const restoreDraft = useCallback(
    (draft?: Draft) => {
      const stored = draft ?? readStoredDraft();
      if (!stored) {
        setDraftStatus("没有找到可恢复的本地草稿。");
        setStoredDraftAt(null);
        return false;
      }

      setTitle(stored.title);
      setSummary(stored.summary);
      setTags(stored.tags || DEFAULT_TAGS);
      setDate(stored.date || initialDate);
      replaceEditorContent(stored.blocks);
      setStoredDraftAt(stored.updatedAt);
      setDraftDirty(false);
      setValidationMessage(null);
      setDraftStatus(`已恢复 ${formatDraftTime(stored.updatedAt)} 的本地草稿。`);
      return true;
    },
    [initialDate, replaceEditorContent],
  );

  const resetToTemplate = useCallback(() => {
    setTitle("");
    setSummary("");
    setTags(DEFAULT_TAGS);
    setDate(initialDate);
    replaceEditorContent(KNOWLEDGE_CARD_TEMPLATE);
    setMarkdown(TEMPLATE_MARKDOWN);
    if (contentInputRef.current) {
      contentInputRef.current.value = TEMPLATE_MARKDOWN;
    }
    setValidationMessage(null);
  }, [initialDate, replaceEditorContent]);

  const saveDraft = useCallback(
    (status: string) => {
      try {
        const updatedAt = new Date().toISOString();
        const draft: Draft = {
          version: 1,
          title,
          summary,
          tags,
          date,
          blocks: editor.document,
          updatedAt,
        };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setStoredDraftAt(updatedAt);
        setDraftDirty(false);
        setDraftStatus(status.replace("{time}", formatDraftTime(updatedAt)));
        return draft;
      } catch {
        setDraftStatus("草稿保存失败：浏览器可能禁用了 localStorage。");
        return undefined;
      }
    },
    [date, editor, summary, tags, title],
  );

  useEffect(() => {
    if (isEditing) {
      setTitle(initialTitle);
      setSummary(initialSummary);
      setTags(initialTags || DEFAULT_TAGS);
      setDate(initialDate);
      void loadMarkdownIntoEditor(initialContent);
      setDraftStatus("正在编辑已发布的文章；保存后会覆盖数据库中的内容，本地草稿不受影响。");
    } else {
      const stored = readStoredDraft();
      if (stored) {
        restoreDraft(stored);
      } else {
        syncMarkdown();
        setDraftStatus("已载入知识卡片模板；开始输入后会自动保存到本机。");
      }
    }
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setSavedToken(storedToken);
      setRememberToken(true);
    }
    setDraftLoaded(true);
  }, [
    isEditing,
    initialTitle,
    initialSummary,
    initialTags,
    initialContent,
    initialDate,
    loadMarkdownIntoEditor,
    restoreDraft,
    syncMarkdown,
  ]);

  useEffect(() => {
    if (!draftLoaded || !draftDirty || isEditing) return undefined;

    const timeoutId = window.setTimeout(() => {
      saveDraft("草稿已自动保存：{time}");
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [draftDirty, draftLoaded, isEditing, markdown, saveDraft]);

  function handleEditorChange() {
    syncMarkdown();
    if (Date.now() <= programmaticChangeUntilRef.current) return;
    markDirty();
  }

  function handleClearDraft() {
    window.localStorage.removeItem(DRAFT_KEY);
    setStoredDraftAt(null);
    setDraftDirty(false);
    resetToTemplate();
    setDraftStatus("本地草稿已清空；刷新后不会恢复旧内容。");
  }

  function handleResetTemplate() {
    resetToTemplate();
    setDraftDirty(true);
    setDraftStatus("已重置为知识卡片模板，保存后会覆盖本地草稿。");
  }

  async function handleLogin() {
    if (!savedToken.trim()) {
      setValidationMessage("请先输入发布密钥。");
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: savedToken.trim() }),
      });
      if (res.ok) {
        if (rememberToken) {
          window.localStorage.setItem(TOKEN_KEY, savedToken.trim());
        }
        window.location.reload();
      } else {
        setValidationMessage("密钥不正确，登录失败。");
      }
    } catch {
      setValidationMessage("登录请求失败，请检查网络。");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const nextMarkdown = syncMarkdown();
    const trimmedMarkdown = nextMarkdown.trim();

    if (!title.trim()) {
      event.preventDefault();
      setValidationMessage("标题不能为空。");
      return;
    }

    if (!trimmedMarkdown) {
      event.preventDefault();
      setValidationMessage("正文不能为空。");
      return;
    }

    const confirmed = window.confirm(
      isEditing
        ? "保存后将更新数据库中的这篇文章，并刷新首页、文章页、标签页和 RSS。确认保存？"
        : "发布后将写入 MongoDB，并公开到首页、文章页、标签页和 RSS。确认发布？",
    );
    if (!confirmed) {
      event.preventDefault();
      setDraftStatus(isEditing ? "已取消保存修改。" : "已取消发布，本地草稿仍保留。");
      return;
    }

    if (!isAuthenticated && rememberToken && savedToken) {
      window.localStorage.setItem(TOKEN_KEY, savedToken);
    }
    setValidationMessage(null);
    if (!isEditing) {
      saveDraft("发布前已保存本地草稿：{time}");
    }
  }

  return (
    <div className="editor-layout write-studio">
      <form className="editor-form" action={publishAction} onSubmit={handleSubmit}>
        <div className="write-command">
          <div>
            <p className="eyebrow">Knowledge Card Studio</p>
            <h2>先写清楚，再发布</h2>
          </div>
          <div className="write-status-strip" aria-label="写作状态">
            <span>{draftDirty ? "Unsaved" : "Saved"}</span>
            <span>{sectionCount} sections</span>
            <span>{markdownCharCount} chars</span>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="auth-status ok">
            <span>凭证状态：已登录（Cookie），无需输入发布密钥</span>
          </div>
        ) : null}

        <label className="title-field">
          <span>标题</span>
          <input
            name="title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              markDirty();
            }}
            placeholder="今天真正掌握了什么？"
            required
          />
        </label>

        <label>
          <span>摘要</span>
          <input
            name="summary"
            value={summary}
            onChange={(event) => {
              setSummary(event.target.value);
              markDirty();
            }}
            placeholder="一句话沉淀结论；留空会自动截取正文。"
          />
        </label>

        <div className="form-grid meta-grid">
          <label>
            <span>日期</span>
            <input
              name="date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                markDirty();
              }}
              required
            />
          </label>
          <label>
            <span>标签（英文逗号分隔）</span>
            <input
              name="tags"
              value={tags}
              onChange={(event) => {
                setTags(event.target.value);
                markDirty();
              }}
            />
          </label>

          {isAuthenticated ? null : (
            <>
              <label>
                <span>发布密钥</span>
                <input
                  name="token"
                  type="password"
                  autoComplete="off"
                  placeholder="BLOG_ADMIN_TOKEN"
                  required
                  value={savedToken}
                  onChange={(e) => setSavedToken(e.target.value)}
                />
              </label>
              <label className="remember-token">
                <input type="checkbox" checked={rememberToken} onChange={(e) => setRememberToken(e.target.checked)} />
                <span>记住密钥</span>
              </label>
            </>
          )}
        </div>

        {isAuthenticated ? null : (
          <div className="hero-actions login-bar">
            <button className="button primary" type="button" disabled={loggingIn} onClick={handleLogin}>
              {loggingIn ? "登录中……" : "登录并记住凭证"}
            </button>
          </div>
        )}

        {isEditing ? <input type="hidden" name="slug" value={editingSlug} /> : null}
        <input ref={contentInputRef} type="hidden" name="content" defaultValue={markdown} />

        <section className="block-editor-field" aria-label="正文块编辑器">
          <div className="field-head">
            <span>正文</span>
            <em>输入 / 打开块菜单；发布时自动转换 Markdown。</em>
          </div>
          <BlockNoteView editor={editor} theme="light" onChange={handleEditorChange} />
        </section>

        {validationMessage ? <p className="form-error">E43: {validationMessage}</p> : null}

        <div className="hero-actions publish-bar">
          <button className="button primary" type="submit">{isEditing ? "保存修改" : "发布今日心得"}</button>
          <button className="button" type="button" onClick={() => saveDraft("草稿已手动保存：{time}")}>保存草稿</button>
          <button className="button" type="button" onClick={handleResetTemplate}>重置模板</button>
        </div>
      </form>

      <aside className="editor-note" aria-label="知识卡片写作清单">
        <div className="editor-note-head">
          <p className="eyebrow">Desk Tools</p>
          <h2>只保留有用的</h2>
        </div>

        <div className="draft-panel compact-card">
          <p className="eyebrow">Local Draft</p>
          <p>{draftStatus}</p>
          <div className="draft-metrics">
            <span>保存：{formatDraftTime(storedDraftAt)}</span>
            <span>{markdownCharCount} 字符</span>
          </div>
          <div className="draft-actions">
            <button className="button" type="button" onClick={() => saveDraft("草稿已手动保存：{time}")}>保存</button>
            <button className="button" type="button" onClick={() => restoreDraft()} disabled={!storedDraftAt}>恢复</button>
            <button className="button" type="button" onClick={handleClearDraft}>清空</button>
          </div>
        </div>

        <details className="tips-panel" open>
          <summary>知识卡片技巧</summary>
          <ol>
            <li><strong>先写概念</strong><span>第一段只回答"今天懂了什么"。</span></li>
            <li><strong>再放证据</strong><span>命令、代码、截图结论比长解释更有用。</span></li>
            <li><strong>最后留下一步</strong><span>给明天一个可执行动作，不写空口号。</span></li>
          </ol>
        </details>

        <details className="tips-panel">
          <summary>BlockNote 快捷用法</summary>
          <ol>
            <li><strong>/</strong><span>插入标题、列表、代码块。</span></li>
            <li><strong>拖拽</strong><span>移动小节，先排序再精修。</span></li>
            <li><strong>勾选</strong><span>用任务项记录验证是否完成。</span></li>
          </ol>
        </details>

        <details className="markdown-panel">
          <summary>Markdown 输出检查</summary>
          <textarea className="markdown-preview" value={markdown} readOnly rows={12} />
        </details>

        {isEditing && deleteAction ? (
          <form
            className="draft-panel compact-card"
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm("确认删除这篇文章？删除后会从数据库永久移除，且无法从网页恢复。")) {
                event.preventDefault();
              }
            }}
          >
            <p className="eyebrow">Danger Zone</p>
            <p>删除后将从 MongoDB 永久移除这篇文章，并刷新首页、文章、标签和 RSS。</p>
            <input type="hidden" name="slug" value={editingSlug} />
            <div className="draft-actions">
              <button className="button" type="submit">删除这篇文章</button>
            </div>
          </form>
        ) : null}

        <a className="button" href="/posts">查看归档</a>
      </aside>
    </div>
  );
}
