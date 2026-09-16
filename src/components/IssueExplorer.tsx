import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  FileCode,
  Lightbulb,
  ChevronDown,
  Layers,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { Category, Issue, Severity } from "../types/analyzer";

interface IssueExplorerProps {
  issues: Issue[];
  selectedCategoryFilter?: string | null;
  selectedIssueId?: string | null;
}

const PAGE_SIZE = 25;

export const IssueExplorer: React.FC<IssueExplorerProps> = ({
  issues,
  selectedCategoryFilter,
  selectedIssueId,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>(
    selectedCategoryFilter || "ALL"
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Sync category filter when parent prop changes
  useEffect(() => {
    if (selectedCategoryFilter) {
      setCategoryFilter(selectedCategoryFilter);
    }
  }, [selectedCategoryFilter]);

  // Debounce search input by 150ms to keep UI responsive
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setVisibleCount(PAGE_SIZE); // reset to first page on search
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset pagination on filter change
  const handleSeverityChange = (sev: string) => {
    setSeverityFilter(sev);
    setVisibleCount(PAGE_SIZE);
  };

  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setVisibleCount(PAGE_SIZE);
  };

  const filteredIssues = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return issues.filter((issue) => {
      // Severity filter
      if (severityFilter !== "ALL" && issue.severity !== severityFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== "ALL" && issue.category !== categoryFilter) {
        return false;
      }
      // Search query
      if (q) {
        const matchesTitle = issue.title.toLowerCase().includes(q);
        const matchesFile = issue.file.toLowerCase().includes(q);
        const matchesDesc = issue.description.toLowerCase().includes(q);
        const matchesSnippet = issue.codeSnippet?.toLowerCase().includes(q) || false;
        return matchesTitle || matchesFile || matchesDesc || matchesSnippet;
      }
      return true;
    });
  }, [issues, severityFilter, categoryFilter, debouncedQuery]);

  // Ensure target issue is included in visible items
  useEffect(() => {
    if (selectedIssueId) {
      const idx = filteredIssues.findIndex((i) => i.id === selectedIssueId);
      if (idx >= visibleCount) {
        setVisibleCount(idx + 10);
      }
      // Smooth scroll after render
      const timer = setTimeout(() => {
        const el = document.getElementById(`issue-${selectedIssueId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedIssueId, filteredIssues, visibleCount]);

  const displayedIssues = useMemo(() => {
    return filteredIssues.slice(0, visibleCount);
  }, [filteredIssues, visibleCount]);

  const copySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityBadge = (sev: Severity) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "MEDIUM":
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "LOW":
        return "bg-slate-700/50 text-slate-300 border-slate-600/40";
      case "INFO":
      default:
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    }
  };

  const severities = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
  const categories = [
    "ALL",
    "Security",
    "Build",
    "Testing",
    "Dependencies",
    "Performance",
    "Documentation",
    "Production",
  ];

  return (
    <div className="space-y-6">
      {/* Controls Bar: Search & Filter Chips */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search issues by title, file path, description, or code snippet..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500 font-mono"
          />
        </div>

        {/* Severity Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Severity:
          </span>
          {severities.map((sev) => (
            <button
              key={sev}
              onClick={() => handleSeverityChange(sev)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                severityFilter === sev
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-xs font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-slate-200 text-slate-950 font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Count & Active Filters Indicator */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
        <span>
          Showing <strong>{displayedIssues.length}</strong> of{" "}
          <strong>{filteredIssues.length}</strong> issues (Total: {issues.length})
        </span>
        {(severityFilter !== "ALL" || categoryFilter !== "ALL" || searchInput) && (
          <button
            onClick={() => {
              setSeverityFilter("ALL");
              setCategoryFilter("ALL");
              setSearchInput("");
              setVisibleCount(PAGE_SIZE);
            }}
            className="text-cyan-400 hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800/80">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-200">
            No Issues Found Matching Filters
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search criteria or selecting "ALL" filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedIssues.map((issue) => (
            <div
              key={issue.id}
              id={`issue-${issue.id}`}
              className={`p-5 rounded-xl border transition-all ${
                issue.id === selectedIssueId
                  ? "bg-slate-900 border-cyan-500 shadow-md shadow-cyan-950/40"
                  : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
              }`}
            >
              {/* Header: Title, Severity, Category, ID */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeverityBadge(
                      issue.severity
                    )}`}
                  >
                    {issue.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {issue.category}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">
                    {issue.title}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  ID: {issue.id}
                </span>
              </div>

              {/* File location */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-3 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
                <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-slate-200">{issue.file}</span>
                {issue.line && (
                  <span className="text-cyan-400">Line {issue.line}</span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {issue.description}
              </p>

              {/* Code Snippet (if available) with masked secrets */}
              {issue.codeSnippet && (
                <div className="relative mb-3 group">
                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs text-cyan-300 overflow-x-auto">
                    <code>{issue.codeSnippet}</code>
                  </pre>
                  <button
                    onClick={() => copySnippet(issue.id, issue.codeSnippet!)}
                    title="Copy code snippet"
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-800/90 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedId === issue.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

              {/* Why It Matters & Recommended Fix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 space-y-1">
                  <span className="font-mono font-bold text-[11px] text-slate-400 uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400" /> Why It Matters:
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {issue.whyItMatters}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/10 border border-emerald-500/20 space-y-1">
                  <span className="font-mono font-bold text-[11px] text-emerald-400 uppercase flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3 text-emerald-400" /> Recommended Fix:
                  </span>
                  <p className="text-emerald-200/90 leading-relaxed">
                    {issue.recommendedFix}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Load More Pagination */}
          {visibleCount < filteredIssues.length && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-medium text-slate-200 hover:text-white border border-slate-700 transition-colors inline-flex items-center gap-2"
              >
                <span>Show Next {Math.min(PAGE_SIZE, filteredIssues.length - visibleCount)} Issues</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
