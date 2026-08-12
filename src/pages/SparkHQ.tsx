import { useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";

const SPARK_HQ_CSS = `
.shq{--bg:#17171A;--shell:#0E0E10;--panel:#1C1C1F;--card:#232327;--hover:#2A2A2F;--float:#2E2E33;
  --border:rgba(255,255,255,.06);--border-hi:rgba(255,255,255,.12);
  --ink:#F5F5F7;--muted:#A8A8B0;--dim:#6B6B75;
  --lime:#C6F432;--lime-soft:rgba(198,244,50,.10);--lime-mid:rgba(198,244,50,.20);--lime-glow:rgba(198,244,50,.06);
  --ok:#4ADE80;--ok-soft:rgba(74,222,128,.12);
  --warn:#FBBF24;--warn-soft:rgba(251,191,36,.12);
  --risk:#FF6B5E;--risk-soft:rgba(255,107,94,.12);
  --elev1:0 1px 0 0 rgba(255,255,255,.02) inset,0 1px 2px 0 rgba(10,10,14,.5),0 8px 24px -8px rgba(10,10,14,.4);
  --elev2:0 1px 0 0 rgba(255,255,255,.03) inset,0 2px 6px -1px rgba(10,10,14,.6),0 24px 60px -16px rgba(10,10,14,.55);
  --radius:12px;--radius-sm:8px;--radius-xs:6px;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:13px;
  color:var(--ink);-webkit-font-smoothing:antialiased;
  display:flex;flex-direction:column;height:100%;overflow:hidden;letter-spacing:-.003em;position:relative}
.shq *,.shq *::before,.shq *::after{box-sizing:border-box;margin:0;padding:0}
.shq button{font:inherit;cursor:pointer;color:inherit}
.shq ::-webkit-scrollbar{width:5px}.shq ::-webkit-scrollbar-track{background:transparent}
.shq ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
.shq .topbar{height:44px;display:flex;align-items:center;gap:12px;padding:0 20px;
  background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;z-index:10}
.shq .brand{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;letter-spacing:-.02em;white-space:nowrap}
.shq .brand-mark{width:22px;height:22px;background:var(--lime);border-radius:6px;display:flex;align-items:center;
  justify-content:center;font-weight:800;font-size:12px;color:var(--shell)}
.shq .brand span{font-weight:400;color:var(--muted)}
.shq .crumbs{display:flex;align-items:center;gap:2px;flex:1;min-width:0;font-size:12.5px}
.shq .crumbs button{background:none;border:none;color:var(--muted);padding:4px 8px;border-radius:var(--radius-sm);transition:all .15s}
.shq .crumbs button:hover{background:var(--card);color:var(--ink)}
.shq .crumbs .cur{font-weight:600;color:var(--ink);padding:4px 8px}
.shq .crumbs .sep{color:var(--dim);font-size:11px;margin:0 1px}
.shq .mode-tabs{display:flex;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:3px;gap:2px}
.shq .mode-tabs button{border:none;background:none;font-size:12px;font-weight:600;color:var(--dim);
  padding:5px 12px;border-radius:var(--radius-sm);transition:all .15s}
.shq .mode-tabs button.on{background:var(--lime-soft);color:var(--lime)}
.shq .mode-tabs.hidden{visibility:hidden}
.shq #shqStage{flex:1;position:relative;min-height:0;overflow:hidden}
.shq .view{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center}
.shq .view.on{display:flex}
.shq .hq-hero{text-align:center;margin-bottom:12px}
.shq .hq-hero h2{font-size:22px;font-weight:700;letter-spacing:-.03em}
.shq .hq-hero p{font-size:13px;color:var(--muted);margin-top:4px}
.shq .hq-hero em{font-style:normal;color:var(--lime)}
.shq .pulse-strip{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;justify-content:center}
.shq .ps-item{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums}
.shq .ps-item b{font-weight:800;font-size:15px;color:var(--ink)}
.shq .ps-item.risk b{color:var(--risk)}.shq .ps-item.ok b{color:var(--ok)}
.shq .ps-dot{width:6px;height:6px;border-radius:50%}
.shq #hqBuilding{width:min(480px,92vw)}
.shq #hqBuilding svg{width:100%;height:auto}
.shq .bfloor{cursor:pointer}
.shq .bfloor .face-top{transition:fill .2s}
.shq .bfloor:hover .face-top{fill:#2A2A2F !important}
.shq .bfloor:hover .fl-glow{opacity:1 !important}
.shq .bf-name{font-size:13px;font-weight:700;fill:var(--ink);pointer-events:none;letter-spacing:-.01em}
.shq .bf-stat{font-size:10px;fill:var(--muted);pointer-events:none;font-weight:600}
.shq .bf-stat.risk{fill:var(--risk)}.shq .bf-stat.warn{fill:var(--warn)}.shq .bf-stat.ok{fill:var(--ok)}
.shq #floorView{padding:16px 24px 0;justify-content:flex-start;align-items:stretch}
.shq .floor-header{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.shq .floor-header h2{font-size:18px;font-weight:700;letter-spacing:-.02em}
.shq .floor-header .fh-sub{font-size:12px;color:var(--dim)}
.shq .plan-holder{flex:1;min-height:0;position:relative;overflow:auto;padding:16px 24px 80px;display:flex;align-items:flex-start;justify-content:center}
.shq .room-poly{fill:var(--card);stroke:rgba(255,255,255,.06);stroke-width:1;cursor:pointer;transition:fill .2s,stroke .2s}
.shq .room-g:hover .room-poly{fill:var(--hover);stroke:rgba(255,255,255,.1)}
.shq .room-g.sel .room-poly{stroke:var(--lime);stroke-width:1.6;fill:rgba(198,244,50,.04)}
.shq .pulse .room-poly.p-risk{fill:rgba(255,107,94,.08);stroke:rgba(255,107,94,.25)}
.shq .pulse .room-poly.p-warn{fill:rgba(251,191,36,.06);stroke:rgba(251,191,36,.2)}
.shq .pulse .room-poly.p-ok{fill:rgba(74,222,128,.05);stroke:rgba(74,222,128,.15)}
.shq .furn{fill:var(--panel);stroke:rgba(255,255,255,.04);stroke-width:.7;pointer-events:none}
.shq .person-dot{stroke-width:1.4;fill:var(--card);cursor:pointer;transition:fill .15s}
.shq .pd-ok{stroke:var(--ok)}.shq .pd-warn{stroke:var(--warn)}.shq .pd-risk{stroke:var(--risk)}
.shq .person-g:hover .person-dot{fill:var(--ink)}
.shq .p-init{font-size:3.6px;font-weight:800;fill:var(--ink);text-anchor:middle;pointer-events:none}
.shq .person-g:hover .p-init{fill:var(--shell)}
.shq .p-name{font-size:3.2px;fill:var(--muted);text-anchor:middle;pointer-events:none;opacity:0;transition:opacity .25s}
.shq svg.zoomed .p-name{opacity:1}
.shq .rcard{cursor:pointer;transition:opacity .2s}
.shq svg.zoomed .rcard.sel{opacity:0;pointer-events:none}
.shq .rcard rect{fill:var(--card);stroke:var(--border);stroke-width:.8;rx:6;ry:6}
.shq .rcard.sel rect{stroke:var(--lime);stroke-width:1.4}
.shq .rc-name{font-size:11px;font-weight:700;fill:var(--ink)}
.shq .rc-sub{font-size:9px;fill:var(--muted)}
.shq .rc-status{font-size:9px;font-weight:700;letter-spacing:.03em}
.shq .st-risk{fill:var(--risk)}.shq .st-warn{fill:var(--warn)}.shq .st-ok{fill:var(--ok)}
.shq .pulse .rcard rect,.shq .pulse .rc-sub,.shq .pulse .rc-status{display:none}
.shq .pulse .rc-name{font-size:10px}
.shq #shqTooltip{position:absolute;pointer-events:none;background:var(--float);border:1px solid var(--border-hi);
  border-radius:var(--radius-sm);padding:8px 12px;font-size:12px;box-shadow:var(--elev1);
  z-index:30;display:none;max-width:220px;white-space:nowrap}
.shq #shqTooltip .tt-name{font-weight:700;font-size:12.5px;margin-bottom:2px}
.shq #shqTooltip .tt-stat{font-size:11px;font-weight:700}
.shq #shqTooltip .tt-line{font-size:11px;color:var(--muted);margin-top:1px}
.shq #shqPopup{position:absolute;z-index:22;display:none;width:min(320px,88vw);
  background:var(--panel);border:1px solid var(--border-hi);border-radius:var(--radius);
  box-shadow:var(--elev2);overflow:hidden}
.shq #shqPopup.show{display:block}
.shq .pop-head{padding:14px 16px 0;position:relative}
.shq .pop-x{position:absolute;top:10px;right:10px;background:none;border:none;color:var(--dim);
  font-size:14px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;
  border-radius:var(--radius-xs);transition:all .15s}
.shq .pop-x:hover{background:var(--hover);color:var(--ink)}
.shq .pop-name{font-size:16px;font-weight:700;letter-spacing:-.02em}
.shq .pop-sub{font-size:11.5px;color:var(--dim);margin-top:1px}
.shq .pop-badge{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;
  padding:3px 10px;border-radius:99px;margin-top:8px}
.shq .pop-badge.ok{background:var(--ok-soft);color:var(--ok)}
.shq .pop-badge.warn{background:var(--warn-soft);color:var(--warn)}
.shq .pop-badge.risk{background:var(--risk-soft);color:var(--risk)}
.shq .pop-badge .bd{width:5px;height:5px;border-radius:50%;background:currentColor}
.shq .pop-body{padding:10px 16px 14px}
.shq .pop-mission{font-size:12.5px;font-weight:600;margin-bottom:6px}
.shq .pop-bar{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.shq .pop-bar .pb-track{flex:1;height:4px;background:var(--hover);border-radius:2px;overflow:hidden}
.shq .pop-bar .pb-track i{display:block;height:100%;border-radius:2px}
.shq .pop-bar .pb-pct{font-size:11px;font-weight:700;color:var(--dim);font-variant-numeric:tabular-nums;min-width:28px;text-align:right}
.shq .pop-wrong{background:var(--risk-soft);border-radius:var(--radius-xs);padding:6px 10px;margin-bottom:8px}
.shq .pop-wrong .pw-item{display:flex;gap:5px;font-size:11px;color:var(--risk);padding:1px 0;line-height:1.4}
.shq .pop-wrong .pw-item::before{content:'›';font-weight:800}
.shq .pop-people{display:flex;gap:0;margin-bottom:10px}
.shq .pop-av{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:8px;font-weight:800;color:#fff;border:2px solid var(--panel);margin-left:-4px;cursor:pointer;
  transition:transform .15s}
.shq .pop-av:first-child{margin-left:0}
.shq .pop-av:hover{transform:scale(1.15);z-index:1}
.shq .pop-meta{display:flex;gap:12px;font-size:11px;color:var(--dim);margin-bottom:10px;font-variant-numeric:tabular-nums}
.shq .pop-meta b{color:var(--ink);font-weight:700;margin-right:3px}
.shq .pop-meta .cb b{color:var(--risk)}
.shq .pop-foot{display:flex;gap:6px;padding:0 16px 14px}
.shq .btn-lime{background:var(--lime);color:var(--shell);border:none;border-radius:var(--radius-sm);
  padding:7px 14px;font-size:12px;font-weight:700;transition:background .15s,transform .1s}
.shq .btn-lime:hover{background:#d4ff4a}.shq .btn-lime:active{transform:scale(.97)}
.shq .btn-ghost{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);
  padding:7px 12px;font-size:12px;font-weight:600;color:var(--muted);transition:border-color .15s,color .15s}
.shq .btn-ghost:hover{border-color:var(--lime);color:var(--lime)}
.shq .pp-header{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.shq .pp-av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:14px;color:#fff}
.shq .pp-today{font-size:12px;color:var(--muted);margin-top:6px}
.shq .pp-sec{margin-top:10px}
.shq .pp-sec h6{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);font-weight:700;margin-bottom:5px}
.shq .pp-li{display:flex;gap:6px;align-items:flex-start;padding:3px 0;font-size:12px}
.shq .pp-li .ldot{width:5px;height:5px;border-radius:50%;margin-top:5px;flex-shrink:0}
.shq .pp-li .lmeta{color:var(--dim);font-size:10.5px;margin-top:1px}
.shq .goalline{display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px}
.shq .goalline .gbar{flex:1;max-width:80px;height:3px;background:var(--hover);border-radius:2px;overflow:hidden}
.shq .goalline .gbar i{display:block;height:100%;background:var(--lime)}
.shq .goalline .gp{margin-left:auto;font-weight:700;font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums}
.shq #shqSheet{position:absolute;top:0;right:0;bottom:0;width:min(420px,94vw);background:var(--panel);
  border-left:1px solid var(--border);box-shadow:var(--elev2);transform:translateX(105%);
  transition:transform .28s cubic-bezier(.32,.72,.35,1);display:flex;flex-direction:column;z-index:24}
.shq #shqSheet.open{transform:none}
.shq .sheet-head{display:flex;align-items:center;gap:8px;padding:14px 18px 0;flex-shrink:0}
.shq .sh-back{background:none;border:none;color:var(--dim);font-size:12px;padding:0;display:none;transition:color .15s}
.shq .sh-back.show{display:inline}.shq .sh-back:hover{color:var(--lime)}
.shq .sh-x{margin-left:auto;background:none;border:none;color:var(--dim);font-size:16px;width:28px;height:28px;
  display:flex;align-items:center;justify-content:center;border-radius:var(--radius-xs);transition:all .15s}
.shq .sh-x:hover{background:var(--hover);color:var(--ink)}
.shq .sheet-body{flex:1;overflow-y:auto;padding:4px 18px 20px}
.shq .sh-title{font-size:18px;font-weight:700;letter-spacing:-.02em;margin-top:4px}
.shq .sh-sub{font-size:12px;color:var(--dim);margin-top:2px}
.shq .sh-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;
  margin-top:10px;padding:5px 12px;border-radius:99px}
.shq .sh-status.risk{color:var(--risk);background:var(--risk-soft)}
.shq .sh-status.warn{color:var(--warn);background:var(--warn-soft)}
.shq .sh-status.ok{color:var(--ok);background:var(--ok-soft)}
.shq .sh-sec{margin-top:18px}
.shq .sh-sec h6{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);font-weight:700;margin-bottom:8px}
.shq .mission-block b{font-size:14px;font-weight:700;display:block;margin-bottom:8px}
.shq .mbar{height:5px;background:var(--hover);border-radius:3px;overflow:hidden}
.shq .mbar i{display:block;height:100%;border-radius:3px}
.shq .mbar-lab{display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-top:4px;font-variant-numeric:tabular-nums}
.shq .wrong-box{background:var(--risk-soft);border-radius:var(--radius-sm);padding:10px 12px}
.shq .wrong-box .wi{display:flex;gap:8px;font-size:12.5px;color:var(--risk);padding:2px 0;line-height:1.4}
.shq .wrong-box .wi::before{content:'›';font-weight:800}
.shq .chips{display:flex;flex-wrap:wrap;gap:6px}
.shq .pchip{display:flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:99px;
  padding:4px 10px 4px 4px;font-size:12px;font-weight:600;background:var(--card);cursor:pointer;transition:border-color .15s}
.shq .pchip:hover{border-color:var(--lime)}
.shq .pchip .pav{width:20px;height:20px;border-radius:50%;color:#fff;font-size:8px;font-weight:800;
  display:flex;align-items:center;justify-content:center}
.shq .pchip .pst{width:6px;height:6px;border-radius:50%}
.shq .duo{display:flex;gap:8px}
.shq .duo .cell{flex:1;border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;background:var(--card)}
.shq .cell b{font-size:14px;font-weight:700;display:block;font-variant-numeric:tabular-nums}
.shq .cell span{font-size:11px;color:var(--dim)}
.shq .li{display:flex;gap:8px;align-items:flex-start;padding:5px 0;font-size:12.5px}
.shq .li .ldot{width:6px;height:6px;border-radius:50%;margin-top:5px;flex-shrink:0}
.shq .li .lmeta{color:var(--dim);font-size:11px;margin-top:1px}
.shq .sheet-actions{display:flex;gap:6px;padding:12px 18px;border-top:1px solid var(--border);flex-shrink:0;flex-wrap:wrap}
.shq #workWrap{flex:1;overflow-y:auto;padding:0 24px 80px;display:none;width:100%;max-width:880px;align-self:center}
.shq #workWrap.on{display:block}
.shq .wgroup{margin-bottom:16px}
.shq .wgroup h4{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);font-weight:700;margin-bottom:6px}
.shq .wrow{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border);
  border-radius:var(--radius-sm);padding:9px 12px;margin-bottom:4px;cursor:pointer;font-size:13px;transition:border-color .15s}
.shq .wrow:hover{border-color:var(--lime)}
.shq .wrow .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.shq .wrow .wt{flex:1;font-weight:600;min-width:0}
.shq .wrow .wr{font-size:11.5px;color:var(--dim)}
.shq .wrow .wd{font-size:11.5px;color:var(--muted);min-width:60px;text-align:right;font-variant-numeric:tabular-nums}
.shq .wrow .wd.urgent{color:var(--risk);font-weight:700}
.shq #shqReplay{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;align-items:center;gap:4px;
  background:var(--card);border:1px solid var(--border);border-radius:99px;padding:4px 8px;box-shadow:var(--elev1);z-index:15}
.shq #shqReplay .rl{font-size:10px;letter-spacing:.1em;color:var(--dim);font-weight:700;margin:0 6px 0 4px;
  font-family:'Geist Mono','SF Mono',ui-monospace,monospace}
.shq #shqReplay button{border:none;background:none;font-size:11.5px;font-weight:600;color:var(--dim);
  padding:5px 10px;border-radius:99px;transition:all .15s}
.shq #shqReplay button.on{background:var(--lime);color:var(--shell)}
.shq #shqReplayNote{position:absolute;left:50%;bottom:56px;transform:translateX(-50%);background:var(--float);
  border:1px solid var(--border-hi);color:var(--ink);font-size:12px;padding:8px 14px;
  border-radius:var(--radius-sm);max-width:min(500px,90vw);text-align:center;z-index:15;display:none;box-shadow:var(--elev1)}
.shq #shqReplayNote.show{display:block}
.shq #shqAskBtn{position:absolute;right:16px;bottom:14px;z-index:15;display:flex;align-items:center;gap:8px;
  background:var(--lime);color:var(--shell);border:none;border-radius:99px;padding:9px 16px;
  font-size:12.5px;font-weight:700;box-shadow:var(--elev1);transition:background .15s,transform .1s}
.shq #shqAskBtn:hover{background:#d4ff4a}.shq #shqAskBtn:active{transform:scale(.97)}
.shq #shqAskBtn kbd{font-family:'Geist Mono','SF Mono',ui-monospace,monospace;font-size:10px;
  background:rgba(0,0,0,.12);border-radius:4px;padding:2px 5px}
.shq #shqAskPanel{position:absolute;right:16px;bottom:60px;width:min(360px,92vw);max-height:55vh;
  background:var(--panel);border:1px solid var(--border-hi);border-radius:var(--radius);
  box-shadow:var(--elev2);display:none;flex-direction:column;overflow:hidden;z-index:25}
.shq #shqAskPanel.open{display:flex}
.shq .ask-head{padding:12px 14px 8px;border-bottom:1px solid var(--border)}
.shq .ask-head b{font-size:13px}
.shq .ask-ctx{font-size:10.5px;color:var(--dim);margin-top:2px}
.shq .ask-thread{flex:1;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:8px}
.shq .ask-q{align-self:flex-end;background:var(--lime-soft);color:var(--lime);font-weight:600;font-size:12px;
  padding:7px 12px;border-radius:12px 12px 4px 12px;max-width:88%}
.shq .ask-a{align-self:flex-start;background:var(--card);font-size:12px;line-height:1.5;padding:9px 12px;
  border-radius:12px 12px 12px 4px;max-width:92%;color:var(--muted)}
.shq .ask-sugs{display:flex;flex-direction:column;gap:4px;padding:0 14px 8px}
.shq .ask-sugs button{text-align:left;border:1px solid var(--border);background:var(--card);border-radius:var(--radius-sm);
  padding:7px 10px;font-size:12px;color:var(--muted);transition:border-color .15s,color .15s}
.shq .ask-sugs button:hover{border-color:var(--lime);color:var(--lime)}
.shq .ask-input{display:flex;border-top:1px solid var(--border)}
.shq .ask-input input{flex:1;border:none;outline:none;font:inherit;font-size:12.5px;padding:11px 14px;
  background:transparent;color:var(--ink)}
.shq .ask-input input::placeholder{color:var(--dim)}
.shq .hint-foot{font-size:10px;color:var(--dim);padding:0 14px 8px}
.shq .role-sw{display:flex;align-items:center;gap:6px;margin-left:8px}
.shq .role-sw select{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-xs);
  color:var(--ink);font:inherit;font-size:11px;font-weight:600;padding:4px 24px 4px 8px;cursor:pointer;outline:none;
  -webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236B6B75'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 8px center}
.shq .role-sw select:focus{border-color:var(--lime)}
.shq .role-sw .role-label{font-size:10px;color:var(--dim);letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.shq .empathy-bar{display:none;align-items:center;gap:8px;background:rgba(198,244,50,.08);
  border:1px solid rgba(198,244,50,.15);border-radius:99px;padding:4px 12px 4px 8px;font-size:11px;color:var(--lime);font-weight:600;
  position:absolute;top:52px;left:50%;transform:translateX(-50%);z-index:16}
.shq .empathy-bar.show{display:flex}
.shq .empathy-bar button{background:none;border:none;color:var(--dim);font-size:11px;padding:2px 6px;cursor:pointer}
.shq .empathy-bar button:hover{color:var(--lime)}
.shq .bfloor.frosted .face-top{opacity:.55}
.shq .bfloor.frosted .bf-stat{opacity:.5}
.shq .bfloor.frosted:hover .face-top{fill:#252528 !important}
.shq .bfloor.locked .face-top{opacity:.3}
.shq .bfloor.locked .bf-name{opacity:.5}
.shq .bfloor.locked .bf-stat{display:none}
.shq .bfloor.locked:hover .face-top{fill:#222225 !important}
.shq .room-g.frosted .room-poly{fill:rgba(255,255,255,.02)!important;stroke-dasharray:4 3}
.shq .room-g.frosted .person-dot,.shq .room-g.frosted .p-init{opacity:.25}
.shq .room-g.frosted .p-name{display:none}
.shq .room-g.frosted .furn{opacity:.3}
.shq .room-g.locked .room-poly{fill:rgba(255,255,255,.01)!important;stroke-dasharray:6 4;stroke:rgba(255,255,255,.04)!important}
.shq .room-g.locked .person-dot,.shq .room-g.locked .p-init,.shq .room-g.locked .p-name,.shq .room-g.locked .furn{display:none}
.shq .rcard.frosted .rc-sub{display:none}.shq .rcard.frosted .rc-status{opacity:.5}
.shq .rcard.locked rect{opacity:.3}.shq .rcard.locked .rc-sub,.shq .rcard.locked .rc-status{display:none}
.shq .rcard.locked .rc-name{opacity:.4}
.shq #shqDoor{position:absolute;z-index:23;display:none;width:min(340px,88vw);
  background:var(--panel);border:1px solid var(--border-hi);border-radius:var(--radius);
  box-shadow:var(--elev2);overflow:hidden;text-align:center;padding:28px 24px 20px;
  left:50%;top:50%;transform:translate(-50%,-50%)}
.shq #shqDoor.show{display:block}
.shq .door-icon{font-size:40px;margin-bottom:14px;line-height:1}
.shq .door-title{font-size:16px;font-weight:700;letter-spacing:-.02em}
.shq .door-sub{font-size:12.5px;color:var(--muted);margin-top:8px;line-height:1.5}
.shq .door-actions{display:flex;gap:8px;justify-content:center;margin-top:18px}
.shq #shqEntrance{position:absolute;inset:0;z-index:40;background:var(--shell);display:none;
  flex-direction:column;align-items:center;justify-content:center;opacity:1;transition:opacity .6s}
.shq #shqEntrance.active{display:flex}
.shq #shqEntrance.fade{opacity:0}
.shq .ent-greet{font-size:24px;font-weight:700;letter-spacing:-.03em;opacity:0;transform:translateY(12px);
  transition:opacity .5s,transform .5s}
.shq .ent-greet.in{opacity:1;transform:none}
.shq .ent-sub{font-size:13px;color:var(--dim);margin-top:6px;opacity:0;transition:opacity .4s .2s}
.shq .ent-sub.in{opacity:1}
.shq .ent-brief{margin-top:20px;text-align:left;max-width:380px;opacity:0;transform:translateY(8px);
  transition:opacity .4s .4s,transform .4s .4s}
.shq .ent-brief.in{opacity:1;transform:none}
.shq .ent-brief .eb-line{font-size:13px;color:var(--muted);padding:5px 0;line-height:1.5}
.shq .ent-brief .eb-line:first-child{color:var(--ink);font-weight:600}
.shq .ent-hint{position:absolute;bottom:24px;font-size:11px;color:var(--dim);opacity:0;transition:opacity .3s 1s}
.shq .ent-hint.in{opacity:1}
.shq .room-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;
  width:100%;max-width:1100px;margin:0 auto;align-content:start}
.shq .room-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);
  padding:16px;cursor:pointer;transition:border-color .2s,box-shadow .2s;display:flex;flex-direction:column;gap:8px}
.shq .room-card:hover{border-color:var(--border-hi);box-shadow:var(--elev1)}
.shq .room-card.active{border-color:var(--lime);box-shadow:0 0 0 1px rgba(198,244,50,.15)}
.shq .rc-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.shq .rc-head .rc-title{font-size:14px;font-weight:700;letter-spacing:-.01em}
.shq .rc-head .rc-badge{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;
  padding:3px 8px;border-radius:99px;white-space:nowrap;letter-spacing:.02em;flex-shrink:0}
.shq .rc-badge.ok{background:var(--ok-soft);color:var(--ok)}
.shq .rc-badge.warn{background:var(--warn-soft);color:var(--warn)}
.shq .rc-badge.risk{background:var(--risk-soft);color:var(--risk)}
.shq .rc-badge .bd{width:5px;height:5px;border-radius:50%;background:currentColor}
.shq .rc-mission{font-size:12.5px;color:var(--muted);line-height:1.4}
.shq .rc-bar{display:flex;align-items:center;gap:8px}
.shq .rc-bar .track{flex:1;height:4px;background:var(--hover);border-radius:2px;overflow:hidden}
.shq .rc-bar .track i{display:block;height:100%;border-radius:2px}
.shq .rc-bar .pct{font-size:11px;font-weight:700;color:var(--dim);font-variant-numeric:tabular-nums;min-width:28px;text-align:right}
.shq .rc-warn{font-size:11px;color:var(--risk);display:flex;gap:4px;line-height:1.4;background:var(--risk-soft);
  border-radius:var(--radius-xs);padding:5px 8px}
.shq .rc-warn::before{content:'›';font-weight:800;flex-shrink:0}
.shq .rc-team{display:flex;gap:0;margin-top:auto;padding-top:4px}
.shq .rc-av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:8px;font-weight:800;color:#fff;border:2px solid var(--card);margin-left:-4px;cursor:pointer;transition:transform .15s}
.shq .rc-av:first-child{margin-left:0}
.shq .rc-av:hover{transform:scale(1.15);z-index:1}
.shq .rc-foot{display:flex;gap:10px;font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums;
  border-top:1px solid var(--border);padding-top:8px;margin-top:4px}
.shq .rc-foot b{color:var(--ink);font-weight:700;margin-right:2px}
.shq .rc-foot .cb b{color:var(--risk)}
.shq .room-card.frosted{border-style:dashed;border-color:rgba(255,255,255,.06)}
.shq .room-card.frosted .rc-mission,.shq .room-card.frosted .rc-bar,.shq .room-card.frosted .rc-warn,.shq .room-card.frosted .rc-foot{display:none}
.shq .room-card.frosted .rc-team .rc-av{opacity:.4}
.shq .room-card.locked{border-style:dashed;border-color:rgba(255,255,255,.04);opacity:.5;cursor:not-allowed}
.shq .room-card.locked .rc-mission,.shq .room-card.locked .rc-bar,.shq .room-card.locked .rc-warn,
.shq .room-card.locked .rc-team,.shq .room-card.locked .rc-foot{display:none}
@media(prefers-reduced-motion:reduce){.shq *,.shq *::before,.shq *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
@media(max-width:640px){.shq #shqSheet{width:100vw}.shq .duo{flex-direction:column}.shq #shqPopup{width:92vw}}
`;

function initSparkHQ(root: HTMLElement) {
  const AVC=["#6D5EF4","#E0662B","#17A3A3","#D14BA0","#4B77E0","#7A9A2E","#B0542B","#5E6AD2"];
  const ST: Record<string,{t:string;cls:string;c:string}>={risk:{t:"RİSKTE",cls:"risk",c:"var(--risk)"},warn:{t:"DİKKAT",cls:"warn",c:"var(--warn)"},
    ok:{t:"YOLUNDA",cls:"ok",c:"var(--ok)"},ahead:{t:"İLERİDE",cls:"ok",c:"var(--ok)"}};
  const SEV: Record<string,number>={ok:0,ahead:0,warn:1,risk:2};

  type Member = {name:string;role:string;g:number;late:number};
  type TaskItem = {tt:string;who:string;day:string;urgent:boolean;done:boolean};
  type Room = {id:string;name:string;rect:number[];st:string;mission:string;pct:number;note:string;
    wrong:string[];mile:string[];members:Member[];tasks:TaskItem[]};
  type Floor = {id:string;name:string;sub:string;rooms:Room[]};

  function room(id: string,name: string,rect: number[],st: string,d: Partial<Room>): Room {
    return {id,name,rect,st,mission:"",pct:0,note:"",wrong:[],mile:["",""],members:[],tasks:[],...d};
  }
  function m(name: string,role: string,g: number,late: number): Member {return{name,role,g,late}}
  function t(tt: string,who: string,day: string,urgent?: boolean,done?: boolean): TaskItem {return{tt,who,day,urgent:!!urgent,done:!!done}}

  const FLOORS: Floor[]=[
   {id:"urun",name:"Ürün",sub:"12 aktif iş",rooms:[
     room("mobile","Mobile Squad",[0,0,44,30],"ok",{mission:"v2.4 Cuma Store'da",pct:72,note:"Release adayı hazır",
       wrong:["SPK-231 crash fix backend refactor bekliyor"],mile:["v2.4 Release","4 gün"],
       members:[m("Burak Çavdur","Mobile Lead",8,3),m("Can Yıldırım","iOS Dev",5,0),m("İpek Aydın","Android Dev",6,1)],
       tasks:[t("Android build final","Burak Ç.","Yarın",true),t("iOS TestFlight","Can Y.","Bugün",false,true),t("Store metadata","İpek A.","Perşembe")]}),
     room("backend","Backend Squad",[56,0,44,30],"warn",{mission:"OCPI v2 canlıda",pct:58,note:"Refactor uzadı",
       wrong:["Refactor mobil crash fix'ini blokluyor"],mile:["Webhook refactor","2 gün"],
       members:[m("Diren Gündoğdu","Backend Lead",7,1),m("Mert Acar","Backend Dev",6,0)],
       tasks:[t("OCPI webhook refactor","Diren G.","Yarın",true),t("Fatura servisi testleri","Mert A.","Cuma")]}),
     room("design","Design Studio",[0,36,44,30],"ok",{mission:"Şarj akışı v3 testte",pct:80,note:"Test Perşembe",wrong:[],mile:["Usability test","2 gün"],
       members:[m("Zeynep Tan","Product Designer",4,0),m("Arda Koç","UI Designer",3,0)],
       tasks:[t("Şarj akışı v3 prototip","Zeynep T.","Perşembe"),t("Token temizliği","Arda K.","Bitti",false,true)]}),
     room("qa","QA Lab",[56,36,44,30],"ok",{mission:"Tam regresyon",pct:60,note:"%60 tamam",wrong:[],mile:["Regresyon bitişi","3 gün"],
       members:[m("Baran Öztürk","QA Engineer",5,0)],
       tasks:[t("Regresyon koşusu","Baran Ö.","Perşembe")]}),
     room("platform","Platform",[0,72,100,28],"ahead",{mission:"Altyapı maliyeti −%15",pct:90,note:"Hedefin önünde",wrong:[],mile:["CDN geçişi","tamamlandı"],
       members:[m("Efe Duran","DevOps",4,0)],
       tasks:[t("Monitoring alarmları","Efe D.","Cuma"),t("CDN geçişi","Efe D.","Bitti",false,true)]}),
   ]},
   {id:"growth",name:"Growth · Launch",sub:"Launch: 1 Eylül",rooms:[
     room("gmarketing","Growth Marketing",[0,0,44,30],"risk",{mission:"CAC ₺38 → ₺30",pct:45,note:"Kreatifler bekleniyor",
       wrong:["Kreatif üretimi launch filmine bağımlı"],mile:["Kampanya seti","3 gün"],
       members:[m("Şevval Beyhan","Growth Lead",5,0),m("Emre Gür","Performance",6,1)],
       tasks:[t("Meta kampanya kurulumu","Emre G.","Perşembe"),t("Kreatif brief revizyonu","Şevval B.","Yarın",true)]}),
     room("product-room","Product",[56,0,44,30],"ahead",{mission:"Launch feature set",pct:84,note:"Planın önünde",wrong:[],mile:["Feature freeze","tamamlandı"],
       members:[m("Ela Sarp","PM",6,0),m("Ozan Kaya","APM",4,0)],
       tasks:[t("Launch feature QA","Ela S.","Cuma")]}),
     room("content","Content & PR",[0,36,44,30],"ok",{mission:"Basın kiti + video",pct:66,note:"Son revizyonda",
       wrong:["PR içerikleri onaya bağlı"],mile:["Basın kiti teslim","2 gün"],
       members:[m("Yağmur Balcı","Content Lead",5,1),m("Deniz Ak","Copywriter",4,0)],
       tasks:[t("Basın kiti final","Yağmur B.","Yarın",true),t("Launch blog yazısı","Deniz A.","Cuma")]}),
     room("launchops","Launch Ops",[56,36,44,30],"risk",{mission:"Launch — 1 Eylül",pct:68,note:"4 gün gecikme",
       wrong:["Android release launch'ı blokluyor","Launch filmi onay bekliyor","PR içerikleri hazır değil"],mile:["Public Beta","6 gün"],
       members:[m("Çağan Koyun","Founder",6,2),m("Burak Çavdur","Mobile Lead",8,3),m("Şevval Beyhan","Growth Lead",5,0),
                m("Diren Gündoğdu","Backend Lead",7,1),m("Enes Nazikoğlu","Ops Specialist",4,0)],
       tasks:[t("Android build final","Burak Ç.","Yarın",true),t("Launch filmi onayı","Çağan K.","Perşembe",true),
              t("PR içeriklerini gönder","Şevval B.","Cuma"),t("Partner listesi","Enes N.","Pazartesi")]}),
     room("partner","Partnerships",[0,72,44,28],"ok",{mission:"12 launch partneri",pct:70,note:"9/12 onaylı",wrong:[],mile:["Duyuru paketi","5 gün"],
       members:[m("Enes Nazikoğlu","Ops Specialist",4,0),m("Melis Ünal","Partnership Mgr",5,0)],
       tasks:[t("Ortak duyuru metinleri","Melis Ü.","Cuma")]}),
     room("data","Data & Analytics",[56,72,44,28],"ok",{mission:"Launch dashboard canlı",pct:75,note:"Event şeması tamam",wrong:[],mile:["Funnel dashboard","4 gün"],
       members:[m("Kaan Erol","Data Analyst",4,0)],
       tasks:[t("Funnel dashboard","Kaan E.","Cuma")]}),
   ]},
   {id:"satis",name:"Satış",sub:"₺680K pipeline",rooms:[
     room("enterprise","Enterprise Sales",[0,0,44,44],"ok",{mission:"Q3 hedefi ₺2.4M",pct:55,note:"Fleet A.Ş. imzada",
       wrong:["Sözleşme onayı lobide bekliyor"],mile:["Fleet A.Ş. imza","bu hafta"],
       members:[m("Kerem Vural","Sales Lead",6,0),m("Aslı Nur","AE",5,0)],
       tasks:[t("Fleet A.Ş. takibi","Kerem V.","Yarın",true),t("Marina Otopark demo","Aslı N.","Yarın 14:00")]}),
     room("cs","Customer Success",[56,0,44,44],"ok",{mission:"Onboarding < 7 gün",pct:70,note:"Yıldız Enerji 3/7",wrong:[],mile:["Yıldız canlı","4 gün"],
       members:[m("Berk Has","CS Manager",5,0)],
       tasks:[t("Yıldız Enerji onboarding","Berk H.","Cuma")]}),
     room("revops","RevOps & CRM",[0,50,100,50],"warn",{mission:"Pipeline hijyeni %95",pct:40,note:"14 bayat kayıt",
       wrong:["Tahmin doğruluğu düşük"],mile:["Q3 temizliği","bu hafta"],
       members:[m("Selen Er","RevOps Analyst",4,1)],
       tasks:[t("Q3 pipeline temizliği","Selen E.","Cuma",true)]}),
   ]},
   {id:"finans",name:"Finans",sub:"Runway 14 ay",rooms:[
     room("revenue","Revenue Room",[0,0,44,44],"ok",{mission:"MRR ₺4.1M · ↑%14",pct:74,note:"Büyüme sağlıklı",wrong:[],mile:["Q3 hedefi","yolunda"],
       members:[m("Onur Çelik","Finance Lead",5,0)],
       tasks:[t("Q4 bütçe revizyonu","Onur Ç.","Cuma"),t("Runway modeli","Onur Ç.","Bitti",false,true)]}),
     room("muhasebe","Muhasebe",[56,0,44,44],"ok",{mission:"Temmuz kapanışı",pct:60,note:"Mutabakatlar tamam",wrong:[],mile:["Ay kapanışı","4 gün"],
       members:[m("Nazlı Ekin","Muhasebe Uzmanı",4,0)],
       tasks:[t("Temmuz kapanışı","Nazlı E.","15 Ağu")]}),
     room("procurement","Satın Alma & Legal",[0,50,100,50],"warn",{mission:"Sözleşme yenilemeleri",pct:50,note:"AWS onay bekliyor",
       wrong:["Onay gecikirse kesinti riski"],mile:["AWS yenileme","3 gün"],
       members:[m("Cem Tok","Operations",3,1)],
       tasks:[t("AWS faturası onayı","Cem T.","Yarın",true)]}),
   ]},
   {id:"lobi",name:"Lobi",sub:"5 şey seni bekliyor",rooms:[
     room("inbox","Founder Inbox",[0,0,100,58],"risk",{mission:"Kuyruğu sıfırla — ~10 dk",pct:0,note:"1 aksiyon 3+ gündür",
       wrong:["Growth bütçesi 3 gündür onaysız — launch'ı geciktiriyor"],mile:["Hepsi bugün","kapanabilir"],
       members:[m("Çağan Koyun","Founder",5,1)],
       tasks:[t("Growth bütçe artışı onayı","Çağan K.","3 gündür",true),t("Fleet A.Ş. sözleşme imzası","Çağan K.","bugün",true),
              t("AWS faturası onayı","Çağan K.","dün"),t("v2.4 go/no-go","Çağan K.","bugün"),
              t("İşe alım onayı: Backend Dev","Çağan K.","2 gündür")]}),
     room("meeting","Toplantı Salonu",[0,64,100,36],"ok",{mission:"Bugün 3 toplantı",pct:0,note:"14:00'e kadar müsait",wrong:[],mile:["Launch sync","16:00"],
       members:[],tasks:[t("Launch sync","Tüm liderler","16:00")]}),
   ]},
  ];

  const TIMES=["Pzt","Çar","Per","Bugün"];
  const OV: Record<string,string[]>={launchops:["ok","warn","risk","risk"],gmarketing:["ok","ok","warn","risk"],
    backend:["ok","ok","warn","warn"],content:["ok","ok","ok","ok"],
    revops:["ok","warn","warn","warn"],procurement:["ok","ok","ok","warn"],
    inbox:["warn","warn","risk","risk"]};
  const DELAY: Record<string,number[]>={launchops:[0,0,2,4],gmarketing:[0,0,0,2]};
  const NOTES: (string|null)[]=[null,"Çar · Backend refactor uzadı → Backend Squad DİKKAT'e düştü.",
   "Per · Android release kaydı → Launch Ops RİSKTE. Zincir: Backend → Mobile → Launch.",
   "Bugün · Gecikme 4 güne çıktı; kreatifler beklediği için Growth Marketing de RİSKTE."];

  const PDETAIL: Record<string,{st:string;today:string;working:string[];waiting:[string,string][];goals:[string,number][];recent:string[]}>={
   "Çağan Koyun":{st:"warn",today:"3 toplantı · 6 görev · 2 onay",
     working:["Launch filmi onayı","Yatırımcı sunumu","İş Bankası partnership"],
     waiting:[["Launch filmini onayla","risk"],["Growth bütçesini onayla","risk"],["Fleet sözleşmesini imzala","warn"]],
     goals:[["Launch Spark",68],["İş Bankası'nı kapat",45]],
     recent:["Kanal bütçesini onayladı","Basın kitine yorum yaptı"]},
   "Burak Çavdur":{st:"risk",today:"1 toplantı · 8 görev · 3 gecikmiş",
     working:["Android build final","SPK-231 crash","Store metadata"],
     waiting:[["Backend refactor'ın bitmesi","risk"]],
     goals:[["v2.4 Store'da",72]],
     recent:["TestFlight dağıttı","Crash raporunu inceledi"]},
  };
  type RoleProfile = {label:string;person:string;homeFloor:string|null;homeRoom:string|null;
    greeting:string;roleSub:string;briefing:string[];floorAccess:Record<string,string>;ownRooms:string[]};
  const ROLE_PROFILES: Record<string,RoleProfile>={
    owner:{label:"Owner (Çağan)",person:"Çağan Koyun",homeFloor:null,homeRoom:null,
      greeting:"Günaydın Çağan.",roleSub:"Şirketin tamamı senin masan.",
      briefing:["Şirket nasıl gidiyor?","🔴 1 kırmızı zincir: Backend → Mobile → Launch (4 gün)",
        "📥 5 karar seni bekliyor — en eskisi 3 gündür","İlk hamle önerisi: Growth bütçesini onayla (~2 dk)"],
      floorAccess:{},ownRooms:[]},
    admin:{label:"Admin (Onur)",person:"Onur Çelik",homeFloor:null,homeRoom:null,
      greeting:"Günaydın Onur.",roleSub:"Tüm katlar sana açık.",
      briefing:["Şirket geneli yolunda, 1 kritik zincir var.","🔴 Launch 4 gün geride — Backend → Mobile → Launch",
        "📊 Runway 14 ay · MRR ₺4.1M","3 onay kuyruğunda bekliyor"],
      floorAccess:{},ownRooms:[]},
    lead:{label:"Kat Lideri (Şevval)",person:"Şevval Beyhan",homeFloor:"growth",homeRoom:null,
      greeting:"Günaydın Şevval.",roleSub:"Growth katı senin alanın.",
      briefing:["Growth · Launch — RİSKTE · 4 gün","Ne ters gidiyor: Android release → Launch Ops → kreatifler zinciri",
        "Ekiplerin: 2 riskte, 1 ileride, 3 yolunda","Bugün senden bekleyen: kreatif brief revizyonu"],
      floorAccess:{urun:"pulse",satis:"pulse",finans:"shape",lobi:"pulse"},ownRooms:[]},
    member:{label:"Üye (Burak)",person:"Burak Çavdur",homeFloor:"urun",homeRoom:"mobile",
      greeting:"Günaydın Burak.",roleSub:"Mobile Squad masanda oturuyorsun.",
      briefing:["🔴 Dikkatini bekleyen: Android build final — yarın, launch'ı blokluyor",
        "Bugün: 3 görev · 1 toplantı","Seni bekleyenler: Backend refactor (Diren)",
        "Ekibin: Mobile Squad · YOLUNDA · v2.4 %72"],
      floorAccess:{growth:"pulse",satis:"pulse",finans:"shape",lobi:"pulse"},ownRooms:["mobile"]},
  };
  const activeRole=()=>ROLE_PROFILES[state.empathy||state.role];
  const floorVis=(fid: string)=>{const p=activeRole();return (p.floorAccess[fid]||"content") as string};
  const roomVis=(fid: string,rid: string)=>{
    const p=activeRole(),fv=floorVis(fid);
    if(fv==="shape"||fv==="pulse")return fv;
    if(state.role==="member"&&!state.empathy&&p.ownRooms.length&&!p.ownRooms.includes(rid))return "pulse";
    return "content";
  };

  function pdOf(mm: Member) {
    if(PDETAIL[mm.name])return PDETAIL[mm.name];
    return{st:mm.late>=3?"risk":mm.late>=1?"warn":"ok",
      today:`${mm.g} görev`+(mm.late?` · ${mm.late} gecikmiş`:""),
      working:[] as string[],waiting:[] as [string,string][],goals:[] as [string,number][],recent:[] as string[]};
  }

  const state={view:"hq",floor:null as string|null,room:null as string|null,person:null as string|null,mode:"office",time:3,role:"owner" as string,empathy:null as string|null};
  const $=(s: string)=>root.querySelector(s) as HTMLElement|null;
  const F=()=>FLOORS.find(f=>f.id===state.floor)!;
  const RM=()=>state.room?F().rooms.find(r=>r.id===state.room)!:null;
  const initials=(n: string)=>n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const avc=(n: string)=>AVC[[...n].reduce((s,c)=>s+c.charCodeAt(0),0)%AVC.length];
  const rSt=(r: Room)=>OV[r.id]?OV[r.id][state.time]:r.st;
  const rDelay=(r: Room)=>DELAY[r.id]?DELAY[r.id][state.time]:0;
  const rLabel=(r: Room)=>{const s=ST[rSt(r)];const d=rDelay(r);return s.t+(d?` · ${d} gün`:"")};
  const fSt=(f: Floor)=>{let mx="ok";f.rooms.forEach(r=>{if(SEV[rSt(r)]>SEV[mx])mx=rSt(r)});return mx};
  const fLabel=(f: Floor)=>{const s=fSt(f);
    if(f.id==="growth"&&s==="risk")return rLabel(f.rooms.find(r=>r.id==="launchops")!);
    if(f.id==="lobi")return f.sub;return s==="ok"?f.sub:ST[s].t};
  const pSt=(mm: Member)=>pdOf(mm).st;
  const stColor=(s: string)=>s==="risk"?"var(--risk)":s==="warn"?"var(--warn)":"var(--lime)";

  const P=(x: number,y: number,z: number,cx: number,cy: number,s: number): [number,number]=>[cx+(x-y)*0.866*s, cy+(x+y)*0.5*s-z*s];
  const pts=(a: [number,number][])=>a.map(p=>p.join(",")).join(" ");

  let curVB=[0,0,560,430];
  let vbAnim=0;
  const planSvgEl: SVGSVGElement|null=null;
  const FULL_VB=[0,0,560,430];
  const ISO={cx:255,cy:70,s:2.05};
  function setVB(vb: number[]){curVB=vb;if(planSvgEl)planSvgEl.setAttribute("viewBox",vb.join(" "))}
  function animVB(target: number[],done?: ()=>void){
    cancelAnimationFrame(vbAnim);
    const from=[...curVB],t0=performance.now(),dur=360;
    const step=(now: number)=>{let k=Math.min(1,(now-t0)/dur);k=1-Math.pow(1-k,3);
      setVB(from.map((v,i)=>v+(target[i]-v)*k));
      if(k<1){vbAnim=requestAnimationFrame(step)}else if(done){done()}};
    vbAnim=requestAnimationFrame(step);
  }
  function roomBBox(r: Room){
    const[x,y,w,h]=r.rect,{cx,cy,s}=ISO;
    const cs=[P(x,y,0,cx,cy,s),P(x+w,y,0,cx,cy,s),P(x+w,y+h,0,cx,cy,s),P(x,y+h,0,cx,cy,s)];
    const xs=cs.map(p=>p[0]),ys=cs.map(p=>p[1]);
    const bx=Math.min(...xs)-16,by=Math.min(...ys)-30;
    let bw=Math.max(...xs)-bx+16;const bh=Math.max(...ys)-by+18;
    bw+=bw*.9;return[bx,by,bw,bh];
  }
  function deskLayout(r: Room){
    const[x,y,w,h]=r.rect,cxr=x+w/2,cyr=y+h/2,list: number[][]=[];
    const nn=r.members.length;if(!nn)return list;
    const rx=Math.min(w,42)*.36+6,ry=Math.min(h,34)*.42+4;
    for(let i=0;i<nn;i++){const a=-Math.PI/2+i*(2*Math.PI/nn);list.push([cxr+Math.cos(a)*rx,cyr+Math.sin(a)*ry])}
    return list;
  }

  function renderHQ(){
    const W=170,D=105,H=44,s=1.15,cx=210,cy=268,n=FLOORS.length;
    const riskRooms=FLOORS.flatMap(f=>f.rooms).filter(r=>rSt(r)==="risk").length;
    const kpis=$("#hqKpis");
    if(kpis)kpis.innerHTML=`
      <span class="ps-item risk"><span class="ps-dot" style="background:var(--risk)"></span><b>${riskRooms+4}</b> riskte iş</span>
      <span class="ps-item ok"><span class="ps-dot" style="background:var(--ok)"></span><b>27</b> tamamlanan</span>
      <span class="ps-item"><span class="ps-dot" style="background:var(--lime)"></span><b>5</b> milestone</span>`;

    let svg=`<svg viewBox="0 0 460 520" xmlns="http://www.w3.org/2000/svg">`;
    const g=30;
    svg+=`<polygon points="${pts([P(-g,-g,0,cx,cy,s),P(W+g,-g,0,cx,cy,s),P(W+g,D+g,0,cx,cy,s),P(-g,D+g,0,cx,cy,s)])}" fill="#111114"/>`;

    for(let i=0;i<n;i++){
      const f=FLOORS[n-1-i],zb=i*H,zt=zb+H;
      const st=fSt(f),sc=ST[st].c;
      const front=pts([P(0,D,zb,cx,cy,s),P(W,D,zb,cx,cy,s),P(W,D,zt,cx,cy,s),P(0,D,zt,cx,cy,s)]);
      const right=pts([P(W,0,zb,cx,cy,s),P(W,D,zb,cx,cy,s),P(W,D,zt,cx,cy,s),P(W,0,zt,cx,cy,s)]);
      const top=pts([P(0,0,zt,cx,cy,s),P(W,0,zt,cx,cy,s),P(W,D,zt,cx,cy,s),P(0,D,zt,cx,cy,s)]);
      const[lx,ly]=P(10,D,zb+H*.62,cx,cy,s);
      const[sx,sy]=P(10,D,zb+H*.26,cx,cy,s);
      const[dx,dy]=P(W-8,D,zb+H*.5,cx,cy,s);
      const riskOutline=st==="risk"?`<polygon points="${front}" fill="rgba(255,107,94,.04)" stroke="var(--risk)" stroke-width="1.4" stroke-dasharray="4 3"/>`:"";
      svg+=`<g class="bfloor" data-f="${f.id}">
        <polygon points="${front}" fill="#1C1C1F" stroke="rgba(255,255,255,.05)"/>
        <polygon points="${right}" fill="#202024" stroke="rgba(255,255,255,.05)"/>
        <polygon class="face-top" points="${top}" fill="#232327" stroke="rgba(255,255,255,.06)"/>
        <polygon class="fl-glow" points="${top}" fill="${st==="risk"?"rgba(255,107,94,.06)":st==="warn"?"rgba(251,191,36,.05)":"rgba(198,244,50,.04)"}" style="opacity:0;transition:opacity .3s"/>
        <text class="bf-name" x="${lx}" y="${ly}">${f.name}</text>
        <text class="bf-stat ${st==="risk"?"risk":st==="warn"?"warn":"ok"}" x="${sx}" y="${sy}">${fLabel(f)}</text>
        <circle cx="${dx}" cy="${dy}" r="4.5" fill="${sc}"/>
        ${riskOutline}
      </g>`;
    }
    const rz=n*H;
    svg+=`<polygon points="${pts([P(104,12,rz+13,cx,cy,s),P(138,12,rz+13,cx,cy,s),P(138,36,rz+13,cx,cy,s),P(104,36,rz+13,cx,cy,s)])}" fill="#1E1E22" stroke="rgba(255,255,255,.05)"/>
    <polygon points="${pts([P(104,36,rz,cx,cy,s),P(138,36,rz,cx,cy,s),P(138,36,rz+13,cx,cy,s),P(104,36,rz+13,cx,cy,s)])}" fill="#18181B" stroke="rgba(255,255,255,.04)"/>
    <polygon points="${pts([P(138,12,rz,cx,cy,s),P(138,36,rz,cx,cy,s),P(138,36,rz+13,cx,cy,s),P(138,12,rz+13,cx,cy,s)])}" fill="#1A1A1E" stroke="rgba(255,255,255,.04)"/>
    <circle cx="${P(121,24,rz+16,cx,cy,s)[0]}" cy="${P(121,24,rz+16,cx,cy,s)[1]}" r="3" fill="var(--lime)" opacity=".6"/>
    <circle cx="${P(121,24,rz+16,cx,cy,s)[0]}" cy="${P(121,24,rz+16,cx,cy,s)[1]}" r="8" fill="var(--lime)" opacity=".08"/>
    </svg>`;
    const bld=$("#hqBuilding");
    if(bld)bld.innerHTML=svg;
    root.querySelectorAll(".bfloor").forEach(el=>{
      const fid=(el as HTMLElement).dataset.f!;
      const vis=floorVis(fid);
      if(vis==="pulse")el.classList.add("frosted");
      else if(vis==="shape")el.classList.add("locked");
      el.addEventListener("click",()=>{
        const v=floorVis(fid);
        if(v==="shape"){showDoor(FLOORS.find(f=>f.id===fid)!.name,"Bu kat yalnızca ilgili ekibe açık.","Kat liderinden erişim iste.");return}
        goFloor(fid);
      });
      el.addEventListener("mouseenter",e=>showTooltipFloor(e as MouseEvent,fid));
      el.addEventListener("mouseleave",hideTooltip);
    });
  }

  function renderPlan(){
    const f=F();
    const ft=$("#floorTitle");if(ft)ft.textContent=f.name;
    const fs=$("#floorSub");if(fs)fs.textContent=f.rooms.length+" oda · "+f.rooms.reduce((a,r)=>a+r.members.length,0)+" kişi";
    const isPulse=state.mode==="pulse";
    const ph=$("#planHolder");if(!ph)return;

    const S=5.2;
    const pad=8;
    const maxX=Math.max(...f.rooms.map(r=>r.rect[0]+r.rect[2]));
    const maxY=Math.max(...f.rooms.map(r=>r.rect[1]+r.rect[3]));
    const vw=maxX*S+pad*2;
    const vh=maxY*S+pad*2;

    let svg=`<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${Math.min(vw*1.1,880)}px;height:auto">`;
    svg+=`<rect width="${vw}" height="${vh}" rx="8" fill="var(--panel)"/>`;

    f.rooms.forEach(r=>{
      const[rx,ry,rw,rh]=r.rect;
      const x=rx*S+pad, y=ry*S+pad, w=rw*S, h=rh*S;
      const st=rSt(r);
      const rv=roomVis(state.floor!,r.id);
      const sel=r.id===state.room;

      const stC=st==="risk"?"rgba(255,107,94,.12)":st==="warn"?"rgba(251,191,36,.08)":"rgba(74,222,128,.06)";
      const stStroke=st==="risk"?"rgba(255,107,94,.35)":st==="warn"?"rgba(251,191,36,.25)":"rgba(255,255,255,.08)";

      let cls="room-g";
      if(rv==="pulse")cls+=" frosted";
      else if(rv==="shape")cls+=" locked";
      if(sel)cls+=" sel";

      svg+=`<g class="${cls}" data-room="${r.id}" data-vis="${rv}" style="cursor:pointer">`;
      svg+=`<rect class="room-poly" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${isPulse?stC:"var(--card)"}" stroke="${sel?"var(--lime)":isPulse?stStroke:"rgba(255,255,255,.06)"}" stroke-width="${sel?1.6:1}"/>`;

      if(isPulse){
        svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${stC}" pointer-events="none"/>`;
      }

      svg+=`<text x="${x+8}" y="${y+14}" class="bf-name" style="font-size:11px;font-weight:700;fill:var(--ink)">${r.name}</text>`;

      if(rv!=="shape"){
        const stLabel=rLabel(r);
        const stFill=st==="risk"?"var(--risk)":st==="warn"?"var(--warn)":"var(--ok)";
        svg+=`<text x="${x+8}" y="${y+26}" style="font-size:8.5px;font-weight:700;fill:${stFill};letter-spacing:.03em">${stLabel}</text>`;
      }

      if(!isPulse && rv==="content" && r.mission){
        svg+=`<text x="${x+8}" y="${y+38}" style="font-size:8px;fill:var(--muted)">${r.mission.length>30?r.mission.slice(0,30)+"…":r.mission}</text>`;
      }

      if(!isPulse && rv==="content" && r.pct){
        const barW=w-16, barH=3, barX=x+8, barY=y+h-18;
        svg+=`<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="1.5" fill="var(--hover)"/>`;
        svg+=`<rect x="${barX}" y="${barY}" width="${barW*r.pct/100}" height="${barH}" rx="1.5" fill="${stColor(st)}"/>`;
        svg+=`<text x="${barX+barW+1}" y="${barY+3}" style="font-size:7px;font-weight:700;fill:var(--dim);text-anchor:start" dx="2">%${r.pct}</text>`;
      }

      if(rv!=="shape"){
        const desks=deskLayout(r);
        r.members.forEach((mm,mi)=>{
          if(mi>=desks.length)return;
          const[dx,dy]=desks[mi];
          const px=dx*S+pad, py=dy*S+pad;
          const mst=pSt(mm);
          const dotR=rv==="pulse"?4:5;

          svg+=`<g class="person-g" data-room="${r.id}" data-person="${mm.name}">`;
          if(rv==="content"){
            svg+=`<rect x="${px-6}" y="${py-4}" width="12" height="8" rx="2" class="furn"/>`;
          }
          svg+=`<circle class="person-dot pd-${mst}" cx="${px}" cy="${py}" r="${dotR}" stroke="${stColor(mst)}"/>`;
          svg+=`<text class="p-init" x="${px}" y="${py+1.3}" style="font-size:${rv==="pulse"?3:3.8}px">${initials(mm.name)}</text>`;
          if(rv==="content"){
            svg+=`<text class="p-name" x="${px}" y="${py+dotR+7}" style="font-size:6px;fill:var(--muted);text-anchor:middle;opacity:.8">${mm.name.split(" ")[0]}</text>`;
          }
          svg+=`</g>`;
        });
      }

      if(!isPulse && rv==="content"){
        const openT=(r.tasks||[]).filter(t2=>!t2.done).length;
        const blocked=(r.tasks||[]).filter(t2=>t2.urgent&&!t2.done).length;
        let foot=`${openT} açık`;
        if(blocked)foot+=` · ${blocked} engel`;
        svg+=`<text x="${x+w-8}" y="${y+h-6}" style="font-size:7px;fill:var(--dim);text-anchor:end;font-variant-numeric:tabular-nums">${foot}</text>`;
      }

      if(rv==="shape"){
        svg+=`<text x="${x+w/2}" y="${y+h/2+4}" style="font-size:16px;text-anchor:middle;opacity:.4">🔒</text>`;
      }

      svg+=`</g>`;
    });

    svg+=`</svg>`;
    ph.innerHTML=svg;

    ph.querySelectorAll(".room-g").forEach(el=>{
      const rid=(el as HTMLElement).dataset.room!;
      const vis=(el as HTMLElement).dataset.vis!;
      el.addEventListener("click",e=>{
        if((e.target as Element).closest(".person-g"))return;
        if(vis==="shape"){showDoor(f.rooms.find(x=>x.id===rid)!.name,"Bu alan yalnızca ilgili ekibe açık.","Erişim iste");return}
        if(vis==="pulse"){showDoorPulse(rid);return}
        showPopupRoom(rid,e as MouseEvent);
      });
      el.addEventListener("mouseenter",e=>showTooltipRoom(e as MouseEvent,rid));
      el.addEventListener("mouseleave",hideTooltip);
    });
    ph.querySelectorAll(".person-g").forEach(el=>{
      el.addEventListener("click",e=>{
        e.stopPropagation();
        const rid=(el as HTMLElement).dataset.room!;
        const vis=roomVis(state.floor!,rid);
        if(vis!=="content"){showDoorPulse(rid);return}
        const pname=(el as HTMLElement).dataset.person!;
        showPopupPerson(rid,pname,e as MouseEvent);
      });
    });
  }

  function showTooltipFloor(e: MouseEvent,fid: string){
    const f=FLOORS.find(x=>x.id===fid)!,st=fSt(f);
    const vis=floorVis(fid);
    const stC=st==="risk"?"var(--risk)":st==="warn"?"var(--warn)":"var(--ok)";
    const tt=$("#shqTooltip");if(!tt)return;
    if(vis==="shape"){
      tt.innerHTML=`<div class="tt-name">${f.name}</div><div class="tt-line" style="color:var(--dim)">🔒 Kilitli alan</div>`;
    }else if(vis==="pulse"){
      tt.innerHTML=`<div class="tt-name">${f.name}</div>
        <div class="tt-stat" style="color:${stC}">${ST[st].t}</div>
        <div class="tt-line">${f.rooms.length} oda · ${f.rooms.reduce((a,r)=>a+r.members.length,0)} kişi</div>`;
    }else{
      tt.innerHTML=`<div class="tt-name">${f.name}</div>
        <div class="tt-stat" style="color:${stC}">${fLabel(f)}</div>
        <div class="tt-line">${f.rooms.length} oda · ${f.rooms.reduce((a,r)=>a+r.members.length,0)} kişi</div>`;
    }
    posTooltip(e);tt.style.display="block";
  }
  function showTooltipRoom(e: MouseEvent,rid: string){
    const r=F().rooms.find(x=>x.id===rid)!,st=rSt(r);
    const rv=roomVis(state.floor!,rid);
    const tt=$("#shqTooltip");if(!tt)return;
    if(rv==="shape"){
      tt.innerHTML=`<div class="tt-name">${r.name}</div><div class="tt-line" style="color:var(--dim)">🔒 Kilitli alan</div>`;
    }else if(rv==="pulse"){
      tt.innerHTML=`<div class="tt-name">${r.name}</div>
        <div class="tt-stat" style="color:${stColor(st)}">${ST[rSt(r)].t}</div>
        <div class="tt-line">${r.members.length} kişi${r.wrong.length?` · ${r.wrong.length} engel`:""}</div>`;
    }else{
      tt.innerHTML=`<div class="tt-name">${r.name}</div>
        <div class="tt-stat" style="color:${stColor(st)}">${rLabel(r)}</div>
        <div class="tt-line">${r.mission}</div>`;
    }
    posTooltip(e);tt.style.display="block";
  }
  function showTooltipPerson(e: MouseEvent,rid: string,pname: string){
    const r=F().rooms.find(x=>x.id===rid)!;
    const mm=r.members.find(x=>x.name===pname)!;
    const pd=pdOf(mm);
    const tt=$("#shqTooltip");if(!tt)return;
    tt.innerHTML=`<div class="tt-name">${mm.name}</div>
      <div class="tt-stat" style="color:${stColor(pd.st)}">${mm.role}</div>
      <div class="tt-line">${pd.today}</div>`;
    posTooltip(e);tt.style.display="block";
  }
  function posTooltip(e: MouseEvent){
    const tt=$("#shqTooltip");if(!tt)return;
    const rect=root.getBoundingClientRect();
    tt.style.left=(e.clientX-rect.left+12)+"px";tt.style.top=(e.clientY-rect.top-8)+"px";
  }
  function hideTooltip(){const tt=$("#shqTooltip");if(tt)tt.style.display="none"}

  root.addEventListener("mousemove",e=>{
    const tt=$("#shqTooltip");
    if(tt&&tt.style.display==="block"){
      const rect=root.getBoundingClientRect();
      tt.style.left=(e.clientX-rect.left+12)+"px";tt.style.top=(e.clientY-rect.top-8)+"px";
    }
  });

  function showPopupRoom(rid: string,e: MouseEvent){
    const rv=roomVis(state.floor!,rid);
    if(rv==="shape"){showDoor(F().rooms.find(x=>x.id===rid)!.name,"Bu alan yalnızca ilgili ekibe açık.","Erişim iste");return}
    if(rv==="pulse"){showDoorPulse(rid);return}
    closePopup();
    const r=F().rooms.find(x=>x.id===rid)!,st=rSt(r);
    const openT=(r.tasks||[]).filter(x=>!x.done).length;
    const blocked=(r.tasks||[]).filter(x=>x.urgent&&!x.done).length;
    const done=(r.tasks||[]).filter(x=>x.done).length;
    state.room=rid;
    const pop=$("#shqPopup");if(!pop)return;
    pop.innerHTML=`
      <div class="pop-head">
        <button class="pop-x" data-act="close-popup">✕</button>
        <div class="pop-name">${r.name}</div>
        <div class="pop-sub">${F().name} katı</div>
        <div class="pop-badge ${st==="ahead"?"ok":st}"><span class="bd"></span>${rLabel(r)}</div>
      </div>
      <div class="pop-body">
        <div class="pop-mission">${r.mission}</div>
        ${r.pct?`<div class="pop-bar"><div class="pb-track"><i style="width:${r.pct}%;background:${stColor(st)}"></i></div><span class="pb-pct">%${r.pct}</span></div>`:""}
        ${r.wrong.length?`<div class="pop-wrong">${r.wrong.map(w=>`<div class="pw-item">${w}</div>`).join("")}</div>`:""}
        ${r.members.length?`<div class="pop-people">${r.members.map(mm=>`<div class="pop-av" style="background:${avc(mm.name)}" title="${mm.name}" data-room="${r.id}" data-person="${mm.name}">${initials(mm.name)}</div>`).join("")}</div>`:""}
        <div class="pop-meta"><span><b>${openT}</b> açık</span>${blocked?`<span class="cb"><b>${blocked}</b> engelli</span>`:""}<span><b>${done}</b> bitti</span></div>
      </div>
      <div class="pop-foot">
        <button class="btn-lime" data-act="enter-room">Gir</button>
        <button class="btn-ghost" data-act="ask-ai">Ask AI</button>
      </div>`;
    pop.querySelector("[data-act=close-popup]")?.addEventListener("click",closePopup);
    pop.querySelectorAll(".pop-av").forEach(el=>el.addEventListener("click",ev=>{
      ev.stopPropagation();closePopup();showPopupPerson((el as HTMLElement).dataset.room!,(el as HTMLElement).dataset.person!,ev as MouseEvent);
    }));
    pop.querySelector("[data-act=enter-room]")?.addEventListener("click",()=>{closePopup();openSheet(rid)});
    pop.querySelector("[data-act=ask-ai]")?.addEventListener("click",()=>{closePopup();openAsk()});
    posPopup(e);pop.classList.add("show");renderCrumbs();
  }

  function showPopupPerson(rid: string,pname: string,e: MouseEvent){
    closePopup();
    const r=F().rooms.find(x=>x.id===rid)!;
    const mm=r.members.find(x=>x.name===pname)!;
    const pd=pdOf(mm);
    state.room=rid;state.person=pname;
    const pop=$("#shqPopup");if(!pop)return;
    pop.innerHTML=`
      <div class="pop-head">
        <button class="pop-x" data-act="close-popup">✕</button>
        <div class="pp-header">
          <div class="pp-av" style="background:${avc(mm.name)}">${initials(mm.name)}</div>
          <div><div class="pop-name" style="font-size:15px">${mm.name}</div><div class="pop-sub">${mm.role}</div></div>
        </div>
        <div class="pop-badge ${pd.st}"><span class="bd"></span>${pd.st==="risk"?"Müdahale gerek":pd.st==="warn"?"Dikkat":"Yolunda"}</div>
      </div>
      <div class="pop-body">
        <div class="pp-today">${pd.today}</div>
        ${pd.waiting.length?`<div class="pp-sec"><h6>Bekleyenler</h6>${pd.waiting.map(([w,k])=>`<div class="pp-li"><span class="ldot" style="background:var(--${k})"></span>${w}</div>`).join("")}</div>`:""}
        ${pd.goals.length?`<div class="pp-sec"><h6>Hedefler</h6>${pd.goals.map(([g,p])=>`<div class="goalline">${g}<span class="gbar"><i style="width:${p}%"></i></span><span class="gp">%${p}</span></div>`).join("")}</div>`:""}
      </div>
      <div class="pop-foot">
        <button class="btn-lime" data-act="enter-person">Masasına Git</button>
        <button class="btn-ghost" data-act="msg">Mesaj</button>
        ${state.role==="owner"?`<button class="btn-ghost" data-act="empathy" style="font-size:11px">👁 Gözünden Gör</button>`:""}
      </div>`;
    pop.querySelector("[data-act=close-popup]")?.addEventListener("click",closePopup);
    pop.querySelector("[data-act=enter-person]")?.addEventListener("click",()=>{closePopup();openSheet(rid,pname)});
    pop.querySelector("[data-act=msg]")?.addEventListener("click",()=>fakeAct("Mesaj gönderildi"));
    pop.querySelector("[data-act=empathy]")?.addEventListener("click",()=>{
      closePopup();const targetRole=Object.entries(ROLE_PROFILES).find(([,p])=>p.person===pname);
      if(targetRole){state.empathy=targetRole[0];renderEmpathy();goHQ();playEntrance()}
      else fakeAct("Bu kişi için empati modu — prototipte yalnızca tanımlı roller destekleniyor")});
    posPopup(e);pop.classList.add("show");renderCrumbs();
  }

  function posPopup(e: MouseEvent){
    const pop=$("#shqPopup")!,stage=$("#shqStage")!,sr=stage.getBoundingClientRect();
    let x=e.clientX-sr.left+16,y=e.clientY-sr.top-40;
    requestAnimationFrame(()=>{
      const pr=pop.getBoundingClientRect();
      if(x+pr.width>sr.width-8)x=sr.width-pr.width-8;
      if(y+pr.height>sr.height-60)y=sr.height-pr.height-60;
      if(x<8)x=8;if(y<8)y=8;
      pop.style.left=x+"px";pop.style.top=y+"px";
    });
    pop.style.left=x+"px";pop.style.top=y+"px";
  }
  function closePopup(){
    const pop=$("#shqPopup");if(pop)pop.classList.remove("show");
    if(!$("#shqSheet")?.classList.contains("open")){
      state.room=null;state.person=null;
      renderCrumbs();
    }
  }

  function openSheet(rid: string,person?: string){
    state.room=rid;state.person=person||null;
    root.querySelectorAll(".room-g").forEach(el=>{
      el.classList.toggle("sel",(el as HTMLElement).dataset.room===rid);
    });
    renderSheet();$("#shqSheet")?.classList.add("open");renderCrumbs();
  }
  function closeSheet(){
    state.room=null;state.person=null;
    $("#shqSheet")?.classList.remove("open");
    root.querySelectorAll(".room-g").forEach(el=>el.classList.remove("sel"));
    renderCrumbs();
  }

  function renderSheet(){
    const r=RM();if(!r)return;
    const body=$("#sheetBody")!,acts=$("#sheetActions")!,back=$("#shBack")!;
    const st=rSt(r);

    if(state.person){
      const mm=r.members.find(x=>x.name===state.person)!;
      const pd=pdOf(mm);
      back.textContent="← "+r.name;back.classList.add("show");
      body.innerHTML=`
        <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
          <div style="width:44px;height:44px;border-radius:50%;background:${avc(mm.name)};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px">${initials(mm.name)}</div>
          <div><div class="sh-title" style="font-size:17px">${mm.name}</div><div class="sh-sub">${mm.role}</div></div>
        </div>
        <span class="sh-status ${pd.st}">${pd.st==="risk"?"● Müdahale gerek":pd.st==="warn"?"● Dikkat":"● Yolunda"}</span>
        <div class="sh-sec"><h6>Bugün</h6><div style="font-size:13px">${pd.today}</div></div>
        ${pd.working.length?`<div class="sh-sec"><h6>Üzerinde çalıştıkları</h6>${pd.working.map(w=>`<div class="li"><span class="ldot" style="background:var(--lime)"></span>${w}</div>`).join("")}</div>`:""}
        ${pd.waiting.length?`<div class="sh-sec"><h6>Bekleyenler</h6>${pd.waiting.map(([w,k])=>`<div class="li"><span class="ldot" style="background:var(--${k})"></span>${w}</div>`).join("")}</div>`:""}
        ${pd.goals.length?`<div class="sh-sec"><h6>Hedefler</h6>${pd.goals.map(([g,p])=>`<div class="goalline">${g}<span class="gbar" style="max-width:100px"><i style="width:${p}%"></i></span><span class="gp" style="font-variant-numeric:tabular-nums">%${p}</span></div>`).join("")}</div>`:""}
        ${pd.recent.length?`<div class="sh-sec"><h6>Son hareketler</h6>${pd.recent.map(x=>`<div class="li"><span class="ldot" style="background:var(--hover)"></span><span style="color:var(--muted)">${x}</span></div>`).join("")}</div>`:""}
        <div class="sh-sec"><h6>Görevleri</h6>
          ${(r.tasks||[]).filter(tk=>tk.who.startsWith(mm.name.split(" ")[0])).map(tk=>`
            <div class="li"><span class="ldot" style="background:${tk.done?"var(--ok)":tk.urgent?"var(--risk)":"var(--lime)"}"></span>
            <span>${tk.tt}<div class="lmeta">${tk.day}${tk.urgent?" · acil":""}</div></span></div>`).join("")||`<div style="font-size:12px;color:var(--dim)">Listelenen görev yok.</div>`}
        </div>`;
      acts.innerHTML=`<button class="btn-lime" data-act="msg">Mesaj</button>
        <button class="btn-ghost" data-act="assign">Görev Ata</button>
        <button class="btn-ghost" data-act="week">Haftasını Gör</button>
        ${state.role==="owner"?`<button class="btn-ghost" data-act="empathy" style="font-size:11px">👁 Gözünden Gör</button>`:""}`;
      acts.querySelectorAll("[data-act]").forEach(b=>{
        const act=(b as HTMLElement).dataset.act!;
        if(act==="empathy"){b.addEventListener("click",()=>{
          const targetRole=Object.entries(ROLE_PROFILES).find(([,p])=>p.person===mm.name);
          if(targetRole){closeSheet();state.empathy=targetRole[0];renderEmpathy();goHQ();playEntrance()}
          else fakeAct("Bu kişi için empati modu desteklenmiyor")});return}
        b.addEventListener("click",()=>fakeAct(act==="msg"?"Mesaj gönderildi":act==="assign"?"Görev atandı":"Hafta görünümü açıldı"));
      });
      back.onclick=()=>{state.person=null;renderSheet();renderCrumbs()};
      return;
    }

    back.classList.remove("show");
    const openT=(r.tasks||[]).filter(x=>!x.done).length,blocked=(r.tasks||[]).filter(x=>x.urgent&&!x.done).length,done=(r.tasks||[]).filter(x=>x.done).length;
    const isInbox=r.id==="inbox";
    body.innerHTML=`
      <div class="sh-title">${r.name}</div>
      <div class="sh-sub">${F().name} katı</div>
      <span class="sh-status ${st==="ahead"?"ok":st}">${rLabel(r)}</span>
      <div class="sh-sec mission-block"><h6>Misyon</h6>
        <b>${r.mission}</b>
        ${r.pct?`<div class="mbar"><i style="width:${r.pct}%;background:${stColor(st)}"></i></div>
        <div class="mbar-lab"><span>%${r.pct}</span><span>${r.note}</span></div>`:`<div class="sh-sub">${r.note}</div>`}
      </div>
      ${r.wrong.length?`<div class="sh-sec"><h6>Ne ters gidiyor?</h6><div class="wrong-box">${r.wrong.map(w=>`<div class="wi">${w}</div>`).join("")}</div></div>`:""}
      ${r.members.length?`<div class="sh-sec"><h6>Ekip</h6><div class="chips">
        ${r.members.map(mm=>`<button class="pchip" data-person="${mm.name}">
          <span class="pav" style="background:${avc(mm.name)}">${initials(mm.name)}</span>${mm.name.split(" ")[0]}
          <span class="pst" style="background:${ST[pSt(mm)].c}"></span></button>`).join("")}</div></div>`:""}
      <div class="sh-sec duo">
        <div class="cell"><b>${r.mile[0]}</b><span>${r.mile[1]}</span></div>
        <div class="cell"><b>${isInbox?openT+" bekleyen":openT+" açık"}</b><span>${blocked?blocked+" engelli · ":""}${done} bitti</span></div>
      </div>
      ${isInbox?`<div class="sh-sec"><h6>Seni bekleyenler</h6>
        ${(r.tasks||[]).map(tk=>`<div class="li"><span class="ldot" style="background:${tk.urgent?"var(--risk)":"var(--warn)"}"></span>
          <span style="flex:1">${tk.tt}<div class="lmeta">${tk.day}</div></span>
          <button class="btn-ghost" style="padding:4px 10px;font-size:11px" data-act="approve">Onayla</button></div>`).join("")}</div>`:""}`;
    acts.innerHTML=`<button class="btn-lime" data-act="work-list">İşleri Gör</button>
      <button class="btn-ghost" data-act="meeting">Toplantı</button>
      <button class="btn-ghost" data-act="ask-sheet">Ask AI</button>`;
    body.querySelectorAll("[data-person]").forEach(el=>el.addEventListener("click",()=>{
      state.person=(el as HTMLElement).dataset.person!;renderSheet();renderCrumbs();
    }));
    body.querySelectorAll("[data-act=approve]").forEach(b=>b.addEventListener("click",()=>fakeAct("Onaylandı")));
    acts.querySelector("[data-act=work-list]")?.addEventListener("click",()=>fakeAct("İş listesi"));
    acts.querySelector("[data-act=meeting]")?.addEventListener("click",()=>fakeAct("Toplantı başlatıldı"));
    acts.querySelector("[data-act=ask-sheet]")?.addEventListener("click",openAsk);
  }

  function fakeAct(msg: string){
    const n=$("#shqReplayNote");if(!n)return;
    n.textContent=msg+" — prototipte temsili";n.classList.add("show");
    clearTimeout((n as any)._t);(n as any)._t=setTimeout(()=>{n.classList.remove("show");renderReplayNote()},1600);
  }

  function renderWork(){
    const f=F();const all=f.rooms.flatMap(r=>(r.tasks||[]).map(tk=>({...tk,room:r})));
    const grp=(title: string,arr: typeof all,color: string)=>arr.length?`<div class="wgroup"><h4>${title} · ${arr.length}</h4>
      ${arr.map(tk=>`<div class="wrow" data-room="${tk.room.id}"><span class="dot" style="background:${color}"></span>
        <span class="wt">${tk.tt}</span><span class="wr">${tk.room.name} · ${tk.who}</span>
        <span class="wd ${tk.urgent?"urgent":""}">${tk.day}${tk.urgent?" !":""}</span></div>`).join("")}</div>`:"";
    const ww=$("#workWrap");if(!ww)return;
    ww.innerHTML=grp("Engelli / Acil",all.filter(x=>!x.done&&x.urgent),"var(--risk)")+
      grp("Açık",all.filter(x=>!x.done&&!x.urgent),"var(--lime)")+
      grp("Bitti",all.filter(x=>x.done),"var(--ok)");
    root.querySelectorAll(".wrow").forEach(el=>el.addEventListener("click",()=>{
      state.mode="office";renderModeUI();applyMode();openSheet((el as HTMLElement).dataset.room!)}));
  }

  function goFloor(id: string){
    state.floor=id;state.room=null;state.person=null;
    $("#hqView")?.classList.remove("on");$("#floorView")?.classList.add("on");
    renderModeUI();renderPlan();renderWork();applyMode();renderCrumbs();
  }
  function goHQ(){
    closeAsk();closePopup();
    $("#shqSheet")?.classList.remove("open");
    state.view="hq";state.floor=null;state.room=null;state.person=null;
    $("#floorView")?.classList.remove("on");$("#hqView")?.classList.add("on");
    renderHQ();renderCrumbs();
  }
  function renderCrumbs(){
    const c=$("#shqCrumbs");if(!c)return;
    let h=`<button data-nav="hq">Spark HQ</button>`;
    if(state.floor){const f=F();h+=`<span class="sep">/</span>`;
      h+=state.room?`<button data-nav="floor">${f.name}</button>`:`<span class="cur">${f.name}</span>`}
    if(state.room){const r=RM();if(r){h+=`<span class="sep">/</span>`;
      h+=state.person?`<button data-nav="room">${r.name}</button>`:`<span class="cur">${r.name}</span>`}}
    if(state.person)h+=`<span class="sep">/</span><span class="cur">${state.person}</span>`;
    c.innerHTML=h;
    c.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>{
      const n=(b as HTMLElement).dataset.nav;
      if(n==="hq")goHQ();
      if(n==="floor"){closePopup();closeSheet()}
      if(n==="room"){state.person=null;renderSheet();renderCrumbs()}
    }));
    const modes=$("#shqModes");if(modes)modes.classList.toggle("hidden",!state.floor);
  }
  function renderModeUI(){root.querySelectorAll("#shqModes button").forEach(b=>b.classList.toggle("on",(b as HTMLElement).dataset.m===state.mode))}
  function applyMode(){
    const isWork=state.mode==="work";
    const ph=$("#planHolder");if(ph)ph.style.display=isWork?"none":"flex";
    const ww=$("#workWrap");if(ww)ww.classList.toggle("on",isWork);
    if(!isWork)renderPlan();if(isWork)renderWork();
  }
  root.querySelectorAll("#shqModes button").forEach(b=>b.addEventListener("click",()=>{
    state.mode=(b as HTMLElement).dataset.m!;
    if(state.mode!=="office"&&state.room){closePopup();closeSheet()}
    renderModeUI();applyMode();
  }));

  function renderReplay(){
    const rep=$("#shqReplay");if(!rep)return;
    rep.innerHTML=`<span class="rl">REPLAY</span>`+TIMES.map((tt,i)=>
      `<button class="${i===state.time?"on":""}" data-t="${i}">${tt}</button>`).join("");
    rep.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
      state.time=+(b as HTMLElement).dataset.t!;renderReplay();renderReplayNote();
      if(!state.floor)renderHQ();else{renderPlan();if(state.room)renderSheet()}}));
    renderReplayNote();
  }
  function renderReplayNote(){
    const n=$("#shqReplayNote");if(!n)return;
    const note=NOTES[state.time];
    if(note&&state.time!==0){n.textContent="Ne değişti? · "+note;n.classList.add("show")}
    else n.classList.remove("show");
  }

  const ASK_QA_OWNER: Record<string,[string,string][]>={
   hq:[["Şirket bugün nasıl?","Bir kırmızı zincir var: Backend refactor → Android release → Launch Ops, launch 4 gün geride. Onun dışında Satış ve Finans yolunda; lobide 5 karar seni bekliyor."],
       ["En acil ne?","Growth bütçe onayı — 3 gündür bekliyor ve launch kreatiflerini blokluyor. 2 dakikanı alır."],
       ["Dünden beri ne değişti?","Growth Marketing de RİSKTE'ye düştü; gecikme 3'ten 4 güne çıktı. Kaynak aynı: Android release."]],
   growth:[["Growth neden riskte?","Kritik yol: Android release gecikti → Launch Ops 4 gün geride → kreatifler launch filmini beklediği için Growth Marketing de kaydı."],
       ["Launch'ı kim blokluyor?","İki kişi üzerinde düğümleniyor: Burak (Android build final, yarın) ve sen (launch filmi onayı + Growth bütçesi)."]],
   room:[["Bu ekip neden bu durumda?","Sheet'teki 'Ne ters gidiyor?' listesi kaynağı gösteriyor."],
       ["Kim yardıma ihtiyaç duyuyor?","Kırmızı halkalı kişiler gecikmiş işi olanlar."]]};
  const ASK_QA_MEMBER: Record<string,[string,string][]>={
   hq:[["Şirket bugün nasıl?","Ürün katı yolunda; senin kritik işin Android build (yarın). Şirket genelinde Growth katı kırmızı görünüyor — detayı kat liderinde."],
       ["Benim günüm nasıl?","3 görev, 1 toplantı. Android build final yarın bitirilmeli — launch'ı blokluyor."],
       ["Finans nasıl?","Bu alana erişimin yok. İstersen Onur'a soru iletebilirim ya da erişim isteği açabilirim."]],
   room:[["Ekibim nasıl?","Mobile Squad yolunda — v2.4 %72'de. Android build yarın bitirilmeli."],
       ["Kime sormalıyım?","Backend refactor için Diren'e, store metadata için İpek'e sor."]]};
  const ASK_QA_LEAD: Record<string,[string,string][]>={
   hq:[["Şirket bugün nasıl?","Growth katın riskte — 4 gün gecikme. Ürün yolunda, Satış yolunda. Finans detayına erişimin yok."],
       ["Katım nasıl?","2 ekip riskte (Growth Marketing, Launch Ops), 1 ileride (Product), 3 yolunda. Kritik yol: Android release."],
       ["Dünden beri ne değişti?","Gecikme 3'ten 4 güne çıktı. Growth Marketing de RİSKTE'ye düştü."]],
   growth:[["Launch'ı kim blokluyor?","Burak (Android build final) ve Çağan (launch filmi onayı + bütçe). İkisi de yarın/bugün çözülebilir."],
       ["Kreatifler ne zaman hazır?","Launch filmi onayına bağlı — Çağan'dan geldiğinde kreatif üretimi başlar. Tahmini: 2-3 gün."]],
   room:[["Bu ekip neden bu durumda?","Sheet'teki 'Ne ters gidiyor?' listesi kaynağı gösteriyor."],
       ["Kim yardıma ihtiyaç duyuyor?","Kırmızı halkalı kişiler gecikmiş işi olanlar."]]};
  function askQA(){
    const r=state.role;
    if(r==="member")return ASK_QA_MEMBER;
    if(r==="lead")return ASK_QA_LEAD;
    return ASK_QA_OWNER;
  }
  function askContext(){
    if(state.person)return{key:"room",label:`Kişi · ${state.person}`};
    const qa=askQA();
    if(state.room)return{key:qa[state.floor!]?state.floor!:"room",label:`Oda · ${RM()?.name}`};
    if(state.floor)return{key:qa[state.floor]?state.floor:"room",label:`Kat · ${F().name}`};
    return{key:"hq",label:"Şirket geneli"};
  }
  function openAsk(){
    const ctx=askContext();
    const actx=$("#shqAskCtx");if(actx)actx.textContent="Bağlam: "+ctx.label;
    const th=$("#shqAskThread");if(th)th.innerHTML="";
    const qa=askQA();const sugs=qa[ctx.key]||qa.room||[];
    const sugEl=$("#shqAskSugs");
    if(sugEl){
      sugEl.innerHTML=sugs.map((q,i)=>`<button data-i="${i}">${q[0]}</button>`).join("");
      sugEl.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
        const[q,a]=sugs[+(b as HTMLElement).dataset.i!];
        if(th){th.innerHTML+=`<div class="ask-q">${q}</div><div class="ask-a">${a}</div>`;th.scrollTop=th.scrollHeight}
      }));
    }
    $("#shqAskPanel")?.classList.add("open");
    ($("#shqAskInput") as HTMLInputElement|null)?.focus();
  }
  function closeAsk(){$("#shqAskPanel")?.classList.remove("open")}
  $("#shqAskBtn")?.addEventListener("click",()=>$("#shqAskPanel")?.classList.contains("open")?closeAsk():openAsk());
  ($("#shqAskInput") as HTMLInputElement|null)?.addEventListener("keydown",(e: KeyboardEvent)=>{
    if(e.key!=="Enter")return;const q=(e.target as HTMLInputElement).value.trim();if(!q)return;
    const lq=q.toLocaleLowerCase("tr");
    for(const f of FLOORS){
      if(f.name.toLocaleLowerCase("tr").includes(lq)){
        const fv=floorVis(f.id);
        if(fv==="shape"){const th2=$("#shqAskThread");
          if(th2){th2.innerHTML+=`<div class="ask-q">${q}</div><div class="ask-a">O kata anahtarın yok. İstersen erişim isteği açabilirim.</div>`;th2.scrollTop=th2.scrollHeight}
          (e.target as HTMLInputElement).value="";return}
        closeAsk();goFloorAnywhere(f.id);(e.target as HTMLInputElement).value="";return}
      for(const r of f.rooms){
        if(r.name.toLocaleLowerCase("tr").includes(lq)){
          const rv3=roomVis(f.id,r.id);
          if(rv3==="shape"){const th2=$("#shqAskThread");
            if(th2){th2.innerHTML+=`<div class="ask-q">${q}</div><div class="ask-a">O alana anahtarın yok. İstersen erişim isteği açabilirim.</div>`;th2.scrollTop=th2.scrollHeight}
            (e.target as HTMLInputElement).value="";return}
          closeAsk();goFloorAnywhere(f.id,()=>{if(rv3==="content")openSheet(r.id)});(e.target as HTMLInputElement).value="";return}
        for(const mm of r.members)
          if(mm.name.toLocaleLowerCase("tr").includes(lq)){closeAsk();goFloorAnywhere(f.id,()=>openSheet(r.id,mm.name));(e.target as HTMLInputElement).value="";return}
      }}
    const th=$("#shqAskThread");
    if(th){th.innerHTML+=`<div class="ask-q">${q}</div><div class="ask-a">Prototipte bu soru için hazır yanıt yok — gerçek üründe Company Graph üzerinde çalışan AI'a gider.</div>`;
    th.scrollTop=th.scrollHeight}
    (e.target as HTMLInputElement).value="";
  });
  function goFloorAnywhere(id: string,after?: ()=>void){
    if(!state.floor){goFloor(id);if(after)setTimeout(after,250)}
    else{state.floor=id;state.room=null;state.person=null;$("#shqSheet")?.classList.remove("open");
      renderPlan();renderWork();applyMode();renderCrumbs();if(after)setTimeout(after,80)}
  }

  const keyHandler=(e: KeyboardEvent)=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();if($("#shqAskPanel")?.classList.contains("open")){closeAsk()}else{openAsk()}return}
    if(e.key==="Escape"){
      if($("#shqAskPanel")?.classList.contains("open")){closeAsk();return}
      if($("#shqPopup")?.classList.contains("show")){closePopup();return}
      if(state.person&&$("#shqSheet")?.classList.contains("open")){state.person=null;renderSheet();renderCrumbs();return}
      if(state.room){closeSheet();return}
      if(state.floor){goHQ();return}
    }
  };
  document.addEventListener("keydown",keyHandler);

  $("#shqShClose")?.addEventListener("click",closeSheet);
  $("#planHolder")?.addEventListener("click",(e: Event)=>{
    if(!(e.target as Element).closest(".room-g")){
      if($("#shqPopup")?.classList.contains("show"))closePopup();
      else if(state.room&&$("#shqSheet")?.classList.contains("open"))closeSheet()
    }
  });

  function showDoor(name: string,desc: string,actionLabel: string){
    const d=$("#shqDoor");if(!d)return;
    d.innerHTML=`<div class="door-icon">🚪</div>
      <div class="door-title">${name}</div>
      <div class="door-sub">${desc}</div>
      <div class="door-actions">
        <button class="btn-lime" data-act="request">${actionLabel}</button>
        <button class="btn-ghost" data-act="close">Kapat</button>
      </div>`;
    d.classList.add("show");
    d.querySelector("[data-act=request]")?.addEventListener("click",()=>{
      fakeAct("Erişim isteği gönderildi — Lobi'deki Inbox'a düştü");closeDoor()});
    d.querySelector("[data-act=close]")?.addEventListener("click",closeDoor);
  }
  function showDoorPulse(rid: string){
    const r=F().rooms.find(x=>x.id===rid)!;
    const st=rSt(r);
    const d=$("#shqDoor");if(!d)return;
    d.innerHTML=`<div class="door-icon">🚪</div>
      <div class="door-title">${r.name}</div>
      <div class="door-sub" style="text-align:left">
        <div style="margin-bottom:6px">${r.members.length} kişi · <span style="color:${stColor(st)};font-weight:700">${ST[rSt(r)].t}</span></div>
        <div style="color:var(--dim);font-size:12px">İçerik detaylarını görmek için erişim gerekiyor.</div>
      </div>
      <div class="door-actions">
        <button class="btn-lime" data-act="request">Erişim İste</button>
        <button class="btn-ghost" data-act="close">Kapat</button>
      </div>`;
    d.classList.add("show");
    d.querySelector("[data-act=request]")?.addEventListener("click",()=>{
      fakeAct("Erişim isteği gönderildi");closeDoor()});
    d.querySelector("[data-act=close]")?.addEventListener("click",closeDoor);
  }
  function closeDoor(){$("#shqDoor")?.classList.remove("show")}

  function playEntrance(){
    const p=activeRole();
    const el=$("#shqEntrance");if(!el)return;
    el.innerHTML=`<div class="ent-greet">${p.greeting}</div>
      <div class="ent-sub">${p.roleSub}</div>
      <div class="ent-brief">${p.briefing.map(b=>`<div class="eb-line">${b}</div>`).join("")}</div>
      <div class="ent-hint">Tıkla veya Enter ile başla</div>`;
    el.classList.add("active");el.classList.remove("fade");
    requestAnimationFrame(()=>{
      el.querySelector(".ent-greet")?.classList.add("in");
      el.querySelector(".ent-sub")?.classList.add("in");
      el.querySelector(".ent-brief")?.classList.add("in");
      el.querySelector(".ent-hint")?.classList.add("in");
    });
    const dismiss=()=>{
      el.removeEventListener("click",dismiss);
      document.removeEventListener("keydown",dismissKey);
      el.classList.add("fade");
      setTimeout(()=>{el.classList.remove("active","fade");navigateHome()},600);
    };
    const dismissKey=(e: KeyboardEvent)=>{if(e.key==="Enter"||e.key===" ")dismiss()};
    el.addEventListener("click",dismiss);
    document.addEventListener("keydown",dismissKey);
  }
  function navigateHome(){
    const p=activeRole();
    if(!p.homeFloor){renderHQ();renderCrumbs();return}
    goFloor(p.homeFloor);
    if(p.homeRoom){
      setTimeout(()=>{
        openSheet(p.homeRoom!,state.role==="member"?p.person:undefined);
      },300);
    }
  }
  function renderEmpathy(){
    const el=$("#shqEmpathy");if(!el)return;
    if(state.empathy){
      const ep=ROLE_PROFILES[state.empathy];
      el.innerHTML=`👁 ${ep.person} gözünden bakıyorsun <button data-act="exit">Çık</button>`;
      el.classList.add("show");
      el.querySelector("[data-act=exit]")?.addEventListener("click",()=>{
        state.empathy=null;renderEmpathy();goHQ();renderHQ();renderCrumbs()});
    }else{
      el.classList.remove("show");
    }
  }
  function switchRole(role: string){
    state.role=role;state.empathy=null;
    goHQ();renderEmpathy();
    setTimeout(()=>playEntrance(),100);
  }

  const roleSelect=$("#shqRoleSelect") as HTMLSelectElement|null;
  if(roleSelect){
    roleSelect.addEventListener("change",()=>switchRole(roleSelect.value));
  }

  renderHQ();renderCrumbs();renderReplay();renderEmpathy();
  playEntrance();

  return ()=>{document.removeEventListener("keydown",keyHandler)};
}

