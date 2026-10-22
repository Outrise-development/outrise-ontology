"""Black-box regression tests for the dependency-free workspace skill manager.

Run from the repository root: python -m unittest discover -s tests -v
All source repositories and workspaces used by the tests are temporary.
"""

import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


CLI = Path(__file__).resolve().parents[1] / "scripts" / "skills.py"
TARGETS = (".agents", ".claude")


class SkillsCliTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="outrise skills test ")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "central source"
        self.workspace = self.root / "project workspace"
        self.source.mkdir()
        self.workspace.mkdir()
        self.entries = []
        self.add_skill("code-helper", "开发", "开发 Python implementation")
        self.add_skill("market-helper", "营销", "广告 campaign marketing")
        self.write_selection([])

    def add_skill(self, name, category="开发", keywords="test skill"):
        folder = self.source / "skills" / name
        folder.mkdir(parents=True)
        (folder / "SKILL.md").write_text(
            f"---\nname: {name}\ndescription: {keywords}\n---\n\n"
            f"# {name}\n\nRead [guide](references/guide.md) when needed.\n",
            encoding="utf-8",
        )
        (folder / "references").mkdir()
        (folder / "references" / "guide.md").write_text(
            "Fixture guide with 中文 content.\n", encoding="utf-8"
        )
        self.entries.append((name, category, keywords))
        self.write_index()
        return folder

    def write_index(self):
        lines = [
            "# Skills",
            "",
            "<!-- skills-index:start -->",
            "| ID | 分类 | 用途与关键词 | 入口 | 兼容性与前置条件 | 来源与版本 |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        lines.extend(
            f"| {name} | {category} | {keywords} | "
            f"[入口](skills/{name}/SKILL.md) | Codex / Claude Code; Python 3 | "
            "Local test fixture; v1 |"
            for name, category, keywords in self.entries
        )
        lines.append("<!-- skills-index:end -->")
        (self.source / "SKILLS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    def write_selection(self, skills):
        (self.workspace / "skills.enabled.json").write_text(
            json.dumps({"skills": skills}), encoding="utf-8"
        )

    def selected(self):
        return json.loads((self.workspace / "skills.enabled.json").read_text(encoding="utf-8"))

    def run_cli(self, command, *arguments, success=True):
        result = subprocess.run(
            [
                sys.executable,
                str(CLI),
                command,
                "--source",
                str(self.source),
                "--workspace",
                str(self.workspace),
                *arguments,
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            env={**os.environ, "PYTHONUTF8": "1"},
            check=False,
        )
        message = f"{command} {arguments}\nstdout: {result.stdout}\nstderr: {result.stderr}"
        if success:
            self.assertEqual(result.returncode, 0, message)
        else:
            self.assertNotEqual(result.returncode, 0, message)
        return result.stdout + result.stderr

    def installed(self, name="code-helper", target=".agents"):
        return self.workspace / target / "skills" / name

    def snapshot(self):
        """Include directories and ownership state when checking non-mutation."""
        return {
            str(path.relative_to(self.workspace)): None if path.is_dir() else path.read_bytes()
            for path in self.workspace.rglob("*")
        }

    def install_code(self):
        self.write_selection(["code-helper"])
        self.run_cli("sync")

    def load_cli(self):
        """Load only for fault injection; ordinary behavior uses subprocesses."""
        spec = importlib.util.spec_from_file_location("outrise_skills_under_test", CLI)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def staged_area(self, path):
        try:
            parts = path.relative_to(self.workspace).parts
        except ValueError:
            return None
        return parts[1] if len(parts) > 2 and parts[0].startswith(".skills-sync-") else None

    def change_source_guide(self):
        guide = self.source / "skills" / "code-helper" / "references" / "guide.md"
        guide.write_text("Source changed after install.\n", encoding="utf-8")

    def sync_in_process(self, cli):
        with contextlib.redirect_stdout(io.StringIO()):
            cli.synchronize(self.source, self.workspace, cli.catalog(self.source), ["code-helper"], False)

    def test_list_searches_unicode_name_and_category_without_reading_skill_bodies(self):
        for arguments, expected, excluded in (
            (("--query", "广告"), "market-helper", "code-helper"),
            (("--query", "code-helper"), "code-helper", "market-helper"),
            (("--category", "开发"), "code-helper", "market-helper"),
        ):
            with self.subTest(arguments=arguments):
                output = self.run_cli("list", *arguments)
                self.assertIn(expected, output)
                self.assertNotIn(excluded, output)
                self.assertNotIn("Read [guide]", output)

    def test_select_is_additive_sorted_and_supports_removal_and_clear(self):
        self.run_cli("select", "--skill", "market-helper")
        self.run_cli("select", "--skill", "code-helper", "--skill", "market-helper")
        self.assertEqual(self.selected(), {"skills": ["code-helper", "market-helper"]})
        self.run_cli("select", "--remove", "--skill", "code-helper")
        self.assertEqual(self.selected(), {"skills": ["market-helper"]})
        self.run_cli("select", "--clear")
        self.assertEqual(self.selected(), {"skills": []})

    def test_category_selection_is_an_explicit_snapshot(self):
        self.run_cli("select", "--category", "开发")
        self.assertEqual(self.selected(), {"skills": ["code-helper"]})
        self.add_skill("later-helper", "开发")
        self.run_cli("sync")
        for target in TARGETS:
            self.assertTrue(self.installed(target=target).is_dir())
            self.assertFalse(self.installed("later-helper", target).exists())
        self.assertEqual(self.selected(), {"skills": ["code-helper"]})

    def test_empty_initial_selection_does_not_install_existing_skills(self):
        self.run_cli("sync")
        for target in TARGETS:
            self.assertFalse(self.installed(target=target).exists())
            self.assertFalse(self.installed("market-helper", target).exists())
        self.run_cli("check", "--installed")

    def test_sync_copies_resources_is_idempotent_and_tracks_source_changes(self):
        source_skill = self.source / "skills" / "code-helper"
        (source_skill / "asset.bin").write_bytes(b"\x00\xffbinary\n")
        self.install_code()
        for target in TARGETS:
            self.assertEqual((self.installed(target=target) / "asset.bin").read_bytes(), b"\x00\xffbinary\n")
            self.assertEqual(
                (self.installed(target=target) / "references" / "guide.md").read_bytes(),
                (source_skill / "references" / "guide.md").read_bytes(),
            )
        before = self.snapshot()
        self.run_cli("sync")
        self.assertEqual(before, self.snapshot())
        (source_skill / "asset.bin").unlink()
        (source_skill / "references" / "guide.md").write_text("Updated guide.\n", encoding="utf-8")
        (source_skill / "new.txt").write_text("New resource.\n", encoding="utf-8")
        self.run_cli("check", "--installed", success=False)
        self.run_cli("sync")
        self.run_cli("check", "--installed")
        for target in TARGETS:
            installed = self.installed(target=target)
            self.assertFalse((installed / "asset.bin").exists())
            self.assertEqual((installed / "new.txt").read_text(encoding="utf-8"), "New resource.\n")
            self.assertEqual((installed / "references" / "guide.md").read_text(encoding="utf-8"), "Updated guide.\n")

    def test_deselection_removes_managed_copies_and_preserves_unrelated_skills(self):
        self.install_code()
        for target in TARGETS:
            unrelated = self.installed("personal-helper", target)
            unrelated.mkdir()
            (unrelated / "SKILL.md").write_text("Personal skill", encoding="utf-8")
        self.run_cli("select", "--clear")
        self.run_cli("sync")
        for target in TARGETS:
            self.assertFalse(self.installed(target=target).exists())
            self.assertEqual(
                (self.installed("personal-helper", target) / "SKILL.md").read_text(encoding="utf-8"),
                "Personal skill",
            )
        self.run_cli("check", "--installed")

    def test_unowned_same_name_is_a_conflict_even_if_contents_are_identical(self):
        import shutil

        self.write_selection(["code-helper"])
        shutil.copytree(self.source / "skills" / "code-helper", self.installed(target=".claude"))
        before = self.snapshot()
        self.run_cli("sync", success=False)
        self.assertEqual(before, self.snapshot())

    def test_local_modified_missing_or_added_file_prevents_all_target_updates(self):
        self.install_code()
        local_guide = self.installed(target=".claude") / "references" / "guide.md"
        original = local_guide.read_bytes()
        extra = self.installed(target=".claude") / "local.txt"
        source_guide = self.source / "skills" / "code-helper" / "references" / "guide.md"
        source_guide.write_text("Source changed after install.\n", encoding="utf-8")
        for kind in ("modified", "missing", "added"):
            with self.subTest(kind=kind):
                local_guide.write_bytes(original)
                extra.unlink(missing_ok=True)
                if kind == "modified":
                    local_guide.write_text("User local change", encoding="utf-8")
                elif kind == "missing":
                    local_guide.unlink()
                else:
                    extra.write_text("User local addition", encoding="utf-8")
                before = self.snapshot()
                self.run_cli("sync", success=False)
                self.assertEqual(before, self.snapshot())

    def test_deselection_preserves_locally_modified_managed_skill(self):
        self.install_code()
        (self.installed(target=".claude") / "local.txt").write_text("Keep me", encoding="utf-8")
        self.write_selection([])
        before = self.snapshot()
        self.run_cli("sync", success=False)
        self.assertEqual(before, self.snapshot())

    def test_dry_run_does_not_create_or_update_any_workspace_files(self):
        self.write_selection(["code-helper"])
        before = self.snapshot()
        self.run_cli("sync", "--dry-run")
        self.assertEqual(before, self.snapshot())
        self.run_cli("sync")
        self.write_selection([])
        before = self.snapshot()
        self.run_cli("sync", "--dry-run")
        self.assertEqual(before, self.snapshot())

    def test_state_write_failure_restores_both_original_copies_and_state(self):
        self.install_code()
        before = self.snapshot()
        self.change_source_guide()
        cli = self.load_cli()
        with mock.patch.object(cli, "write_json", side_effect=OSError("Injected state write failure")):
            with self.assertRaises(OSError):
                self.sync_in_process(cli)
        self.assertEqual(before, self.snapshot())

    def test_keyboard_interrupt_during_replacement_restores_original_copies(self):
        self.install_code()
        before = self.snapshot()
        self.change_source_guide()
        cli = self.load_cli()
        original_rename = Path.rename
        interrupted = False

        def interrupt_second_replacement(path, target):
            nonlocal interrupted
            if self.staged_area(path) == "new" and ".claude" in path.parts:
                interrupted = True
                raise KeyboardInterrupt("Injected interrupt after original was backed up")
            return original_rename(path, target)

        with mock.patch.object(Path, "rename", interrupt_second_replacement):
            with self.assertRaises(KeyboardInterrupt):
                self.sync_in_process(cli)
        self.assertTrue(interrupted)
        self.assertEqual(before, self.snapshot())

    def test_failed_rollback_retains_recoverable_original_backups(self):
        self.install_code()
        before = self.snapshot()
        self.change_source_guide()
        cli = self.load_cli()
        original_rename = Path.rename
        failed_restores = []

        def fail_replacement_and_restore(path, target):
            area = self.staged_area(path)
            if area == "new" and ".claude" in path.parts:
                raise OSError("Injected replacement failure")
            if area == "old" and ".claude" in path.parts:
                failed_restores.append(path)
                raise OSError("Injected backup restore failure")
            return original_rename(path, target)

        with mock.patch.object(Path, "rename", fail_replacement_and_restore):
            with self.assertRaises(Exception):
                self.sync_in_process(cli)
        self.assertTrue(failed_restores, "Fault must reach the rollback path")
        recoveries = list(self.workspace.glob(".skills-sync-*/old"))
        self.assertTrue(recoveries, "Failed rollback must retain its recovery directory")
        for relative, original in before.items():
            if original is None or not relative.startswith(TARGETS):
                continue
            candidates = [self.workspace / relative, *(backup / relative for backup in recoveries)]
            self.assertTrue(
                any(path.is_file() and path.read_bytes() == original for path in candidates),
                f"Original file lost from both installed copy and backups: {relative}",
            )
        self.assertEqual(
            (self.workspace / ".skills-state.json").read_bytes(),
            before[".skills-state.json"],
        )

    def test_installed_check_requires_fresh_selected_copies(self):
        self.write_selection(["code-helper"])
        self.run_cli("check")
        self.run_cli("check", "--installed", success=False)
        self.run_cli("sync")
        self.run_cli("check", "--installed")

    def test_malformed_or_unknown_selection_is_rejected_without_mutation(self):
        for payload in ("not JSON", "[]", '{"skills": "code-helper"}', '{"skills": ["unknown"]}', '{"skills": ["../escape"]}'):
            with self.subTest(payload=payload):
                (self.workspace / "skills.enabled.json").write_text(payload, encoding="utf-8")
                before = self.snapshot()
                self.run_cli("sync", success=False)
                self.assertEqual(before, self.snapshot())

    def test_unknown_selection_request_does_not_overwrite_the_manifest(self):
        before = self.snapshot()
        self.run_cli("select", "--skill", "unknown", success=False)
        self.assertEqual(before, self.snapshot())

    def test_duplicate_index_id_is_rejected(self):
        self.entries.append(self.entries[0])
        self.write_index()
        self.run_cli("check", success=False)

    def test_missing_referenced_resource_is_rejected_before_copying(self):
        (self.source / "skills" / "code-helper" / "references" / "guide.md").unlink()
        self.write_selection(["code-helper"])
        before = self.snapshot()
        self.run_cli("check", success=False)
        self.run_cli("sync", success=False)
        self.assertEqual(before, self.snapshot())

    def test_absolute_local_references_are_rejected_but_https_is_valid(self):
        skill = self.source / "skills" / "code-helper" / "SKILL.md"
        original = skill.read_text(encoding="utf-8")
        for target in (
            "C:/Users/example.md",
            "file:///C:/Users/example.md",
            "C%3A%2FUsers%2Fexample.md",
            "file%3A%2F%2F%2FC%3A%2FUsers%2Fexample.md",
        ):
            with self.subTest(target=target):
                skill.write_text(original + f"\n[Reference]({target})\n", encoding="utf-8")
                self.run_cli("check", success=False)
        skill.write_text(original + "\n[Reference](https://example.com/guide.md)\n", encoding="utf-8")
        self.run_cli("check")

    def test_index_entry_cannot_traverse_out_of_its_skill_directory(self):
        index = self.source / "SKILLS.md"
        index.write_text(
            index.read_text(encoding="utf-8").replace(
                "skills/code-helper/SKILL.md", "skills/../outside/SKILL.md"
            ),
            encoding="utf-8",
        )
        outside = self.source / "outside"
        outside.mkdir()
        (outside / "SKILL.md").write_text("---\nname: code-helper\ndescription: test\n---\n", encoding="utf-8")
        self.write_selection(["code-helper"])
        before = self.snapshot()
        self.run_cli("sync", success=False)
        self.assertEqual(before, self.snapshot())

    def test_symlink_resource_is_rejected_without_copying_external_data(self):
        external = self.root / "private.txt"
        external.write_text("Do not copy", encoding="utf-8")
        link = self.source / "skills" / "code-helper" / "linked.txt"
        try:
            link.symlink_to(external)
        except (OSError, NotImplementedError) as error:
            self.skipTest(f"Symlink creation unavailable: {error}")
        self.write_selection(["code-helper"])
        before = self.snapshot()
        self.run_cli("sync", success=False)
        self.assertEqual(before, self.snapshot())

    def test_symlink_destination_cannot_redirect_copy_outside_workspace(self):
        external = self.root / "outside workspace"
        external.mkdir()
        sentinel = external / "keep.txt"
        sentinel.write_text("Keep unchanged", encoding="utf-8")
        destination = self.workspace / ".agents"
        try:
            destination.symlink_to(external, target_is_directory=True)
        except (OSError, NotImplementedError) as error:
            self.skipTest(f"Symlink creation unavailable: {error}")
        self.write_selection(["code-helper"])
        before = self.snapshot()
        self.run_cli("sync", success=False)
        self.assertEqual(before, self.snapshot())
        self.assertEqual(list(external.iterdir()), [sentinel])
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "Keep unchanged")

    @unittest.skipUnless(os.name == "nt", "Windows junction regression")
    def test_windows_junction_destination_cannot_redirect_copy_outside_workspace(self):
        external = self.root / "outside workspace"
        external.mkdir()
        sentinel = external / "keep.txt"
        sentinel.write_text("Keep unchanged", encoding="utf-8")
        destination = self.workspace / ".claude"
        result = subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(destination), str(external)],
            capture_output=True,
            check=False,
        )
        if result.returncode:
            self.skipTest("Windows junction creation unavailable")
        # Remove the junction itself before TemporaryDirectory cleanup. Never
        # recursively remove a reparse point or follow it into its target.
        self.addCleanup(destination.rmdir)
        self.write_selection(["code-helper"])
        before = self.snapshot()
        self.run_cli("sync", success=False)
        self.assertEqual(before, self.snapshot())
        self.assertEqual(list(external.iterdir()), [sentinel])
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "Keep unchanged")


if __name__ == "__main__":
    unittest.main()
