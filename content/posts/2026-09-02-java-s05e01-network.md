---
title: "《从零开始学 Java》40 · 网络世界:订单如何穿过网线"
date: 2026-09-02
summary: "第四季讲了 HTTP 的一问一答,可它下面那层到底怎么把字节送过网线?这一话挖到 TCP 与 Socket,亲手用 ServerSocket 写一个最小服务器,并撞上单线程只能服务一个人的墙——为并发埋线。"
tags: [Java, Java漫画, 网络, TCP, Socket, 阿零与豆豆]
---

# 《从零开始学 Java》40 · 网络世界:订单如何穿过网线

> 连载特刊 · 第五季「服务器战争」第 1 话 · 基线 Java 25(最新 LTS)
> 承接:第四季咖啡站上网营业,请求能来能回,但 HTTP **下面那层**——字节到底怎么过网线的,还没讲。

---

## 一、需求:挖到 HTTP 底下那一层

第四季用 Spring Boot 三行代码就起了服务器,`DispatcherServlet` 帮你把请求分好类。但这一切之下,是**谁真正把字节从手机搬到服务器**的?豆豆:「HTTP 只是纸面上的『快递单格式』。真正搬货的,是底下的 **TCP** 管道和 **Socket** 插座。今天我们绕过框架,亲手用 Socket 收一次请求——你会突然看懂 Tomcat 在干什么。」

---

## 二、漫画 · 网络世界的底层管道

> **〔1〕** 镜头钻进网线里:两台机器之间,先来一段"对暗号"——`SYN` → `SYN-ACK` → `ACK`,三次点头,管道才建成。
> 豆豆:「这是 TCP **三次握手**。不先握手建立可靠管道,数据不敢发——TCP 保证**不丢、不乱序**。」

> **〔2〕** 管道两端各插着一个 `Socket`(插座):一端是 `IP + 端口`,另一端也是。数据以**字节流**在管道里流动。
> 豆豆:「`Socket` = IP + 端口。服务器用 `ServerSocket` 在某个端口**守着**,客户端连上来,就配成一对插座。」

> **〔3〕** 阿零用几行代码起了个 `ServerSocket`,`accept()` 一挂,真等来了一个连接,读出了浏览器发来的原始 HTTP 文本。
> 阿零:「原来 Tomcat 底下……就是这个?!」豆豆:「对。框架只是把这套包装得好用了。」

> **〔4〕** 第二个顾客同时连进来,却发现服务器**卡着不动**——它还在陪第一个顾客,`accept` 单线程一次只招待一个。
> 豆豆(叼豆子):「看到墙了吧?**单线程服务器,一次只能服务一个人。** 早高峰几百人一来,全在门口排长队。这就是下一话要打的仗。」

---

## 三、本话目标

- 理解 TCP **三次握手**与"可靠、有序、面向连接"的字节流;
- 理解 `Socket` = IP + 端口,`ServerSocket` 如何监听;
- 亲手用 `ServerSocket` 写一个能收 HTTP 请求的最小服务器;
- 撞一次"单线程只能服务一个连接"的墙,为并发埋线;
- 分清 TCP 与 UDP。

---

## 四、原理图:从 Socket 到 HTTP

```tcp-flow
client -> server: SYN | 三次握手建立 TCP 连接
server -> client: SYN-ACK
client -> server: ACK
client <-> server: Socket（IP: 随机端口）⇄ ServerSocket（IP: 8080）
client <-> server: 字节流（HTTP 文本就在流里跑）
---
应用层 | HTTP（第四季）
传输层 | TCP（三次握手、可靠有序） | 本话
网络层 | IP（找到对方机器）
```

---

## 五、代码:用 ServerSocket 起一个最小服务器

绕过 Spring,直接看 HTTP 底下的字节:

