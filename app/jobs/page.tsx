"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
const JOBS = [
  {
    "company": "阿里巴巴",
    "tier": "一线",
    "title": "Java技术专家",
    "city": "深圳",
    "salary": "17-40K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Hadoop",
      "Spark",
      "Flink",
      "Hive",
      "Kafka",
      "HBase"
    ],
    "source": "market_estimate",
    "url": "https://talent.alibaba.com/off-campus/position-list?lang=zh&search=Java"
  },
  {
    "company": "阿里云",
    "tier": "一线",
    "title": "Java中间件开发",
    "city": "深圳",
    "salary": "16-43K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Hadoop",
      "Spark",
      "Flink",
      "Hive",
      "Kafka",
      "HBase"
    ],
    "source": "market_estimate",
    "url": "https://careers.aliyun.com/?keyword=Java"
  },
  {
    "company": "蚂蚁集团",
    "tier": "一线",
    "title": "Java高级开发工程师",
    "city": "杭州",
    "salary": "13-31K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://talent.antgroup.com/position-list?keyword=Java"
  },
  {
    "company": "菜鸟网络",
    "tier": "一线",
    "title": "Java中间件开发",
    "city": "深圳",
    "salary": "18-47K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://talent.cainiao.com/?keyword=Java"
  },
  {
    "company": "腾讯",
    "tier": "一线",
    "title": "Java服务端高级开发工程师",
    "city": "广州",
    "salary": "22-55K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "MySQL",
      "Redis",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://careers.tencent.com/search.html?keyword=Java%E5%BC%80%E5%8F%91"
  },
  {
    "company": "腾讯云",
    "tier": "一线",
    "title": "Java后端开发",
    "city": "广州",
    "salary": "13-33K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "高并发",
      "分布式",
      "Spring Boot",
      "MySQL",
      "Redis",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://careers.tencent.com/search.html?keyword=Java%E5%BC%80%E5%8F%91"
  },
  {
    "company": "微信",
    "tier": "一线",
    "title": "Java技术专家",
    "city": "广州",
    "salary": "23-58K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://careers.tencent.com/search.html?keyword=Java%E5%BC%80%E5%8F%91"
  },
  {
    "company": "字节跳动",
    "tier": "一线",
    "title": "Java技术专家",
    "city": "北京",
    "salary": "35-83K",
    "exp": "8-15年",
    "degree": "硕士",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://jobs.bytedance.com/experienced/position?keywords=Java"
  },
  {
    "company": "抖音",
    "tier": "一线",
    "title": "Java后端开发",
    "city": "杭州",
    "salary": "14-37K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Hadoop",
      "Spark",
      "Flink",
      "Hive",
      "Kafka",
      "HBase"
    ],
    "source": "market_estimate",
    "url": "https://jobs.bytedance.com/experienced/position?keywords=Java"
  },
  {
    "company": "飞书",
    "tier": "一线",
    "title": "Java架构师",
    "city": "杭州",
    "salary": "29-68K",
    "exp": "8-15年",
    "degree": "硕士",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://jobs.bytedance.com/experienced/position?keywords=Java"
  },
  {
    "company": "美团",
    "tier": "一线",
    "title": "Java技术专家",
    "city": "北京",
    "salary": "19-52K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.meituan.com/web/pc#/?keyword=Java"
  },
  {
    "company": "京东",
    "tier": "一线",
    "title": "Java中间件开发",
    "city": "北京",
    "salary": "19-44K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis-Plus",
      "MySQL",
      "Redis",
      "MongoDB",
      "Elasticsearch"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.jd.com/web/job/job_info_list/3?keyword=Java"
  },
  {
    "company": "京东科技",
    "tier": "一线",
    "title": "Java中间件开发",
    "city": "成都",
    "salary": "13-36K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.jd.com/web/job/job_info_list/3?keyword=Java"
  },
  {
    "company": "拼多多",
    "tier": "一线",
    "title": "Java架构师",
    "city": "上海",
    "salary": "18-41K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "MySQL",
      "Redis",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://careers.pinduoduo.com/jobs?keyword=Java"
  },
  {
    "company": "Temu",
    "tier": "一线",
    "title": "Java架构师",
    "city": "上海",
    "salary": "24-58K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://careers.pinduoduo.com/jobs?keyword=Java"
  },
  {
    "company": "华为",
    "tier": "一线",
    "title": "Java微服务高级开发工程师",
    "city": "成都",
    "salary": "18-43K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://career.huawei.com/reccampportal/portal5/campus-recruitment.html?jobTypes=0&keywords=Java"
  },
  {
    "company": "华为云",
    "tier": "一线",
    "title": "Java技术专家",
    "city": "杭州",
    "salary": "24-59K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "JPA",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitLab CI"
    ],
    "source": "market_estimate",
    "url": "https://career.huawei.com/reccampportal/portal5/campus-recruitment.html?jobTypes=0&keywords=Java"
  },
  {
    "company": "小米",
    "tier": "一线",
    "title": "Java中间件开发",
    "city": "武汉",
    "salary": "12-30K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis-Plus",
      "MySQL",
      "Redis",
      "MongoDB",
      "Elasticsearch"
    ],
    "source": "market_estimate",
    "url": "https://xiaomi.jobs.f.mioffice.cn/index/?keywords=Java"
  },
  {
    "company": "百度",
    "tier": "一线",
    "title": "Java全栈工程师",
    "city": "北京",
    "salary": "18-47K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis-Plus",
      "MySQL",
      "Redis",
      "MongoDB",
      "Elasticsearch"
    ],
    "source": "market_estimate",
    "url": "https://talent.baidu.com/jobs/list?search=Java"
  },
  {
    "company": "SHEIN",
    "tier": "一线",
    "title": "Java中间件开发",
    "city": "南京",
    "salary": "13-39K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://app.mokahr.com/apply/shein/2932#/?keyword=Java"
  },
  {
    "company": "快手",
    "tier": "一线",
    "title": "Java中间件开发",
    "city": "北京",
    "salary": "27-68K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.kuaishou.cn/recruit/portal/#/?keyword=Java"
  },
  {
    "company": "携程",
    "tier": "中厂",
    "title": "Java服务端开发工程师",
    "city": "上海",
    "salary": "18-44K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://job.ctrip.com/#/?keyword=Java"
  },
  {
    "company": "去哪儿",
    "tier": "中厂",
    "title": "Java技术专家",
    "city": "上海",
    "salary": "19-51K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://job.ctrip.com/#/?keyword=Java"
  },
  {
    "company": "哔哩哔哩",
    "tier": "中厂",
    "title": "Java中间件开发",
    "city": "上海",
    "salary": "20-52K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis-Plus",
      "MySQL",
      "Redis",
      "MongoDB",
      "Elasticsearch"
    ],
    "source": "market_estimate",
    "url": "https://jobs.bilibili.com/social/positions?keyword=Java"
  },
  {
    "company": "小红书",
    "tier": "中厂",
    "title": "Java开发工程师",
    "city": "上海",
    "salary": "16-42K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://job.xiaohongshu.com/social?keyword=Java"
  },
  {
    "company": "滴滴出行",
    "tier": "中厂",
    "title": "Java大数据开发工程师",
    "city": "北京",
    "salary": "20-45K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://talent.didiglobal.com/social/list/1?keyword=Java"
  },
  {
    "company": "网易",
    "tier": "中厂",
    "title": "Java服务端高级开发工程师",
    "city": "广州",
    "salary": "19-51K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "JPA",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitLab CI"
    ],
    "source": "market_estimate",
    "url": "https://hr.163.com/job-list.html?search=Java"
  },
  {
    "company": "网易云音乐",
    "tier": "中厂",
    "title": "Java全栈工程师",
    "city": "杭州",
    "salary": "18-49K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://hr.163.com/job-list.html?search=Java"
  },
  {
    "company": "得物App",
    "tier": "中厂",
    "title": "Java架构师",
    "city": "上海",
    "salary": "25-62K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.dewu.com/#/?keyword=Java"
  },
  {
    "company": "完美世界",
    "tier": "中厂",
    "title": "Java后端开发",
    "city": "成都",
    "salary": "13-41K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://jobs.wanmei.com/social?keyword=Java"
  },
  {
    "company": "虎牙直播",
    "tier": "中厂",
    "title": "Java后端开发",
    "city": "广州",
    "salary": "16-37K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "MySQL",
      "Redis",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://hr.huya.com/#/social?keyword=Java"
  },
  {
    "company": "唯品会",
    "tier": "中厂",
    "title": "Java架构师",
    "city": "广州",
    "salary": "13-35K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "MySQL",
      "Redis",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://recruitment.corp.vipshop.com/?keyword=Java"
  },
  {
    "company": "Shopee",
    "tier": "中厂",
    "title": "Java中间件开发",
    "city": "北京",
    "salary": "23-59K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://careers.shopee.cn/jobs?keyword=Java"
  },
  {
    "company": "Sea Group",
    "tier": "中厂",
    "title": "Java全栈工程师",
    "city": "北京",
    "salary": "17-39K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://careers.shopee.cn/jobs?keyword=Java"
  },
  {
    "company": "Keep",
    "tier": "中厂",
    "title": "Java微服务开发工程师",
    "city": "北京",
    "salary": "20-44K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://hr.keep.com/social?keyword=Java"
  },
  {
    "company": "运动科技",
    "tier": "中厂",
    "title": "Java架构师",
    "city": "北京",
    "salary": "15-36K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Java",
      "Hadoop",
      "Spark",
      "Flink",
      "Hive",
      "Kafka",
      "HBase"
    ],
    "source": "market_estimate",
    "url": "https://hr.keep.com/social?keyword=Java"
  },
  {
    "company": "大疆",
    "tier": "中厂",
    "title": "Java微服务开发工程师",
    "city": "深圳",
    "salary": "16-39K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "JPA",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitLab CI"
    ],
    "source": "market_estimate",
    "url": "https://we.dji.com/zh-CN/social/position/list?keyword=Java"
  },
  {
    "company": "米哈游",
    "tier": "中厂",
    "title": "Java微服务开发工程师",
    "city": "上海",
    "salary": "19-51K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://jobs.mihoyo.com/social-recruitment/mihoyo/?keyword=Java"
  },
  {
    "company": "三七互娱",
    "tier": "中厂",
    "title": "Java开发工程师",
    "city": "广州",
    "salary": "13-35K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "JPA",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitLab CI"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.37.com/?keyword=Java"
  },
  {
    "company": "奇安信",
    "tier": "中厂",
    "title": "Java高级开发工程师",
    "city": "北京",
    "salary": "20-44K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://campus.qianxin.com/jobs?keyword=Java"
  },
  {
    "company": "美的",
    "tier": "大厂",
    "title": "Java技术专家",
    "city": "佛山",
    "salary": "13-39K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.midea.com.cn/#/?keyword=Java"
  },
  {
    "company": "比亚迪",
    "tier": "大厂",
    "title": "Java中间件开发",
    "city": "深圳",
    "salary": "19-49K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Hadoop",
      "Spark",
      "Flink",
      "Hive",
      "Kafka",
      "HBase"
    ],
    "source": "market_estimate",
    "url": "https://job.byd.com/portal/pc/#/social/positionList?keyword=Java"
  },
  {
    "company": "海康威视",
    "tier": "大厂",
    "title": "Java开发工程师",
    "city": "杭州",
    "salary": "16-46K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://talent.hikvision.com/post-list.html?search=Java"
  },
  {
    "company": "萤石",
    "tier": "大厂",
    "title": "Java高级开发工程师",
    "city": "杭州",
    "salary": "23-59K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "MySQL",
      "Redis",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://talent.hikvision.com/post-list.html?search=Java"
  },
  {
    "company": "科大讯飞",
    "tier": "大厂",
    "title": "Java后端开发",
    "city": "合肥",
    "salary": "10-27K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "JPA",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitLab CI"
    ],
    "source": "market_estimate",
    "url": "https://campus.iflytek.com/jobList?keyword=Java"
  },
  {
    "company": "中兴通讯",
    "tier": "大厂",
    "title": "Java全栈工程师",
    "city": "西安",
    "salary": "11-36K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://job.zte.com.cn/cn/tech-job?keyword=Java"
  },
  {
    "company": "招商银行",
    "tier": "银行",
    "title": "Java大数据开发工程师",
    "city": "深圳",
    "salary": "16-47K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "MySQL",
      "Redis",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://career.cmbchina.com/#/search?keyword=Java"
  },
  {
    "company": "招银网络",
    "tier": "银行",
    "title": "Java技术专家",
    "city": "成都",
    "salary": "13-36K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "高并发",
      "分布式",
      "Spring Boot",
      "MySQL",
      "Redis",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://career.cmbchina.com/#/search?keyword=Java"
  },
  {
    "company": "平安集团",
    "tier": "银行",
    "title": "Java技术专家",
    "city": "深圳",
    "salary": "18-41K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis-Plus",
      "MySQL",
      "Redis",
      "MongoDB",
      "Elasticsearch"
    ],
    "source": "market_estimate",
    "url": "https://wetalent.pingan.com/careers/search?keyword=Java"
  },
  {
    "company": "平安科技",
    "tier": "银行",
    "title": "Java后端开发",
    "city": "深圳",
    "salary": "16-40K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://wetalent.pingan.com/careers/search?keyword=Java"
  },
  {
    "company": "微众银行",
    "tier": "银行",
    "title": "Java后端开发",
    "city": "深圳",
    "salary": "20-49K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "高并发",
      "分布式",
      "Spring Boot",
      "MySQL",
      "Redis",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://hr.webank.com/#/position/social?keyword=Java"
  },
  {
    "company": "中信银行",
    "tier": "银行",
    "title": "Java技术专家",
    "city": "北京",
    "salary": "18-51K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "JPA",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitLab CI"
    ],
    "source": "market_estimate",
    "url": "https://www.hotjob.cn/wt/chinaciticbank/web/index/social?keyword=Java"
  },
  {
    "company": "新网银行",
    "tier": "银行",
    "title": "Java技术专家",
    "city": "成都",
    "salary": "22-50K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "JPA",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitLab CI"
    ],
    "source": "market_estimate",
    "url": "https://www.zhipin.com/web/geek/job?query=Java+%E6%96%B0%E7%BD%91%E9%93%B6%E8%A1%8C"
  },
  {
    "company": "特斯拉",
    "tier": "新势力",
    "title": "Java中间件开发",
    "city": "上海",
    "salary": "16-41K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://www.tesla.cn/careers/search/?query=Java"
  },
  {
    "company": "理想汽车",
    "tier": "新势力",
    "title": "Java技术专家",
    "city": "北京",
    "salary": "25-59K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://www.lixiang.com/employ/social.html?keyword=Java"
  },
  {
    "company": "蔚来",
    "tier": "新势力",
    "title": "Java技术专家",
    "city": "上海",
    "salary": "16-41K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://nio.jobs.feishu.cn/index/?keywords=Java"
  },
  {
    "company": "小鹏汽车",
    "tier": "新势力",
    "title": "Java服务端开发工程师",
    "city": "广州",
    "salary": "16-45K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "DDD",
      "Spring Boot",
      "MySQL",
      "Redis",
      "Kafka",
      "Docker"
    ],
    "source": "market_estimate",
    "url": "https://xiaopeng.com/job.html?keyword=Java"
  },
  {
    "company": "零跑汽车",
    "tier": "新势力",
    "title": "Java后端开发",
    "city": "杭州",
    "salary": "18-43K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://leapmotor.zhiye.com/social?keyword=Java"
  },
  {
    "company": "中信银行",
    "tier": "银行",
    "title": "Java服务端开发工程师",
    "city": "北京",
    "salary": "17-34K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://www.hotjob.cn/wt/chinaciticbank/web/index/social?keyword=Java"
  },
  {
    "company": "百度",
    "tier": "一线",
    "title": "Java开发工程师",
    "city": "北京",
    "salary": "16-32K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "高并发",
      "分布式",
      "Spring Boot",
      "MySQL",
      "Redis",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://talent.baidu.com/jobs/list?search=Java"
  },
  {
    "company": "小红书",
    "tier": "中厂",
    "title": "Java中间件开发",
    "city": "上海",
    "salary": "13-26K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://job.xiaohongshu.com/social?keyword=Java"
  },
  {
    "company": "小鹏汽车",
    "tier": "新势力",
    "title": "Java服务端开发工程师",
    "city": "广州",
    "salary": "15-31K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://xiaopeng.com/job.html?keyword=Java"
  },
  {
    "company": "腾讯",
    "tier": "一线",
    "title": "Java全栈工程师",
    "city": "北京",
    "salary": "18-36K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://careers.tencent.com/search.html?keyword=Java%E5%BC%80%E5%8F%91"
  },
  {
    "company": "网易",
    "tier": "中厂",
    "title": "Java后端开发",
    "city": "广州",
    "salary": "15-31K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://hr.163.com/job-list.html?search=Java"
  },
  {
    "company": "字节跳动",
    "tier": "一线",
    "title": "Java微服务开发工程师",
    "city": "深圳",
    "salary": "16-31K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "高并发",
      "分布式",
      "Spring Boot",
      "MySQL",
      "Redis",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://jobs.bytedance.com/experienced/position?keywords=Java"
  },
  {
    "company": "唯品会",
    "tier": "中厂",
    "title": "Java高级开发工程师",
    "city": "广州",
    "salary": "12-25K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://recruitment.corp.vipshop.com/?keyword=Java"
  },
  {
    "company": "Keep",
    "tier": "中厂",
    "title": "Java技术专家",
    "city": "北京",
    "salary": "15-30K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "高并发",
      "分布式",
      "Spring Boot",
      "MySQL",
      "Redis",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://hr.keep.com/social?keyword=Java"
  },
  {
    "company": "平安集团",
    "tier": "银行",
    "title": "Java后端开发",
    "city": "上海",
    "salary": "19-37K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "DDD",
      "Spring Boot",
      "MySQL",
      "Redis",
      "Kafka",
      "Docker"
    ],
    "source": "market_estimate",
    "url": "https://wetalent.pingan.com/careers/search?keyword=Java"
  },
  {
    "company": "携程",
    "tier": "中厂",
    "title": "Java全栈工程师",
    "city": "上海",
    "salary": "12-24K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "高并发",
      "分布式",
      "Spring Boot",
      "MySQL",
      "Redis",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://job.ctrip.com/#/?keyword=Java"
  },
  {
    "company": "Shopee",
    "tier": "中厂",
    "title": "Java大数据开发工程师",
    "city": "北京",
    "salary": "13-26K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://careers.shopee.cn/jobs?keyword=Java"
  },
  {
    "company": "得物App",
    "tier": "中厂",
    "title": "Java中间件开发",
    "city": "上海",
    "salary": "21-41K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.dewu.com/#/?keyword=Java"
  },
  {
    "company": "哔哩哔哩",
    "tier": "中厂",
    "title": "Java架构师",
    "city": "上海",
    "salary": "21-42K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://jobs.bilibili.com/social/positions?keyword=Java"
  },
  {
    "company": "Shopee",
    "tier": "中厂",
    "title": "Java全栈工程师",
    "city": "深圳",
    "salary": "17-34K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "高并发",
      "分布式",
      "Spring Boot",
      "MySQL",
      "Redis",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://careers.shopee.cn/jobs?keyword=Java"
  },
  {
    "company": "奇安信",
    "tier": "中厂",
    "title": "Java全栈工程师",
    "city": "北京",
    "salary": "16-31K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://campus.qianxin.com/jobs?keyword=Java"
  },
  {
    "company": "携程",
    "tier": "中厂",
    "title": "Java开发工程师",
    "city": "上海",
    "salary": "24-48K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "DDD",
      "Spring Boot",
      "MySQL",
      "Redis",
      "Kafka",
      "Docker"
    ],
    "source": "market_estimate",
    "url": "https://job.ctrip.com/#/?keyword=Java"
  },
  {
    "company": "虎牙直播",
    "tier": "中厂",
    "title": "Java大数据开发工程师",
    "city": "广州",
    "salary": "21-43K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://hr.huya.com/#/social?keyword=Java"
  },
  {
    "company": "Shopee",
    "tier": "中厂",
    "title": "Java高级开发工程师",
    "city": "北京",
    "salary": "24-47K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "JPA",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitLab CI"
    ],
    "source": "market_estimate",
    "url": "https://careers.shopee.cn/jobs?keyword=Java"
  },
  {
    "company": "中兴通讯",
    "tier": "大厂",
    "title": "Java技术专家",
    "city": "西安",
    "salary": "12-24K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "JPA",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitLab CI"
    ],
    "source": "market_estimate",
    "url": "https://job.zte.com.cn/cn/tech-job?keyword=Java"
  },
  {
    "company": "零跑汽车",
    "tier": "新势力",
    "title": "Java高级开发工程师",
    "city": "杭州",
    "salary": "13-26K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://leapmotor.zhiye.com/social?keyword=Java"
  },
  {
    "company": "唯品会",
    "tier": "中厂",
    "title": "Java开发工程师",
    "city": "广州",
    "salary": "13-26K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://recruitment.corp.vipshop.com/?keyword=Java"
  },
  {
    "company": "中兴通讯",
    "tier": "大厂",
    "title": "Java大数据开发工程师",
    "city": "西安",
    "salary": "9-18K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://job.zte.com.cn/cn/tech-job?keyword=Java"
  },
  {
    "company": "三七互娱",
    "tier": "中厂",
    "title": "Java开发工程师",
    "city": "广州",
    "salary": "19-38K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.37.com/?keyword=Java"
  },
  {
    "company": "比亚迪",
    "tier": "大厂",
    "title": "Java中间件开发",
    "city": "深圳",
    "salary": "18-36K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://job.byd.com/portal/pc/#/social/positionList?keyword=Java"
  },
  {
    "company": "美团",
    "tier": "一线",
    "title": "Java后端开发",
    "city": "成都",
    "salary": "15-30K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.meituan.com/web/pc#/?keyword=Java"
  },
  {
    "company": "百度",
    "tier": "一线",
    "title": "Java微服务开发工程师",
    "city": "上海",
    "salary": "19-38K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://talent.baidu.com/jobs/list?search=Java"
  },
  {
    "company": "平安集团",
    "tier": "银行",
    "title": "Java微服务开发工程师",
    "city": "上海",
    "salary": "27-52K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://wetalent.pingan.com/careers/search?keyword=Java"
  },
  {
    "company": "得物App",
    "tier": "中厂",
    "title": "Java中间件开发",
    "city": "上海",
    "salary": "18-36K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.dewu.com/#/?keyword=Java"
  },
  {
    "company": "零跑汽车",
    "tier": "新势力",
    "title": "Java技术专家",
    "city": "杭州",
    "salary": "15-30K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://leapmotor.zhiye.com/social?keyword=Java"
  },
  {
    "company": "完美世界",
    "tier": "中厂",
    "title": "Java后端开发",
    "city": "成都",
    "salary": "15-30K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis-Plus",
      "MySQL",
      "Redis",
      "MongoDB",
      "Elasticsearch"
    ],
    "source": "market_estimate",
    "url": "https://jobs.wanmei.com/social?keyword=Java"
  },
  {
    "company": "SHEIN",
    "tier": "一线",
    "title": "Java高级开发工程师",
    "city": "广州",
    "salary": "21-42K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://app.mokahr.com/apply/shein/2932#/?keyword=Java"
  },
  {
    "company": "美的",
    "tier": "大厂",
    "title": "Java全栈工程师",
    "city": "佛山",
    "salary": "11-23K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "MySQL",
      "Redis",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.midea.com.cn/#/?keyword=Java"
  },
  {
    "company": "小红书",
    "tier": "中厂",
    "title": "Java大数据开发工程师",
    "city": "北京",
    "salary": "27-52K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Java",
      "Hadoop",
      "Spark",
      "Flink",
      "Hive",
      "Kafka",
      "HBase"
    ],
    "source": "market_estimate",
    "url": "https://job.xiaohongshu.com/social?keyword=Java"
  },
  {
    "company": "腾讯",
    "tier": "一线",
    "title": "Java架构师",
    "city": "成都",
    "salary": "16-33K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "DDD",
      "Spring Boot",
      "MySQL",
      "Redis",
      "Kafka",
      "Docker"
    ],
    "source": "market_estimate",
    "url": "https://careers.tencent.com/search.html?keyword=Java%E5%BC%80%E5%8F%91"
  },
  {
    "company": "三七互娱",
    "tier": "中厂",
    "title": "Java技术专家",
    "city": "广州",
    "salary": "14-29K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.37.com/?keyword=Java"
  },
  {
    "company": "招商银行",
    "tier": "银行",
    "title": "Java全栈工程师",
    "city": "深圳",
    "salary": "23-45K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Java",
      "Hadoop",
      "Spark",
      "Flink",
      "Hive",
      "Kafka",
      "HBase"
    ],
    "source": "market_estimate",
    "url": "https://career.cmbchina.com/#/search?keyword=Java"
  },
  {
    "company": "快手",
    "tier": "一线",
    "title": "Java中间件开发",
    "city": "杭州",
    "salary": "17-35K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "MySQL",
      "Redis",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.kuaishou.cn/recruit/portal/#/?keyword=Java"
  },
  {
    "company": "奇安信",
    "tier": "中厂",
    "title": "Java服务端开发工程师",
    "city": "北京",
    "salary": "14-28K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://campus.qianxin.com/jobs?keyword=Java"
  },
  {
    "company": "携程",
    "tier": "中厂",
    "title": "Java高级开发工程师",
    "city": "上海",
    "salary": "17-33K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://job.ctrip.com/#/?keyword=Java"
  },
  {
    "company": "Shopee",
    "tier": "中厂",
    "title": "Java全栈工程师",
    "city": "北京",
    "salary": "23-45K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "DDD",
      "Spring Boot",
      "MySQL",
      "Redis",
      "Kafka",
      "Docker"
    ],
    "source": "market_estimate",
    "url": "https://careers.shopee.cn/jobs?keyword=Java"
  },
  {
    "company": "拼多多",
    "tier": "一线",
    "title": "Java开发工程师",
    "city": "上海",
    "salary": "14-29K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "高并发",
      "分布式",
      "Spring Boot",
      "MySQL",
      "Redis",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://careers.pinduoduo.com/jobs?keyword=Java"
  },
  {
    "company": "滴滴出行",
    "tier": "中厂",
    "title": "Java高级开发工程师",
    "city": "北京",
    "salary": "14-29K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://talent.didiglobal.com/social/list/1?keyword=Java"
  },
  {
    "company": "腾讯",
    "tier": "一线",
    "title": "Java后端开发",
    "city": "北京",
    "salary": "15-30K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://careers.tencent.com/search.html?keyword=Java%E5%BC%80%E5%8F%91"
  },
  {
    "company": "小红书",
    "tier": "中厂",
    "title": "Java服务端开发工程师",
    "city": "北京",
    "salary": "18-36K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://job.xiaohongshu.com/social?keyword=Java"
  },
  {
    "company": "蔚来",
    "tier": "新势力",
    "title": "Java后端开发",
    "city": "上海",
    "salary": "19-38K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://nio.jobs.feishu.cn/index/?keywords=Java"
  },
  {
    "company": "腾讯",
    "tier": "一线",
    "title": "Java高级开发工程师",
    "city": "广州",
    "salary": "19-39K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://careers.tencent.com/search.html?keyword=Java%E5%BC%80%E5%8F%91"
  },
  {
    "company": "理想汽车",
    "tier": "新势力",
    "title": "Java技术专家",
    "city": "北京",
    "salary": "14-28K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://www.lixiang.com/employ/social.html?keyword=Java"
  },
  {
    "company": "蔚来",
    "tier": "新势力",
    "title": "Java全栈工程师",
    "city": "上海",
    "salary": "13-26K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://nio.jobs.feishu.cn/index/?keywords=Java"
  },
  {
    "company": "米哈游",
    "tier": "中厂",
    "title": "Java全栈工程师",
    "city": "上海",
    "salary": "15-29K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://jobs.mihoyo.com/social-recruitment/mihoyo/?keyword=Java"
  },
  {
    "company": "华为",
    "tier": "一线",
    "title": "Java微服务开发工程师",
    "city": "成都",
    "salary": "14-28K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Hadoop",
      "Spark",
      "Flink",
      "Hive",
      "Kafka",
      "HBase"
    ],
    "source": "market_estimate",
    "url": "https://career.huawei.com/reccampportal/portal5/campus-recruitment.html?jobTypes=0&keywords=Java"
  },
  {
    "company": "SHEIN",
    "tier": "一线",
    "title": "Java技术专家",
    "city": "南京",
    "salary": "14-28K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Java",
      "Go",
      "分布式系统",
      "Kubernetes",
      "MySQL",
      "Redis",
      "gRPC"
    ],
    "source": "market_estimate",
    "url": "https://app.mokahr.com/apply/shein/2932#/?keyword=Java"
  },
  {
    "company": "中信银行",
    "tier": "银行",
    "title": "Java大数据开发工程师",
    "city": "北京",
    "salary": "24-46K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "DDD",
      "Spring Boot",
      "MySQL",
      "Redis",
      "Kafka",
      "Docker"
    ],
    "source": "market_estimate",
    "url": "https://www.hotjob.cn/wt/chinaciticbank/web/index/social?keyword=Java"
  },
  {
    "company": "Shopee",
    "tier": "中厂",
    "title": "Java微服务开发工程师",
    "city": "深圳",
    "salary": "13-25K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://careers.shopee.cn/jobs?keyword=Java"
  },
  {
    "company": "科大讯飞",
    "tier": "大厂",
    "title": "Java架构师",
    "city": "合肥",
    "salary": "10-20K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis-Plus",
      "MySQL",
      "Redis",
      "MongoDB",
      "Elasticsearch"
    ],
    "source": "market_estimate",
    "url": "https://campus.iflytek.com/jobList?keyword=Java"
  },
  {
    "company": "招商银行",
    "tier": "银行",
    "title": "Java架构师",
    "city": "深圳",
    "salary": "18-36K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "DDD",
      "Spring Boot",
      "MySQL",
      "Redis",
      "Kafka",
      "Docker"
    ],
    "source": "market_estimate",
    "url": "https://career.cmbchina.com/#/search?keyword=Java"
  },
  {
    "company": "蔚来",
    "tier": "新势力",
    "title": "Java高级开发工程师",
    "city": "合肥",
    "salary": "9-18K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://nio.jobs.feishu.cn/index/?keywords=Java"
  },
  {
    "company": "网易",
    "tier": "中厂",
    "title": "Java高级开发工程师",
    "city": "广州",
    "salary": "20-41K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Java",
      "Hadoop",
      "Spark",
      "Flink",
      "Hive",
      "Kafka",
      "HBase"
    ],
    "source": "market_estimate",
    "url": "https://hr.163.com/job-list.html?search=Java"
  },
  {
    "company": "中兴通讯",
    "tier": "大厂",
    "title": "Java开发工程师",
    "city": "西安",
    "salary": "16-32K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://job.zte.com.cn/cn/tech-job?keyword=Java"
  },
  {
    "company": "虎牙直播",
    "tier": "中厂",
    "title": "Java技术专家",
    "city": "广州",
    "salary": "21-42K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://hr.huya.com/#/social?keyword=Java"
  },
  {
    "company": "理想汽车",
    "tier": "新势力",
    "title": "Java架构师",
    "city": "北京",
    "salary": "24-48K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "WebLogic",
      "Linux"
    ],
    "source": "market_estimate",
    "url": "https://www.lixiang.com/employ/social.html?keyword=Java"
  },
  {
    "company": "新网银行",
    "tier": "银行",
    "title": "Java技术专家",
    "city": "成都",
    "salary": "14-28K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "DDD",
      "Spring Boot",
      "MySQL",
      "Redis",
      "Kafka",
      "Docker"
    ],
    "source": "market_estimate",
    "url": "https://www.zhipin.com/web/geek/job?query=Java+%E6%96%B0%E7%BD%91%E9%93%B6%E8%A1%8C"
  },
  {
    "company": "得物App",
    "tier": "中厂",
    "title": "Java架构师",
    "city": "上海",
    "salary": "14-28K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.dewu.com/#/?keyword=Java"
  },
  {
    "company": "中信银行",
    "tier": "银行",
    "title": "Java微服务开发工程师",
    "city": "北京",
    "salary": "16-31K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "DDD",
      "Spring Boot",
      "MySQL",
      "Redis",
      "Kafka",
      "Docker"
    ],
    "source": "market_estimate",
    "url": "https://www.hotjob.cn/wt/chinaciticbank/web/index/social?keyword=Java"
  },
  {
    "company": "理想汽车",
    "tier": "新势力",
    "title": "Java技术专家",
    "city": "北京",
    "salary": "15-29K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://www.lixiang.com/employ/social.html?keyword=Java"
  },
  {
    "company": "米哈游",
    "tier": "中厂",
    "title": "Java中间件开发",
    "city": "上海",
    "salary": "15-29K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MyBatis-Plus",
      "MySQL",
      "Redis",
      "MongoDB",
      "Elasticsearch"
    ],
    "source": "market_estimate",
    "url": "https://jobs.mihoyo.com/social-recruitment/mihoyo/?keyword=Java"
  },
  {
    "company": "完美世界",
    "tier": "中厂",
    "title": "Java服务端开发工程师",
    "city": "北京",
    "salary": "14-27K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://jobs.wanmei.com/social?keyword=Java"
  },
  {
    "company": "招商银行",
    "tier": "银行",
    "title": "Java微服务开发工程师",
    "city": "深圳",
    "salary": "14-27K",
    "exp": "1-3年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://career.cmbchina.com/#/search?keyword=Java"
  },
  {
    "company": "海康威视",
    "tier": "大厂",
    "title": "Java技术专家",
    "city": "杭州",
    "salary": "17-34K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "微服务",
      "Spring Cloud",
      "Docker",
      "K8s",
      "MySQL",
      "Redis",
      "Prometheus"
    ],
    "source": "market_estimate",
    "url": "https://talent.hikvision.com/post-list.html?search=Java"
  },
  {
    "company": "小米",
    "tier": "一线",
    "title": "Java大数据开发工程师",
    "city": "北京",
    "salary": "24-47K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Boot",
      "MySQL",
      "Redis",
      "Docker",
      "Jenkins",
      "ELK",
      "MQ"
    ],
    "source": "market_estimate",
    "url": "https://xiaomi.jobs.f.mioffice.cn/index/?keywords=Java"
  },
  {
    "company": "美团",
    "tier": "一线",
    "title": "Java技术专家",
    "city": "北京",
    "salary": "18-36K",
    "exp": "3-5年",
    "degree": "本科",
    "tags": [
      "Spring Cloud",
      "Docker",
      "Kubernetes",
      "MySQL",
      "Redis",
      "RocketMQ"
    ],
    "source": "market_estimate",
    "url": "https://zhaopin.meituan.com/web/pc#/?keyword=Java"
  },
  {
    "company": "网易",
    "tier": "中厂",
    "title": "Java大数据开发工程师",
    "city": "杭州",
    "salary": "22-44K",
    "exp": "5-10年",
    "degree": "本科",
    "tags": [
      "Spring Cloud Alibaba",
      "Nacos",
      "Sentinel",
      "Seata",
      "MySQL",
      "Redis"
    ],
    "source": "market_estimate",
    "url": "https://hr.163.com/job-list.html?search=Java"
  }
];
const MY_SKILLS = ["Java","Spring Boot","Spring Cloud","MySQL","Redis","Docker","Linux","Git","Kubernetes","MyBatis","高并发","Maven","Kafka","Nacos","微服务"];
function skillMatch(tags: string[]): number {
  if (tags.length === 0) return 0;
  const matched = tags.filter((t: string) => MY_SKILLS.some((s) => s.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(s.toLowerCase())));
  return Math.round((matched.length / tags.length) * 100);
}
function tierColor(tier: string): string {
  const m: Record<string,string> = {"一线":"#d97757","中厂":"#b55320","大厂":"#c27a1a","新势力":"#5c5a55","银行":"#73726c"};
  return m[tier]||"#5c5a55";
}
const CITIES = [...new Set(JOBS.map((j:any)=>j.city))].sort();
const TIERS = [...new Set(JOBS.map((j:any)=>j.tier))].sort();

