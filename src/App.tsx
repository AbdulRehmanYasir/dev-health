import React, { useState, useEffect, useCallback } from "react";

import { Header } from "./components/Header";
import { UploadSection } from "./components/UploadSection";
import { Dashboard } from "./components/Dashboard";
import { IssueExplorer } from "./components/IssueExplorer";
import { ProjectTree } from "./components/ProjectTree";
import { ReportView } from "./components/ReportView";
import { HistoryView } from "./components/HistoryView";
import { CategoryDetailView } from "./components/CategoryDetailView";
import { PythonSourceModal } from "./components/PythonSourceModal";
import { ResetModal } from "./components/ResetModal";
import { Footer } from "./components/Footer";

import {
  AnalysisReport,
  Category,
  Issue,
  TreeNode,
} from "./types/analyzer";

const STORAGE_KEY = "devhealth_audits_v1";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function camelizeKeys(value: any): any {
  if (Array.isArray(value)) {
    return value.map(camelizeKeys);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce(
      (result, [key, child]) => {
        const camelKey = key.replace(
          /_([a-z])/g,
          (_, letter) => letter.toUpperCase()
        );

        result[camelKey] = camelizeKeys(child);
        return result;
      },
      {} as Record<string, any>
    );
  }

  return value;
}

function normalizeApiReport(data: any): AnalysisReport {
  return camelizeKeys(data) as AnalysisReport;
}

async function fetchDefaultSample(): Promise<AnalysisReport> {
  const response = await fetch(
    `${API_BASE_URL}/api/analyze/sample/rayva-cloud`,
    {
      method: "POST",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.error ||
        "Could not load the default demo project."
    );
  }

  return normalizeApiReport(data);
}