export default function SparkHQ() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const cleanup = initSparkHQ(containerRef.current);
    return cleanup;
  }, []);

  return (
    <AppLayout>
      <style>{SPARK_HQ_CSS}</style>
      <div ref={containerRef} className="shq" style={{height:"100%"}}>
        <div className="topbar">
          <div className="brand"><div className="brand-mark">S</div>Spark <span>HQ</span></div>
          <nav className="crumbs" id="shqCrumbs"></nav>
          <div className="mode-tabs hidden" id="shqModes">
            <button data-m="office" className="on">Ofis</button>
            <button data-m="pulse">Nabız</button>
            <button data-m="work">İş</button>
          </div>
          <div className="role-sw" id="shqRoleSw">
            <span className="role-label">Rol</span>
            <select id="shqRoleSelect">
              <option value="owner">Owner (Çağan)</option>
              <option value="admin">Admin (Onur)</option>
              <option value="lead">Kat Lideri (Şevval)</option>
              <option value="member">Üye (Burak)</option>
            </select>
          </div>
        </div>
        <div id="shqStage" style={{flex:1,position:"relative",minHeight:0,overflow:"hidden"}}>
          <div className="view on" id="hqView">
            <div className="hq-hero">
              <h2>Şirket nasıl gidiyor?</h2>
              <p>Bir kata dokun — <em>içine gir.</em></p>
            </div>
            <div className="pulse-strip" id="hqKpis"></div>
            <div id="hqBuilding"></div>
          </div>
          <div className="view" id="floorView">
            <div className="floor-header" style={{width:"100%",padding:"0 24px"}}>
              <h2 id="floorTitle"></h2><span className="fh-sub" id="floorSub"></span>
            </div>
            <div className="plan-holder" id="planHolder"></div>
            <div id="workWrap"></div>
          </div>
          <div id="shqTooltip"></div>
          <div id="shqPopup"></div>
          <div id="shqDoor"></div>
          <div id="shqEntrance"></div>
          <div className="empathy-bar" id="shqEmpathy"></div>
          <aside id="shqSheet">
            <div className="sheet-head"><button className="sh-back" id="shBack"></button><button className="sh-x" id="shqShClose">✕</button></div>
            <div className="sheet-body" id="sheetBody"></div>
            <div className="sheet-actions" id="sheetActions"></div>
          </aside>
          <div id="shqReplay"></div>
          <div id="shqReplayNote"></div>
          <button id="shqAskBtn">Ask HQ <kbd>⌘K</kbd></button>
          <div id="shqAskPanel">
            <div className="ask-head"><b>Ask HQ</b><div className="ask-ctx" id="shqAskCtx"></div></div>
            <div className="ask-thread" id="shqAskThread"></div>
            <div className="ask-sugs" id="shqAskSugs"></div>
            <div className="ask-input"><input id="shqAskInput" placeholder="Sor ya da bir yere git…" /></div>
            <div className="hint-foot">Enter = git/sor · Esc = kapat</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
