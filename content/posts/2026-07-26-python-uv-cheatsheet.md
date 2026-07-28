---
title: "Python + uv 速查 · 版本到发布的全周期"
date: 2026-07-26
summary: "按「装 Python → 建项目 → 管依赖 → 跑代码 → 检查测试 → 构建发布 → 迁移排障」全生命周期编排的 uv 速查，含 pyenv/venv/pip/pip-tools/pipx 职责替代表、pip 与 poetry 命令对照，破坏性操作显式标注。"
tags: [命令速查, Python, uv]
---


# Python + uv 速查 · 版本到发布的全周期

> 基线：Python 3.13 / 3.14；uv 0.9+（命令在 0.11.x 实测）；ruff、pytest。标「新版」的是 0.9 之后加的子命令，`uv --help` 里没有就用同行等价写法。**项目接口**（`uv add`/`sync`，改 `pyproject.toml`+`uv.lock`）与 **pip 兼容层**（`uv pip`，只动环境不写配置）语义别混。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 1、uv 是什么 | 一个二进制吃掉 pyenv+venv+pip+pip-tools+pipx |
| 2、Python 版本管理 | 装版本、钉版本、查当前用哪个解释器 |
| 3、创建项目与虚拟环境 | `uv init` 起项目，`.venv` 交给 uv 自动维护 |
| 4、依赖增删与锁定 | `add/remove` 改意图，`lock/sync` 落地环境 |
| 5、运行脚本与工具 | 项目内 `uv run`，一次性工具 `uvx` |
| 6、代码检查与格式化 | ruff 顶掉 flake8+isort+black |
| 7、测试 | pytest 的筛选、重跑、并行、覆盖率 |
| 8、构建与发布 | `version → build → publish` 上 PyPI |
| 9、迁移 | 从 pip / pip-tools / poetry / pipx 平移过来 |
| 10、清理与排障 | 缓存、环境、解析冲突、换源 |

## 1、uv 是什么：一个二进制吃掉五个工具

| 被替代 | 原职责 | uv 能力 | 备注 / 坑 |
|--------|--------|---------|-----------|
| `pyenv` | 装/切 Python 版本 | `uv python install` / `pin` | 装的是预编译产物，不本地源码编译 |
| `venv` | 建虚拟环境 | `uv venv`，`uv run` 会自动建 | 建的环境**默认不装 pip**，`python -m pip` 会失败，需 `--seed` |
| `pip` | 装包到环境 | `uv add`（改配置）/ `uv pip`（纯兼容） | `uv pip install` 不写 `pyproject.toml`，下次 `uv sync` 就卸掉 |
| `pip-tools` | 锁定依赖 | `uv lock`（跨平台）/ `uv pip compile` | `uv.lock` 平台无关，`requirements.txt` 是单平台快照 |
| `pipx` | 全局装 CLI 工具 | `uv tool install` / `uvx` | `uvx` = `uv tool run`，跑完不落盘 |
| `twine` | 上传 PyPI | `uv publish` | 默认传 `dist/*`，不用另装 twine |

**pip / pyenv / pipx → uv 命令对照表**（全文最该收藏的一张）：

| 老写法 | uv 写法 | 备注 / 坑 |
|--------|---------|-----------|
| `python -m venv .venv` | `uv venv` | 建在 `./.venv`，且不含 pip |
| `pip install requests` | `uv add requests` | 同时改 pyproject + lock + 装进环境 |
| `pip install -r req.txt` | `uv add -r req.txt`（收编）/ `uv pip install -r`（救火） | 正规做法是 `uv add -r` |
| `pip install -e .` | `uv sync` | 项目自身默认就是可编辑安装 |
| `pip uninstall requests` | `uv remove requests` | `uv pip uninstall` 只动环境不改配置 |
| `pip freeze > req.txt` | `uv export --format requirements.txt -o req.txt` | freeze 是环境快照，export 从锁文件生成（可复现） |
| `pip-compile x.in` | `uv pip compile x.in -o x.txt` | 参数几乎同名，可直接换 |
| `pip-sync req.txt` | `uv pip sync req.txt` | ⚠ 两者都会**卸载**文件里没有的包 |
| `pipx install ruff` | `uv tool install ruff` | 装到 uv 的 bin 目录，需在 PATH |
| `pipx run ruff` | `uvx ruff` | 不落盘，用完即弃 |
| `pyenv install 3.14` | `uv python install 3.14` | 不改系统 Python、不动 PATH |
| `pyenv local 3.14` | `uv python pin 3.14` | 都是写 `.python-version` |
| `python script.py` | `uv run script.py` | 跑之前自动把环境对齐锁文件 |

