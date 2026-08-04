import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useModuleAccess } from "@/hooks/useWorkspacePermission";
import {
  AGENT_LIST, getAgent, extractApprovalDraft, type AgentDef, type AgentDomain,
} from "@/lib/agent-config";
import {
  Send, Bot, User, Loader2, Crown, FolderKanban, Briefcase, DollarSign, Database, InboxIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; sources?: string[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const AGENT_ICONS: Record<AgentDomain, React.ElementType> = {
  chief_of_staff: Crown,
  projects: FolderKanban,
  revenue: Briefcase,
  finance: DollarSign,
};

async function streamChat({
  message, history, domain, token, onSources, onDelta, onDone,
}: {
  message: string; history: Msg[]; domain: AgentDomain; token: string;
  onSources: (sources: string[]) => void;
  onDelta: (text: string) => void; onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      message,
      domain,
      history: history.map(({ role, content }) => ({ role, content })),
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Error ${resp.status}`);
  }

  const rawSources = resp.headers.get("x-agent-sources");
  if (rawSources) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawSources));
      if (Array.isArray(parsed)) onSources(parsed as string[]);
    } catch { /* header optional */ }
  }

  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  onDone();
}

export default function AiChat() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const agent = getAgent(params.get("agent"));
  const initialQuery = params.get("q") ?? "";
  const setAgent = (d: AgentDomain) => {
    setParams((p) => { p.set("agent", d); p.delete("q"); return p; }, { replace: true });
  };
  return (
    <AppLayout>
      <div className="p-4 lg:p-6">
        <ChatInterface
          key={agent.domain + ":" + initialQuery}
          token={session?.access_token ?? ""}
          agent={agent}
          onAgentChange={setAgent}
          initialQuery={initialQuery}
          onConsumedInitialQuery={() =>
            setParams((p) => { p.delete("q"); return p; }, { replace: true })
          }
        />
      </div>
    </AppLayout>
  );
}

function ChatInterface({
  token, agent, onAgentChange, initialQuery, onConsumedInitialQuery,
}: {
  token: string; agent: AgentDef; onAgentChange: (d: AgentDomain) => void;
  initialQuery?: string; onConsumedInitialQuery?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { allowed: financeAllowed } = useModuleAccess("finance", "view");
  const { user } = useAuth();
  const [inboxBusy, setInboxBusy] = useState<number | null>(null);

  const sendToInbox = async (msgIndex: number, content: string) => {
    setInboxBusy(msgIndex);
    try {
      const draft = extractApprovalDraft(content);
      const { error } = await supabase.from("approvals").insert({
        title: `[${agent.label} Agent] ${draft.title}`,
        summary: draft.summary,
        kind: "general",
        requested_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Öneri Founder Inbox'a onay talebi olarak eklendi");
    } catch (e) {
      toast.error("Inbox'a eklenemedi: " + (e instanceof Error ? e.message : ""));
    } finally {
      setInboxBusy(null);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Auto-send an initial query from ?q= (e.g. a domain agent quick-task link)
  useEffect(() => {
    if (initialQuery && messages.length === 0 && !isLoading) {
      void send(initialQuery);
      onConsumedInitialQuery?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    let pendingSources: string[] | undefined;
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar, sources: pendingSources } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar, sources: pendingSources }];
      });
    };

    try {
      await streamChat({
        message: text,
        history: messages,
        domain: agent.domain,
        token,
        onSources: (s) => { pendingSources = s; },
        onDelta: upsert,
        onDone: () => setIsLoading(false),
      });
    } catch (e) {
      setIsLoading(false);
      toast.error(e instanceof Error ? e.message : "Failed to get response");
    }
    inputRef.current?.focus();
  };

  const AgentIcon = AGENT_ICONS[agent.domain];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {AGENT_LIST.map((a) => {
          const Icon = AGENT_ICONS[a.domain];
          const locked = a.requiresFinanceAccess && !financeAllowed;
          return (
            <Button
              key={a.domain}
              variant={a.domain === agent.domain ? "default" : "outline"}
              size="sm"
              disabled={locked}
              title={locked ? "Finans yetkisi gerekiyor" : a.description}
              onClick={() => onAgentChange(a.domain)}
            >
              <Icon className="mr-1.5 h-4 w-4" /> {a.label}
            </Button>
          );
        })}
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <AgentIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{agent.title}</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {agent.description}
                </p>
              </div>
              <div className="flex max-w-xl flex-wrap justify-center gap-2">
                {agent.suggestedPrompts.map((p) => (
                  <Button key={p} variant="outline" size="sm" className="h-auto whitespace-normal py-1.5 text-xs"
                    onClick={() => send(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div className={`max-w-[90%] rounded-lg px-3 py-2.5 text-sm sm:max-w-[80%] sm:px-4 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {msg.role === "assistant" ? (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border/50 pt-2">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        {msg.sources.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] font-normal">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {!isLoading && msg.content.length > 0 && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          disabled={inboxBusy === i}
                          onClick={() => sendToInbox(i, msg.content)}
                          title="Bu öneriyi onay talebi olarak Founder Inbox'a gönder — onaylandığında otomatik karar kaydına dönüşür"
                        >
                          {inboxBusy === i
                            ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            : <InboxIcon className="mr-1 h-3 w-3" />}
                          Inbox'a Taşı
                        </Button>
                      </div>
                    )}
                  </>
                ) : msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-lg bg-muted px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin" /></div>
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              placeholder={`${agent.label} ajanına sor...`} disabled={isLoading} className="flex-1" />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
