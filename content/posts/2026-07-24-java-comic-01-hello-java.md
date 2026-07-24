---
title: "Java 漫画连载 01：第一次让程序开口"
date: 2026-07-24
summary: "从一片空白的终端开始：写下第一个 Java 类，理解编译与运行各自做了什么，并亲手让 Hello, Java! 出现。"
tags: [Java漫画, Java入门, HelloWorld, 编程学习]
---

![《从零开始学 Java》第一章封面：阿零和豆豆在夜晚的桌前运行第一个程序](/java-comic-episode-01-cover.webp)

> 连载名：《从零开始学 Java》
>
> 主角阿零：第一次打开终端的大学生。搭档豆豆：一颗总能把复杂概念拆成小任务的咖啡豆机器人。

## 本章任务：让计算机说出一句话

阿零盯着空白终端发愁：“Java 这么大，我从哪里开始？”

豆豆把任务缩小成一句话：“今天不学完 Java。只让程序开口。”

![第一章四格：面对空终端、创建源文件、修正小错误、成功运行](/java-comic-episode-01-panels.webp)

### 四格旁白

1. **空白不是失败。** 新建一个文件，就是在告诉计算机：这里有一段待翻译的指令。
2. **类是程序的外壳。** Java 从一个类开始组织代码；文件名和公开类名要保持一致。
3. **报错是线索。** 少一个分号、拼错一个大小写，都不是“我不适合编程”，而是编译器在指出位置。
4. **先跑通，再理解。** 看见输出后再追问：它为什么能运行？这才是可持续的学习节奏。

## 最小可运行程序

创建文件 `HelloJava.java`，内容如下：

```java
public class HelloJava {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
```

在文件所在目录运行：

```bash
javac HelloJava.java
java HelloJava
```

预期输出：

```text
Hello, Java!
```

## 这两条命令分别做了什么？

| 命令 | 发生的事 | 先记住什么 |
| --- | --- | --- |
| `javac HelloJava.java` | 编译器检查 Java 源代码，并生成字节码文件 `HelloJava.class` | 写错语法时，错误通常在这一步出现 |
| `java HelloJava` | JVM 读取字节码，找到 `main` 方法并执行 | 运行时写的是类名，不带 `.class` |

先把 `main` 当作“程序开场白”即可：JVM 从这里开始执行。`System.out.println(...)` 的任务也很单纯：把括号里的内容打印到控制台。

## 新手最常见的三次卡住

### 1. 文件名和类名不一致

`public class HelloJava` 必须放在 `HelloJava.java`。Java 对大小写敏感，`hellojava.java` 也不行。

### 2. 在错误目录运行

终端要先进入保存文件的目录。用 `dir`（Windows）或 `ls`（macOS/Linux）确认能看到 `HelloJava.java`，再编译。

### 3. 把编译和运行混成一件事

第一次运行没有输出时，按顺序检查：有没有 `HelloJava.class`？类名是否正确？`main` 方法是否完全照写？每一次只改一个问题，再重试。

## 本章小练习：让豆豆打招呼

把输出改成自己的名字，例如：

```java
System.out.println("你好，我是阿零。今天开始学 Java！");
```

然后故意删掉最后的分号，运行一次 `javac`。不要害怕错误信息：找到它提示的行号，补回分号，再重新编译。你刚刚完成了程序员每天都会做的事情：**根据证据修复问题。**

## 连载路线图

| 章 | 标题 | 学完后能做什么 |
| --- | --- | --- |
| 02 | 变量仓库：把信息放进盒子 | 用变量、类型和运算符计算结果 |
| 03 | 选择之门：`if` 与 `switch` | 让程序根据条件做决定 |
| 04 | 循环训练场：重复但不迷路 | 用 `for`、`while` 处理重复任务 |
| 05 | 对象小队：类、字段与方法 | 把数据和行为组织成对象 |
| 06 | 继承不是复制：接口与多态 | 用统一规则协作多个对象 |
| 07 | 背包与图书馆：集合与泛型 | 管理一组数据，避免类型混乱 |
| 08 | 异常警报：失败也有流程 | 写出可恢复、可定位的问题处理 |
| 09 | 文件任务：读写一份学习清单 | 保存和读取本地数据 |
| 10 | 小项目：命令行待办清单 | 串起前九章，完成第一个作品 |

下一章，阿零会发现：程序记不住数字和名字，就无法帮你做任何事。于是豆豆带他走进“变量仓库”。

## 延伸阅读

- [Dev.java：Running Your First Java Application](https://dev.java/learn/)
- [Java Language Specification：类型、值与变量](https://docs.oracle.com/javase/specs/jls/se25/html/jls-4.html)