export function App() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showPythonModal, setShowPythonModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const [expandedTreePaths, setExpandedTreePaths] =
    useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");

  const initializeTreePaths = (structureTree?: TreeNode) => {
    const paths = new Set<string>();

    if (structureTree) {
      paths.add(structureTree.path || structureTree.name);

      if (structureTree.children) {
        structureTree.children.forEach((child) => {
          if (child.isDir) {
            paths.add(child.path || child.name);
          }
        });
      }
    }

    return paths;
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let loadedHistory: AnalysisReport[] = [];

    if (saved) {
      try {
        loadedHistory = JSON.parse(saved);
        setHistory(loadedHistory);
      } catch {}
    }

    let cancelled = false;

    const loadDefaultSample = async () => {
      try {
        const initialReport = await fetchDefaultSample();

        if (cancelled) return;

        setReport(initialReport);
        setExpandedTreePaths(
          initializeTreePaths(initialReport.structure?.tree)
        );

        if (loadedHistory.length === 0) {
          const initialHistory = [initialReport];

          setHistory(initialHistory);

          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(initialHistory)
            );
          } catch {}
        }
      } catch (error) {
        console.error(
          "Failed to load default demo project:",
          error
        );
      }
    };

    loadDefaultSample();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNavigateTab = useCallback(
    (
      tab: string,
      catFilter: string | null = null,
      issueId: string | null = null
    ) => {
      const normalizedTab = tab.toLowerCase();

      if (
        currentTab === normalizedTab &&
        categoryFilter === catFilter &&
        selectedIssueId === issueId
      ) {
        return;
      }

      setCategoryFilter(catFilter);
      setSelectedIssueId(issueId);
      setCurrentTab(normalizedTab);
    },
    [currentTab, categoryFilter, selectedIssueId]
  );

  const handleAuditComplete = (newReport: AnalysisReport) => {
    setReport(newReport);
    setExpandedTreePaths(
      initializeTreePaths(newReport.structure?.tree)
    );
    setShowUploadModal(false);
    handleNavigateTab("dashboard", null, null);

    const updated = [
      newReport,
      ...history.filter((h) => h.id !== newReport.id),
    ].slice(0, 10);

    setHistory(updated);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch {}
  };

  const handleClearHistory = () => {
    setHistory([]);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleClearActiveAudit = () => {
    setReport(null);
    setExpandedTreePaths(new Set());
    setSelectedIssueId(null);
    setCategoryFilter(null);
    setShowUploadModal(false);

    handleNavigateTab("dashboard", null, null);
  };

  const handleResetToDefaultSample = async () => {
    setIsLoading(true);
    setProgressPercent(20);
    setProgressText("Loading Rayva Cloud demo project...");

    try {
      setProgressPercent(45);
      setProgressText(
        "Sending demo project to DevHealth backend..."
      );

      const initialReport = await fetchDefaultSample();

      setProgressPercent(85);
      setProgressText(
        "Running Python static analysis engine..."
      );

      setReport(initialReport);
      setExpandedTreePaths(
        initializeTreePaths(initialReport.structure?.tree)
      );
      setSelectedIssueId(null);
      setCategoryFilter(null);
      setShowUploadModal(false);

      handleNavigateTab("dashboard", null, null);

      setProgressPercent(100);
      setProgressText("Audit complete!");
    } catch (error: any) {
      console.error(
        "Failed to restore default demo project:",
        error
      );

      setProgressPercent(0);
      setProgressText("");

      alert(
        error?.message ||
          "Could not restore the default demo project."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFactoryResetAll = () => {
    setReport(null);
    setHistory([]);
    setExpandedTreePaths(new Set());
    setSelectedIssueId(null);
    setCategoryFilter(null);
    setShowUploadModal(false);

    handleNavigateTab("dashboard", null, null);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleSelectCategory = (cat: string | Category) => {
    const normalized = cat.toLowerCase();

    switch (normalized) {
      case "security":
        handleNavigateTab("security", "Security");
        break;

      case "dependencies":
        handleNavigateTab("dependencies", "Dependencies");
        break;

      case "testing":
        handleNavigateTab("testing", "Testing");
        break;

      case "performance":
        handleNavigateTab("performance", "Performance");
        break;

      case "documentation":
        handleNavigateTab("documentation", "Documentation");
        break;

      case "production":
      case "production-readiness":
      case "production readiness":
        handleNavigateTab("production", "Production");
        break;

      case "build":
      case "build health":
        handleNavigateTab("build", "Build");
        break;

      default:
        handleNavigateTab("issues", cat, null);
        break;
    }
  };

  const handleSelectIssue = (issue: Issue) => {
    handleNavigateTab("issues", issue.category, issue.id);
  };

  const handleToggleTreePath = useCallback((path: string) => {
    setExpandedTreePaths((previous) => {
      const next = new Set(previous);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }, []);

  const handleExpandAllTree = useCallback(() => {
    if (!report?.structure?.tree) return;

    const paths = new Set<string>();

    const collect = (node: TreeNode) => {
      if (node.isDir) {
        paths.add(node.path || node.name);

        if (node.children) {
          node.children.forEach(collect);
        }
      }
    };

    collect(report.structure.tree);
    setExpandedTreePaths(paths);
  }, [report]);

  const handleCollapseAllTree = useCallback(() => {
    setExpandedTreePaths(new Set());
  }, []);

  const renderActiveView = () => {
    if (!report) {
      if (currentTab === "history") {
        return (
          <HistoryView
            history={history}
            onSelectAudit={(selected) => {
              setReport(selected);
              setExpandedTreePaths(
                initializeTreePaths(selected.structure?.tree)
              );
              handleNavigateTab("dashboard");
            }}
            onClearHistory={handleClearHistory}
          />
        );
      }

      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <span className="text-slate-400">
              ⚡ Workspace is clean. Select a source below or
              reload the demo project.
            </span>

            <button
              onClick={handleResetToDefaultSample}
              disabled={isLoading}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Restore Demo Project
            </button>
          </div>

          <UploadSection
            onAuditComplete={handleAuditComplete}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            progressPercent={progressPercent}
            setProgressPercent={setProgressPercent}
            progressText={progressText}
            setProgressText={setProgressText}
          />
        </div>
      );
    }

    switch (currentTab) {
      case "dashboard":
        return (
          <Dashboard
            report={report}
            onSelectCategory={handleSelectCategory}
            onSelectIssue={handleSelectIssue}
            onResetClick={() => setShowResetModal(true)}
          />
        );

      case "issues":
        return (
          <IssueExplorer
            issues={report.issues}
            selectedCategoryFilter={categoryFilter}
            selectedIssueId={selectedIssueId}
          />
        );

      case "tree":
        return (
          <ProjectTree
            structure={report.structure}
            expandedPaths={expandedTreePaths}
            onTogglePath={handleToggleTreePath}
            onExpandAll={handleExpandAllTree}
            onCollapseAll={handleCollapseAllTree}
          />
        );

      case "security":
        return (
          <CategoryDetailView
            report={report}
            category="Security"
            onNavigateCategory={(category) =>
              handleSelectCategory(category)
            }
            onBackToDashboard={() =>
              handleNavigateTab("dashboard")
            }
            onSelectIssue={handleSelectIssue}
          />
        );

      case "dependencies":
        return (
          <CategoryDetailView
            report={report}
            category="Dependencies"
            onNavigateCategory={(category) =>
              handleSelectCategory(category)
            }
            onBackToDashboard={() =>
              handleNavigateTab("dashboard")
            }
            onSelectIssue={handleSelectIssue}
          />
        );

      case "testing":
        return (
          <CategoryDetailView
            report={report}
            category="Testing"
            onNavigateCategory={(category) =>
              handleSelectCategory(category)
            }
            onBackToDashboard={() =>
              handleNavigateTab("dashboard")
            }
            onSelectIssue={handleSelectIssue}
          />
        );

      case "performance":
        return (
          <CategoryDetailView
            report={report}
            category="Performance"
            onNavigateCategory={(category) =>
              handleSelectCategory(category)
            }
            onBackToDashboard={() =>
              handleNavigateTab("dashboard")
            }
            onSelectIssue={handleSelectIssue}
          />
        );

      case "documentation":
        return (
          <CategoryDetailView
            report={report}
            category="Documentation"
            onNavigateCategory={(category) =>
              handleSelectCategory(category)
            }
            onBackToDashboard={() =>
              handleNavigateTab("dashboard")
            }
            onSelectIssue={handleSelectIssue}
          />
        );

      case "production":
      case "production-readiness":
        return (
          <CategoryDetailView
            report={report}
            category="Production"
            onNavigateCategory={(category) =>
              handleSelectCategory(category)
            }
            onBackToDashboard={() =>
              handleNavigateTab("dashboard")
            }
            onSelectIssue={handleSelectIssue}
          />
        );

      case "build":
        return (
          <CategoryDetailView
            report={report}
            category="Build"
            onNavigateCategory={(category) =>
              handleSelectCategory(category)
            }
            onBackToDashboard={() =>
              handleNavigateTab("dashboard")
            }
            onSelectIssue={handleSelectIssue}
          />
        );

      case "report":
        return <ReportView report={report} />;

      case "history":
        return (
          <HistoryView
            history={history}
            onSelectAudit={(selected) => {
              setReport(selected);
              setExpandedTreePaths(
                initializeTreePaths(selected.structure?.tree)
              );
              handleNavigateTab("dashboard");
            }}
            onClearHistory={handleClearHistory}
          />
        );

      default:
        return (
          <Dashboard
            report={report}
            onSelectCategory={handleSelectCategory}
            onSelectIssue={handleSelectIssue}
            onResetClick={() => setShowResetModal(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => handleNavigateTab(tab)}
        report={report}
        onNewAuditClick={() => setShowUploadModal(true)}
        onOpenPythonModal={() => setShowPythonModal(true)}
        onResetClick={() => setShowResetModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showUploadModal ? (
          <div className="mb-8 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                Audit Another Project
              </span>

              <button
                onClick={() => setShowUploadModal(false)}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800"
              >
                Close [Esc]
              </button>
            </div>

            <UploadSection
              onAuditComplete={handleAuditComplete}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              progressPercent={progressPercent}
              setProgressPercent={setProgressPercent}
              progressText={progressText}
              setProgressText={setProgressText}
            />
          </div>
        ) : null}

        {renderActiveView()}
      </main>

      <Footer />

      <ResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onClearActiveAudit={handleClearActiveAudit}
        onResetToDefaultSample={handleResetToDefaultSample}
        onFactoryResetAll={handleFactoryResetAll}
        hasActiveReport={!!report}
        historyCount={history.length}
      />

      <PythonSourceModal
        isOpen={showPythonModal}
        onClose={() => setShowPythonModal(false)}
      />
    </div>
  );
}

export default App;