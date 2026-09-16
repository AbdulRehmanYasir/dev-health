import React, { useState, useMemo, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Settings,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Layers,
  File,
  ShieldAlert,
  Search,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ProjectStructure, TreeNode } from "../types/analyzer";

interface ProjectTreeProps {
  structure: ProjectStructure;
  expandedPaths?: Set<string>;
  onTogglePath?: (path: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

// Safely sort children without mutating original array
function getSortedChildren(children: TreeNode[]): TreeNode[] {
  return [...children].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
}

const TreeItem: React.FC<{
  node: TreeNode;
  level?: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  filterQuery: string;
}> = React.memo(({ node, level = 0, expandedPaths, onToggle, filterQuery }) => {
  const nodePath = node.path || node.name;
  const isExpanded = expandedPaths.has(nodePath);

  // If search filter is active, check if this node or any child matches
  const matchesSearch = useMemo(() => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    const selfMatches = node.name.toLowerCase().includes(q);
    if (selfMatches) return true;
    if (node.isDir && node.children) {
      const checkDescendants = (children: TreeNode[]): boolean => {
        return children.some((c) => {
          if (c.name.toLowerCase().includes(q)) return true;
          if (c.isDir && c.children) return checkDescendants(c.children);
          return false;
        });
      };
      return checkDescendants(node.children);
    }
    return false;
  }, [node, filterQuery]);

  if (!matchesSearch) {
    return null;
  }

  if (node.isDir) {
    const sortedChildren = node.children ? getSortedChildren(node.children) : [];
    const shouldShowChildren = filterQuery ? true : isExpanded;

    return (
      <div>
        <div
          onClick={() => onToggle(nodePath)}
          className="flex items-center gap-1.5 py-1 px-2 hover:bg-slate-800/60 rounded cursor-pointer text-xs font-mono text-slate-300 transition-colors select-none"
          style={{ paddingLeft: `${level * 14 + 6}px` }}
        >
          {shouldShowChildren ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          {shouldShowChildren ? (
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          )}
          <span className="font-semibold text-slate-200">{node.name}</span>
          <span className="text-[10px] text-slate-500">
            ({node.children?.length || 0})
          </span>
        </div>

        {shouldShowChildren && sortedChildren.length > 0 && (
          <div>
            {sortedChildren.map((child) => (
              <TreeItem
                key={child.path || child.name}
                node={child}
                level={level + 1}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                filterQuery={filterQuery}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File rendering
  const name = node.name.toLowerCase();
  const isTest = name.includes("test") || name.includes("spec") || name.startsWith("test_");
  const isConfig =
    name.endsWith(".json") ||
    name.endsWith(".yaml") ||
    name.endsWith(".yml") ||
    name.endsWith(".toml") ||
    name.endsWith(".ini") ||
    name.includes(".env");
  const isDoc =
    name.endsWith(".md") ||
    name.endsWith(".rst") ||
    name.endsWith(".txt") ||
    name.includes("readme") ||
    name.includes("license");

  return (
    <div
      className="flex items-center justify-between py-1 px-2 hover:bg-slate-800/40 rounded text-xs font-mono text-slate-400 transition-colors"
      style={{ paddingLeft: `${level * 14 + 6}px` }}
    >
      <div className="flex items-center gap-1.5 truncate">
        {isDoc ? (
          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        ) : isConfig ? (
          <Settings className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        <span className="truncate text-slate-300">{node.name}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isTest && (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            TEST
          </span>
        )}
        {node.size !== undefined && (
          <span className="text-[10px] text-slate-500">
            {node.size > 1024 ? `${Math.round(node.size / 1024)} KB` : `${node.size} B`}
          </span>
        )}
      </div>
    </div>
  );
});

export const ProjectTree: React.FC<ProjectTreeProps> = ({
  structure,
  expandedPaths: externalExpanded,
  onTogglePath: externalToggle,
  onExpandAll: externalExpandAll,
  onCollapseAll: externalCollapseAll,
}) => {
  const [filterQuery, setFilterQuery] = useState("");

  // Helper to gather all directory paths for Expand All
  const allDirPaths = useMemo(() => {
    const paths = new Set<string>();
    const collect = (n: TreeNode) => {
      if (n.isDir) {
        paths.add(n.path || n.name);
        if (n.children) {
          n.children.forEach(collect);
        }
      }
    };
    if (structure.tree) collect(structure.tree);
    return paths;
  }, [structure.tree]);

  // Default initial expanded paths (root + 1st level)
  const defaultInitialExpanded = useMemo(() => {
    const initial = new Set<string>();
    if (structure.tree) {
      initial.add(structure.tree.path || structure.tree.name);
      if (structure.tree.children) {
        structure.tree.children.forEach((c) => {
          if (c.isDir) initial.add(c.path || c.name);
        });
      }
    }
    return initial;
  }, [structure.tree]);

  // Internal fallback state if not managed externally
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(defaultInitialExpanded);

  const activeExpanded = externalExpanded || internalExpanded;

  const handleToggle = useCallback(
    (path: string) => {
      if (externalToggle) {
        externalToggle(path);
      } else {
        setInternalExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(path)) {
            next.delete(path);
          } else {
            next.add(path);
          }
          return next;
        });
      }
    },
    [externalToggle]
  );

  const handleExpandAll = useCallback(() => {
    if (externalExpandAll) {
      externalExpandAll();
    } else {
      setInternalExpanded(new Set(allDirPaths));
    }
  }, [externalExpandAll, allDirPaths]);

  const handleCollapseAll = useCallback(() => {
    if (externalCollapseAll) {
      externalCollapseAll();
    } else {
      setInternalExpanded(new Set());
    }
  }, [externalCollapseAll]);

  // Calculate total language file count once (prevent repeated reduce inside loop)
  const totalLanguageFiles = useMemo(() => {
    return (Object.values(structure.languages) as number[]).reduce((a, b) => a + b, 0);
  }, [structure.languages]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-2xl font-black font-mono text-slate-100">
            {structure.totalFiles}
          </span>
          <span className="block text-[11px] font-mono text-slate-400 uppercase mt-1">
            Total Files
          </span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-2xl font-black font-mono text-cyan-400">
            {structure.sourceFilesCount}
          </span>
          <span className="block text-[11px] font-mono text-slate-400 uppercase mt-1">
            Source Files
          </span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-2xl font-black font-mono text-emerald-400">
            {structure.testFilesCount}
          </span>
          <span className="block text-[11px] font-mono text-slate-400 uppercase mt-1">
            Test Files
          </span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-2xl font-black font-mono text-amber-400">
            {structure.configFilesCount}
          </span>
          <span className="block text-[11px] font-mono text-slate-400 uppercase mt-1">
            Configs
          </span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center col-span-2 sm:col-span-1">
          <span className="text-2xl font-black font-mono text-purple-400">
            {structure.docFilesCount}
          </span>
          <span className="block text-[11px] font-mono text-slate-400 uppercase mt-1">
            Documentation
          </span>
        </div>
      </div>

      {/* Main Two-Column View: Interactive Tree + Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Collapsible Directory Tree */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              File System Hierarchy
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExpandAll}
                title="Expand All Directories"
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Expand All</span>
              </button>
              <button
                onClick={handleCollapseAll}
                title="Collapse All Directories"
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Collapse</span>
              </button>
            </div>
          </div>

          {/* Search Filter for Fast Directory Traversal */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter files by name in tree..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500 font-mono"
            />
          </div>

          <div className="max-h-[500px] overflow-y-auto overflow-x-auto pr-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
            <TreeItem
              node={structure.tree}
              expandedPaths={activeExpanded}
              onToggle={handleToggle}
              filterQuery={filterQuery}
            />
          </div>
        </div>

        {/* Right: Languages, Large Files & Suspicious Files */}
        <div className="space-y-4">
          {/* Languages Distribution */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-3">
              Languages & File Types
            </h3>
            <div className="space-y-2">
              {Object.entries(structure.languages).map(([lang, count]) => {
                const pct =
                  totalLanguageFiles > 0
                    ? Math.round(((count as number) / totalLanguageFiles) * 100)
                    : 0;
                return (
                  <div key={lang} className="text-xs font-mono">
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>{lang}</span>
                      <span className="text-slate-400">
                        {count} files ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suspicious Files Card */}
          {structure.suspiciousFiles.length > 0 && (
            <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Suspicious Files Flagged ({structure.suspiciousFiles.length})
              </h3>
              <div className="space-y-2 text-xs font-mono">
                {structure.suspiciousFiles.map((sf, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-slate-950/60 border border-rose-500/20 text-rose-200"
                  >
                    <div className="font-bold truncate">{sf.path}</div>
                    <div className="text-[10px] text-rose-400/80 mt-0.5">
                      {sf.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Large Files (>200KB) Card */}
          {structure.largeFiles.length > 0 && (
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Large Source Files (&gt;200KB)
              </h3>
              <div className="space-y-1.5 text-xs font-mono">
                {structure.largeFiles.map((lf, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-800 text-slate-300"
                  >
                    <span className="truncate pr-2">{lf.path}</span>
                    <span className="text-amber-400 font-bold shrink-0">
                      {lf.sizeKb} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
