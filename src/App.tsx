import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Globe, 
  ShieldCheck, 
  Layout, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Loader2,
  ChevronRight,
  ExternalLink,
  BarChart3,
  Terminal,
  RefreshCw,
  Activity,
  Cpu,
  Database,
  Lock,
  Eye,
  Download,
  Share2,
  History,
  Settings,
  Maximize2,
  Minimize2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Shield,
  ShieldAlert,
  HardDrive,
  Network,
  FileText,
  Printer,
  Github,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Types ---

type AuditStatus = 'pass' | 'fail' | 'warning';

interface AuditCheck {
  id: string;
  name: string;
  status: AuditStatus;
  score: number;
  finding: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  // New fields for Solution
  solution?: {
    detailedFix: string;
    impactAnalysis: string;
    effortLevel: 'low' | 'medium' | 'high';
    codeSnippet?: string;
  };
}

interface AuditCategory {
  id: string;
  name: string;
  icon: any;
  score: number;
  description: string;
  checks: AuditCheck[];
}

interface AuditReport {
  url: string;
  timestamp: string;
  overallScore: number;
  summary: string;
  categories: AuditCategory[];
  seoAnalysis: {
    url: string;
    canonical: string;
    title: string;
    metaDescription: string;
    headings: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number };
    imageAltTags: { total: number; missing: number };
    htmlRatio: string;
    frames: boolean;
    flash: boolean;
    microFormats: string[];
    schema: string[];
    openGraph: boolean;
    twitterCard: boolean;
    metaViewport: string;
    robotsTxt: boolean;
    xmlSitemaps: boolean;
    language: string;
    doctype: string;
    encoding: string;
    googleAnalytics: boolean;
    favicon: boolean;
  };
  technicalSpecs: {
    loadTime: string;
    pageSize: string;
    requestCount: number;
    serverLocation: string;
    framework: string;
    serverType: string;
    ipAddress: string;
    platform: string;
    platformVersion: string;
    responsivenessScore: number;
    sslExpiry?: string;
    httpVersion: string;
    compression: string;
    cdn: string;
    dnsProvider: string;
    securityHeaders: string[];
  };
  securityHealth: {
    malwareStatus: string;
    blacklistStatus: string;
    brokenLinksCount: number;
    privacyScore: number;
    sslStrength: string;
    firewallPresence: boolean;
  };
  performanceVitals: {
    ttfb: string;
    lcp: string;
    cls: string;
    fid: string;
    speedIndex: string;
  };
}

// --- Constants ---

const CATEGORY_METADATA = [
  { id: 'seo', name: 'Search Engine Optimization', icon: Globe, description: 'Visibility, indexing, and semantic structure analysis.' },
  { id: 'security', name: 'Cybersecurity & Privacy', icon: ShieldCheck, description: 'SSL, headers, data exposure, and vulnerability scanning.' },
  { id: 'uxui', name: 'UX/UI & Accessibility', icon: Layout, description: 'Visual hierarchy, legibility, and interactive feedback.' },
  { id: 'performance', name: 'Performance & Features', icon: Zap, description: 'Load speed, asset optimization, and functional logic.' },
];

// --- Components ---

const ScoreCircle = ({ score, size = "md" }: { score: number, size?: "sm" | "md" | "lg" }) => {
  const color = score >= 90 ? 'text-emerald-500' : score >= 70 ? 'text-amber-500' : 'text-red-500';
  const stroke = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  
  const dimensions = {
    sm: { w: "w-10", h: "h-10", text: "text-[10px]", stroke: 3 },
    md: { w: "w-16", h: "h-16", text: "text-xs", stroke: 4 },
    lg: { w: "w-24", h: "h-24", text: "text-xl", stroke: 6 },
  };

  const d = dimensions[size];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", d.w, d.h)}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#27272a" strokeWidth={d.stroke} />
        <motion.circle 
          cx="50" cy="50" r={radius} fill="none" stroke={stroke} strokeWidth={d.stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <span className={cn("absolute font-mono font-bold", d.text, color)}>{score}</span>
    </div>
  );
};

const StatusIcon = ({ status }: { status: AuditStatus }) => {
  switch (status) {
    case 'pass': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'fail': return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
  }
};

const SeverityBadge = ({ severity }: { severity: AuditCheck['severity'] }) => {
  const styles = {
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border", styles[severity])}>
      {severity}
    </span>
  );
};