## 2、Python 版本管理

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `uv python list` | 列可用与已装 | `--only-installed` 只看已装，排查时输出干净 |
| `uv python install 3.14` | 下载安装 | 可一次多个：`uv python install 3.13 3.14` |
| `uv python upgrade 3.14` | 升到该 minor 最新补丁 | 参数只吃 **minor**，写 `3.14.6` 没意义 |
| `uv python pin 3.14` | 写项目级 `.python-version` | 要提交进 git；`--global` 设全局默认，`--rm` 移除 |
| `uv python find` | 打印当前会用哪个解释器 | 「版本不对」类问题的第一条命令 |
| `uv python dir` | 显示 Python 安装目录 | 想搬盘配 `UV_PYTHON_INSTALL_DIR` |
| `uv python uninstall 3.13` | ⚠ 卸载某版本 | 依赖它的所有 `.venv` 立刻失效；卸前先 `uv python find` 确认没人用 |
| `uv python update-shell` | 把 Python 目录写进 PATH | Windows 改用户 PATH，必须**重开终端**才生效 |
| `UV_PYTHON=3.14 uv run …` | 环境变量指定版本 | CI 里比到处加 `-p` 省事 |

> ⚠ **3.14 的现实**：新 minor 刚出时，一批带 C 扩展的包还没对应 wheel，`uv add` 会退回源码编译（表现为「卡住不动几分钟」）。生产基线建议先站 **3.13**，3.14 用于验证。

## 3、创建项目与虚拟环境

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `uv init myapp` | 建应用项目 | 生成 pyproject / README / main.py / .python-version / .gitignore |
| `uv init --lib mylib` | 建库项目 | `src/` 布局 + 可构建配置，写库一律用它 |
| `uv init --package` | 应用也打成包 | 带 `[project.scripts]` 入口，做 CLI 用 |
| `uv init --bare` | 只生成 `pyproject.toml` | 往**已有代码目录**补 uv 支持的最干净方式 |
| `uv init --script s.py` | 建 PEP 723 单文件脚本 | 依赖写在文件头 `# /// script` 块，无需项目 |
| `uv venv` | 手动建 `.venv` | 多数时候不用——`uv run`/`sync` 自动建；`-p 3.13` 指定版本，`--seed` 额外装 pip |
| `uv venv --clear` | ⚠ 清空目标目录重建 | 会删该路径下已有内容；不如直接删 `.venv` 直观 |
| `.venv\Scripts\Activate.ps1` · `source .venv/bin/activate` | 传统激活 | 仍可用；但 uv 不依赖它，混用易「激活的是 A、uv 用 B」 |

## 4、依赖增删与锁定

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `uv add requests` | 加运行依赖 | 一条命令做三件事：写 pyproject、更 `uv.lock`、同步 `.venv` |
| `uv add "fastapi>=0.115"` | 带版本约束 | **必须加引号**，否则 `>` 被 shell 当重定向 |
| `uv add --dev pytest ruff` | 加开发依赖 | 落到 `[dependency-groups] dev`，发布产物不含 |
| `uv add --group lint ruff` | 加到自定义依赖组 | PEP 735 分组，比滥用 extras 干净 |
| `uv add --optional pg psycopg` | 加可选 extra | 面向下游的开关，装时 `uv sync --extra pg` |
| `uv add --editable ../shared` | 本地路径可编辑依赖 | monorepo 里改一处两边生效 |
| `uv add "pkg @ git+https://…" --tag v1.2.0` | git 依赖 | `--rev`/`--tag`/`--branch` 三选一；`--branch` 等于放弃可复现性；本地路径加 `--editable` |
| `uv remove requests` | 删依赖 | 只删直接依赖，传递依赖重新解析自动收敛 |
| `uv lock` | 只解析、生成 `uv.lock` | 不动环境，适合先看 diff |
| `uv lock --check` | 校验锁文件是否最新 | **CI 门禁必备**，防只改 pyproject 忘了锁 |
| `uv lock -U` / `-P requests` | 全量升级 / 只升一个 | ⚠ `-U` 一次动几十个包难 review；日常升级用 `-P` |
| `uv sync` | `.venv` 精确对齐锁文件 | ⚠ **默认会卸载**多余的包——它对齐的是锁文件不是你的记忆；`--inexact` 才不卸 |
| `uv sync --frozen` / `--locked` / `--no-dev` | 按锁装不解析 / 锁过期即报错 / 不装 dev | 前二是 CI、容器标配，`--no-dev` 生产瘦身第一刀 |
| `uv sync --reinstall` | 强制重装全部包 | 怀疑环境污染；`--reinstall-package <名>` 只重装一个 |
| `uv tree` | 依赖树 | `--invert` 反查「谁把它引进来的」，`--outdated` 看新版本 |
| `uv export --format requirements.txt -o req.txt` | 从锁文件导出 | 给不认 `uv.lock` 的部署系统；`--format pylock.toml` 出 PEP 751 锁 |
| `uv audit`（新版） | 依赖漏洞审计 | 老版用 `uvx pip-audit` 等价；`--output-format sarif` 接 CI |

