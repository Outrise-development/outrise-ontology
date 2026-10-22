#!/usr/bin/env python3
"""Small, offline skill catalog and workspace synchronizer (Python 3.10+)."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import sys
import tempfile
from urllib.parse import unquote, urlsplit


CATEGORIES = ("通用", "开发", "营销", "业务运营", "工作区维护")
HEADERS = ("ID", "分类", "用途与关键词", "入口", "兼容性与前置条件", "来源与版本")
TARGETS = (".agents/skills", ".claude/skills")
ID_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
LINK_PATTERN = re.compile(r"!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[\"'][^\n]*?[\"'])?\s*\)")


class SkillError(Exception):
    """An actionable input or synchronization conflict."""


def valid_id(value: str) -> bool:
    return (isinstance(value, str) and len(value) <= 64
            and bool(ID_PATTERN.fullmatch(value))
            and value.upper() not in {"CON", "PRN", "AUX", "NUL", *[f"COM{i}" for i in range(1, 10)],
                                      *[f"LPT{i}" for i in range(1, 10)]})


def exists(path: Path) -> bool:
    return os.path.lexists(path)


def reject_link(path: Path) -> None:
    if exists(path):
        info = path.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
            raise SkillError(f"不处理符号链接或 junction：{path}")


def relative_path(value: str) -> PurePosixPath:
    if not isinstance(value, str) or not value or "\\" in value or ":" in value:
        raise SkillError(f"不安全的相对路径：{value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in ("", ".", "..") for part in value.split("/")):
        raise SkillError(f"不安全的相对路径：{value!r}")
    return path


def child(root: Path, value: str) -> Path:
    parts = relative_path(value).parts
    current = root
    for part in parts:
        current = current / part
        reject_link(current)
    return current


def read_text(path: Path) -> str:
    reject_link(path)
    return path.read_text(encoding="utf-8-sig")


def read_json(path: Path) -> dict:
    result = json.loads(read_text(path))
    if not isinstance(result, dict):
        raise SkillError(f"JSON 顶层必须是对象：{path}")
    return result


def write_json(path: Path, data: dict) -> None:
    """Atomically replace a JSON file; never follow a destination link."""
    reject_link(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n",
                                     dir=path.parent, prefix=".skills-", suffix=".tmp", delete=False) as out:
        temporary = Path(out.name)
        json.dump(data, out, ensure_ascii=False, indent=2)
        out.write("\n")
    try:
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def catalog(source: Path) -> dict[str, dict[str, str]]:
    text = read_text(child(source, "SKILLS.md"))
    start, end = "<!-- skills-index:start -->", "<!-- skills-index:end -->"
    if text.count(start) != 1 or text.count(end) != 1 or text.index(start) >= text.index(end):
        raise SkillError("SKILLS.md 必须有一对按顺序排列的 skills-index 标记。")
    lines = [line.strip() for line in text.split(start)[1].split(end)[0].splitlines() if line.strip()]
    if len(lines) < 2:
        raise SkillError("技能索引缺少表头。")

    def cells(line: str) -> list[str]:
        if not line.startswith("|") or not line.endswith("|"):
            raise SkillError(f"索引表格行无效：{line}")
        return [part.strip().replace(r"\|", "|") for part in re.split(r"(?<!\\)\|", line[1:-1])]

    if tuple(cells(lines[0])) != HEADERS:
        raise SkillError("索引列必须为：" + " | ".join(HEADERS))
    separators = cells(lines[1])
    if len(separators) != len(HEADERS) or not all(re.fullmatch(r":?-{3,}:?", cell) for cell in separators):
        raise SkillError("索引表格分隔行无效。")
    result = {}
    for line in lines[2:]:
        values = cells(line)
        if len(values) != len(HEADERS) or any(not value for value in values):
            raise SkillError(f"索引行必须填满 {len(HEADERS)} 列：{line}")
        row = dict(zip(HEADERS, values))
        name = row["ID"]
        if not valid_id(name) or name in result:
            raise SkillError(f"无效或重复的技能 ID：{name}")
        if row["分类"] not in CATEGORIES:
            raise SkillError(f"未知分类：{row['分类']}")
        link = LINK_PATTERN.fullmatch(row["入口"])
        if not link or link.group(1).strip("<>") != f"skills/{name}/SKILL.md":
            raise SkillError(f"{name} 的入口必须指向 skills/{name}/SKILL.md")
        result[name] = row
    return result


def selection(workspace: Path) -> list[str]:
    path = child(workspace, "skills.enabled.json")
    if not exists(path):
        return []
    data = read_json(path)
    names = data.get("skills")
    if set(data) != {"skills"} or not isinstance(names, list) or not all(valid_id(name) for name in names):
        raise SkillError(f"{path} 必须包含 skills 字符串数组，且只包含该字段。")
    if len(names) != len(set(names)):
        raise SkillError(f"启用清单包含重复 ID：{path}")
    return sorted(names)


def snapshot(directory: Path) -> dict:
    """Fingerprint the complete tree, including empty directories and extra files."""
    reject_link(directory)
    if not directory.is_dir():
        raise SkillError(f"技能目录不存在或不是目录：{directory}")
    files, directories = {}, []

    def walk(folder: Path) -> None:
        seen = set()
        for entry in sorted(folder.iterdir()):
            reject_link(entry)
            rel = entry.relative_to(directory).as_posix()
            relative_path(rel)
            if entry.name.casefold() in seen:
                raise SkillError(f"Windows 下文件名冲突：{entry}")
            seen.add(entry.name.casefold())
            if entry.is_dir():
                directories.append(rel)
                walk(entry)
            elif entry.is_file():
                files[rel] = hashlib.sha256(entry.read_bytes()).hexdigest()
            else:
                raise SkillError(f"技能含非普通文件：{entry}")

    walk(directory)
    return {"files": files, "dirs": sorted(directories)}


def frontmatter(path: Path, expected: str) -> None:
    """Check required scalar metadata without pretending to be a YAML parser."""
    lines = read_text(path).splitlines()
    if not lines or lines[0] != "---" or "---" not in lines[1:]:
        raise SkillError(f"缺少 YAML frontmatter：{path}")
    metadata = lines[1:lines.index("---", 1)]
    fields = {}
    for index, line in enumerate(metadata):
        match = re.match(r"^(name|description):\s*(.*)$", line)
        if not match:
            continue
        key, value = match.groups()
        if key in fields:
            raise SkillError(f"重复的 {key} 字段：{path}")
        if value in ("|", ">", "|-", ">-", "|+", ">+"):
            chunks = []
            for following in metadata[index + 1:]:
                if following and not following[0].isspace():
                    break
                chunks.append(following.strip())
            value = " ".join(chunks).strip()
        elif value.startswith(('"', "'")):
            quote = value[0]
            if len(value) < 2 or value[-1] != quote:
                raise SkillError(f"{key} 请使用完整的单行引号或 YAML 块标量：{path}")
            value = value[1:-1].strip()
        else:
            value = re.split(r"\s+#", value, maxsplit=1)[0].strip()
        fields[key] = value
    if fields.get("name") != expected or not fields.get("description"):
        raise SkillError(f"name 必须等于目录 ID，description 不得为空：{path}")


def validate_skill(source: Path, name: str) -> dict:
    directory = child(source, f"skills/{name}")
    tree = snapshot(directory)
    frontmatter(directory / "SKILL.md", name)
    for rel in tree["files"]:
        if not rel.lower().endswith(".md"):
            continue
        document = directory / rel
        # Fenced examples are instructions, not dependencies to bundle.
        markdown = re.sub(r"(?ms)^\s*(`{3,}|~{3,})[^\n]*\n.*?^\s*\1\s*$", "", read_text(document))
        for link in LINK_PATTERN.finditer(markdown):
            target = link.group(1).strip("<>")
            decoded_target = unquote(target)
            if re.match(r"(?i)^(file:|[a-z]:)", decoded_target) or "\\" in decoded_target:
                raise SkillError(f"技能引用不得依赖本机绝对路径：{document} -> {target}")
            parsed = urlsplit(decoded_target)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            decoded = parsed.path
            if "\\" in decoded or Path(decoded).is_absolute():
                raise SkillError(f"技能引用必须使用相对路径：{document} -> {target}")
            resolved = (document.parent / decoded).resolve()
            if not resolved.is_relative_to(directory):
                raise SkillError(f"引用超出技能目录，复制后不可用：{document} -> {target}")
            if not resolved.exists():
                raise SkillError(f"引用文件不存在：{document} -> {target}")
    return tree


def validate_catalog(source: Path, rows: dict) -> None:
    directory = child(source, "skills")
    actual = set()
    if directory.exists():
        for item in directory.iterdir():
            reject_link(item)
            if item.is_dir() and (item / "SKILL.md").is_file():
                actual.add(item.name)
    if actual != set(rows):
        raise SkillError(f"索引与源码不一致；未登记：{sorted(actual - set(rows))}；缺少源码：{sorted(set(rows) - actual)}")
    for name in rows:
        validate_skill(source, name)


def state(workspace: Path) -> dict:
    path = child(workspace, ".skills-state.json")
    if not exists(path):
        return {}
    data = read_json(path)
    if set(data) != {"version", "managed"} or data["version"] != 1 or not isinstance(data["managed"], dict):
        raise SkillError(f"不支持的同步状态：{path}")
    for rel, tree in data["managed"].items():
        relative_path(rel)
        parts = rel.split("/")
        if len(parts) != 3 or "/".join(parts[:2]) not in TARGETS or not valid_id(parts[2]):
            raise SkillError(f"同步状态包含越界目标：{rel}")
        if not isinstance(tree, dict) or set(tree) != {"files", "dirs"}:
            raise SkillError(f"同步状态的目录记录无效：{rel}")
        if not isinstance(tree["files"], dict) or not isinstance(tree["dirs"], list):
            raise SkillError(f"同步状态的文件记录无效：{rel}")
        for filename, digest in tree["files"].items():
            relative_path(filename)
            if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
                raise SkillError(f"同步状态的摘要无效：{rel}/{filename}")
        for dirname in tree["dirs"]:
            relative_path(dirname)
    return data["managed"]


def sync_plan(source: Path, workspace: Path, rows: dict, names: list[str]) -> tuple[dict, dict, list]:
    missing = set(names) - set(rows)
    if missing:
        raise SkillError(f"启用清单含未知技能：{', '.join(sorted(missing))}")
    previous = state(workspace)
    desired = {}
    for name in names:
        tree = validate_skill(source, name)
        for parent in TARGETS:
            desired[f"{parent}/{name}"] = tree
    actions = []
    # Check every destination before changing anything, including deselected skills.
    for rel in sorted(set(previous) | set(desired)):
        destination = child(workspace, rel)
        if rel in previous:
            if not exists(destination) or snapshot(destination) != previous[rel]:
                raise SkillError(f"本地技能已修改或缺失，停止同步以保留现场：{destination}。请先备份并恢复到上次同步内容。")
        elif exists(destination):
            raise SkillError(f"同名目录未由本工具管理，停止同步：{destination}。请先明确处理现有目录。")
        if rel not in desired:
            actions.append(("remove", rel))
        elif rel not in previous:
            actions.append(("install", rel))
        elif desired[rel] != previous[rel]:
            actions.append(("update", rel))
    return previous, desired, actions


def synchronize(source: Path, workspace: Path, rows: dict, names: list[str], dry_run: bool) -> None:
    previous, desired, actions = sync_plan(source, workspace, rows, names)
    for action, rel in actions:
        print(f"{action}: {rel}")
    if dry_run:
        print(f"预览完成：{len(actions)} 项变更，未写入文件。")
        return
    if not actions:
        print("已同步；没有文件需要修改。")
        return
    workspace.mkdir(parents=True, exist_ok=True)
    # Stage and verify complete copies first. Back up owned trees for rollback on I/O errors.
    staging = Path(tempfile.mkdtemp(prefix=".skills-sync-", dir=workspace))
    cleanup = True
    try:
        for action, rel in actions:
            if action != "remove":
                name = rel.split("/")[-1]
                staged = staging / "new" / rel
                shutil.copytree(child(source, f"skills/{name}"), staged)
                if snapshot(staged) != desired[rel]:
                    raise SkillError(f"源码在复制过程中发生变化，请重新同步：{name}")
        # Recheck for edits made while staging.
        if sync_plan(source, workspace, rows, names) != (previous, desired, actions):
            raise SkillError("同步期间源码或启用状态发生变化，请重试。")
        completed = []
        try:
            for action, rel in actions:
                destination = child(workspace, rel)
                backup = staging / "old" / rel
                destination.parent.mkdir(parents=True, exist_ok=True)
                if rel in previous:
                    backup.parent.mkdir(parents=True, exist_ok=True)
                    destination.rename(backup)
                completed.append(rel)
                if action != "remove":
                    (staging / "new" / rel).rename(destination)
            write_json(child(workspace, ".skills-state.json"), {"version": 1, "managed": desired})
        except BaseException as original:
            rollback_errors = []
            for rel in reversed(completed):
                try:
                    destination = child(workspace, rel)
                    if exists(destination):
                        # Preserve edits made by another process during this transaction.
                        if rel not in desired or snapshot(destination) != desired[rel]:
                            raise SkillError(f"回滚期间发现新改动：{destination}")
                        shutil.rmtree(destination)
                    backup = staging / "old" / rel
                    if backup.exists():
                        backup.rename(destination)
                except BaseException as error:
                    rollback_errors.append(str(error))
            if rollback_errors:
                cleanup = False
                raise SkillError(f"同步失败且回滚未完成，原始副本保留在 {staging}，请先恢复 old/ 下的文件再重试。"
                                 f"原因：{'; '.join(rollback_errors)}") from original
            raise
    finally:
        if cleanup:
            try:
                shutil.rmtree(staging)
            except OSError:
                print(f"临时目录未能清理，请保留并检查：{staging}", file=sys.stderr)
    print(f"同步完成：{len(names)} 个技能，Codex 和 Claude Code 各一份。")


def parser() -> argparse.ArgumentParser:
    cli = argparse.ArgumentParser(description=__doc__)
    commands = cli.add_subparsers(dest="command", required=True)
    for command in ("list", "select", "sync", "check"):
        sub = commands.add_parser(command)
        sub.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1], help="中央技能库检出目录")
        sub.add_argument("--workspace", type=Path, help="启用目标工作区，默认中央仓库根目录")
        if command == "list":
            sub.add_argument("--query", default="", help="名称、中文用途或关键词")
            sub.add_argument("--category", choices=CATEGORIES)
        if command == "select":
            sub.add_argument("--skill", action="append", default=[])
            sub.add_argument("--category", choices=CATEGORIES, action="append", default=[])
            mode = sub.add_mutually_exclusive_group()
            mode.add_argument("--remove", action="store_true")
            mode.add_argument("--clear", action="store_true")
        if command == "sync":
            sub.add_argument("--dry-run", action="store_true")
        if command == "check":
            sub.add_argument("--installed", action="store_true", help="同时验证两种 Agent 的副本是否已同步")
    return cli


def run(args: argparse.Namespace) -> None:
    source = args.source.resolve()
    workspace = (args.workspace or source).resolve()
    if workspace.is_relative_to(source / "skills"):
        raise SkillError("工作区不能位于中央技能源码目录内。")
    rows = catalog(source)
    if args.command == "list":
        for name, row in rows.items():
            if args.category and row["分类"] != args.category:
                continue
            if args.query.casefold() not in " ".join(row.values()).casefold():
                continue
            print(" | ".join(row.values()))
        return
    names = selection(workspace)
    if args.command == "select":
        if args.clear and (args.skill or args.category):
            raise SkillError("--clear 不能与 --skill 或 --category 一起使用。")
        if not args.clear and not args.skill and not args.category:
            raise SkillError("请指定 --skill、--category 或 --clear。")
        requested = set(args.skill)
        unknown = requested - set(rows)
        if unknown and not (args.remove and unknown <= set(names)):
            raise SkillError(f"未知技能：{', '.join(sorted(unknown))}")
        requested.update(name for name, row in rows.items() if row["分类"] in args.category)
        chosen = set() if args.clear else set(names) - requested if args.remove else set(names) | requested
        if chosen - set(rows):
            raise SkillError("已有清单包含失效技能，请先用 --remove 或 --clear 移除。")
        for name in chosen:
            validate_skill(source, name)
        write_json(child(workspace, "skills.enabled.json"), {"skills": sorted(chosen)})
        print(f"已选择 {len(chosen)} 个技能；运行 sync 后生效。")
    elif args.command == "check":
        validate_catalog(source, rows)
        missing = set(names) - set(rows)
        if missing:
            raise SkillError(f"启用清单含未知技能：{', '.join(sorted(missing))}")
        if args.installed:
            _, _, actions = sync_plan(source, workspace, rows, names)
            if actions:
                raise SkillError(f"{len(actions)} 个副本变更尚未同步，请运行 sync。")
        print(f"检查通过：{len(rows)} 个登记技能，当前工作区选择 {len(names)} 个。")
    else:
        synchronize(source, workspace, rows, names, args.dry_run)


def main() -> int:
    try:
        run(parser().parse_args())
        return 0
    except (SkillError, OSError, ValueError, TypeError) as error:
        print(f"错误：{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
