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

```text
客户端                          服务器
  │   SYN ─────────────▶         │   三次握手建立 TCP 连接
  │   ◀──────── SYN-ACK │
  │   ACK ─────────────▶         │
  │                              │
  │  Socket(IP:随机端口)  ⇄  ServerSocket 监听(IP:8080)
  │                              │
  │  字节流(HTTP 文本就在流里跑)  │

分层:  应用层 HTTP(第四季)
        └── 传输层 TCP(三次握手、可靠有序) ← 本话
              └── 网络层 IP(找到对方机器)
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

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