> `uv.lock` **必须提交进 git**（应用项目无条件）；`.venv` **不要**提交。

## 5、运行脚本与工具（uv run / uvx）

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `uv run main.py` | 跑项目内脚本 | 跑前自动建/对齐 `.venv`，不需要 activate；`-m pytest` 走模块 |
| `uv run --with rich python` | 临时多装一个包再跑 | **不写进** `pyproject.toml`，试完即弃 |
| `uv run --isolated …` | 在临时隔离环境跑 | 排查「是不是我本地环境脏了」；`--frozen`/`--no-sync` 跳过解析更快 |
| `uv run --env-file .env cmd` | 载入环境变量文件 | uv **不会**自动读 `.env`，必须显式指定 |
| `uv run --script s.py` | 按 PEP 723 头运行单文件 | 自带依赖声明，别人拿到就能跑 |
| `uvx ruff check` | 一次性跑工具 | 即 `uv tool run`；不进项目依赖、不污染 `.venv` |
| `uvx --from httpie http …` | 包名 ≠ 命令名时 | ⚠ 最常见的 uvx 报错就是没写 `--from` |
| `uvx ruff@0.16.0 check` | 钉工具版本 | 复现别人的报错时很有用 |
| `uv tool install ruff` | 常驻安装 CLI 工具 | 命令找不到 → `uv tool update-shell` 后重开终端 |
| `uv tool list` / `upgrade --all` / `uninstall ruff` | 列 / 升 / 卸工具 | 只影响工具环境，不碰项目 |

> **分工**：要看到项目代码和依赖 → `uv run`；只借个 CLI 用一下 → `uvx`。`uvx pytest` 跑项目测试必然失败，那环境里没有你的项目。

## 6、代码检查与格式化（ruff）

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `uv add --dev ruff` | 把 ruff 钉进项目 | 团队/CI 同一版本，避免「我这不报你那报」 |
| `uv run ruff check .` | 静态检查 | 版本随锁文件，可复现；临时场景用 `uvx ruff check` |
| `ruff check --fix` | 自动修复 | 只应用**安全**修复 |
| `ruff check --fix --unsafe-fixes` | 含不安全修复 | ⚠ 可能改变语义，修完必须跑测试 + 看 diff |
| `ruff check --select E,F,I --statistics` | 选规则族 + 出统计 | `I` 是 isort（导入排序），`E/F` 是 pycodestyle/pyflakes |
| `ruff rule F401` | 解释某条规则 | 比搜索引擎快；`ruff check --add-noqa` 给存量批量打 `# noqa` |
| `ruff format` | 格式化 | 替 black；`--check` 只校验不改写（CI 门禁） |
| `uv format`（新版） | uv 内置包装的 ruff 格式化 | 支持 `--check`/`--diff`，`uv format -- <ruff 参数>` 透传 |
| `uv check`（新版） | uv 内置类型检查（基于 ty） | ty 尚未 1.0，别当 mypy 完全替代；稳妥仍用 `uv run mypy .` |

> 配置统一写在 `[tool.ruff]`（`line-length` 默认 88）。**lint 与 format 会打架**：把行宽交给 formatter 后，lint 侧应 ignore `E501`，否则「格式化完立刻被 lint 骂」。

