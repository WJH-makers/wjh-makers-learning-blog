export const tagCategories: Record<string, { label: string; emoji: string }> = {
  "Java":     { label: "语言与框架", emoji: "☕" },
  "JDK":      { label: "语言与框架", emoji: "☕" },
  "JVM":      { label: "语言与框架", emoji: "☕" },
  "Spring":   { label: "语言与框架", emoji: "☕" },
  "HTML":     { label: "语言与框架", emoji: "☕" },
  "Markdown": { label: "语言与框架", emoji: "☕" },
  "前端":     { label: "语言与框架", emoji: "☕" },

  "Git":      { label: "工具与DevOps", emoji: "🛠" },
  "Docker":   { label: "工具与DevOps", emoji: "🛠" },
  "Maven":    { label: "工具与DevOps", emoji: "🛠" },
  "Gradle":   { label: "工具与DevOps", emoji: "🛠" },
  "SSH":      { label: "工具与DevOps", emoji: "🛠" },
  "Vim":      { label: "工具与DevOps", emoji: "🛠" },
  "systemctl": { label: "工具与DevOps", emoji: "🛠" },

  "Linux":    { label: "系统与数据库", emoji: "💻" },
  "Windows":  { label: "系统与数据库", emoji: "💻" },
  "CPU":      { label: "系统与数据库", emoji: "💻" },
  "OOM":      { label: "系统与数据库", emoji: "💻" },
  "环境配置": { label: "系统与数据库", emoji: "💻" },
  "MySQL":    { label: "系统与数据库", emoji: "💻" },
  "Redis":    { label: "系统与数据库", emoji: "💻" },
  "数据库":   { label: "系统与数据库", emoji: "💻" },

  "命令速查": { label: "学习与方法", emoji: "📝" },
  "学习方法": { label: "学习与方法", emoji: "📝" },
  "博客":     { label: "学习与方法", emoji: "📝" },
  "复盘":     { label: "学习与方法", emoji: "📝" },
} as const;

export const categoryOrder = [
  { key: "语言与框架", emoji: "☕" },
  { key: "工具与DevOps", emoji: "🛠" },
  { key: "系统与数据库", emoji: "💻" },
  { key: "学习与方法", emoji: "📝" },
] as const;
