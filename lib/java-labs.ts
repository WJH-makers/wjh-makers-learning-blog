/**
 * Public, versioned contracts for the first Java laboratory season.
 *
 * A manifest deliberately contains only course material and client-safe
 * assertions. Recommendation weights, aggregate learning data and any future
 * scoring policy stay on the server; they do not belong in this module.
 */

export const JAVA_LAB_CONTRACT = {
  runtime: "browser-java17-spike",
  javaVersion: 17,
  promise: "浏览器实验模式：仅在 Java 17 兼容运行时通过验证后提供运行。",
  excluded: ["Java 25", "Maven", "JUnit", "多文件项目"],
  privacy: "源码、标准输入、控制台全文和本地路径默认只保留在本机。",
} as const;

export type LabAssertion = {
  id: string;
  description: string;
  expectedOutput?: string;
};

export type LabManifest = {
  id: string;
  version: 1;
  contentId: string;
  slug: string;
  locale: "zh-CN";
  terminologyVersion: "java-terms-v1";
  technicalVersion: "java17-v1";
  title: string;
  environment: typeof JAVA_LAB_CONTRACT;
  files: ReadonlyArray<{ path: "Main.java"; content: string }>;
  starter: string;
  stdin: string;
  limits: { compileMs: number; runMs: number; maxOutputChars: number };
  assertions: ReadonlyArray<LabAssertion>;
  knowledgePoints: readonly string[];
  prerequisites: readonly string[];
  misconceptionTags: readonly string[];
  projectIncrement: string;
  reviewAfterDays: readonly number[];
};

export type JavaDiagnostic = {
  severity: "error" | "warning";
  message: string;
  line?: number;
  column?: number;
};

export type JavaPreflight = {
  passed: boolean;
  diagnostics: readonly JavaDiagnostic[];
};