```java
import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;

public class TinyServer {
    public static void main(String[] args) throws IOException {
        try (ServerSocket server = new ServerSocket(8080)) {   // 在 8080 端口守着
            System.out.println("咖啡站监听 :8080");
            while (true) {
                Socket socket = server.accept();               // 阻塞,直到有人连上来
                handle(socket);                                // ← 单线程:处理完才回来接下一个
            }
        }
    }

    static void handle(Socket socket) throws IOException {
        try (socket;
             var in  = new BufferedReader(new InputStreamReader(socket.getInputStream()));
             var out = new PrintWriter(socket.getOutputStream())) {
            String requestLine = in.readLine();                // 读到的正是 "GET / HTTP/1.1"
            System.out.println("收到:" + requestLine);
            out.print("HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n");
            out.print("豆豆咖啡站 · 营业中 ☕");
            out.flush();
        }
    }
}
```

浏览器访问 `http://localhost:8080`,就能看到咖啡站的问候——你刚刚**手写了一个迷你 Tomcat**。

---

## 六、故意制造一个 Bug:单线程扛不住第二个人

`handle` 里模拟一次"慢制作"(比如查库存耗时):

```java
static void handle(Socket socket) throws IOException {
    try (socket; ...) {
        Thread.sleep(5000);   // ← 模拟耗时处理
        // ...回响应
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
}
```

---

## 七、读懂现象:后面的人全在干等

两个浏览器同时访问:第一个等 5 秒拿到响应;第二个**必须等第一个彻底处理完**,才轮到它,又等 5 秒——总共 10 秒。因为 `main` 是**单线程**:`accept()` → `handle()` → 回到 `accept()`,串行执行,一次只招待一个连接。早高峰几百人同时下单,就是几百人排一条队。

根因不是网络慢,是**服务器没有并发能力**。解决要靠"多个工人同时招待"——线程与线程池,正是下一话。

> **豆豆锐评 · 框架没有魔法,只有封装**
> 你手写的这个 `ServerSocket` + `accept` + 读写流,就是 Tomcat 的内核雏形。Tomcat 只是在它之上加了**线程池**(每个连接交给一个工人)、HTTP 解析、Servlet 规范。看懂这一层,你以后调 Tomcat 线程池参数、排查连接数打满,就不再是碰运气。

> **⏳ 版本时光机 · Java 网络编程模型的演进**

| 模型 | 代表 | 特点 |
|---|---|---|
| BIO(阻塞) | `ServerSocket` + 每连接一线程 | 简单直观,但连接一多线程爆炸(本话) |
| NIO(多路复用) | `Selector` + `Channel` | 一个线程管很多连接,高并发基石 |
| 框架 | Netty | 封装 NIO,写高性能网络服务的事实标准 |
| Java 21+ | **虚拟线程** | 让"每连接一线程"重新变得廉价可行 |

> **🎯 面试直击**:TCP 和 UDP 有什么区别?三次握手为什么是三次?
> **TCP**:面向连接、可靠、有序、有流量/拥塞控制,适合下单、传文件(HTTP 就基于它);**UDP**:无连接、不保证送达、快,适合直播、游戏、DNS。三次握手为什么不是两次?**为了双方都确认『我能发、你能收』**——两次只能确认单向,第三次让服务器确认客户端也准备好了,避免历史失效连接请求造成误建。

---

## 八、用测试证明:服务器能应答

```java
@Test
void server_responds_200() throws Exception {
    // 后台起服务器,再用 HttpClient(第四季学的)自己连自己
    var client = java.net.http.HttpClient.newHttpClient();
    var req = java.net.http.HttpRequest.newBuilder()
        .uri(java.net.URI.create("http://localhost:8080/")).GET().build();
    var resp = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
    assertEquals(200, resp.statusCode());
    assertTrue(resp.body().contains("营业中"));
}
```

---

## 九、项目检查点 · 理解底层通信

