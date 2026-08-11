#!/usr/bin/env bash
# txcloud 运维辅助:把多条命令合并进一次 SSH 会话。
#
# 为什么需要它:走 Cloudflare Access 的每次连接都要重新完成 Access 授权往返,
# 实测固定约 4 秒(KEXINIT 1s + 认证 2s + 命令下发 1s),且这段开销在客户端
# 消不掉 —— ControlMaster 连接复用在 Windows OpenSSH 上不可用(会直接报
# "getsockname failed: Not a socket"),cloudflared 常驻 --listener 也一样,
# 因为慢的是 Access 授权而不是隧道建立。
#
# 所以唯一有效的办法是「少连几次」:5 条命令分 5 次连是 20 秒,合成一次是 4 秒。
#
# 用法:
#   scripts/txcloud.sh status              # 一次会话取回全部健康指标
#   scripts/txcloud.sh logs [行数]         # 部署日志
#   scripts/txcloud.sh deploy              # 手动触发部署
#   scripts/txcloud.sh run 'cmd1' 'cmd2'   # 任意多条命令,合并进一次会话
set -Eeuo pipefail

# Git Bash 的 /usr/bin/ssh 连不上 Windows ssh-agent 命名管道,必须用 Windows 版。
readonly SSH="${TXCLOUD_SSH:-C:/Windows/System32/OpenSSH/ssh.exe}"
readonly HOST="${TXCLOUD_HOST:-txcloud}"

die() { echo "$*" >&2; exit 1; }

# 把 stdin 上的脚本整体交给远端一个 bash 执行 —— 一次连接跑完所有命令。
remote() { "$SSH" -o BatchMode=yes "$HOST" 'bash -s'; }

cmd_status() {
  remote << 'REMOTE'
set -u
echo "── 主机 ───────────────────────────────"
uptime | tr -s ' '
echo
echo "── 磁盘 ───────────────────────────────"
df -h / | tail -1 | awk '{print "  / "$3" / "$2" ("$5" used)"}'
echo
echo "── 内存 ───────────────────────────────"
free -m | awk '/^Mem:/{printf "  %sMB / %sMB (%.0f%%)\n", $3, $2, $3/$2*100}'
echo
echo "── 容器 ───────────────────────────────"
docker ps --format '{{.Names}}\t{{.Status}}' 2>/dev/null \
  | awk -F'\t' '{printf "  %-28s %s\n", $1, $2}' || echo "  docker 不可用"
echo
echo "── 部署版本 ───────────────────────────"
cd /home/ubuntu/blog 2>/dev/null && {
  echo "  HEAD:       $(git rev-parse --short=12 HEAD)"
  echo "  production: $(git rev-parse --short=12 origin/production 2>/dev/null || echo '未知')"
}
served="$(curl -fsS --max-time 10 http://127.0.0.1:3001/api/version 2>/dev/null \
  | sed -n 's/.*"commit":"\([0-9a-f]\{12\}\)[0-9a-f]*".*/\1/p')"
echo "  容器在服务:  ${served:-取不到}"
echo
echo "── 定时器 ─────────────────────────────"
systemctl list-timers 'txcloud-blog-*' --all --no-pager 2>/dev/null \
  | awk 'NR>1 && NF>3 {print "  "$NF"  下次 "$1" "$2" "$3}' | head -4
REMOTE
}

cmd_logs() {
  local lines="${1:-40}"
  [[ "$lines" =~ ^[0-9]+$ ]] || die "行数必须是数字:$lines"
  # 变量在本地展开后再送进远端,避免远端再解析一次。
  remote << REMOTE
sudo journalctl -u txcloud-blog-pull.service -n ${lines} --no-pager 2>/dev/null \
  || journalctl -u txcloud-blog-pull.service -n ${lines} --no-pager 2>/dev/null \
  || echo "读不到日志(可能需要 sudo 权限)"
REMOTE
}

cmd_deploy() {
  echo "触发部署(服务器会自行校验容器 commit,不符会拒绝)…"
  remote << 'REMOTE'
sudo systemctl start txcloud-blog-pull.service 2>/dev/null \
  || systemctl --user start txcloud-blog-pull.service 2>/dev/null \
  || bash /home/ubuntu/blog/scripts/deploy-from-origin.sh
REMOTE
}

cmd_run() {
  (( $# > 0 )) || die "run 需要至少一条命令"
  # printf '%s\n' 保证每条命令独占一行,不会被空格拼接。
  printf '%s\n' "$@" | remote
}

case "${1:-status}" in
  status) cmd_status ;;
  logs)   shift; cmd_logs "$@" ;;
  deploy) cmd_deploy ;;
  run)    shift; cmd_run "$@" ;;
  *)      die "未知子命令:$1（可用:status / logs / deploy / run）" ;;
esac
