import { useState } from 'react';
import {
  ChevronRight, ChevronDown, Plus, SlidersHorizontal, AlertCircle,
  Search, MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

// ---------- data types ----------

type AgentCategory = 'research' | 'voice' | 'marketing';

type SubAgent = {
  id: string;
  initials: string;
  name: string;
  description: string;
  color: string;
};

type Agent = {
  id: string;
  initials: string;
  name: string;
  description: string;
  color: string;
  category: AgentCategory;
  children?: SubAgent[];
  badge?: string;
  taskCondition?: {
    status: string;
    affected: string;
    creditUsage: string;
    actionRequired: string;
  };
};

// ---------- demo data ----------

const AGENTS: Agent[] = [
  {
    id: '1',
    initials: 'A',
    name: 'Academic Research Assistant',
    description: 'Scientific literature review and analysis',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    category: 'research',
  },
  {
    id: '2',
    initials: 'S',
    name: 'Survey Analyzer Pro',
    description: 'Process and analyze survey responses',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    category: 'research',
    badge: '🍕',
    children: [
      { id: '2a', initials: 'SA', name: 'Sentiment Analyzer', description: 'Emotional response classification', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
      { id: '2b', initials: 'DS', name: 'Data Standardization', description: 'Data Cleaner & Normalizer', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
      { id: '2c', initials: 'PRE', name: 'Pattern Recognition Engine', description: 'Trend identification and clustering', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
    ],
    taskCondition: {
      status: 'Task failed',
      affected: '23 tasks',
      creditUsage: '4,100/5000',
      actionRequired: 'Update API key',
    },
  },
  {
    id: '3',
    initials: 'T',
    name: 'Trend Scout',
    description: 'Identify emerging market trends',
    color: 'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-400',
    category: 'research',
  },
  {
    id: '4',
    initials: 'I',
    name: 'Industry Analyst',
    description: 'Deep-dive industry analysis',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    category: 'research',
  },
  {
    id: '5',
    initials: 'A',
    name: 'Tech Trend Analyzer',
    description: 'Technology market research',
    color: 'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-400',
    category: 'research',
  },
  {
    id: '6',
    initials: 'S',
    name: 'Innovation Scout',
    description: 'Track innovative solutions and startups',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    category: 'research',
  },
  {
    id: '7',
    initials: 'S',
    name: 'Data Synthesis Pro',
    description: 'Combine and analyze multiple data sources',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    category: 'research',
  },
  {
    id: '8',
    initials: 'F',
    name: 'Focus Group Analyzer',
    description: 'Process focus group feedback',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    category: 'research',
  },
  {
    id: '9',
    initials: 'N',
    name: 'Niche Market Explorer',
    description: 'Analyze specialized market opportunities',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    category: 'research',
  },
  {
    id: '10',
    initials: 'L',
    name: 'Research Lab Assistant',
    description: 'Support experimental research design and analysis',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
    category: 'research',
  },
  {
    id: '11',
    initials: 'T',
    name: 'Digital Trends Observer',
    description: 'Monitor and analyze digital technologies',
    color: 'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-400',
    category: 'research',
  },
  {
    id: '12',
    initials: 'C',
    name: 'Cross-Market Correlator',
    description: 'Patterns across different market segments',
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
    category: 'research',
  },
  {
    id: '13',
    initials: 'F',
    name: 'Forecast Builder',
    description: 'Generate predictive models and future market projections',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    category: 'research',
  },
  // Voice agents
  {
    id: 'v1',
    initials: 'V',
    name: 'Voice Transcriber',
    description: 'Real-time speech-to-text conversion',
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
    category: 'voice',
  },
  {
    id: 'v2',
    initials: 'C',
    name: 'Call Summarizer',
    description: 'Automatic meeting and call summaries',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    category: 'voice',
  },
  // Marketing agents
  {
    id: 'm1',
    initials: 'C',
    name: 'Content Generator',
    description: 'AI-powered marketing copy generation',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
    category: 'marketing',
  },
  {
    id: 'm2',
    initials: 'S',
    name: 'SEO Optimizer',
    description: 'Search engine optimization analysis',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    category: 'marketing',
  },
];

const TABS: { key: AgentCategory; label: string; icon: string }[] = [
  { key: 'research', label: 'Research', icon: '📋' },
  { key: 'voice', label: 'Voice', icon: '🎙️' },
  { key: 'marketing', label: 'Marketing', icon: '▶️' },
];

// ---------- components ----------

function InitialsBadge({ initials, color, size = 'md' }: { initials: string; color: string; size?: 'md' | 'sm' }) {
  return (
    <span className={cn(
      'inline-flex items-center justify-center rounded font-semibold shrink-0 select-none',
      size === 'md' ? 'h-7 min-w-7 px-1 text-[11px]' : 'h-5 min-w-5 px-0.5 text-[9px]',
      color,
    )}>
      {initials}
    </span>
  );
}

function TaskConditionPopover({ condition }: { condition: NonNullable<Agent['taskCondition']> }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-destructive hover:text-destructive/80 transition-colors" title="Task conditions">
          <AlertCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" side="left" align="start">
        <div className="border-b border-border px-3 py-2.5 flex items-center gap-2">
          <span className="h-5 w-5 rounded bg-violet-600 text-white grid place-items-center text-[10px] font-bold">AI</span>
          <span className="text-[13px] font-semibold">Task conditions</span>
        </div>
        <div className="px-3 py-2 space-y-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-mono text-[12px] text-destructive font-medium">{condition.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Affected</span>
            <span className="font-mono text-[12px] font-medium">{condition.affected}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credit usage</span>
            <span className="font-mono text-[12px] font-medium">{condition.creditUsage}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Action required</span>
            <span className="font-mono text-[12px] text-primary font-medium">{condition.actionRequired}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AgentRow({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false);
  const hasChildren = agent.children && agent.children.length > 0;

  return (
    <>
      <tr
        className={cn(
          'group border-b border-border/50 transition-colors hover:bg-muted/30',
          open && 'bg-muted/20',
        )}
      >
        <td className="w-10 pl-3 pr-0 py-2.5">
          {hasChildren ? (
            <button
              onClick={() => setOpen(o => !o)}
              className="grid h-5 w-5 place-items-center rounded hover:bg-muted transition-colors"
            >
              {open
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </button>
          ) : (
            <span className="grid h-5 w-5 place-items-center">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            </span>
          )}
        </td>
        <td className="py-2.5 pr-3">
          <div className="flex items-center gap-2.5">
            <InitialsBadge initials={agent.initials} color={agent.color} />
            <span className="text-[13.5px] font-medium text-foreground">{agent.name}</span>
            {agent.badge && <span className="text-sm">{agent.badge}</span>}
            {agent.taskCondition && <TaskConditionPopover condition={agent.taskCondition} />}
          </div>
        </td>
        <td className="py-2.5 pr-3 text-[13px] text-muted-foreground">{agent.description}</td>
        <td className="w-10 pr-3 py-2.5">
          <button className="opacity-0 group-hover:opacity-100 transition-opacity grid h-6 w-6 place-items-center rounded hover:bg-muted">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </td>
      </tr>

      {open && agent.children?.map(child => (
        <tr key={child.id} className="border-b border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
          <td className="pl-3 pr-0 py-2" />
          <td className="py-2 pr-3">
            <div className="flex items-center gap-2.5 pl-8">
              <span className="text-muted-foreground/40 mr-[-4px]">↳</span>
              <InitialsBadge initials={child.initials} color={child.color} size="sm" />
              <span className="text-[13px] text-foreground">{child.name}</span>
            </div>
          </td>
          <td className="py-2 pr-3 text-[12.5px] text-muted-foreground">{child.description}</td>
          <td className="pr-3 py-2" />
        </tr>
      ))}
    </>
  );
}

// ---------- page ----------

export default function AgentRuns() {
  const [activeTab, setActiveTab] = useState<AgentCategory>('research');
  const [search, setSearch] = useState('');

  const filtered = AGENTS
    .filter(a => a.category === activeTab)
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[18px] font-semibold tracking-tight flex items-center gap-2">
            Agents
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </h1>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        </div>

        {/* Tabs + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                <span className="text-[12px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pb-1">
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[12px]">
              <Plus className="h-3 w-3" /> Add
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[12px]">
              <SlidersHorizontal className="h-3 w-3" /> Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-10 pl-3 pr-0 py-2" />
              <th className="text-left py-2 pr-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</th>
              <th className="text-left py-2 pr-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Description</th>
              <th className="w-10 pr-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(agent => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-16 text-center text-[13px] text-muted-foreground">
                  No agents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