function lineAndColumn(source: string, index: number): Pick<JavaDiagnostic, "line" | "column"> {
  const before = source.slice(0, Math.max(0, index));
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

/**
 * A deliberately small, client-safe boundary check. It is not a compiler and
 * must never be presented as one: the browser runtime remains unavailable
 * until a real Java 17 runtime is independently verified.
 */
export function preflightJava17SingleFile(source: string): JavaPreflight {
  const diagnostics: JavaDiagnostic[] = [];
  if (!source.trim()) {
    diagnostics.push({ severity: "error", message: "Main.java 不能为空。", line: 1, column: 1 });
    return { passed: false, diagnostics };
  }

  const packageMatch = /^\s*package\s+/m.exec(source);
  if (packageMatch) {
    diagnostics.push({
      severity: "error",
      message: "在线实验只支持默认包中的单文件 Main.java。",
      ...lineAndColumn(source, packageMatch.index),
    });
  }
  if (!/\b(?:public\s+)?class\s+Main\b/.test(source)) {
    diagnostics.push({ severity: "error", message: "没有找到 Main 类。", line: 1, column: 1 });
  }
  if (!/\bpublic\s+static\s+void\s+main\s*\(\s*String(?:\[\s*\]|\.\.\.)\s*\w+\s*\)/.test(source)) {
    diagnostics.push({
      severity: "error",
      message: "需要 Java 17 入口：public static void main(String[] args)。",
      line: 1,
      column: 1,
    });
  }

  const compactMain = /^\s*void\s+main\s*\(/m.exec(source) ?? /\bIO\.println\s*\(/.exec(source);
  if (compactMain) {
    diagnostics.push({
      severity: "error",
      message: "检测到 Java 25 紧凑源文件语法；本实验固定为 Java 17。",
      ...lineAndColumn(source, compactMain.index),
    });
  }

  return { passed: diagnostics.length === 0, diagnostics };
}

type Starter = Omit<LabManifest, "id" | "version" | "contentId" | "slug" | "locale" | "terminologyVersion" | "technicalVersion" | "environment" | "limits" | "starter"> & {
  number: number;
  slug: string;
};

const STARTERS: readonly Starter[] = [
  { number: 1, slug: "2026-05-03-java-s01e01-hello", title: "第一次让程序开口", files: [{ path: "Main.java", content: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"豆豆咖啡站 · 营业中 ☕\");\n  }\n}\n" }], stdin: "", assertions: [{ id: "hello", description: "让咖啡站说出第一句招呼", expectedOutput: "豆豆咖啡站 · 营业中 ☕" }], knowledgePoints: ["java.main", "java.console-output"], prerequisites: [], misconceptionTags: ["compile-vs-run", "main-signature"], projectIncrement: "咖啡机可以向顾客打招呼。", reviewAfterDays: [1, 7, 21] },
  { number: 2, slug: "2026-05-04-java-s01e02-variables", title: "变量仓库", files: [{ path: "Main.java", content: "public class Main {\n  public static void main(String[] args) {\n    int cups = 2;\n    double price = 12.5;\n    System.out.println(cups * price);\n  }\n}\n" }], stdin: "", assertions: [{ id: "typed-values", description: "用变量计算总价", expectedOutput: "25.0" }], knowledgePoints: ["java.variables", "java.primitive-types"], prerequisites: ["java.main"], misconceptionTags: ["integer-vs-decimal", "variable-type"], projectIncrement: "咖啡机记住杯数与单价。", reviewAfterDays: [1, 7, 21] },
  {
    number: 3,
    slug: "2026-05-05-java-s01e03-operators",
    title: "咖啡价格计算器",
    files: [{
      path: "Main.java",
      content: "public class Main {\n  static int totalCents(int unitPriceCents, int cups) {\n    if (unitPriceCents < 0 || cups < 0) {\n      throw new IllegalArgumentException(\"price and cups must be non-negative\");\n    }\n    return unitPriceCents * cups;\n  }\n\n  public static void main(String[] args) {\n    int unitPriceCents = 1250;\n    int cups = 3;\n    System.out.println(\"totalCents: \" + totalCents(unitPriceCents, cups));\n  }\n}\n",
    }],
    stdin: "",
    assertions: [
      { id: "three-cups", description: "单价 1250 分、3 杯，计算总价", expectedOutput: "totalCents: 3750" },
      { id: "zero-cups", description: "单价 1250 分、0 杯，总价为 0", expectedOutput: "totalCents: 0" },
      { id: "negative-input", description: "负数单价或杯数必须拒绝", expectedOutput: "IllegalArgumentException" },
    ],
    knowledgePoints: ["java.operators", "java.methods", "java.boundary-check"],
    prerequisites: ["java.variables"],
    misconceptionTags: ["integer-division", "operator-precedence", "missing-boundary-check"],
    projectIncrement: "咖啡机可以用“分”精确计算订单小计，并拒绝负数输入。",
    reviewAfterDays: [1, 7, 21],
  },
  { number: 4, slug: "2026-05-06-java-s01e04-if", title: "余额不足：if", files: [{ path: "Main.java", content: "public class Main {\n  public static void main(String[] args) {\n    int balance = 10;\n    int price = 12;\n    System.out.println(balance >= price ? \"paid\" : \"insufficient\");\n  }\n}\n" }], stdin: "", assertions: [{ id: "branch", description: "余额不足时拒绝付款", expectedOutput: "insufficient" }], knowledgePoints: ["java.if"], prerequisites: ["java.operators"], misconceptionTags: ["assignment-vs-equality", "missing-branch"], projectIncrement: "付款前检查顾客余额。", reviewAfterDays: [1, 7, 21] },
  { number: 5, slug: "2026-05-07-java-s01e05-switch", title: "菜单选择：switch", files: [{ path: "Main.java", content: "public class Main {\n  public static void main(String[] args) {\n    int choice = 2;\n    String drink = switch (choice) {\n      case 1 -> \"Americano\";\n      case 2 -> \"Latte\";\n      default -> \"Unknown\";\n    };\n    System.out.println(drink);\n  }\n}\n" }], stdin: "", assertions: [{ id: "switch", description: "编号 2 选择拿铁", expectedOutput: "Latte" }], knowledgePoints: ["java.switch"], prerequisites: ["java.if"], misconceptionTags: ["switch-fallthrough", "missing-default"], projectIncrement: "顾客能按编号点单。", reviewAfterDays: [1, 7, 21] },
  { number: 6, slug: "2026-05-08-java-s01e06-loops", title: "批量制作：循环", files: [{ path: "Main.java", content: "public class Main {\n  public static void main(String[] args) {\n    for (int cup = 1; cup <= 3; cup++) {\n      System.out.println(\"make \" + cup);\n    }\n  }\n}\n" }], stdin: "", assertions: [{ id: "loop", description: "连续制作三杯", expectedOutput: "make 1\nmake 2\nmake 3" }], knowledgePoints: ["java.loops"], prerequisites: ["java.if"], misconceptionTags: ["off-by-one", "infinite-loop"], projectIncrement: "咖啡机可批量制作订单。", reviewAfterDays: [1, 7, 21] },
  { number: 7, slug: "2026-05-09-java-s01e07-arrays", title: "多杯订单：数组", files: [{ path: "Main.java", content: "public class Main {\n  public static void main(String[] args) {\n    String[] order = {\"Latte\", \"Mocha\"};\n    System.out.println(order[0]);\n  }\n}\n" }], stdin: "", assertions: [{ id: "array", description: "读取订单的第一杯", expectedOutput: "Latte" }], knowledgePoints: ["java.arrays"], prerequisites: ["java.loops"], misconceptionTags: ["array-out-of-bounds", "length-vs-index"], projectIncrement: "一张订单能够保存多杯饮品。", reviewAfterDays: [1, 7, 21] },
  { number: 8, slug: "2026-05-10-java-s01e08-methods", title: "制作步骤：方法", files: [{ path: "Main.java", content: "public class Main {\n  static String makeCoffee(String drink) {\n    return \"made \" + drink;\n  }\n\n  public static void main(String[] args) {\n    System.out.println(makeCoffee(\"Latte\"));\n  }\n}\n" }], stdin: "", assertions: [{ id: "method", description: "复用制作步骤", expectedOutput: "made Latte" }], knowledgePoints: ["java.methods"], prerequisites: ["java.loops"], misconceptionTags: ["return-vs-print", "parameter-scope"], projectIncrement: "制作步骤可复用。", reviewAfterDays: [1, 7, 21] },
  { number: 9, slug: "2026-05-11-java-s01e09-scanner", title: "顾客输入：Scanner", files: [{ path: "Main.java", content: "import java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner input = new Scanner(System.in);\n    System.out.println(\"order: \" + input.nextLine());\n  }\n}\n" }], stdin: "Latte\n", assertions: [{ id: "stdin", description: "读取顾客点单", expectedOutput: "order: Latte" }], knowledgePoints: ["java.scanner", "java.stdin"], prerequisites: ["java.methods"], misconceptionTags: ["nextline-after-nextint", "unclosed-scanner"], projectIncrement: "顾客可以输入饮品名称。", reviewAfterDays: [1, 7, 21] },
  { number: 10, slug: "2026-05-12-java-s01e10-string", title: "名称与备注：String", files: [{ path: "Main.java", content: "public class Main {\n  public static void main(String[] args) {\n    String note = \"less ice\";\n    System.out.println(note.equals(\"less ice\"));\n  }\n}\n" }], stdin: "", assertions: [{ id: "string", description: "用 equals 比较备注", expectedOutput: "true" }], knowledgePoints: ["java.string", "java.equals"], prerequisites: ["java.methods"], misconceptionTags: ["string-reference-equality", "string-immutability"], projectIncrement: "订单可携带顾客备注。", reviewAfterDays: [1, 7, 21] },
  { number: 11, slug: "2026-05-13-java-s01e11-bugs", title: "Bug 第一次入侵", files: [{ path: "Main.java", content: "public class Main {\n  public static void main(String[] args) {\n    String drink = null;\n    if (drink == null) {\n      System.out.println(\"missing drink\");\n      return;\n    }\n    System.out.println(drink.toUpperCase());\n  }\n}\n" }], stdin: "", assertions: [{ id: "null-guard", description: "在调用前处理空值", expectedOutput: "missing drink" }], knowledgePoints: ["java.debugging", "java.null"], prerequisites: ["java.string"], misconceptionTags: ["null-pointer", "read-stack-trace"], projectIncrement: "咖啡机遇到缺失饮品不会崩溃。", reviewAfterDays: [1, 7, 21] },
  { number: 12, slug: "2026-05-14-java-s01e12-coffee-machine", title: "控制台咖啡机", files: [{ path: "Main.java", content: "public class Main {\n  static int total(int price, int cups) {\n    return price * cups;\n  }\n\n  public static void main(String[] args) {\n    System.out.println(\"total: \" + total(12, 2));\n  }\n}\n" }], stdin: "", assertions: [{ id: "coffee-machine", description: "整合计算功能", expectedOutput: "total: 24" }], knowledgePoints: ["java.season-one-project"], prerequisites: ["java.arrays", "java.methods", "java.debugging"], misconceptionTags: ["missing-boundary-test", "unverified-output"], projectIncrement: "控制台咖啡机 v1 的价格核心可验证。", reviewAfterDays: [1, 7, 21] },
];

export const JAVA_LABS: readonly LabManifest[] = STARTERS.map((starter) => ({
  ...starter,
  starter: starter.files[0]?.content ?? "",
  id: `java-s01e${String(starter.number).padStart(2, "0")}`,
  version: 1,
  contentId: `java.s01.e${String(starter.number).padStart(2, "0")}`,
  locale: "zh-CN",
  terminologyVersion: "java-terms-v1",
  technicalVersion: "java17-v1",
  environment: JAVA_LAB_CONTRACT,
  limits: { compileMs: 4_000, runMs: 2_000, maxOutputChars: 4_000 },
}));

export function findJavaLab(identifier: string): LabManifest | undefined {
  return JAVA_LABS.find((lab) => lab.slug === identifier || lab.id === identifier);
}

export function validateJavaLabs(labs: readonly LabManifest[] = JAVA_LABS): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const lab of labs) {
    if (seen.has(lab.id)) errors.push(`重复实验 ID：${lab.id}`);
    seen.add(lab.id);
    if (lab.environment.javaVersion !== 17) errors.push(`${lab.id} 不是 Java 17 实验`);
    if (lab.files.length !== 1 || lab.files[0]?.path !== "Main.java") errors.push(`${lab.id} 只能包含 Main.java`);
    if (!lab.assertions.length || !lab.knowledgePoints.length || !lab.misconceptionTags.length) errors.push(`${lab.id} 缺少课程证据`);
    if (lab.limits.runMs <= 0 || lab.limits.maxOutputChars <= 0) errors.push(`${lab.id} 资源限制无效`);
  }
  return errors;
}