```text
新增认知:TCP 三次握手、Socket=IP+端口、ServerSocket 监听、HTTP 就是流里的文本
用到:ServerSocket/Socket、字节流、try-with-resources(第三季)
撞到的墙:单线程服务器一次只能服务一个连接 —— 下一话用线程池破局
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| TCP/Socket 底层 | "计算机网络"面试必考,握手挥手高频 |
| ServerSocket 编程 | 理解 Tomcat/Netty 的基础 |
| BIO/NIO 模型认知 | 高并发岗位的入门题 |
| TCP vs UDP | 网络基础送分题 |

---

## 十一、下一话悬念

单线程服务器卡在第一个顾客身上,后面全排队。得让**多个工人同时招待**——但工人不是越多越好,乱开线程会把服务器自己压垮。

> 下一话《线程与线程池》:阿零给咖啡站雇一批"工人线程"并发出杯,学会用 `ExecutorService` 线程池管理它们,并搞懂线程池那七个参数到底在控制什么。

---

## 🎯 随堂练习
先自己做,再对答案。选择难度递进,解答从概念到综合,代码含边界验证。

### 一、选择题(10 道)
1. [基础]TCP 三次握手的第一步是?
- A) 服务端发 SYN-ACK　B) 客户端发 ACK　C) 客户端发 SYN　D) 服务端发 FIN
> [!答案] **1-C**　三次握手顺序:①客户端→服务端:SYN(我要连你);②服务端→客户端:SYN-ACK(收到,我也准备好了);③客户端→服务端:ACK(好的,开始传)。**举一反三**:为什么要三次?两次只能确认"客户能发、服能收",第三次确认"服能发、客能收"——双方都确认双向通路可用。

2. [进阶]TCP 和 UDP 的核心区别是?
- A) TCP 更快,UDP 更可靠　B) TCP 面向连接、可靠、有序;UDP 无连接、不保证送达、无序但快　C) TCP 用于视频,UDP 用于文件　D) 没有区别
> [!答案] **2-B**　TCP 有握手、ACK 确认、重传、顺序保证;UDP 直接发包无确认,快但不可靠。**举一反三**:DNS(快速查询)、直播(丢几帧无妨)、游戏(实时位置)用 UDP;文件传输、HTTP、邮件用 TCP。

3. [深入]Java 中 `ServerSocket.accept()` 方法的特性是?
- A) 非阻塞,立即返回　B) 阻塞——没有客户端连接时一直等待,直到有连接进来才返回一个 Socket　C) 随机返回已有连接　D) 同时处理多个连接
> [!答案] **3-B**　`accept()` 是**阻塞**方法:主线程卡在这一行,直到有客户端 `new Socket(host,port)` 连上来才返回。**举一反三**:这就是单线程服务器"一次只招待一人"的根源——while 循环里 `accept()`→`handle()`→回到 `accept()`,串行执行。

4. [基础]`Socket` = 什么组合?
- A) IP 地址 + MAC 地址　B) IP 地址 + 端口号　C) 域名 + 路径　D) 用户名 + 密码
> [!答案] **4-B**　Socket(套接字) = IP 地址 + 端口号,标识网络中一个通信端点。客户端和服务器各有一个 Socket,两者配对形成一条 TCP 连接。**举一反三**:同一台机器上不同端口可同时运行多个服务(8080 订单、9090 菜单),互不冲突。

5. [进阶]BIO(阻塞 IO)模型的核心特征是什么?
- A) 一个线程管理很多连接　B) 一个连接对应一个线程,`accept()` 和 `read()` 都是阻塞的——没连接来时 `accept()` 卡住,有连接时 `read()` 卡住等数据　C) 完全不阻塞　D) 使用事件驱动
> [!答案] **5-B**　BIO(`ServerSocket` + `Socket`)是阻塞模型:`accept()` 没连接时一直等,`read()` 没数据时也一直等。每个连接需要一个独立的线程去处理——这就是本话"每连接一线程"的模式。**举一反三**:Java 网络编程有三种模型:BIO(阻塞,本话)、NIO(多路复用,一个线程管很多连接)、AIO(异步回调)。Tomcat 底层就是 BIO→NIO 的演进路线。

6. [深入]单线程 `ServerSocket` 服务器,为什么第二个顾客必须等第一个处理完?
- A) 服务器主动拒绝第二个连接　B) `main` 线程的执行是**串行**的:`while(true){ Socket s = server.accept(); handle(s); }`——`accept()` 和 `handle()` 在同一个线程,`handle()` 没返回之前,程序不会回到 `accept()` 接下一个　C) 网络带宽不够　D) 浏览器限制
> [!答案] **6-B**　本话代码中的致命设计:`accept()` 拿到连接→调用 `handle()`→`handle()` 处理完才返回→回到 `while` 顶部再次 `accept()`。整个链路串行,一次只服务一个连接。**举一反三**:这就是下一话引入线程池的原因——`accept()` 拿到连接后,把 `handle()` 丢给另一个线程,主线程立刻回到 `accept()` 接下一个,实现"多个工人同时招待"。

7. [基础]OSI 七层模型中,HTTP 属于哪一层?
- A) 传输层　B) 网络层　C) 应用层　D) 数据链路层
> [!答案] **7-C**　自上而下:应用层(HTTP/DNS/FTP)→传输层(TCP/UDP)→网络层(IP)→数据链路层→物理层。**举一反三**:面试常考"HTTP 基于 TCP,TCP 基于 IP"——实际 TCP/IP 模型简化为四层,但 OSI 七层是标准参考。

8. [进阶]TCP 的"可靠传输"依赖于什么机制?
- A) 不验证数据　B) 序列号(Seq) + 确认应答(ACK) + 超时重传　C) 只发一次就不管了　D) 加密传输
> [!答案] **8-B**　TCP 给每个字节编号(Seq),接收方确认(ACK 告知"下一个期望的字节号"),发送方超时未收到 ACK 就重传。**举一反三**:TCP 还通过滑动窗口做流量控制,防止发送方太快把接收方压垮。

9. [深入]端口号的范围是多少?常见端口:HTTP/HTTPS 各是多少?
- A) 0-255,HTTP=8080,HTTPS=8443　B) 0-65535,HTTP=80,HTTPS=443　C) 0-9999,HTTP=80,HTTPS=443　D) 0-1023,HTTP=80,HTTPS=443
> [!答案] **9-B**　端口号 16 位,范围 0-65535。0-1023 为知名端口(需 root 权限,HTTP=80,HTTPS=443);1024-49151 为注册端口;49152-65535 为动态/私有端口。**举一反三**:Spring Boot 默认 8080 是注册端口,无需 root 权限;生产环境通常用 Nginx 反向代理将 80/443 请求转发到后端 8080。

10. [综合]从浏览器输入 `https://coffee.example.com/api/menu` 到页面展示菜单数据,涉及的网络层顺序是?
- A) 直接 HTTP 请求　B) DNS 解析域名→TCP 三次握手→TLS 握手(HTTPS)→HTTP 请求→服务器处理→HTTP 响应→浏览器渲染　C) 先连数据库→再渲染　D) 先下载 HTML→再发 HTTP
> [!答案] **10-B**　完整链路:DNS(域名→IP)→TCP 三次握手(建立可靠的传输通道)→TLS 握手(加密信道)→HTTP 请求(应用层数据)→服务器(Spring Boot)处理→HTTP 响应(JSON)→浏览器解析渲染。**举一反三**:`curl -v https://...` 能看到每一步的详细耗时,是排查"慢"在哪一步的利器。

