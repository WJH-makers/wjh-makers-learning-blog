# txcloud 拉取式发布

GitHub Actions 只验证 `main`。类型检查、测试、生产构建和依赖审计全部通过后，工作流才更新 `production` 引用；GitHub hosted runner 不再直接连接服务器 SSH。

服务器上的 `txcloud-blog-pull.timer` 每两分钟（另加至多 20 秒抖动）执行一次：

1. 工作区有未提交改动时拒绝发布，不 stash、reset 或覆盖人工工作。
2. 仅快进到 `origin/production`，失败的 CI 提交不会进入生产环境。
3. 把目标 Git SHA 写入镜像，运行 `docker compose up -d --build`，等待容器健康检查并核对 `/api/version`。
4. 发布成功后按本次变更精确失效 Cloudflare URL；非文章代码变更回退为全量失效。
5. GitHub Actions 轮询公网 `/api/version`，只有线上提交与已测试 SHA 完全一致才把发布任务标绿。

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
