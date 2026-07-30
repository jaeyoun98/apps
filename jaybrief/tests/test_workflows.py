import unittest
from pathlib import Path


# Workflows live at the monorepo root, one level above this app.
APP_ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = APP_ROOT.parent / ".github" / "workflows"
PAGES_WORKFLOW = WORKFLOWS / "pages.yml"


class PagesWorkflowTest(unittest.TestCase):
    def test_runtime_data_is_not_committed_to_main(self):
        workflow = PAGES_WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("ref: runtime-data", workflow)
        self.assertIn("git commit-tree", workflow)
        self.assertIn("--force-with-lease=refs/heads/runtime-data", workflow)
        self.assertNotIn("Update feed data", workflow)
        self.assertNotIn("Update digest", workflow)

    def test_site_artifact_combines_shell_and_runtime_data(self):
        workflow = PAGES_WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("cp -a runtime/jaybrief/data _site/jaybrief/data", workflow)
        self.assertIn("actions/upload-pages-artifact@v3", workflow)
        self.assertIn("actions/deploy-pages@v4", workflow)

    def test_deploy_survives_a_failed_refresh(self):
        # A jaybrief pipeline failure must not block other apps from deploying: the
        # deploy job runs regardless and ships the last good runtime-data snapshot.
        workflow = PAGES_WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("if: always()", workflow)

    def test_legacy_data_workflows_are_removed(self):
        self.assertTrue(WORKFLOWS.is_dir(), f"{WORKFLOWS} should exist")
        self.assertFalse((WORKFLOWS / "feed.yml").exists())
        self.assertFalse((WORKFLOWS / "digest.yml").exists())


if __name__ == "__main__":
    unittest.main()