## 7、测试（pytest）

> 下列 `pytest …` 均通过 `uv run pytest …` 运行；`uvx pytest` 看不到项目代码。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `uv add --dev pytest` | 装 pytest | 必须用 `uv run pytest` 跑 |
| `uv run pytest -q` | 跑全量（精简输出） | 默认从当前目录递归收集 `test_*.py` |
| `pytest tests/t.py::test_y` | 精确跑一个用例 | `::` 分隔文件与函数，类里再加 `::TestC::test_y` |
| `pytest -k "login and not slow"` | 按名字表达式筛 | 匹配的是**用例名子串**，不是文件名 |
| `pytest -m slow --strict-markers` | 按 mark 筛 | `--strict-markers` 防 mark 拼错被静默忽略 |
| `pytest -x` / `--maxfail=3` | 首个失败即停 / 宽松版 | 大面积失败时先止血 |
| `pytest --lf` / `--sw` | 只跑上次失败 / 失败即停下次续跑 | 改 bug 循环神器 |
| `pytest -s` / `--durations=10` | 不吞 print / 列最慢 10 个 | `-s` 等价 `--capture=no`；后者治慢测 |
| `pytest --import-mode=importlib` | 换导入模式 | `src/` 布局缺 `__init__.py` 的导入错多靠它解决 |
| `pytest-xdist` + `pytest -n auto` | 并行跑 | ⚠ 用例间有共享状态会随机失败 |
| `pytest-cov` + `pytest --cov=src --cov-report=term-missing` | 覆盖率 | 直接列未覆盖行号，比看百分比有用 |

## 8、构建与发布

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `uv version` | 读当前项目版本 | `--short` 只输出版本号，方便脚本取值 |
| `uv version --bump minor` | 按语义升版本 | 可选 `major/minor/patch/stable/alpha/beta/rc/post/dev`，会顺带更新 lock；`--dry-run` 先演练 |
| `uv build` | 构建 sdist + wheel 到 `dist/` | 默认两个都建（发 PyPI 建议都传）；`--wheel`/`--sdist` 只建其一 |
| `uv build --clear` | ⚠ 构建前清空输出目录 | 会删旧产物；好处是杜绝「传了上一版残留文件」 |
| `uv publish --dry-run` | 演练上传 | **每次发布前先跑这条**，提前发现认证与文件名问题 |
| `uv publish` | 上传 `dist/*` | ⚠ PyPI 版本号**用过即废**：传错不能覆盖、不能删了重传同号，只能 yank 后发新号 |
| `uv publish --token <t>` | token 认证 | 用 `UV_PUBLISH_TOKEN` 环境变量，别写进仓库 |
| `uv publish --index testpypi` | 发到配置好的索引 | 需先在 `[[tool.uv.index]]` 里定义；真发布前务必先在 TestPyPI 走一遍 |
| `uv publish --trusted-publishing automatic` | GitHub Actions OIDC 免 token | 免维护长期密钥，CI 发布首选 |

## 9、迁移（从 pip+venv / poetry 过来）

| 场景 | 命令 / 做法 | 备注 / 坑 |
|------|-------------|-----------|
| 只想先提速，不改结构 | `uv venv` → `uv pip install -r req.txt` | 零改造，装包速度立刻可感；但仍没有锁文件 |
| 正式收编 requirements | `uv init --bare` → `uv add -r req.txt` | 一次性把散装依赖变成 pyproject + `uv.lock` |
| 原来用 pip-tools | `uv pip compile x.in -o x.txt` | 参数基本同名，可平替 |
| poetry 的依赖表 | 把 `[tool.poetry.dependencies]` 改写成 PEP 621 的 `[project] dependencies` | ⚠ poetry 的 `^1.2`/`~1.2` uv **不认**，翻成 `>=1.2,<2` / `>=1.2,<1.3` |
| `poetry install` / `poetry run x` | `uv sync` / `uv run x` | sync 默认会卸载多余包 |
| `poetry shell` | 无对应，用 `uv run` 或手工 activate | uv 刻意不做 shell 注入，减少「当前在哪个环境」的歧义 |
| `poetry.lock` | 删掉，重新 `uv lock` | 两种锁不能互转，重锁后跑一遍全量测试 |
| pipx 装的工具 | 先 `uv tool install <同名>`，确认可用后再 `pipx uninstall` | **先装后卸**，避免 PATH 断档期命令消失 |
| CI 流水线 | `uv sync --locked --no-dev` → `uv run pytest` | ⚠ CI 里**绝不要** `uv add`，那会改锁文件毁掉可复现性 |
| Dockerfile 分层 | 先 `COPY pyproject.toml uv.lock` + `uv sync --frozen --no-dev`，再 `COPY` 源码 | 顺序反了每次改代码都重装全部依赖 |

