# txcloud 拉取式发布

GitHub Actions 只验证 `main`。类型检查、测试、生产构建和依赖审计全部通过后，工作流才更新 `production` 引用；GitHub hosted runner 不再直接连接服务器 SSH。

服务器上的 `txcloud-blog-pull.timer` 每两分钟（另加至多 20 秒抖动）执行一次：

1. 工作区有未提交改动时拒绝发布，不 stash、reset 或覆盖人工工作。
2. 精确对齐 CI 强推的 `origin/production` 发布引用；失败的 CI 提交不会进入生产环境。
3. 把目标 Git SHA 写入镜像，运行 `docker compose up -d --build`，等待容器健康检查，并用本次容器启动时生成的随机授权 token 向仅绑定宿主回环的 `/api/version` 核对 SHA。
4. 发布成功后按本次变更精确失效 Cloudflare URL；非文章代码变更回退为全量失效。
5. GitHub Actions 轮询公网 `/api/version`，只确认生产边缘健康且没有泄漏内部 commit。

一次性安装：

```bash
cd /home/ubuntu/blog
sudo install -m 0644 ops/txcloud-blog-pull.service /etc/systemd/system/txcloud-blog-pull.service
sudo install -m 0644 ops/txcloud-blog-pull.timer /etc/systemd/system/txcloud-blog-pull.timer
sudo systemctl daemon-reload
sudo systemctl enable --now txcloud-blog-pull.timer
sudo systemctl start txcloud-blog-pull.service
```

状态与故障证据：

```bash
systemctl list-timers txcloud-blog-pull.timer
sudo systemctl status txcloud-blog-pull.service
sudo journalctl -u txcloud-blog-pull.service -n 100 --no-pager
```

生产 `.env` 需要 `CLOUDFLARE_TOKEN` 与 `CLOUDFLARE_ZONE_ID`。旧的 `DEPLOY_*` GitHub Secrets 应在确认数个发布周期稳定后再按密钥指纹轮换或删除。

## 从本地查看服务器状态

`scripts/txcloud.sh` 把多条命令合并进一次 SSH 会话：

```bash
scripts/txcloud.sh status            # 主机 / 磁盘 / 内存 / 容器 / 部署版本 / 定时器
scripts/txcloud.sh logs 40           # 部署日志尾部
scripts/txcloud.sh deploy            # 手动触发一次拉取部署
scripts/txcloud.sh run 'cmd1' 'cmd2' # 任意多条命令，仍只连一次
```

**为什么要合并**：管理入口走 Cloudflare Access（公网 5522 已关），每建一个新连接都要重新完成一次 Access 授权往返，实测固定约 4 秒——KEXINIT 1 秒、认证 2 秒、命令下发 1 秒。分 6 次连接查状态要 24 秒，合成一次是 5 秒。

这 4 秒在客户端消不掉，两条路都验证过不通：

- **ControlMaster 连接复用**：Windows OpenSSH 不支持 Unix domain socket 形式的复用，配上去连接直接失败并报 `getsockname failed: Not a socket`。`~/.ssh/config` 里留了注释记着这个坑。
- **cloudflared 常驻 `access tcp --listener`**：隧道确实复用了，但每个新 TCP 连接仍要重走 Access 授权，实测同样 4.1 秒。慢的是授权而不是隧道建立。

1Password SSH agent 签名只占 67 毫秒，密钥也一次命中（`IdentitiesOnly yes` + 指定 `IdentityFile`），这两处都不是瓶颈。所以唯一有效的办法就是少连几次。
