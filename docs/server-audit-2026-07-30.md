# txcloud 服务器与 SSH 审计（2026-07-30）

本报告先使用 `txcloud` SSH 别名执行只读检查，随后按发布任务完成受控生产恢复。未记录公网 IP、密钥、令牌或 `.env` 内容；未执行包升级、数据库变更、端口修改或宽范围 Docker 清理。

## 结论

- 服务器不是 SSH 交互卡顿的主要来源：负载低、无 IO wait、无 failed systemd unit，登录 shell 初始化约 0 秒。
- 本机无线链路是主要抖动源：当前为 2.4GHz、RSSI -66dBm、发送速率 36Mbps；本地网关延迟峰值 153ms，服务器延迟峰值 733ms。
- 博客已恢复到 `62cc5ae`，公网与容器内 `/api/version` 均返回相同 SHA 和 `healthy:true`，timer 已恢复 active。
- Docker 运行态健康，但镜像与 BuildKit 缓存占用偏高；新构建后 BuildKit 为 24.8GB、系统盘 72%。既定“仅清 7 天前”策略实测回收 0B。
- Postfix 配置不完整且对公网监听 25 端口；邮件队列为空，但日志持续报 `/etc/mailname` 缺失。

## 系统与服务

| 项目 | 观测值 | 判断 |
| --- | --- | --- |
| 负载 | 0.08 / 0.09 / 0.09 | 正常 |
| 内存 | 3.6GiB，总可用约 2.1GiB | 正常 |
| Swap | 使用约 963MiB，检查期间无持续换出 | 不是当前卡顿源 |
| 系统盘 | 59GB，使用 68%，剩余约 19GB | 需要控制构建缓存增长 |
| systemd | 0 个 failed unit | 正常 |
| 博客容器 | healthy，约 199MiB | 正常 |
| 其他容器 | API、Web、PostgreSQL、Uptime Kuma 均运行 | 正常 |
| 安全更新 | `snapd`；另有 Docker Buildx 功能更新 | 进入维护窗口处理 |

对公网 TCP 监听仅看到 SSH 5522 与 Postfix 25；Web、监控、数据库和应用端口均绑定回环地址，通过既有反向代理或隧道访问。

## SSH 卡顿

服务器端证据：

- 当前 SSH socket RTT 约 33–39ms，BBR 已启用，TCP MTU probing 为 2。
- `UseDNS no`、`GSSAPIAuthentication no`，不存在常见的反向 DNS/GSSAPI 登录停顿。
- `.bashrc` 没有 `conda`、`nvm`、`starship`、网络请求或 Git 状态钩子；login/non-interactive shell 初始化都约 0 秒。
- CPU、内存压力和 IO wait 在检查时均不足以解释逐键回显卡顿。

本机链路证据：

- Intel AX211 驱动版本 24.40.0.4，驱动并不陈旧。
- 当前只发现 2.4GHz AP；发送速率 36Mbps，网关 RTT 为 2–153ms。
- 到服务器无丢包，但 RTT 为 26–733ms。SSH 的逐键回显必须等待网络往返，因此会直接表现为偶发卡顿。

优先处置顺序：

1. 在路由器开启独立 5GHz/6GHz SSID，并让笔记本连接该频段；条件允许时用网线复测。
2. 用 `ping` 同时复测网关与服务器。网关应稳定在个位数毫秒，服务器高分位延迟应接近基础 RTT。
3. Windows OpenSSH 9.5 的 `ControlMaster` 实测报 `getsockname failed: Not a socket`，不要写入配置。它也只能优化重复建连，不能修复已连接会话的逐键卡顿。
4. 如果无线环境无法改善，可评估 Mosh；它需要安装客户端/服务端并开放 UDP 端口，应另做变更窗口和防火墙确认。

## 部署链路

- `txcloud-blog-pull.timer` 已启用且 active，每两分钟运行一次；fetch 使用 HTTPS、单次 180 秒、最多两次。
- 服务器旧提交 `52cdabf` 与新生产提交原本在 `628d055` 后分叉，严格 `--ff-only` 不可能成功。已增加不改变文件树的历史汇合提交 `62cc5ae`，保留旧生产历史并恢复可快进发布。
- 服务器到 GitHub 的 SSH fetch 曾在 `index-pack` 停顿约 10 分钟；HTTPS fetch 也出现连接建立后 2 分钟无 pack 数据。最终通过本地生成的 17.5MB 增量 Git bundle 经 SSH 恢复，证明问题是服务器到 GitHub 的出站路径，不是仓库损坏。
- 新镜像构建约 689 秒，其中 `npm ci` 493 秒；559 个静态页面构建、TypeScript 与容器健康检查均成功。旧容器在镜像构建期间保持 healthy，镜像完成后才被替换。
- 公网与回环 `/api/version` 当前均返回 `62cc5ae939a5408ce968d7575dcccf2e58db2126`。Cloudflare 缓存已清理，Java API 已配置 JDK 17 Judge0 后端。

下一步不应继续优化“服务器现场拉源码并构建”，而应由 CI 产出按 SHA 标记的不可变镜像，服务器只拉镜像、启动候选容器、验证后切流。当前脚本在新容器 unhealthy 时只退出，没有恢复上一健康镜像。

## Docker 磁盘

新构建后观测到镜像约 10.9GB、BuildKit 缓存约 24.8GB，其中 Docker 标记约 13.5GB 可回收。运行容器日志很小，博客 compose 已有 `10m x 3` 日志轮转，因此主要问题不是应用日志。

部署脚本已增加发布成功后的保守清理：

- 仅处理 7 天前的未使用 BuildKit 缓存和悬空镜像。
- BuildKit 保留上限 8GB。
- 不执行 `docker system prune`、`docker volume prune` 或 `image prune --all`。
- 清理有时间上限且失败不影响已经健康的发布。

该逻辑已部署。手工执行同一策略时回收 0B，因为可回收对象均未超过 7 天；系统盘已从 69% 增至 72%。这说明长期解法是把构建迁出服务器，而不是缩短保留期并反复删除近期缓存。

## Postfix

当前状态：

- 服务 enabled，对 IPv4/IPv6 全接口监听 25。
- `myhostname=localhost.localdomain`，`/etc/mailname` 不存在。
- 邮件队列为空；日志约每 16 分钟出现一次缺失文件错误。

需要在以下两条路径中明确选择，不能自动猜测：

- 不需要服务器发信：停用并禁用 Postfix，关闭 25 端口，再验证监控与定时任务不依赖本地邮件。
- 需要发信：设置真实邮件身份与 relay 策略，创建 `/etc/mailname`，限制中继与监听范围，并做外发/拒绝中继测试。
