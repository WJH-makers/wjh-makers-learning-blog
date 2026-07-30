export const JAVA_LAB_CONTRACT = {
  javaVersion: 17,
  files: ["Main.java"],
  limits: { compileMs: 4_000, runMs: 2_000, maxOutputChars: 4_000 },
} as const;

export type LabAssertion = {
  id: string;
  description: string;
  expectedOutput: string;
};

export type LabManifest = {
  id: string;
  version: 1;
  slug: string;
  title: string;
  starter: string;
  stdin: string;
  assertions: readonly LabAssertion[];
  limits: typeof JAVA_LAB_CONTRACT.limits;
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

/** Fast local feedback only. The sandbox response remains the compilation authority. */
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

type Starter = Omit<LabManifest, "id" | "version" | "limits"> & { number: number };

const STARTERS: readonly Starter[] = [
  { number: 1, slug: "2026-07-25-java-s01e01-hello", title: "第一次让程序开口", starter: `public class Main {
  public static void main(String[] args) {
    System.out.println("豆豆咖啡站 · 营业中");
  }
}
`, stdin: "", assertions: [{ id: "hello", description: "输出第一句招呼", expectedOutput: "豆豆咖啡站 · 营业中" }] },
  { number: 2, slug: "2026-07-26-java-s01e02-variables", title: "变量仓库", starter: `public class Main {
  public static void main(String[] args) {
    int cups = 2;
    double price = 12.5;
    System.out.println(cups * price);
  }
}
`, stdin: "", assertions: [{ id: "typed-values", description: "计算两杯咖啡的总价", expectedOutput: "25.0" }] },
  { number: 3, slug: "2026-07-27-java-s01e03-operators", title: "咖啡价格计算器", starter: `public class Main {
  public static void main(String[] args) {
    int unitPriceCents = 1250;
    int cups = 3;
    System.out.println("totalCents: " + unitPriceCents * cups);
  }
}
`, stdin: "", assertions: [{ id: "three-cups", description: "计算三杯咖啡的小计", expectedOutput: "totalCents: 3750" }] },
  { number: 4, slug: "2026-07-28-java-s01e04-if", title: "余额不足：if", starter: `public class Main {
  public static void main(String[] args) {
    int balance = 10;
    int price = 12;
    System.out.println(balance >= price ? "paid" : "insufficient");
  }
}
`, stdin: "", assertions: [{ id: "branch", description: "余额不足时拒绝付款", expectedOutput: "insufficient" }] },
  { number: 5, slug: "2026-07-29-java-s01e05-switch", title: "菜单选择：switch", starter: `public class Main {
  public static void main(String[] args) {
    int choice = 2;
    String drink = switch (choice) {
      case 1 -> "Americano";
      case 2 -> "Latte";
      default -> "Unknown";
    };
    System.out.println(drink);
  }
}
`, stdin: "", assertions: [{ id: "switch", description: "编号 2 选择拿铁", expectedOutput: "Latte" }] },
  { number: 6, slug: "2026-07-30-java-s01e06-loops", title: "批量制作：循环", starter: `public class Main {
  public static void main(String[] args) {
    for (int cup = 1; cup <= 3; cup++) {
      System.out.println("make " + cup);
    }
  }
}
`, stdin: "", assertions: [{ id: "loop", description: "连续制作三杯", expectedOutput: "make 1\nmake 2\nmake 3" }] },
  { number: 7, slug: "2026-07-31-java-s01e07-arrays", title: "多杯订单：数组", starter: `public class Main {
  public static void main(String[] args) {
    String[] order = {"Latte", "Mocha"};
    System.out.println(order[0]);
  }
}
`, stdin: "", assertions: [{ id: "array", description: "读取订单的第一杯", expectedOutput: "Latte" }] },
  { number: 8, slug: "2026-08-01-java-s01e08-methods", title: "制作步骤：方法", starter: `public class Main {
  static String makeCoffee(String drink) {
    return "made " + drink;
  }

  public static void main(String[] args) {
    System.out.println(makeCoffee("Latte"));
  }
}
`, stdin: "", assertions: [{ id: "method", description: "复用制作步骤", expectedOutput: "made Latte" }] },
  { number: 9, slug: "2026-08-02-java-s01e09-scanner", title: "顾客输入：Scanner", starter: `import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner input = new Scanner(System.in);
    System.out.println("order: " + input.nextLine());
  }
}
`, stdin: "Latte\n", assertions: [{ id: "stdin", description: "读取顾客点单", expectedOutput: "order: Latte" }] },
  { number: 10, slug: "2026-08-03-java-s01e10-string", title: "名称与备注：String", starter: `public class Main {
  public static void main(String[] args) {
    String note = "less ice";
    System.out.println(note.equals("less ice"));
  }
}
`, stdin: "", assertions: [{ id: "string", description: "用 equals 比较备注", expectedOutput: "true" }] },
  { number: 11, slug: "2026-08-04-java-s01e11-bugs", title: "Bug 第一次入侵", starter: `public class Main {
  public static void main(String[] args) {
    String drink = null;
    if (drink == null) {
      System.out.println("missing drink");
      return;
    }
    System.out.println(drink.toUpperCase());
  }
}
`, stdin: "", assertions: [{ id: "null-guard", description: "先处理空值", expectedOutput: "missing drink" }] },
  { number: 12, slug: "2026-08-05-java-s01e12-coffee-machine", title: "控制台咖啡机", starter: `public class Main {
  static int total(int price, int cups) {
    return price * cups;
  }

  public static void main(String[] args) {
    System.out.println("total: " + total(12, 2));
  }
}
`, stdin: "", assertions: [{ id: "coffee-machine", description: "整合价格计算", expectedOutput: "total: 24" }] },
];

export const JAVA_LABS: readonly LabManifest[] = STARTERS.map((starter) => ({
  ...starter,
  id: `java-s01e${String(starter.number).padStart(2, "0")}`,
  version: 1,
  limits: JAVA_LAB_CONTRACT.limits,
}));

export function findJavaLab(slug: string): LabManifest | undefined {
  return JAVA_LABS.find((lab) => lab.slug === slug);
}

export function validateJavaLabs(labs: readonly LabManifest[] = JAVA_LABS): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const lab of labs) {
    if (ids.has(lab.id)) errors.push(`重复实验 ID：${lab.id}`);
    ids.add(lab.id);
    if (!lab.starter.includes("class Main")) errors.push(`${lab.id} 缺少 Main 类`);
    if (lab.limits !== JAVA_LAB_CONTRACT.limits) errors.push(`${lab.id} 未使用统一资源上限`);
    if (lab.assertions.length === 0) errors.push(`${lab.id} 缺少预期输出`);
  }
  return errors;
}