### 二、解答题(3 道)
1. [概念]用自己的话解释 TCP 三次握手:每一步发什么标志位?为什么是三次而不是两次或四次?
> [!答案] **1**　①客户端→服务端:SYN(seq=x,我要连);②服务端→客户端:SYN+ACK(seq=y,ack=x+1,收到,我也要连);③客户端→服务端:ACK(ack=y+1,好的)。**为什么三次**:两次握手只能确认"客户能发、服能收",服务端不知道客户端能否收到自己的消息;第三次 ACK 让服务端确认"客户也能收"。同时也是防止历史失效连接——旧 SYN 迟到,服务端先回 SYN-ACK 但客户端不认,不发第三次 ACK,连接就不会错误建立。**举一反三**:四次挥手(TCP 断开)多一步是因为 TCP 全双工——一方说"我没数据了"(FIN),另一方可能还有数据要发,ACK 和 FIN 分开。

2. [场景]咖啡站部署了 3 台服务器,Nginx 如何实现"把请求轮流转发给这 3 台"?画个简单的文字拓扑图。
> [!答案] **2**　拓扑:浏览器→Nginx(80)→轮询分发→{server1:8080, server2:8080, server3:8080}。Nginx 配置:`upstream coffee_backend { server 192.168.1.10:8080; server 192.168.1.11:8080; server 192.168.1.12:8080; }`。策略:默认轮询(Round-Robin);`ip_hash` 让同一客户端始终到同一台(解决 Session 问题);`least_conn` 发给连接数最少的。**举一反三**:Nginx 还可做健康检查——后端挂了自动摘除,恢复后自动加回;配合 `max_fails` 和 `fail_timeout` 参数。

