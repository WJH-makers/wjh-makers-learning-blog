# txcloud 拉取式发布

GitHub Actions 只负责在 `main` 上验证 `npm ci`、类型检查、生产构建和 critical 依赖审计。全部通过后，工作流把该提交更新为 `production` 引用；它不再从 hosted runner 连接服务器 SSH。

txcloud 上的 `txcloud-blog-pull.timer` 每两分钟（另加至多 20 秒抖动）运行一次：

1. 拒绝工作区有未提交改动的情况；不会 stash、reset 或覆盖人工工作。
2. 仅快进到 `origin/production`，因此失败的 CI 提交不会进入生产环境。
3. 执行 `docker compose up -d --build`，等待 `blog` health check 并请求本机首页。
4. 只有健康检查成功才写入最后成功提交；失败会在下一次 tick 重试。

服务器上的一次性安装（以已存在的 `ubuntu` 服务账户执行）：

```bash
cd /home/ubuntu/blog
sudo install -m 0644 ops/txcloud-blog-pull.service /etc/systemd/system/txcloud-blog-pull.service
sudo install -m 0644 ops/txcloud-blog-pull.timer /etc/systemd/system/txcloud-blog-pull.timer
sudo systemctl daemon-reload
sudo systemctl enable --now txcloud-blog-pull.timer
sudo systemctl start txcloud-blog-pull.service
```

运行状态与故障证据：

```bash
systemctl list-timers txcloud-blog-pull.timer
sudo systemctl status txcloud-blog-pull.service
sudo journalctl -u txcloud-blog-pull.service -n 100 --no-pager
```

这个模式不需要开放 GitHub hosted runner 到服务器的入站 SSH。旧的 `DEPLOY_*` GitHub Secrets 在确认数个发布周期稳定后应按密钥指纹轮换/删除；不要在无法确认其是否被其他服务使用时直接删除。