## 10、清理与排障

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `uv cache dir` / `size` | 缓存位置 / 占用 | 换盘用 `UV_CACHE_DIR`；⚠ 缓存与 `.venv` 跨盘时硬链接失效，退化成复制 |
| `uv cache prune` | 清理无效/悬挂条目 | 日常首选，安全，不影响已装环境 |
| `uv cache clean` | ⚠ 清空整个缓存 | 下次全部重新下载；先试 `prune`，别一上来就 clean |
| 删 `.venv` 重建 | `rm -rf .venv && uv sync` | uv 重建按秒计——**环境坏了别修，重来更快** |
| `uv run python -c "import sys;print(sys.executable)"` | 确认真实运行的解释器 | 比 `which python` 可靠，uv 不依赖 PATH |
| `uv run -v` / `-vv` | 详细日志 | 看解析卡在哪个包/索引；`--offline` 判是不是网络问题 |
| `uv sync --refresh` | 忽略缓存重取元数据 | 私有源刚发新版却看不到时；`--refresh-package <名>` 更精准 |
| `UV_DEFAULT_INDEX=<镜像地址>` | 换索引源 | 国内提速；长期方案写进 `[[tool.uv.index]]` |
| `uv self update` | 升级 uv 自身 | ⚠ 用 winget/scoop/brew 装的会**拒绝**自更新，必须回原渠道升 |

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| `ModuleNotFoundError`，但明明装过 | 跑的是系统 Python，不是项目 `.venv` | `uv run python -c "import sys;print(sys.executable)"` |
| 同事拉下来跑不起来 | `uv.lock` 没提交 | `git add uv.lock` 后 `uv sync --locked` 验证 |
| 装包时开始编译 C 扩展、久久不动 | 当前 Python 版本没预编译 wheel | 退回 3.13，或装好编译工具链再来 |
| `uvx xxx` 提示找不到命令 | 包名与命令名不一致 | `uvx --from <包名> <命令名>` |
| `uv tool install` 后命令找不到 | uv 的 bin 目录不在 PATH | `uv tool update-shell`，然后**重开终端** |
| `No solution found` 解析失败 | 版本约束互相打架 | 顺报错里的冲突链，用 `uv lock -P <包>` 逐个放宽，别直接 `-U` |
| `uv sync` 把我手工装的包删了 | sync 默认精确同步 | 把包 `uv add` 进去（正解），或临时 `uv sync --inexact` |
| 格式化完立刻被 lint 报错 | `E501` 等规则与 formatter 冲突 | lint 侧 ignore `E501`，行宽交给 formatter |
| pytest 找不到 `src/` 下的包 | 导入模式 / 布局问题 | `uv run pytest --import-mode=importlib` |

## 一页纸口诀

1. 项目内一律 `uv run`，别 activate；一次性工具一律 `uvx`，别全局装。
2. 改依赖只用 `uv add` / `uv remove`；`uv pip` 是兼容层、是救火通道，不是日常入口。
3. `uv.lock` 是团队契约：提交进 git，CI 用 `--locked` 卡死，`.venv` 永不进版本库。
4. 升级小步走 `uv lock -P <包>`；`uv lock -U` 留给专门的升级 PR。
5. `uv sync` 对齐的是锁文件而不是你的记忆——它默认会卸载多余的包。
6. Python 版本三件套：`install` 装、`pin` 定、`find` 查错。
7. 真正破坏性的只有四类：`cache clean`、`venv --clear`、`python uninstall`、`publish`；其余重跑无害。
8. 环境坏了别修，删 `.venv` 重来——uv 的重建成本按秒计。
9. 发布前必跑 `uv publish --dry-run`：PyPI 的版本号用过即废，没有后悔药。