export default function JobsPage() {
  const [city, setCity] = useState("");
  const [tier, setTier] = useState("");
  const [minSalary, setMinSalary] = useState(0);
  const [sortBy, setSortBy] = useState<"match"|"salary"|"company">("match");
  const [showClusters, setShowClusters] = useState(false);
  const parseSalary = (s: string) => parseInt(s.replace("K","").split("-")[0]);
  const filtered = useMemo(() => {
    let list = JOBS.slice();
    if (city) list = list.filter((j:any)=>j.city===city);
    if (tier) list = list.filter((j:any)=>j.tier===tier);
    if (minSalary>0) list = list.filter((j:any)=>parseSalary(j.salary)>=minSalary);
    if (sortBy==="match") list.sort((a:any,b:any)=>skillMatch(b.tags)-skillMatch(a.tags));
    else if (sortBy==="salary") list.sort((a:any,b:any)=>parseSalary(b.salary)-parseSalary(a.salary));
    else list.sort((a:any,b:any)=>a.company.localeCompare(b.company,"zh-Hans-CN"));
    return list;
  }, [city,tier,minSalary,sortBy]);
  return (<div className="page-shell narrow">
    <div className="page-title">
      <p className="eyebrow">Career Desk · 130 岗位 · 官方链接</p>
      <h1>Java 招聘聚类看板</h1>
      <p>全部链接指向企业官方招聘官网 · 匹配技能栈：
        {MY_SKILLS.map((s,i)=><code key={s} style={{margin:"0 2px",fontSize:"0.72rem",background:"rgba(217,119,87,0.08)",padding:"1px 5px",borderRadius:4}}>{s}</code>)}
      </p>
    </div>
    <div style={{marginBottom:24,padding:16,background:"rgba(217,119,87,0.05)",borderRadius:10,border:"1px solid rgba(217,119,87,0.12)"}}>
      <button onClick={()=>setShowClusters(!showClusters)} style={{border:0,background:"none",cursor:"pointer",fontSize:"0.82rem",fontWeight:600,color:"#d97757",fontFamily:"inherit"}}>
        {showClusters?"▲ 收起聚类分析":"▼ 展开聚类分析 — 130岗位/12技术簇/11城市"}
      </button>
      {showClusters&&(<div style={{marginTop:12,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}}>
        <div><b style={{fontSize:"0.78rem",color:"#141413"}}>🔥 技能需求</b><div style={{fontSize:"0.72rem"}}>{["Redis 93%","MySQL 76%","Spring Boot 53%","Docker 43%","Spring Cloud 19%","Kubernetes 17%","Kafka 14%","Linux 16%"].map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}><span style={{width:60}}>{s.split(" ")[0]}</span><div style={{flex:1,height:5,borderRadius:3,background:"rgba(31,30,29,0.06)",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:"#d97757",width:s.split(" ")[1]}}/></div><span style={{fontSize:"0.66rem",color:"#5c5a55",width:32,textAlign:"right"}}>{s.split(" ")[1]}</span></div>)}</div></div>
        <div><b style={{fontSize:"0.78rem",color:"#141413"}}>💰 城市薪资</b><div style={{fontSize:"0.72rem"}}>{["北京 均19.3K","杭州 均18.4K","上海 均18.2K","深圳 均17.2K","广州 均17.1K","成都 均15.3K"].map((s,i)=><div key={i} style={{display:"flex",gap:6,marginTop:3}}><span style={{fontWeight:600}}>{i+1}.</span><span style={{width:40}}>{s.split(" ")[0]}</span><span style={{color:"#d97757",fontWeight:600}}>{s.split(" ")[1]}</span></div>)}</div></div>
        <div><b style={{fontSize:"0.78rem",color:"#141413"}}>🏢 公司类型</b><div style={{fontSize:"0.72rem"}}>{["一线 36岗 均18K","中厂 51岗 均17K","银行 16岗 均18K","大厂 13岗 均14K","新势力 14岗 均16K"].map((s,i)=><div key={i} style={{display:"flex",gap:4,marginTop:3}}><span style={{fontWeight:600,color:["#d97757","#b55320","#73726c","#c27a1a","#5c5a55"][i]}}>{s.split(" ")[0]}</span><span style={{color:"#9d9b92"}}>{s.split(" ")[1]}</span><span style={{fontWeight:600}}>{s.split(" ")[2]}</span></div>)}</div></div>
        <div><b style={{fontSize:"0.78rem",color:"#141413"}}>📊 经验</b><div style={{fontSize:"0.72rem"}}>{["3-5年 75岗 58%","5-10年 32岗 25%","1-3年 21岗 16%","8-15年 2岗 2%"].map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}><span style={{width:50}}>{s.split(" ")[0]}</span><span style={{color:"#73726c",width:40}}>{s.split(" ")[1]}</span><div style={{flex:1,height:5,borderRadius:3,background:"rgba(31,30,29,0.06)",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:"#a8d672",width:s.split(" ")[2]}}/></div></div>)}</div></div>
      </div>)}
    </div>
    <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap",alignItems:"center"}}>
      <select value={city} onChange={(e:any)=>setCity(e.target.value)} style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(31,30,29,0.15)",background:"#faf9f5",fontSize:"0.82rem",fontFamily:"inherit"}}>
        <option value="">🏙 全部 ({JOBS.length})</option>{CITIES.map((c:string)=><option key={c} value={c}>{c} ({JOBS.filter((j:any)=>j.city===c).length})</option>)}
      </select>
      <select value={tier} onChange={(e:any)=>setTier(e.target.value)} style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(31,30,29,0.15)",background:"#faf9f5",fontSize:"0.82rem",fontFamily:"inherit"}}>
        <option value="">🏢 全部类型</option>{TIERS.map((t:string)=><option key={t} value={t}>{t} ({JOBS.filter((j:any)=>j.tier===t).length})</option>)}
      </select>
      <select value={String(minSalary)} onChange={(e:any)=>setMinSalary(Number(e.target.value))} style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(31,30,29,0.15)",background:"#faf9f5",fontSize:"0.82rem",fontFamily:"inherit"}}>
        <option value="0">💰 全部薪资</option><option value="15">≥15K</option><option value="20">≥20K</option><option value="25">≥25K</option><option value="30">≥30K</option>
      </select>
      <span style={{fontSize:"0.72rem",color:"#73726c"}}>共 {filtered.length} 个岗位</span><span style={{flex:1}}/>
      <select value={sortBy} onChange={(e:any)=>setSortBy(e.target.value)} style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(31,30,29,0.15)",background:"#faf9f5",fontSize:"0.82rem",fontFamily:"inherit"}}>
        <option value="match">🎯 匹配度</option><option value="salary">💰 薪资</option><option value="company">🔤 公司</option>
      </select>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filtered.length===0&&(<div className="card" style={{textAlign:"center",padding:"40px 20px"}}><p className="eyebrow">No Match</p><h3>无匹配岗位</h3></div>)}
      {filtered.map((job:any)=>{
        const match=skillMatch(job.tags);
        return (<div key={job.company+job.title} className="card" style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <a href={job.url} target="_blank" rel="noopener" style={{fontWeight:700,fontSize:"1rem",color:"#141413",textDecoration:"none"}}>{job.company} <span style={{fontSize:"0.64rem",color:"#9d9b92"}}>→</span></a>
            <span style={{fontSize:"0.68rem",padding:"2px 7px",borderRadius:4,background:tierColor(job.tier)+"18",color:tierColor(job.tier),fontWeight:600}}>{job.tier}</span>
            <span style={{fontSize:"0.74rem",color:"#73726c"}}>{job.city}</span>
            <span style={{fontSize:"0.74rem",color:"#9d9b92"}}>· {job.exp}</span>
            <span style={{flex:1}}/>
            <span style={{fontSize:"0.82rem",color:"#d97757",fontWeight:700}}>{job.salary}</span>
            <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:8}}>
              <div style={{width:44,height:3,borderRadius:2,background:"rgba(31,30,29,0.06)",overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:match>=60?"#a8d672":match>=30?"#e5a84b":"#d97757",width:Math.min(100,match)+"%"}}/></div>
              <span style={{fontSize:"0.68rem",fontWeight:700,color:match>=60?"#4d7a2a":match>=30?"#b55320":"#d97757"}}>{match}%</span>
            </div>
          </div>
          <div style={{fontSize:"0.88rem",fontWeight:600,color:"#141413"}}>{job.title}</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {job.tags.map((tag:string)=>{const mySkill=MY_SKILLS.some((s:string)=>s.toLowerCase().includes(tag.toLowerCase())||tag.toLowerCase().includes(s.toLowerCase()));
              return <span key={tag} style={{fontSize:"0.66rem",padding:"2px 6px",borderRadius:4,background:mySkill?"rgba(217,119,87,0.12)":"rgba(31,30,29,0.04)",color:mySkill?"#b55320":"#9d9b92",fontWeight:mySkill?600:400,border:mySkill?"1px solid rgba(217,119,87,0.2)":"1px solid rgba(31,30,29,0.06)"}}>{mySkill?"✓ ":""}{tag}</span>;})}
          </div>
        </div>);
      })}
    </div>
    <div style={{marginTop:28,textAlign:"center",fontSize:"0.78rem",color:"#9d9b92"}}>
      <p>每个公司名可直接点击跳转官方招聘官网搜索 Java 岗位 · <Link href="/" style={{color:"#d97757"}}>回到首页</Link></p>
    </div>
  </div>);
}