export default function App() {
  const [url, setUrl] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategoryId, setSelectedCategoryId] = useState('seo');
  const [logs, setLogs] = useState<string[]>([]);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<any>(null);
  const [isExportingRepo, setIsExportingRepo] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url');
    if (targetUrl) {
      setUrl(targetUrl);
      // Auto-trigger audit if URL is provided in query
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }, 500);
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from AI Studio preview, localhost, or Vercel deployment
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.endsWith('.vercel.app') && origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.token) {
        setGithubToken(event.data.token);
        addLog("GITHUB OAUTH SUCCESSFUL. TOKEN ACQUIRED.");
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (githubToken) {
      fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${githubToken}`
        }
      })
      .then(res => res.json())
      .then(data => {
        setGithubUser(data);
        addLog(`GITHUB USER CONNECTED: ${data.login}`);
      })
      .catch(err => {
        console.error('Error fetching GitHub user:', err);
        addLog("ERROR FETCHING GITHUB USER PROFILE.");
      });
    }
  }, [githubToken]);

  const handleConnectGithub = async () => {
    try {
      addLog("INITIATING GITHUB OAUTH SEQUENCE...");
      const redirectUri = `${window.location.origin}/api/auth/github/callback`;
      const response = await fetch(`/api/auth/github/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to connect your GitHub account.');
        addLog("ERROR: POPUP BLOCKED BY BROWSER.");
      }
    } catch (error) {
      console.error('OAuth error:', error);
      addLog("ERROR: GITHUB OAUTH SEQUENCE FAILED.");
    }
  };

  const handleExportRepo = async () => {
    if (!githubToken) return;
    setIsExportingRepo(true);
    addLog("STARTING GITHUB REPOSITORY EXPORT...");
    try {
      const res = await fetch('/api/github/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken, repoName: 'msakin-fds/FDS-SiteAudit-1.0' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Export failed');
      addLog(`EXPORT SUCCESSFUL. REPOSITORY CREATED: ${data.url}`);
      window.open(data.url, '_blank');
    } catch (err: any) {
      console.error(err);
      addLog(`EXPORT ERROR: ${err.message}`);
      alert(`Export failed: ${err.message}. You may need to reconnect to GitHub to grant repository permissions.`);
    } finally {
      setIsExportingRepo(false);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    
    const baseUrl = window.location.origin + window.location.pathname;
    const fullShareUrl = `${baseUrl}?url=${encodeURIComponent(report.url)}`;
    setShareLink(fullShareUrl);

    const shareData = {
      title: `FDS SiteAudit - ${report.url}`,
      text: `Check out the audit report for ${report.url}. Overall Score: ${report.overallScore}/100`,
      url: fullShareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        addLog("REPORT SHARED SUCCESSFULLY.");
      } else {
        await navigator.clipboard.writeText(fullShareUrl);
        addLog("LINK COPIED TO CLIPBOARD.");
        alert("Shareable link copied to clipboard!");
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback for cancelled share or other errors
      await navigator.clipboard.writeText(fullShareUrl);
      addLog("LINK COPIED TO CLIPBOARD (FALLBACK).");
    }
  };

  const downloadPDF = async () => {
    if (!report) return;
    setIsExporting(true);
    addLog("INITIALIZING PDF EXPORT ENGINE...");
    
    try {
      const element = document.getElementById('audit-report-content');
      if (!element) {
        addLog("ERROR: REPORT CONTENT NOT FOUND.");
        return;
      }

      addLog("CAPTURING VIRTUAL DOM STATE...");
      
      // We use onclone to modify the element for capture without affecting the UI
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0a',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('audit-report-content');
          if (clonedElement) {
            clonedElement.style.height = 'auto';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.maxHeight = 'none';
          }
        }
      });

      addLog("GENERATING PDF ASSETS...");
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit A4 or maintain aspect ratio
      const imgWidth = 595.28; // A4 width in pts
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      // If content is longer than one A4 page, we might need multiple pages
      // But for simplicity and to match user's previous "long" PDF expectation, 
      // we'll just use a custom format that fits the whole thing or split it.
      // Let's use a custom format that fits the whole canvas height.
      const customPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      customPdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      customPdf.save(`FDS-SiteAudit-${report.url.replace(/[^a-z0-9]/gi, '-')}.pdf`);
      
      addLog("PDF EXPORT COMPLETE.");
    } catch (error) {
      console.error('PDF Export Error:', error);
      addLog("CRITICAL ERROR DURING PDF EXPORT.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;

    setIsAuditing(true);
    setError(null);
    setReport(null);
    setLogs([]);
    addLog(`INITIALIZING AUDIT SEQUENCE FOR: ${formattedUrl}`);

    try {
      addLog("ESTABLISHING SECURE CONNECTION TO GEMINI-3-FLASH...");
      addLog("MOUNTING URL CONTEXT TOOL...");

      const prompt = `
        Perform a deep-dive technical audit for the website: ${formattedUrl}.
        You must be extremely specific and descriptive. Analyze every possible technical detail.
        
        Structure your response as a JSON object matching this interface:
        interface AuditReport {
          overallScore: number;
          summary: string;
          seoAnalysis: {
            url: string;
            canonical: string;
            title: string;
            metaDescription: string;
            headings: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number };
            imageAltTags: { total: number; missing: number };
            htmlRatio: string;
            frames: boolean;
            flash: boolean;
            microFormats: string[];
            schema: string[];
            openGraph: boolean;
            twitterCard: boolean;
            metaViewport: string;
            robotsTxt: boolean;
            xmlSitemaps: boolean;
            language: string;
            doctype: string;
            encoding: string;
            googleAnalytics: boolean;
            favicon: boolean;
          };
          technicalSpecs: {
            loadTime: string;
            pageSize: string;
            requestCount: number;
            serverLocation: string;
            framework: string;
            serverType: string;
            ipAddress: string;
            platform: string;
            platformVersion: string;
            responsivenessScore: number;
            sslExpiry?: string;
            httpVersion: string;
            compression: string;
            cdn: string;
            dnsProvider: string;
            securityHeaders: string[];
          };
          securityHealth: {
            malwareStatus: string;
            blacklistStatus: string;
            brokenLinksCount: number;
            privacyScore: number;
            sslStrength: string;
            firewallPresence: boolean;
          };
          performanceVitals: {
            ttfb: string;
            lcp: string;
            cls: string;
            fid: string;
            speedIndex: string;
          };
          categories: {
            id: 'seo' | 'security' | 'uxui' | 'performance';
            name: string;
            score: number;
            checks: {
              id: string;
              name: string;
              status: 'pass' | 'fail' | 'warning';
              score: number;
              severity: 'low' | 'medium' | 'high' | 'critical';
              finding: string;
              recommendation: string;
              solution?: {
                detailedFix: string;
                impactAnalysis: string;
                effortLevel: 'low' | 'medium' | 'high';
                codeSnippet?: string;
              };
            }[];
          }[];
        }

        Specific checks required for each category:
        - SEO: Analyze URL, Canonical, Title, Meta Description, Headings (H1-H6 count), Image Alt tags (total vs missing), HTML to Text ratio, presence of Frames or Flash, Micro-formats, Schema.org data, Open Graph tags, Twitter Cards, Meta Viewport, Robots.txt, XML Sitemaps, Language, Doctype, Encoding, Google Analytics presence, and Favicon.
        - Security & Privacy: Malware scan status, Blacklist check (Google Safe Browsing, etc.), SSL/HTTPS strength, HSTS, CSP, X-Frame-Options, Sensitive data in JS, Outdated libraries, Form security, Privacy Policy presence, GDPR compliance markers, and Firewall/WAF detection.
        - UX/UI: Color contrast, Font legibility, Navigation depth, CTA clarity, Whitespace, Layout shifts, Accessibility (ARIA).
        - Performance: Core Web Vitals (TTFB, LCP, CLS, FID, Speed Index), Image optimization, Minification, Compression, Caching, Critical path, Feature functional logic, and Broken links scan.

        For solution, provide step-by-step technical instructions for developers to fix the issue, including code snippets where applicable.
        Be extremely detailed about the technical infrastructure (server, platform, version, responsiveness).
      `;

      const logSteps = [
        "CRAWLING DOM STRUCTURE...",
        "EXTRACTING META DATA...",
        "SCANNING SECURITY HEADERS...",
        "ANALYZING ASSET PAYLOADS...",
        "EVALUATING ACCESSIBILITY CONTRAST...",
        "SIMULATING USER FLOWS...",
        "GENERATING RECOMMENDATION ENGINE..."
      ];

      let stepIdx = 0;
      const logInterval = setInterval(() => {
        if (stepIdx < logSteps.length) {
          addLog(logSteps[stepIdx]);
          stepIdx++;
        }
      }, 1500);

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formattedUrl, prompt })
      });

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        const text = await response.text();
        if (response.status === 504) {
          throw new Error("Vercel Hobby Tier Timeout (10s limit). The audit took too long to generate.");
        }
        throw new Error(`Server returned ${response.status}: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate audit report');
      }

      clearInterval(logInterval);
      addLog("DATA ACQUISITION COMPLETE. PARSING REPORT...");

      const rawText = result.text || "{}";
      let jsonText = rawText;
      const jsonMatch = rawText.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      const data = JSON.parse(jsonText.trim()) as AuditReport;
      setReport({
        ...data,
        url: formattedUrl,
        timestamp: new Date().toISOString()
      });
      addLog("AUDIT SUCCESSFUL. RENDERING DASHBOARD.");
    } catch (err: any) {
      console.error('Audit failed:', err);
      setError(err.message || 'CRITICAL SYSTEM FAILURE: AUDIT ABORTED.');
      addLog("ERROR: AUDIT SEQUENCE TERMINATED UNEXPECTEDLY.");
    } finally {
      setIsAuditing(false);
    }
  };

  const activeCategory = report?.categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="h-screen flex flex-col bg-grid">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-mono text-xs font-bold tracking-widest uppercase">FDS <span className="text-blue-500">SiteAudit 1.0</span></h1>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-tighter">System Terminal v2.4.0</p>
          </div>
        </div>

        <form onSubmit={runAudit} className="flex-1 max-w-xl mx-8 relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Terminal className="w-3.5 h-3.5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="root@webaudit:~# scan --target <url>"
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-1.5 pl-9 pr-24 text-xs font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-zinc-700"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isAuditing}
          />
          <button 
            type="submit"
            disabled={isAuditing || !url}
            className="absolute right-1 top-1 bottom-1 bg-zinc-800 text-zinc-300 text-[9px] font-bold uppercase px-3 rounded hover:bg-zinc-700 disabled:opacity-30 transition-all flex items-center gap-2"
          >
            {isAuditing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Execute
          </button>
        </form>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSuperUser(!isSuperUser)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] font-mono transition-all",
              isSuperUser 
                ? "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Shield className={cn("w-3.5 h-3.5", isSuperUser && "animate-pulse")} />
            {isSuperUser ? "SUPER_USER: ON" : "SUPER_USER: OFF"}
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-zinc-400 uppercase">Engine:</span>
            <span className="text-white">Gemini-3-Flash</span>
          </div>
          {githubUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono">
                <img src={githubUser.avatar_url} alt="GitHub Avatar" className="w-4 h-4 rounded-full" />
                <span className="text-white">{githubUser.login}</span>
                <button onClick={() => { setGithubToken(null); setGithubUser(null); }} className="ml-2 text-zinc-500 hover:text-red-500" title="Disconnect">
                  <Minus className="w-3 h-3" />
                </button>
              </div>
              <button 
                onClick={handleExportRepo}
                disabled={isExportingRepo}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-[10px] font-bold uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {isExportingRepo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                {isExportingRepo ? 'Pushing...' : 'Push to GitHub'}
              </button>
            </div>
          ) : (
            <button 
              onClick={handleConnectGithub}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono hover:bg-zinc-800 transition-all text-zinc-300"
            >
              <Github className="w-3.5 h-3.5" />
              Connect GitHub
            </button>
          )}
          <Settings className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white transition-colors" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Navigation */}
        <aside className="w-16 border-r border-zinc-800 bg-zinc-950 flex flex-col items-center py-6 gap-6">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn("p-2 rounded-lg transition-all", activeTab === 'overview' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-zinc-600 hover:text-zinc-300")}
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={cn("p-2 rounded-lg transition-all", activeTab === 'details' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-zinc-600 hover:text-zinc-300")}
          >
            <Database className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('author')}
            className={cn("p-2 rounded-lg transition-all", activeTab === 'author' ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20" : "text-zinc-600 hover:text-zinc-300")}
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('terminal')}
            className={cn("p-2 rounded-lg transition-all", activeTab === 'terminal' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-zinc-600 hover:text-zinc-300")}
          >
            <Terminal className="w-5 h-5" />
          </button>
          <div className="mt-auto flex flex-col gap-6">
            <History className="w-5 h-5 text-zinc-700 cursor-pointer hover:text-zinc-400" />
            <Lock className="w-5 h-5 text-zinc-700 cursor-pointer hover:text-zinc-400" />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {isAuditing && <div className="scan-line" />}

          <AnimatePresence mode="wait">
            {!report && !isAuditing && !error && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-12"
              >
                <div className="w-24 h-24 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center mb-8 animate-[spin_10s_linear_infinite]">
                  <Globe className="w-10 h-10 text-zinc-800" />
                </div>
                <h2 className="text-3xl font-mono font-bold tracking-tighter mb-4 uppercase">System Idle</h2>
                <p className="text-zinc-500 font-mono text-sm max-w-md text-center leading-relaxed">
                  Awaiting target URL input. FDS SiteAudit 1.0 will perform a deep-scan across SEO, Security, UX, and Performance layers.
                </p>
                <div className="mt-12 grid grid-cols-4 gap-4 w-full max-w-4xl">
                  {CATEGORY_METADATA.map(cat => (
                    <div key={cat.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                      <cat.icon className="w-4 h-4 text-blue-500 mb-3" />
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 mb-1">{cat.name}</h3>
                      <p className="text-[9px] text-zinc-600 leading-tight">{cat.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {error && !isAuditing && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-12"
              >
                <div className="w-24 h-24 border-2 border-dashed border-red-500/50 rounded-full flex items-center justify-center mb-8 bg-red-500/10">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-mono font-bold tracking-tighter mb-4 uppercase text-red-500">System Error</h2>
                <p className="text-zinc-400 font-mono text-sm max-w-md text-center leading-relaxed mb-8">
                  {error}
                </p>
                <button 
                  onClick={() => setError(null)}
                  className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs uppercase tracking-widest hover:bg-zinc-800 transition-colors"
                >
                  Acknowledge & Reset
                </button>
              </motion.div>
            )}

            {isAuditing && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col p-8"
              >
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 mb-12">
                    <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                    <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-4 border border-zinc-800 rounded-full flex items-center justify-center">
                      <Cpu className="w-12 h-12 text-blue-500 animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-mono font-bold tracking-tighter mb-2 uppercase animate-pulse">Scanning Target...</h2>
                  <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">{url}</p>
                </div>
                
                {/* Terminal Output */}
                <div className="h-48 bg-black/50 border border-zinc-800 rounded p-4 font-mono text-[10px] overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-zinc-600 mr-2">{log.split(']')[0]}]</span>
                      <span className={cn(log.includes('ERROR') ? 'text-red-500' : 'text-blue-400')}>{log.split(']')[1]}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </motion.div>
            )}

            {report && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex-1 flex flex-col h-full"
              >
                {/* Dashboard Header */}
                <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <ScoreCircle score={report.overallScore} size="lg" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold tracking-tight">{report.url}</h2>
                        <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-blue-500 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3" /> Scanned: {new Date(report.timestamp).toLocaleTimeString()}</span>
                        <span className="flex items-center gap-1.5"><Database className="w-3 h-3" /> Framework: {report.technicalSpecs.framework}</span>
                        <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Server: {report.technicalSpecs.serverLocation}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {shareLink && (
                      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400">
                        <span className="truncate max-w-[150px]">{shareLink}</span>
                      </div>
                    )}
                    <button 
                      onClick={downloadPDF}
                      disabled={isExporting}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold uppercase hover:bg-zinc-800 transition-all disabled:opacity-50"
                    >
                      {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                    <button 
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-[10px] font-bold uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share Report
                    </button>
                  </div>
                </div>

                {/* Sub-Navigation */}
                <div className="flex border-b border-zinc-800 bg-zinc-950/30">
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={cn("px-6 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all", activeTab === 'overview' ? "border-blue-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300")}
                  >
                    Executive Summary
                  </button>
                  <button 
                    onClick={() => setActiveTab('details')}
                    className={cn("px-6 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all", activeTab === 'details' ? "border-blue-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300")}
                  >
                    Technical Breakdown
                  </button>
                  <button 
                    onClick={() => setActiveTab('author')}
                    className={cn("px-6 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all", activeTab === 'author' ? "border-amber-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300")}
                  >
                    Solution Center
                  </button>
                  <button 
                    onClick={() => setActiveTab('terminal')}
                    className={cn("px-6 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all", activeTab === 'terminal' ? "border-blue-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300")}
                  >
                    Raw Analysis Logs
                  </button>
                </div>

                <div id="audit-report-content" className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'overview' && (
                    <div className="max-w-4xl mx-auto space-y-8">
                      {/* Summary Card */}
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Activity className="w-32 h-32" />
                        </div>
                        <h3 className="text-xs font-bold text-blue-500 uppercase tracking-[0.2em] mb-4">Audit Summary</h3>
                        <div className="markdown-body relative z-10">
                          <Markdown>{report.summary}</Markdown>
                        </div>
                      </div>

                      {/* Technical Specs Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Load Time</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.loadTime}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Page Size</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.pageSize}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Requests</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.requestCount}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Server Type</div>
                          <div className="text-lg font-mono text-zinc-200 truncate" title={report.technicalSpecs.serverType}>{report.technicalSpecs.serverType}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Platform</div>
                          <div className="text-lg font-mono text-zinc-200 truncate" title={report.technicalSpecs.platform}>{report.technicalSpecs.platform} {report.technicalSpecs.platformVersion}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Framework</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.framework}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">IP Address</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.ipAddress}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Location</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.serverLocation}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Responsiveness</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.responsivenessScore}/100</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">HTTP Version</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.httpVersion}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Compression</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.compression}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">CDN Provider</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.cdn}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">DNS Provider</div>
                          <div className="text-lg font-mono text-zinc-200">{report.technicalSpecs.dnsProvider}</div>
                        </div>
                        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg col-span-2">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Security Headers</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {report.technicalSpecs.securityHeaders.map((header, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9px] font-mono text-zinc-400">{header}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Security & Health + Performance Vitals Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                          <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" /> Security & Privacy Health
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">Malware Status</div>
                              <div className={cn(
                                "text-xs font-bold font-mono",
                                report.securityHealth.malwareStatus.toLowerCase().includes('clean') ? "text-emerald-500" : "text-red-500"
                              )}>{report.securityHealth.malwareStatus}</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">Blacklist Check</div>
                              <div className={cn(
                                "text-xs font-bold font-mono",
                                report.securityHealth.blacklistStatus.toLowerCase().includes('clear') ? "text-emerald-500" : "text-red-500"
                              )}>{report.securityHealth.blacklistStatus}</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">Privacy Score</div>
                              <div className="text-xs font-bold font-mono text-zinc-200">{report.securityHealth.privacyScore}/100</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">SSL Strength</div>
                              <div className="text-xs font-bold font-mono text-zinc-200">{report.securityHealth.sslStrength}</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">WAF/Firewall</div>
                              <div className="text-xs font-bold font-mono text-zinc-200">{report.securityHealth.firewallPresence ? 'DETECTED' : 'NOT DETECTED'}</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">Broken Links</div>
                              <div className={cn(
                                "text-xs font-bold font-mono",
                                report.securityHealth.brokenLinksCount === 0 ? "text-emerald-500" : "text-amber-500"
                              )}>{report.securityHealth.brokenLinksCount} Found</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                          <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" /> Performance Vitals
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">TTFB</div>
                              <div className="text-xs font-bold font-mono text-zinc-200">{report.performanceVitals.ttfb}</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">LCP</div>
                              <div className="text-xs font-bold font-mono text-zinc-200">{report.performanceVitals.lcp}</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">CLS</div>
                              <div className="text-xs font-bold font-mono text-zinc-200">{report.performanceVitals.cls}</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">FID</div>
                              <div className="text-xs font-bold font-mono text-zinc-200">{report.performanceVitals.fid}</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800 col-span-2">
                              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">Speed Index</div>
                              <div className="text-xs font-bold font-mono text-zinc-200">{report.performanceVitals.speedIndex}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Category Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {report.categories.map(cat => (
                          <div 
                            key={cat.id} 
                            onClick={() => { setSelectedCategoryId(cat.id); setActiveTab('details'); }}
                            className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-all">
                                  {CATEGORY_METADATA.find(m => m.id === cat.id)?.icon && React.createElement(CATEGORY_METADATA.find(m => m.id === cat.id)!.icon, { className: "w-5 h-5" })}
                                </div>
                                <h4 className="font-bold text-sm">{cat.name}</h4>
                              </div>
                              <ScoreCircle score={cat.score} size="sm" />
                            </div>
                            <div className="space-y-2">
                              {cat.checks.slice(0, 3).map((check, i) => (
                                <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-zinc-500 truncate mr-4">{check.name}</span>
                                  <StatusIcon status={check.status} />
                                </div>
                              ))}
                              {cat.checks.length > 3 && (
                                <div className="text-[9px] text-blue-500 font-bold uppercase mt-2">+ {cat.checks.length - 3} more checks</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div className="flex h-full gap-6">
                      {/* Category Selector */}
                      <div className="w-64 flex flex-col gap-2">
                        {report.categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left",
                              selectedCategoryId === cat.id 
                                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" 
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {CATEGORY_METADATA.find(m => m.id === cat.id)?.icon && React.createElement(CATEGORY_METADATA.find(m => m.id === cat.id)!.icon, { className: "w-4 h-4" })}
                              <span className="text-[10px] font-bold uppercase tracking-wider">{cat.name}</span>
                            </div>
                            <span className="text-[10px] font-mono">{cat.score}</span>
                          </button>
                        ))}
                        
                        <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <h5 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Technical Specs</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-600">Server</span>
                              <span className="text-zinc-300 truncate ml-2" title={report.technicalSpecs.serverType}>{report.technicalSpecs.serverType}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-600">Platform</span>
                              <span className="text-zinc-300">{report.technicalSpecs.platform}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-600">IP Addr</span>
                              <span className="text-zinc-300">{report.technicalSpecs.ipAddress}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-600">Responsive</span>
                              <span className="text-zinc-300">{report.technicalSpecs.responsivenessScore}/100</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono border-t border-zinc-800 pt-2 mt-2">
                              <span className="text-zinc-600">Load Time</span>
                              <span className="text-zinc-300">{report.technicalSpecs.loadTime}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-600">Page Size</span>
                              <span className="text-zinc-300">{report.technicalSpecs.pageSize}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                          <h5 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Security & Health</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-600">Malware</span>
                              <span className={cn(
                                "px-1 rounded",
                                report.securityHealth.malwareStatus.toLowerCase().includes('clean') ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                              )}>{report.securityHealth.malwareStatus}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-600">Blacklist</span>
                              <span className={cn(
                                "px-1 rounded",
                                report.securityHealth.blacklistStatus.toLowerCase().includes('clear') ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                              )}>{report.securityHealth.blacklistStatus}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-600">Broken Links</span>
                              <span className={cn(
                                "px-1 rounded",
                                report.securityHealth.brokenLinksCount === 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                              )}>{report.securityHealth.brokenLinksCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Checks List */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold flex items-center gap-3">
                            {activeCategory?.name}
                            <span className="text-zinc-500 font-mono text-xs">[{activeCategory?.checks.length} Checks]</span>
                          </h3>
                          <div className="flex gap-4 text-[10px] font-mono">
                            <span className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 className="w-3 h-3" /> {activeCategory?.checks.filter(c => c.status === 'pass').length} Pass</span>
                            <span className="flex items-center gap-1.5 text-amber-500"><AlertCircle className="w-3 h-3" /> {activeCategory?.checks.filter(c => c.status === 'warning').length} Warning</span>
                            <span className="flex items-center gap-1.5 text-red-500"><AlertCircle className="w-3 h-3" /> {activeCategory?.checks.filter(c => c.status === 'fail').length} Fail</span>
                          </div>
                        </div>

                        {selectedCategoryId === 'seo' && report.seoAnalysis && (
                          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                              <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                <Globe className="w-3 h-3" /> Core Meta
                              </h4>
                              <div className="space-y-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] text-zinc-500 uppercase font-mono">Title</span>
                                  <span className="text-xs text-zinc-200 line-clamp-2">{report.seoAnalysis.title}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] text-zinc-500 uppercase font-mono">Description</span>
                                  <span className="text-xs text-zinc-400 line-clamp-3">{report.seoAnalysis.metaDescription}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-mono">
                                  <span className="text-zinc-500">Canonical</span>
                                  <span className={cn("px-1.5 py-0.5 rounded", report.seoAnalysis.canonical ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                                    {report.seoAnalysis.canonical ? 'PRESENT' : 'MISSING'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                              <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                <Layout className="w-3 h-3" /> Structure & Content
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                                  <div className="text-[8px] text-zinc-500 uppercase font-mono">Headings</div>
                                  <div className="flex gap-1 mt-1">
                                    {Object.entries(report.seoAnalysis.headings).map(([k, v]) => (
                                      <div key={k} className="flex flex-col items-center">
                                        <span className="text-[7px] text-zinc-600 uppercase">{k}</span>
                                        <span className="text-[10px] text-zinc-300">{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                                  <div className="text-[8px] text-zinc-500 uppercase font-mono">Images Alt</div>
                                  <div className="text-[10px] text-zinc-300 mt-1">
                                    {report.seoAnalysis.imageAltTags.total} Total / {report.seoAnalysis.imageAltTags.missing} Missing
                                  </div>
                                </div>
                                <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                                  <div className="text-[8px] text-zinc-500 uppercase font-mono">HTML Ratio</div>
                                  <div className="text-[10px] text-zinc-300 mt-1">{report.seoAnalysis.htmlRatio}</div>
                                </div>
                                <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                                  <div className="text-[8px] text-zinc-500 uppercase font-mono">Language</div>
                                  <div className="text-[10px] text-zinc-300 mt-1">{report.seoAnalysis.language}</div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                              <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" /> Technical & Social
                              </h4>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {[
                                  { label: 'Robots.txt', val: report.seoAnalysis.robotsTxt },
                                  { label: 'Sitemap', val: report.seoAnalysis.xmlSitemaps },
                                  { label: 'Open Graph', val: report.seoAnalysis.openGraph },
                                  { label: 'Twitter Card', val: report.seoAnalysis.twitterCard },
                                  { label: 'Analytics', val: report.seoAnalysis.googleAnalytics },
                                  { label: 'Favicon', val: report.seoAnalysis.favicon },
                                  { label: 'Frames', val: report.seoAnalysis.frames, invert: true },
                                  { label: 'Flash', val: report.seoAnalysis.flash, invert: true },
                                ].map(item => (
                                  <div key={item.label} className="flex justify-between items-center text-[9px] font-mono">
                                    <span className="text-zinc-500">{item.label}</span>
                                    <span className={cn(
                                      "w-2 h-2 rounded-full",
                                      item.invert 
                                        ? (item.val ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" : "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]")
                                        : (item.val ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-zinc-700")
                                    )} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {activeCategory?.checks.map((check, i) => (
                          <motion.div 
                            key={check.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden"
                          >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/30">
                              <div className="flex items-center gap-3">
                                <StatusIcon status={check.status} />
                                <h4 className="font-bold text-sm">{check.name}</h4>
                                <SeverityBadge severity={check.severity} />
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-[10px] font-mono text-zinc-500">Score: <span className={cn(check.score >= 90 ? 'text-emerald-500' : 'text-amber-500')}>{check.score}/100</span></div>
                                <ChevronRight className="w-4 h-4 text-zinc-700" />
                              </div>
                            </div>
                            <div className="p-6 grid md:grid-cols-2 gap-8">
                              <div>
                                <h5 className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Observation</h5>
                                <p className="text-xs text-zinc-400 leading-relaxed">{check.finding}</p>
                              </div>
                              <div className="space-y-4">
                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
                                  <h5 className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Zap className="w-3 h-3" />
                                    Resolution Path
                                  </h5>
                                  <p className="text-xs text-zinc-300 font-medium leading-relaxed">{check.recommendation}</p>
                                </div>

                                {isSuperUser && check.solution && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-4 overflow-hidden"
                                  >
                                    <div className="flex items-center gap-2 text-amber-500">
                                      <Shield className="w-4 h-4" />
                                      <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Solution Insight: Super User Mode</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800">
                                        <div className="text-[8px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Impact</div>
                                        <div className="text-[10px] text-zinc-300">{check.solution.impactAnalysis}</div>
                                      </div>
                                      <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800">
                                        <div className="text-[8px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Effort</div>
                                        <div className={cn(
                                          "text-[10px] font-bold uppercase font-mono",
                                          check.solution.effortLevel === 'low' ? 'text-emerald-500' :
                                          check.solution.effortLevel === 'medium' ? 'text-amber-500' : 'text-rose-500'
                                        )}>
                                          {check.solution.effortLevel}
                                        </div>
                                      </div>
                                    </div>
 
                                    <div>
                                      <div className="text-[8px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Detailed Fix</div>
                                      <div className="text-xs text-zinc-300 prose prose-invert max-w-none prose-xs">
                                        <Markdown>{check.solution.detailedFix}</Markdown>
                                      </div>
                                    </div>
 
                                    {check.solution.codeSnippet && (
                                      <div>
                                        <div className="text-[8px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Implementation</div>
                                        <pre className="p-2 bg-black rounded border border-zinc-800 overflow-x-auto">
                                          <code className="text-[10px] font-mono text-emerald-400">
                                            {check.solution.codeSnippet}
                                          </code>
                                        </pre>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'author' && (
                    <div className="max-w-5xl mx-auto space-y-6">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-2xl font-bold text-amber-500 flex items-center gap-3">
                            <ShieldAlert className="w-6 h-6" />
                            Solution Center
                          </h2>
                          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-1">Super User: Authoritative Fix Briefing</p>
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={downloadPDF}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all text-xs font-bold disabled:opacity-50"
                          >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            {isExporting ? 'EXPORTING...' : 'DOWNLOAD PDF REPORT'}
                          </button>
                          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                            <div className="text-[8px] text-zinc-500 uppercase font-mono">Critical Issues</div>
                            <div className="text-xl font-bold text-red-500">{report.categories.flatMap(c => c.checks).filter(c => c.severity === 'critical').length}</div>
                          </div>
                          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                            <div className="text-[8px] text-zinc-500 uppercase font-mono">High Priority</div>
                            <div className="text-xl font-bold text-orange-500">{report.categories.flatMap(c => c.checks).filter(c => c.severity === 'high').length}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {report.categories.flatMap(c => c.checks)
                          .filter(c => c.status !== 'pass')
                          .sort((a, b) => {
                            const order = { critical: 0, high: 1, medium: 2, low: 3 };
                            return order[a.severity] - order[b.severity];
                          })
                          .map((check, idx) => (
                            <motion.div 
                              key={check.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden"
                            >
                              <div className="px-6 py-3 bg-zinc-950/50 border-b border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <SeverityBadge severity={check.severity} />
                                  <span className="text-sm font-bold text-zinc-200">{check.name}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500">ID: {check.id}</span>
                              </div>
                              <div className="p-6 space-y-6">
                                <div className="grid md:grid-cols-3 gap-6">
                                  <div className="col-span-2 space-y-4">
                                    <div>
                                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-2 font-mono">Technical Briefing</div>
                                      <div className="text-sm text-zinc-300 leading-relaxed">{check.finding}</div>
                                    </div>
                                    <div>
                                      <div className="text-[9px] uppercase tracking-wider text-amber-500 mb-2 font-mono">Solution Path</div>
                                      <div className="text-sm text-zinc-200 prose prose-invert max-w-none prose-sm bg-amber-500/5 p-4 rounded-lg border border-amber-500/10">
                                        <Markdown>{check.solution?.detailedFix || check.recommendation}</Markdown>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-3 font-mono">Impact Analysis</div>
                                      <p className="text-xs text-zinc-400 leading-relaxed italic">"{check.solution?.impactAnalysis || 'Standard impact on system performance and security.'}"</p>
                                    </div>
                                    <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-3 font-mono">Effort Assessment</div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                          <div className={cn(
                                            "h-full rounded-full",
                                            check.solution?.effortLevel === 'low' ? 'w-1/3 bg-emerald-500' :
                                            check.solution?.effortLevel === 'medium' ? 'w-2/3 bg-amber-500' : 'w-full bg-rose-500'
                                          )} />
                                        </div>
                                        <span className="text-[10px] font-mono uppercase text-zinc-500">{check.solution?.effortLevel || 'medium'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
 
                                {check.solution?.codeSnippet && (
                                  <div className="space-y-2">
                                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Implementation Reference</div>
                                    <pre className="p-4 bg-black rounded-lg border border-zinc-800 overflow-x-auto">
                                      <code className="text-xs font-mono text-emerald-400">
                                        {check.solution.codeSnippet}
                                      </code>
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'terminal' && (
                    <div className="h-full bg-black rounded-xl border border-zinc-800 p-6 font-mono text-xs overflow-y-auto">
                      <div className="text-emerald-500 mb-4">FDS SiteAudit 1.0 [Version 2.4.0.112]</div>
                      <div className="text-zinc-500 mb-6">Target: {report.url} | Session ID: {Math.random().toString(36).substring(7).toUpperCase()}</div>
                      
                      {report.categories.map(cat => (
                        <div key={cat.id} className="mb-8">
                          <div className="text-blue-500 mb-2 uppercase tracking-widest font-bold">--- {cat.name} Analysis ---</div>
                          {cat.checks.map(check => (
                            <div key={check.id} className="mb-3 pl-4 border-l border-zinc-800">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  check.status === 'pass' ? 'text-emerald-500' : 
                                  check.status === 'fail' ? 'text-red-500' : 'text-amber-500'
                                )}>[{check.status.toUpperCase()}]</span>
                                <span className="text-white">{check.name}</span>
                                <span className="text-zinc-700">({check.severity})</span>
                              </div>
                              <div className="text-zinc-500 pl-4 italic">// {check.finding}</div>
                              <div className="text-blue-400/60 pl-4"># Recommendation: {check.recommendation}</div>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="text-emerald-500 mt-8 animate-pulse">_ SCAN COMPLETE. SYSTEM READY.</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-8 border-t border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span>System: Operational</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3" />
            <span>CPU: 12%</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3" />
            <span>Memory: 4.2GB / 16GB</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span>Encrypted Session: AES-256</span>
          <span className="text-zinc-400">UTC: {new Date().toISOString()}</span>
        </div>
      </footer>
    </div>
  );
}
