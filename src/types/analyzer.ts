export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type Category =
  | "Security"
  | "Build"
  | "Testing"
  | "Dependencies"
  | "Performance"
  | "Documentation"
  | "Production";

export type HealthStatus = "HEALTHY" | "NEEDS ATTENTION" | "AT RISK" | "CRITICAL";

export type ProductionStatus =
  | "PRODUCTION READY"
  | "READY WITH IMPROVEMENTS"
  | "NEEDS WORK"
  | "NOT READY";

export interface Issue {
  id: string;
  title: string;
  severity: Severity;
  category: Category;
  file: string;
  line?: number;
  codeSnippet?: string;
  description: string;
  whyItMatters: string;
  recommendedFix: string;
}

export interface CheckItem {
  label: string;
  passed: boolean;
  isWarning?: boolean;
  details?: string;
}

export interface CategoryResult {
  score: number;
  checks: CheckItem[];
  findings: string[];
  recommendations: string[];
  metrics: Record<string, any>;
}

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  children?: TreeNode[];
}

export interface ProjectStructure {
  totalFiles: number;
  totalDirs: number;
  sourceFilesCount: number;
  testFilesCount: number;
  configFilesCount: number;
  docFilesCount: number;
  largeFiles: { path: string; sizeKb: number }[];
  suspiciousFiles: { path: string; reason: string }[];
  envFiles: string[];
  tree: TreeNode;
  languages: Record<string, number>;
  primaryLanguage: string;
}

export interface ScoresBreakdown {
  overall: number;
  build: number;
  security: number;
  testing: number;
  dependencies: number;
  performance: number;
  documentation: number;
  productionReadiness: number;
}

export interface AnalysisReport {
  id: string;
  projectName: string;
  sourceType: "upload" | "github" | "sample";
  sourceIdentifier?: string;
  createdAt: string;
  projectType: string;
  languages: string[];
  status: HealthStatus;
  productionStatus: ProductionStatus;
  scores: ScoresBreakdown;
  structure: ProjectStructure;
  buildHealth: CategoryResult;
  security: CategoryResult;
  testing: CategoryResult;
  dependencies: CategoryResult;
  performance: CategoryResult;
  documentation: CategoryResult;
  production: CategoryResult;
  issues: Issue[];
  recommendedActions: string[];
  executiveSummary: string;
}

export interface HistoryItem {
  id: string;
  name: string;
  sourceType: string;
  projectType: string;
  createdAt: string;
  overallScore: number;
  buildScore: number;
  securityScore: number;
  testingScore: number;
  dependenciesScore: number;
  performanceScore: number;
  documentationScore: number;
  productionScore: number;
  status: string;
  issueCount: number;
  criticalIssueCount: number;
}