3. [综合]从 TCP 层面解释"为什么服务器用线程池处理连接"?如果每个连接都 `new Thread`,当 10000 人同时访问会发生什么?
> [!答案] **3**　每个 TCP 连接消费一个 Socket,`accept()` 返回后需要一个线程去 `handle(socket)`。如果每连接 `new Thread`:①10000 连接 = 10000 个线程;每个线程约 1MB 栈空间 = 约 10GB 内存被栈占满——没到业务层内存就爆了;②CPU 在 10000 个线程间疯狂上下文切换,有效工作时间极低;**线程不是免费的**。线程池方案:固定 N 个 worker(如 200),任务排队,复用线程——既控制资源上限,又减少创建/销毁开销。这就是"线程池也是限流器"的体现。**举一反三**:Java 21 的虚拟线程让"每连接一线程"重新可行——虚拟线程极轻量(~KB 而不是 ~MB),但 DB 连接池等共享资源仍需控制,虚拟线程不改变"资源有上限"的物理现实。

### 三、代码题(2 道)
1. [基础]用 Java `Socket` 连接 `example.com` 的 80 端口,发送 `GET / HTTP/1.1` 请求(Host 头必带),打印服务器返回的第一行(状态行)。
> [!答案] **1 验收**:
> ```java
> try (Socket socket = new Socket("example.com", 80);
>      PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
>      BufferedReader in = new BufferedReader(
>          new InputStreamReader(socket.getInputStream()))) {
>     out.println("GET / HTTP/1.1");
>     out.println("Host: example.com");
>     out.println("Connection: close");
>     out.println(); // 空行表示头部结束
>     String statusLine = in.readLine();
>     System.out.println("状态行: " + statusLine); // HTTP/1.1 200 OK
> } catch (IOException e) {
>     System.err.println("连接失败: " + e.getMessage());
> }
> ```
> **举一反三**:`Connection: close` 告知服务器"响应后关闭连接",否则连接可能挂起;生产代码用 HttpClient 而非手写 Socket——此练习旨在理解 HTTP 底层是纯文本协议。

2. [综合]写一个支持并发的 Socket 服务器:用 `ServerSocket` + `ThreadPoolExecutor`(4 个 worker,有界队列 20),每连接回显"你好,你是第 N 位访客",并通过压测(10 个并发请求)验证服务器能同时处理。
> [!答案] **2 验收**:
> ```java
> class ConcurrentServer {
>     static final ExecutorService pool = new ThreadPoolExecutor(
>             4, 4, 60, TimeUnit.SECONDS,
>             new ArrayBlockingQueue<>(20),
>             new ThreadPoolExecutor.CallerRunsPolicy());
>     static final AtomicInteger counter = new AtomicInteger();
> 
>     public static void main(String[] args) throws IOException {
>         try (ServerSocket server = new ServerSocket(8080)) {
>             System.out.println("并发服务器监听 :8080");
>             while (true) {
>                 Socket socket = server.accept();
>                 pool.execute(() -> {
>                     try (socket; var out = new PrintWriter(socket.getOutputStream(), true)) {
>                         int id = counter.incrementAndGet();
>                         out.println("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n你好,你是第 " + id + " 位访客");
>                     } catch (IOException ignored) {}
>                 });
>             }
>         }
>     }
> }
> ```
> **举一反三**:`AtomicInteger` 保证访客计数线程安全;`CallerRunsPolicy` 在队列满时让主线程(accept)自己处理,形成反压——防止无限排队 OOM。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
