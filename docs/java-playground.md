# Java Playground 执行架构

文章页只负责编辑、输入、诊断和结果展示。用户代码不会在 Next.js/Vercel 进程中调用本机 `javac` 或 `java`，而是经同源 `POST /api/java/run` 转发到独立 Judge0 CE 沙箱。

## 产品边界

- Java 17、默认包、单文件 `Main.java`
- 源码最多 20,000 字符，stdin 最多 4,000 字符
- 编译预算 4 秒、运行预算 2 秒、内存 128 MB
- 网络关闭，输出最多 4,000 字符
- 编译错误映射到行列；实际输出与课程预期输出分开显示
- 页面上的本地预检只提供快速反馈，不能冒充 `javac` 结果

## 配置

```dotenv
JAVA_JUDGE0_URL=https://judge0.example.com
JAVA_JUDGE0_LANGUAGE_ID=<该实例的 Java 17 language id>
JAVA_JUDGE0_TOKEN=<可选的 X-Auth-Token>
```

不同 Judge0 实例的 language id 可能不同，部署时应从该实例的 `/languages` 响应确认 Java 17 对应值。未配置完整时，界面显示“执行服务待配置”并禁用运行按钮。

## 部署要求

Judge0 必须作为独立服务部署，并在容器/主机层继续限制 CPU、内存、进程数、文件系统、网络、输出与并发。站点 API 的内存限流只适合低流量和自托管长驻进程；公开生产环境还应在 Cloudflare、Nginx 或共享 Redis 限流层增加按 IP 配额。

停止按钮会中止浏览器请求，并通过请求信号中止站点到沙箱的等待。执行服务仍需自身提供作业超时和清理，不能依赖客户端断开完成隔离。
