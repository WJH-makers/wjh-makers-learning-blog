# Cloudflare 安全配置指南

## 修复服务器版本信息泄漏

### 1. 移除 Server 响应头
在 Cloudflare Dashboard 中配置 Transform Rules:

**路径**: Dashboard → Rules → Transform Rules → Modify Response Header

**规则配置**:
- Rule name: `Remove Server Header`
- When incoming requests match: `All incoming requests`
- Then:
  - Operation: `Remove`
  - Header name: `Server`

### 2. 限制 robots.txt 访问频率 (可选)
虽然 robots.txt 是公开文件,但可以限制过于频繁的访问:

**路径**: Dashboard → Security → WAF → Rate Limiting Rules

**规则配置**:
- Rule name: `Rate Limit Robots.txt`
- When incoming requests match:
  - Field: `URI Path`
  - Operator: `equals`
  - Value: `/robots.txt`
- With the same characteristics:
  - IP Address
- Then:
  - Choose action: `Block`
  - For duration: `10 minutes`
  - When rate exceeds: `10 requests per 1 minute`

### 3. 增强 Cookie 安全性 (已在代码中实现)
中间件已配置 Cookie 的 SameSite 属性为 `lax`,并启用:
- `httpOnly: true` - 防止 XSS 攻击读取 Cookie
- `secure: true` - 仅通过 HTTPS 传输
- `sameSite: 'lax'` - 防止 CSRF 攻击

### 4. 额外的安全响应头配置
在 Cloudflare Workers 或 Transform Rules 中添加:

```javascript
// Cloudflare Worker 示例
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const newResponse = new Response(response.body, response)
  
  // 移除可能泄漏信息的响应头
  newResponse.headers.delete('Server')
  newResponse.headers.delete('X-Powered-By')
  
  // 添加安全响应头
  newResponse.headers.set('X-Content-Type-Options', 'nosniff')
  newResponse.headers.set('X-Frame-Options', 'DENY')
  newResponse.headers.set('X-XSS-Protection', '1; mode=block')
  
  return newResponse
}
```

## 关于低危漏洞的说明

### 文件路径泄漏 (20处)
这些是技术博客文章中的**示例代码**,包含的路径如:
- `/posts/2026-07-31-cli-s05e04-deploy-day`
- `/posts/2026-07-26-cmd-cheatsheet`

**处理方式**: 这是正常的技术内容,不是安全漏洞。技术博客必然包含代码示例和路径。

### 发现电子邮箱 (10处)
文章中的示例邮箱地址,用于技术教学。

**处理方式**: 如果是真实邮箱,考虑用示例域名(example.com)替换。

### 发现内网IP地址 (10处)
文章中用于教学的内网 IP 示例(如 192.168.x.x, 127.0.0.1, 172.x.x.x)。

**处理方式**: 这是正常的技术教学内容,内网 IP 示例不构成安全威胁。

## 验证修复效果

修复完成后,可使用以下工具验证:

1. **检查响应头**:
```bash
curl -I https://wwjjhh.online
```

应该看到:
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Strict-Transport-Security: max-age=63072000`
- ✅ 没有 `Server: cloudflare` 或版本信息
- ✅ 没有 `X-Powered-By`

2. **检查 Cookie**:
打开浏览器开发者工具 → Application → Cookies
所有 Cookie 应该有:
- ✅ `SameSite: Lax`
- ✅ `Secure: true`
- ✅ `HttpOnly: true` (如果是会话 Cookie)

3. **在线扫描工具**:
- https://securityheaders.com/ (检查安全响应头)
- https://www.ssllabs.com/ssltest/ (检查 SSL/TLS 配置)

## 部署步骤

1. 本地测试:
```bash
cd E:\wjh-blog-overhaul
npm run build
npm run start
```

2. 访问 http://localhost:3000 检查功能正常

3. 部署到生产环境:
```bash
# SSH 到腾讯云服务器
ssh txcloud

# 拉取最新代码
cd ~/path/to/blog
git pull

# 重新构建
npm install
npm run build

# 重启服务 (根据你的部署方式)
pm2 restart blog
# 或
systemctl restart blog
```

4. 在 Cloudflare Dashboard 应用上述配置

5. 使用验证工具确认修复生效
