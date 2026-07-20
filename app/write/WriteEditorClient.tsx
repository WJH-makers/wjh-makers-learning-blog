"use client";

import dynamic from "next/dynamic";

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

const WriteEditorClientImpl = dynamic(() => import("./WriteEditorClientImpl"), {
  ssr: false,
  loading: () => (
    <div className="editor-layout">
      <section className="editor-form editor-loading" aria-live="polite">
        <p className="eyebrow">Loading Desk</p>
        <h2>正在装载块编辑器</h2>
        <p>写作台会在浏览器中加载，以便使用本地草稿和 BlockNote 块编辑体验。</p>
      </section>
      <aside className="editor-note">
        <p className="eyebrow">Local Draft</p>
        <h2>准备本地草稿</h2>
        <p>草稿只保存在当前浏览器，不改变 MongoDB 发布链路。</p>
      </aside>
    </div>
  ),
});

export default function WriteEditorClient(props: WriteEditorClientProps) {
  return <WriteEditorClientImpl {...props} />;
}
