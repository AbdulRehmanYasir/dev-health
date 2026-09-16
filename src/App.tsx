import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { AnalysisReport, Category, Issue, TreeNode } from "./types/analyzer";
import { SAMPLE_PROJECTS } from "./engine/sampleProjects";
import { runStaticAudit } from "./engine/staticAnalyzer";

const STORAGE_KEY = "devhealth_audits_v1";

export function App() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showPythonModal, setShowPythonModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // Filter state passed between views
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Persistent tree expansion state to preserve expanded state across tab switches
  const [expandedTreePaths, setExpandedTreePaths] = useState<Set<string>>(new Set());

  // Ingestion loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");

  // Helper to collect default initial expanded tree paths
  const initializeTreePaths = (structureTree?: TreeNode) => {
    const paths = new Set<string>();
    if (structureTree) {
      paths.add(structureTree.path || structureTree.name);
      if (structureTree.children) {
        structureTree.children.forEach((c) => {
          if (c.isDir) paths.add(c.path || c.name);
        });
      }
    }
    return paths;
  };

  // Initialize with initial sample and local storage
  useEffect(() => {
    // 1. Load historical audits from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    let loadedHistory: AnalysisReport[] = [];
    if (saved) {
      try {
        loadedHistory = JSON.parse(saved);
        setHistory(loadedHistory);
      } catch {}
    }

    // 2. If no active report, run the "Rayva Cloud" sample as immediate default
    const defaultSample = SAMPLE_PROJECTS[0];
    const initialReport = runStaticAudit(
      defaultSample.files,
      defaultSample.name,
      "sample",
      defaultSample.tagline
    );
    setReport(initialReport);
    setExpandedTreePaths(initializeTreePaths(initialReport.structure?.tree));

    if (loadedHistory.length === 0) {
      const initialHistory = [initialReport];
      setHistory(initialHistory);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialHistory));
      } catch {}
    }
  }, []);

  // Standardized, idempotent navigation handler
  const handleNavigateTab = useCallback(
    (tab: string, catFilter: string | null = null, issueId: string | null = null) => {
      const normalizedTab = tab.toLowerCase();

      // Idempotent check: prevent unnecessary re-renders when clicking active tab
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
    setExpandedTreePaths(initializeTreePaths(newReport.structure?.tree));
    setShowUploadModal(false);
    handleNavigateTab("dashboard", null, null);

    // Save lightweight copy to history
    const updated = [newReport, ...history.filter((h) => h.id !== newReport.id)].slice(0, 10);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // Reset Actions
  const handleClearActiveAudit = () => {
    setReport(null);
    setExpandedTreePaths(new Set());
    setSelectedIssueId(null);
    setCategoryFilter(null);
    setShowUploadModal(false);
    handleNavigateTab("dashboard", null, null);
  };

  const handleResetToDefaultSample = () => {
    const defaultSample = SAMPLE_PROJECTS[0];
    const initialReport = runStaticAudit(
      defaultSample.files,
      defaultSample.name,
      "sample",
      defaultSample.tagline
    );
    setReport(initialReport);
    setExpandedTreePaths(initializeTreePaths(initialReport.structure?.tree));
    setSelectedIssueId(null);
    setCategoryFilter(null);
    setShowUploadModal(false);
    handleNavigateTab("dashboard", null, null);
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

  // Category navigation from Dashboard or Category Detail View
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

  // Tree expansion callbacks (preserves state across tab switches)
  const handleToggleTreePath = useCallback((path: string) => {
    setExpandedTreePaths((prev) => {
      const next = new Set(prev);
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
    const collect = (n: TreeNode) => {
      if (n.isDir) {
        paths.add(n.path || n.name);
        if (n.children) n.children.forEach(collect);
      }
    };
    collect(report.structure.tree);
    setExpandedTreePaths(paths);
  }, [report]);

  const handleCollapseAllTree = useCallback(() => {
    setExpandedTreePaths(new Set());
  }, []);

  // View dispatcher: strictly renders only the requested view
  const renderActiveView = () => {
    if (!report) {
      if (currentTab === "history") {
        return (
          <HistoryView
            history={history}
            onSelectAudit={(selected) => {
              setReport(selected);
              setExpandedTreePaths(initializeTreePaths(selected.structure?.tree));
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
              ⚡ Workspace is clean. Select a source below or reload the demo project.
            </span>
            <button
              onClick={handleResetToDefaultSample}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold transition-colors"
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
            onNavigateCategory={(c) => handleSelectCategory(c)}
            onBackToDashboard={() => handleNavigateTab("dashboard")}
            onSelectIssue={handleSelectIssue}
          />
        );

      case "dependencies":
        return (
          <CategoryDetailView
            report={report}
            category="Dependencies"
            onNavigateCategory={(c) => handleSelectCategory(c)}
            onBackToDashboard={() => handleNavigateTab("dashboard")}
            onSelectIssue={handleSelectIssue}
          />
        );

      case "testing":
        return (
          <CategoryDetailView
            report={report}
            category="Testing"
            onNavigateCategory={(c) => handleSelectCategory(c)}
            onBackToDashboard={() => handleNavigateTab("dashboard")}
            onSelectIssue={handleSelectIssue}
          />
        );

      case "performance":
        return (
          <CategoryDetailView
            report={report}
            category="Performance"
            onNavigateCategory={(c) => handleSelectCategory(c)}
            onBackToDashboard={() => handleNavigateTab("dashboard")}
            onSelectIssue={handleSelectIssue}
          />
        );

      case "documentation":
        return (
          <CategoryDetailView
            report={report}
            category="Documentation"
            onNavigateCategory={(c) => handleSelectCategory(c)}
            onBackToDashboard={() => handleNavigateTab("dashboard")}
            onSelectIssue={handleSelectIssue}
          />
        );

      case "production":
      case "production-readiness":
        return (
          <CategoryDetailView
            report={report}
            category="Production"
            onNavigateCategory={(c) => handleSelectCategory(c)}
            onBackToDashboard={() => handleNavigateTab("dashboard")}
            onSelectIssue={handleSelectIssue}
          />
        );

      case "build":
        return (
          <CategoryDetailView
            report={report}
            category="Build"
            onNavigateCategory={(c) => handleSelectCategory(c)}
            onBackToDashboard={() => handleNavigateTab("dashboard")}
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
              setExpandedTreePaths(initializeTreePaths(selected.structure?.tree));
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
      {/* Top Navigation Bar with Audit Sub-nav */}
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => handleNavigateTab(tab)}
        report={report}
        onNewAuditClick={() => setShowUploadModal(true)}
        onOpenPythonModal={() => setShowPythonModal(true)}
        onResetClick={() => setShowResetModal(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Upload Modal Drawer / View */}
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

        {/* View Rendering */}
        {renderActiveView()}
      </main>

      {/* Persistent App Footer */}
      <Footer />

      {/* Reset Modal */}
      <ResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onClearActiveAudit={handleClearActiveAudit}
        onResetToDefaultSample={handleResetToDefaultSample}
        onFactoryResetAll={handleFactoryResetAll}
        hasActiveReport={!!report}
        historyCount={history.length}
      />

      {/* Python Source Code Modal */}
      <PythonSourceModal
        isOpen={showPythonModal}
        onClose={() => setShowPythonModal(false)}
      />
    </div>
  );
}

export default App;
