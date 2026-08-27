import { useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";

const SPARK_HQ_CSS = `
.shq{--bg:#F6F6F3;--shell:#F6F6F3;--panel:#FFF;--card:#FFF;--hover:#F0F0ED;--float:#FFF;
  --border:rgba(0,0,0,.08);--border-hi:rgba(0,0,0,.14);
  --ink:#14161F;--muted:#6B6E7A;--dim:#9DA1AD;
  --accent:#6D5EF4;--accent-soft:rgba(109,94,244,.10);--accent-mid:rgba(109,94,244,.20);--accent-glow:rgba(109,94,244,.06);
  --ok:#17A34A;--ok-soft:rgba(23,163,74,.10);
  --warn:#E9A23B;--warn-soft:rgba(233,162,59,.10);
  --risk:#E0342B;--risk-soft:rgba(224,52,43,.10);
  --line:#EAECF2;--line2:#D5D9E4;--corridor:#F1F2F5;--woodTop:#F9F1E3;
  --elev1:0 1px 0 0 rgba(255,255,255,.6) inset,0 1px 2px 0 rgba(20,22,31,.06),0 8px 24px -8px rgba(20,22,31,.12);
  --elev2:0 1px 0 0 rgba(255,255,255,.7) inset,0 2px 6px -1px rgba(20,22,31,.08),0 24px 60px -16px rgba(20,22,31,.18);
  --radius:12px;--radius-sm:8px;--radius-xs:6px;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:13px;
  color:var(--ink);-webkit-font-smoothing:antialiased;
  display:flex;flex-direction:column;height:100%;overflow:hidden;letter-spacing:-.003em;position:relative}
.shq *,.shq *::before,.shq *::after{box-sizing:border-box;margin:0;padding:0}
.shq button{font:inherit;cursor:pointer;color:inherit}
.shq ::-webkit-scrollbar{width:5px}.shq ::-webkit-scrollbar-track{background:transparent}
.shq ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:3px}
.shq .topbar{height:44px;display:flex;align-items:center;gap:12px;padding:0 20px;
  background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;z-index:10}
.shq .brand{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;letter-spacing:-.02em;white-space:nowrap}
.shq .brand-mark{width:22px;height:22px;background:var(--accent);border-radius:6px;display:flex;align-items:center;
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
.shq .mode-tabs button.on{background:var(--accent-soft);color:var(--accent)}
.shq .mode-tabs.hidden{visibility:hidden}
.shq #shqStage{flex:1;position:relative;min-height:0;overflow:hidden}
.shq .view{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center}
.shq .view.on{display:flex}
.shq .hq-hero{text-align:center;margin-bottom:12px}
.shq .hq-hero h2{font-size:22px;font-weight:700;letter-spacing:-.03em}
.shq .hq-hero p{font-size:13px;color:var(--muted);margin-top:4px}
.shq .hq-hero em{font-style:normal;color:var(--accent)}
.shq .pulse-strip{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;justify-content:center}
.shq .ps-item{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums}
.shq .ps-item b{font-weight:800;font-size:15px;color:var(--ink)}
.shq .ps-item.risk b{color:var(--risk)}.shq .ps-item.ok b{color:var(--ok)}
.shq .ps-dot{width:6px;height:6px;border-radius:50%}
.shq #hqBuilding{width:min(480px,92vw);cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
.shq #hqBuilding.dragging{cursor:grabbing}
.shq #hqBuilding svg{width:100%;height:auto;pointer-events:none}
.shq #hqBuilding svg *{pointer-events:auto}
.shq .cam-ctrl{display:flex;align-items:center;gap:8px;margin-top:6px;justify-content:center}
.shq .cam-hint{font-size:10.5px;color:var(--dim);opacity:.5;transition:opacity .5s}
.shq .cam-hint.faded{opacity:0}
.shq .cam-reset{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-xs);padding:2px 8px;font-size:11px;color:var(--dim);transition:all .15s;opacity:0;pointer-events:none}
.shq .cam-reset.show{opacity:1;pointer-events:auto}
.shq .cam-reset:hover{background:var(--hover);color:var(--ink)}
.shq .bfloor{cursor:pointer}
.shq .bfloor .face-top{transition:fill .2s}
.shq .bfloor:hover .face-top{fill:#E8E8E5 !important}
.shq .bfloor:hover .fl-glow{opacity:1 !important}
.shq .bf-name{font-size:13px;font-weight:700;fill:var(--ink);pointer-events:none;letter-spacing:-.01em}
.shq .bf-stat{font-size:10px;fill:var(--muted);pointer-events:none;font-weight:600}
.shq .bf-stat.risk{fill:var(--risk)}.shq .bf-stat.warn{fill:var(--warn)}.shq .bf-stat.ok{fill:var(--ok)}
.shq .bfloor.draggable{cursor:grab}
.shq .bfloor.dragging{cursor:grabbing;opacity:.88}
.shq .bfloor.dragging .face-top{fill:#E8E8E5 !important}
.shq .grip{opacity:0;transition:opacity .15s;fill:var(--dim);font-size:13px;font-weight:800}
.shq .bfloor.draggable:hover .grip{opacity:1}
.shq #dropInd{stroke:var(--accent);stroke-width:2.5;stroke-dasharray:7 5;opacity:0;pointer-events:none}
.shq #dropInd.show{opacity:1}
.shq .drag-hint{font-size:11px;color:var(--dim);margin-top:5px;text-align:center}
.shq .fctl{opacity:0;transition:opacity .15s;cursor:pointer}
.shq .bfloor:hover .fctl{opacity:1}
.shq .fctl circle{fill:var(--card);stroke:var(--border);stroke-width:1}
.shq .fctl:hover circle{stroke:var(--accent)}
.shq .fctl text{font-size:9.5px;fill:var(--muted);text-anchor:middle;font-weight:700;pointer-events:none}
.shq .fctl:hover text{fill:var(--accent)}
.shq .fctl.del:hover circle{stroke:var(--risk)}
.shq .fctl.del:hover text{fill:var(--risk)}
.shq #shqModal{position:absolute;inset:0;background:rgba(20,22,31,.35);display:none;align-items:center;justify-content:center;z-index:60}
.shq #shqModal.open{display:flex}
.shq .modal-card{width:min(400px,92vw);background:var(--panel);border:1px solid var(--border-hi);border-radius:var(--radius);box-shadow:var(--elev2);padding:22px}
.shq .modal-card h3{font-size:16px;font-weight:700;letter-spacing:-.01em;margin-bottom:14px}
.shq .mnote{font-size:13px;color:var(--muted);line-height:1.55;margin-bottom:6px}
.shq .mfield{margin-bottom:12px}
.shq .mfield label{display:block;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);font-weight:700;margin-bottom:6px}
.shq .mfield input{width:100%;border:1px solid var(--border);border-radius:var(--radius-xs);padding:10px 12px;font:inherit;font-size:13px;outline:none;background:var(--card);color:var(--ink)}
.shq .mfield input:focus{border-color:var(--accent)}
.shq .modal-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:18px}
.shq .hq-tools{display:flex;align-items:center;gap:12px;margin-top:6px;flex-wrap:wrap;justify-content:center}
.shq .sortseg{display:flex;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:3px;gap:2px}
.shq .sortseg span{font-size:10.5px;color:var(--dim);align-self:center;padding:0 6px 0 9px;font-weight:700;letter-spacing:.06em}
.shq .sortseg button{border:none;background:none;font-size:12px;font-weight:600;color:var(--muted);padding:5px 11px;border-radius:7px}
.shq .sortseg button.on{background:var(--accent-soft);color:var(--accent)}
.shq .addbtn{display:flex;align-items:center;gap:6px;border:1px dashed var(--border);background:var(--card);
  border-radius:10px;padding:8px 14px;font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer}
.shq .addbtn:hover{border-color:var(--accent);color:var(--accent)}
.shq .chip{border:1px solid var(--border);background:var(--card);border-radius:10px;padding:6px 11px;
  font-size:12px;font-weight:600;color:var(--muted);display:flex;align-items:center;gap:5px;cursor:pointer}
.shq .chip:hover{border-color:var(--accent);color:var(--accent)}
.shq .empty-floor{text-align:center;color:var(--muted);padding:40px}
.shq .empty-floor .ico{font-size:38px;margin-bottom:10px}
.shq .empty-floor p{font-size:13px;margin-bottom:14px}
.shq .fade-scale{transition:opacity .32s ease,transform .32s ease}
.shq .leaving-in{opacity:0;transform:scale(1.5)}
.shq .leaving-out{opacity:0;transform:scale(.8)}
.shq .entering{animation:shqEnterScale .38s ease both}
@keyframes shqEnterScale{from{opacity:0;transform:scale(1.12)}to{opacity:1;transform:scale(1)}}
.shq #floorView{padding:16px 24px 0;justify-content:flex-start;align-items:stretch}
.shq .floor-header{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.shq .floor-header h2{font-size:18px;font-weight:700;letter-spacing:-.02em}
.shq .floor-header .fh-sub{font-size:12px;color:var(--dim)}
.shq .plan-holder{flex:1;min-height:0;position:relative;overflow:auto;padding:16px 24px 80px;display:flex;align-items:flex-start;justify-content:center}
.shq .room-poly{fill:var(--woodTop);stroke:rgba(0,0,0,.08);stroke-width:1;cursor:pointer;transition:fill .2s,stroke .2s}
.shq .room-g:hover .room-poly{fill:#F0E8D6;stroke:rgba(0,0,0,.12)}
.shq .room-g.sel .room-poly{stroke:var(--accent);stroke-width:1.6;fill:rgba(109,94,244,.04)}
.shq .pulse .room-poly.p-risk{fill:rgba(224,52,43,.10);stroke:rgba(224,52,43,.3)}
.shq .pulse .room-poly.p-warn{fill:rgba(233,162,59,.08);stroke:rgba(233,162,59,.25)}
.shq .pulse .room-poly.p-ok{fill:rgba(23,163,74,.06);stroke:rgba(23,163,74,.18)}
.shq .furn{fill:#E2E5EE;stroke:rgba(0,0,0,.06);stroke-width:.7;pointer-events:none}
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
.shq .rcard.sel rect{stroke:var(--accent);stroke-width:1.4}
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
.shq .pop-wrong .pw-item::before{content:'>';font-weight:800}
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
.shq .btn-lime{background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);
  padding:7px 14px;font-size:12px;font-weight:700;transition:background .15s,transform .1s}
.shq .btn-lime:hover{background:#5B4ED4}.shq .btn-lime:active{transform:scale(.97)}
.shq .btn-ghost{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);
  padding:7px 12px;font-size:12px;font-weight:600;color:var(--muted);transition:border-color .15s,color .15s}
.shq .btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
.shq .btn-danger{background:var(--risk-soft);border:1px solid var(--risk);border-radius:var(--radius-sm);
  padding:7px 14px;font-size:12px;font-weight:700;color:var(--risk);transition:background .15s,transform .1s}
.shq .btn-danger:hover{background:rgba(224,52,43,.18)}.shq .btn-danger:active{transform:scale(.97)}
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
.shq .goalline .gbar i{display:block;height:100%;background:var(--accent)}
.shq .goalline .gp{margin-left:auto;font-weight:700;font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums}
.shq #shqSheet{position:absolute;top:0;right:0;bottom:0;width:min(420px,94vw);background:var(--panel);
  border-left:1px solid var(--border);box-shadow:var(--elev2);transform:translateX(105%);
  transition:transform .28s cubic-bezier(.32,.72,.35,1);display:flex;flex-direction:column;z-index:24}
.shq #shqSheet.open{transform:none}
.shq .sheet-head{display:flex;align-items:center;gap:8px;padding:14px 18px 0;flex-shrink:0}
.shq .sh-back{background:none;border:none;color:var(--dim);font-size:12px;padding:0;display:none;transition:color .15s}
.shq .sh-back.show{display:inline}.shq .sh-back:hover{color:var(--accent)}
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
.shq .wrong-box .wi::before{content:'>';font-weight:800}
.shq .chips{display:flex;flex-wrap:wrap;gap:6px}
.shq .pchip{display:flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:99px;
  padding:4px 10px 4px 4px;font-size:12px;font-weight:600;background:var(--card);cursor:pointer;transition:border-color .15s}
.shq .pchip:hover{border-color:var(--accent)}
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
.shq .wrow:hover{border-color:var(--accent)}
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
.shq #shqReplay button.on{background:var(--accent);color:var(--shell)}
.shq #shqReplayNote{position:absolute;left:50%;bottom:56px;transform:translateX(-50%);background:var(--float);
  border:1px solid var(--border-hi);color:var(--ink);font-size:12px;padding:8px 14px;
  border-radius:var(--radius-sm);max-width:min(500px,90vw);text-align:center;z-index:15;display:none;box-shadow:var(--elev1)}
.shq #shqReplayNote.show{display:block}
.shq #shqAskBtn{position:absolute;right:16px;bottom:14px;z-index:15;display:flex;align-items:center;gap:8px;
  background:var(--accent);color:var(--shell);border:none;border-radius:99px;padding:9px 16px;
  font-size:12.5px;font-weight:700;box-shadow:var(--elev1);transition:background .15s,transform .1s}
.shq #shqAskBtn:hover{background:#5B4ED4}.shq #shqAskBtn:active{transform:scale(.97)}
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
.shq .ask-q{align-self:flex-end;background:var(--accent-soft);color:var(--accent);font-weight:600;font-size:12px;
  padding:7px 12px;border-radius:12px 12px 4px 12px;max-width:88%}
.shq .ask-a{align-self:flex-start;background:var(--card);font-size:12px;line-height:1.5;padding:9px 12px;
  border-radius:12px 12px 12px 4px;max-width:92%;color:var(--muted)}
.shq .ask-sugs{display:flex;flex-direction:column;gap:4px;padding:0 14px 8px}
.shq .ask-sugs button{text-align:left;border:1px solid var(--border);background:var(--card);border-radius:var(--radius-sm);
  padding:7px 10px;font-size:12px;color:var(--muted);transition:border-color .15s,color .15s}
.shq .ask-sugs button:hover{border-color:var(--accent);color:var(--accent)}
.shq .ask-input{display:flex;border-top:1px solid var(--border)}
.shq .ask-input input{flex:1;border:none;outline:none;font:inherit;font-size:12.5px;padding:11px 14px;
  background:transparent;color:var(--ink)}
.shq .ask-input input::placeholder{color:var(--dim)}
.shq .hint-foot{font-size:10px;color:var(--dim);padding:0 14px 8px}
.shq .role-sw{display:flex;align-items:center;gap:2px;margin-left:8px}
.shq .role-av{width:32px;height:32px;border-radius:50%;border:2px solid var(--border);cursor:pointer;
  transition:all .2s;display:flex;align-items:center;justify-content:center;background:var(--card);position:relative;flex-shrink:0}
.shq .role-av:hover{border-color:var(--accent-mid);transform:scale(1.1)}
.shq .role-av.on{border-color:var(--accent);box-shadow:0 0 0 2px rgba(109,94,244,.18)}
.shq .role-av svg{width:26px;height:26px;border-radius:50%;pointer-events:none}
.shq .role-av .role-tip{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:6px;
  background:var(--float);border:1px solid var(--border-hi);border-radius:var(--radius-xs);padding:5px 10px;
  font-size:10.5px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;z-index:30;box-shadow:var(--elev1)}
.shq .role-av:hover .role-tip{opacity:1}
.shq .role-av .role-badge-icon{position:absolute;bottom:-3px;right:-3px;font-size:10px;line-height:1;
  background:var(--card);border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;
  border:1px solid var(--border);pointer-events:none}
.shq .empathy-bar{display:none;align-items:center;gap:8px;background:rgba(109,94,244,.08);
  border:1px solid rgba(109,94,244,.15);border-radius:99px;padding:4px 12px 4px 8px;font-size:11px;color:var(--accent);font-weight:600;
  position:absolute;top:52px;left:50%;transform:translateX(-50%);z-index:16}
.shq .empathy-bar.show{display:flex}
.shq .empathy-bar button{background:none;border:none;color:var(--dim);font-size:11px;padding:2px 6px;cursor:pointer}
.shq .empathy-bar button:hover{color:var(--accent)}
.shq .bfloor.frosted .face-top{opacity:.55}
.shq .bfloor.frosted .bf-stat{opacity:.5}
.shq .bfloor.frosted:hover .face-top{fill:#ECECE8 !important}
.shq .bfloor.locked .face-top{opacity:.4}
.shq .bfloor.locked .bf-name{opacity:.5}
.shq .bfloor.locked .bf-stat{display:none}
.shq .bfloor.locked:hover .face-top{fill:#EFEFEC !important}
.shq .room-g.frosted .room-poly{fill:rgba(0,0,0,.02)!important;stroke-dasharray:4 3}
.shq .room-g.frosted .person-dot,.shq .room-g.frosted .p-init{opacity:.25}
.shq .room-g.frosted .p-name{display:none}
.shq .room-g.frosted .furn{opacity:.3}
.shq .room-g.locked .room-poly{fill:rgba(0,0,0,.015)!important;stroke-dasharray:6 4;stroke:rgba(0,0,0,.06)!important}
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
.shq .ent-avatar{margin-bottom:16px;opacity:0;transform:scale(.5);transition:opacity .5s,transform .5s .05s}
.shq .ent-avatar.in{opacity:1;transform:scale(1)}
.shq .ent-avatar svg{width:72px;height:72px;filter:drop-shadow(0 4px 12px rgba(0,0,0,.4))}
.shq .conn-line{stroke-width:1.5;fill:none;opacity:.5;stroke-dasharray:4 3}
.shq .conn-badge{font-size:7px;fill:var(--dim);text-anchor:middle;font-weight:700;letter-spacing:.04em}
.shq .room-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;
  width:100%;max-width:1100px;margin:0 auto;align-content:start}
.shq .room-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);
  padding:16px;cursor:pointer;transition:border-color .2s,box-shadow .2s;display:flex;flex-direction:column;gap:8px}
.shq .room-card:hover{border-color:var(--border-hi);box-shadow:var(--elev1)}
.shq .room-card.active{border-color:var(--accent);box-shadow:0 0 0 1px rgba(109,94,244,.15)}
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
.shq .rc-warn::before{content:'>';font-weight:800;flex-shrink:0}
.shq .rc-team{display:flex;gap:0;margin-top:auto;padding-top:4px}
.shq .rc-av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:8px;font-weight:800;color:#fff;border:2px solid var(--card);margin-left:-4px;cursor:pointer;transition:transform .15s}
.shq .rc-av:first-child{margin-left:0}
.shq .rc-av:hover{transform:scale(1.15);z-index:1}
.shq .rc-foot{display:flex;gap:10px;font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums;
  border-top:1px solid var(--border);padding-top:8px;margin-top:4px}
.shq .rc-foot b{color:var(--ink);font-weight:700;margin-right:2px}
.shq .rc-foot .cb b{color:var(--risk)}
.shq .room-card.frosted{border-style:dashed;border-color:rgba(0,0,0,.08)}
.shq .room-card.frosted .rc-mission,.shq .room-card.frosted .rc-bar,.shq .room-card.frosted .rc-warn,.shq .room-card.frosted .rc-foot{display:none}
.shq .room-card.frosted .rc-team .rc-av{opacity:.4}
.shq .room-card.locked{border-style:dashed;border-color:rgba(0,0,0,.06);opacity:.5;cursor:not-allowed}
.shq .room-card.locked .rc-mission,.shq .room-card.locked .rc-bar,.shq .room-card.locked .rc-warn,
.shq .room-card.locked .rc-team,.shq .room-card.locked .rc-foot{display:none}
@media(prefers-reduced-motion:reduce){.shq *,.shq *::before,.shq *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
@media(max-width:640px){.shq #shqSheet{width:100vw}.shq .duo{flex-direction:column}.shq #shqPopup{width:92vw}}
`;

function initSparkHQ(root: HTMLElement) {
  const AVC=["#6D5EF4","#E0662B","#17A3A3","#D14BA0","#4B77E0","#7A9A2E","#B0542B","#5E6AD2"];
  const ST: Record<string,{t:string;cls:string;c:string}>={risk:{t:"RiSKTE",cls:"risk",c:"var(--risk)"},warn:{t:"DiKKAT",cls:"warn",c:"var(--warn)"},
    ok:{t:"YOLUNDA",cls:"ok",c:"var(--ok)"},ahead:{t:"iLERiDE",cls:"ok",c:"var(--ok)"}};
  const SEV: Record<string,number>={ok:0,ahead:0,warn:1,risk:2};

  type Member = {name:string;role:string;g:number;late:number};
  type TaskItem = {tt:string;who:string;day:string;urgent:boolean;done:boolean};
  type Room = {id:string;name:string;rect:number[];st:string;mission:string;pct:number;note:string;
    wrong:string[];mile:string[];members:Member[];tasks:TaskItem[]};
  type Floor = {id:string;name:string;sub:string;rooms:Room[];lobby?:boolean};

  function room(id: string,name: string,rect: number[],st: string,d: Partial<Room>): Room {
    return {id,name,rect,st,mission:"",pct:0,note:"",wrong:[],mile:["",""],members:[],tasks:[],...d};
  }
  function blankRoom(id: string, name: string): Room {
    return room(id, name, [0,0,44,30], "ok", {mission:"Hedef belirlenmedi", pct:0, note:"Yeni ekip",
      wrong:[], mile:["ilk milestone","belirlenmedi"], members:[], tasks:[]});
  }
  function m(name: string,role: string,g: number,late: number): Member {return{name,role,g,late}}
  function t(tt: string,who: string,day: string,urgent?: boolean,done?: boolean): TaskItem {return{tt,who,day,urgent:!!urgent,done:!!done}}

  const slug = (p: string) => p + "-" + Math.random().toString(36).slice(2,7);

  const FLOORS: Floor[]=[
   {id:"urun",name:"Urun",sub:"12 aktif is",rooms:[
     room("mobile","Mobile Squad",[0,0,44,30],"ok",{mission:"v2.4 Cuma Store'da",pct:72,note:"Release adayi hazir",
       wrong:["SPK-231 crash fix backend refactor bekliyor"],mile:["v2.4 Release","4 gun"],
       members:[m("Burak Cavdur","Mobile Lead",8,3),m("Can Yildirim","iOS Dev",5,0),m("ipek Aydin","Android Dev",6,1)],
       tasks:[t("Android build final","Burak C.","Yarin",true),t("iOS TestFlight","Can Y.","Bugun",false,true),t("Store metadata","ipek A.","Persembe")]}),
     room("backend","Backend Squad",[56,0,44,30],"warn",{mission:"OCPI v2 canlida",pct:58,note:"Refactor uzadi",
       wrong:["Refactor mobil crash fix'ini blokluyor"],mile:["Webhook refactor","2 gun"],
       members:[m("Diren Gundogdu","Backend Lead",7,1),m("Mert Acar","Backend Dev",6,0)],
       tasks:[t("OCPI webhook refactor","Diren G.","Yarin",true),t("Fatura servisi testleri","Mert A.","Cuma")]}),
     room("design","Design Studio",[0,36,44,30],"ok",{mission:"Sarj akisi v3 testte",pct:80,note:"Test Persembe",wrong:[],mile:["Usability test","2 gun"],
       members:[m("Zeynep Tan","Product Designer",4,0),m("Arda Koc","UI Designer",3,0)],
       tasks:[t("Sarj akisi v3 prototip","Zeynep T.","Persembe"),t("Token temizligi","Arda K.","Bitti",false,true)]}),
     room("qa","QA Lab",[56,36,44,30],"ok",{mission:"Tam regresyon",pct:60,note:"%60 tamam",wrong:[],mile:["Regresyon bitisi","3 gun"],
       members:[m("Baran Ozturk","QA Engineer",5,0)],
       tasks:[t("Regresyon kosusu","Baran O.","Persembe")]}),
     room("platform","Platform",[0,72,100,28],"ahead",{mission:"Altyapi maliyeti -%15",pct:90,note:"Hedefin onunde",wrong:[],mile:["CDN gecisi","tamamlandi"],
       members:[m("Efe Duran","DevOps",4,0)],
       tasks:[t("Monitoring alarmlari","Efe D.","Cuma"),t("CDN gecisi","Efe D.","Bitti",false,true)]}),
   ]},
   {id:"growth",name:"Growth · Launch",sub:"Launch: 1 Eylul",rooms:[
     room("gmarketing","Growth Marketing",[0,0,44,30],"risk",{mission:"CAC ₺38 → ₺30",pct:45,note:"Kreatifler bekleniyor",
       wrong:["Kreatif uretimi launch filmine bagimli"],mile:["Kampanya seti","3 gun"],
       members:[m("Sevval Beyhan","Growth Lead",5,0),m("Emre Gur","Performance",6,1)],
       tasks:[t("Meta kampanya kurulumu","Emre G.","Persembe"),t("Kreatif brief revizyonu","Sevval B.","Yarin",true)]}),
     room("product-room","Product",[56,0,44,30],"ahead",{mission:"Launch feature set",pct:84,note:"Planin onunde",wrong:[],mile:["Feature freeze","tamamlandi"],
       members:[m("Ela Sarp","PM",6,0),m("Ozan Kaya","APM",4,0)],
       tasks:[t("Launch feature QA","Ela S.","Cuma")]}),
     room("content","Content & PR",[0,36,44,30],"ok",{mission:"Basin kiti + video",pct:66,note:"Son revizyonda",
       wrong:["PR icerikleri onaya bagli"],mile:["Basin kiti teslim","2 gun"],
       members:[m("Yagmur Balci","Content Lead",5,1),m("Deniz Ak","Copywriter",4,0)],
       tasks:[t("Basin kiti final","Yagmur B.","Yarin",true),t("Launch blog yazisi","Deniz A.","Cuma")]}),
     room("launchops","Launch Ops",[56,36,44,30],"risk",{mission:"Launch — 1 Eylul",pct:68,note:"4 gun gecikme",
       wrong:["Android release launch'i blokluyor","Launch filmi onay bekliyor","PR icerikleri hazir degil"],mile:["Public Beta","6 gun"],
       members:[m("Cagan Koyun","Founder",6,2),m("Burak Cavdur","Mobile Lead",8,3),m("Sevval Beyhan","Growth Lead",5,0),
                m("Diren Gundogdu","Backend Lead",7,1),m("Enes Nazikoglu","Ops Specialist",4,0)],
       tasks:[t("Android build final","Burak C.","Yarin",true),t("Launch filmi onayi","Cagan K.","Persembe",true),
              t("PR iceriklerini gonder","Sevval B.","Cuma"),t("Partner listesi","Enes N.","Pazartesi")]}),
     room("partner","Partnerships",[0,72,44,28],"ok",{mission:"12 launch partneri",pct:70,note:"9/12 onayli",wrong:[],mile:["Duyuru paketi","5 gun"],
       members:[m("Enes Nazikoglu","Ops Specialist",4,0),m("Melis Unal","Partnership Mgr",5,0)],
       tasks:[t("Ortak duyuru metinleri","Melis U.","Cuma")]}),
     room("data","Data & Analytics",[56,72,44,28],"ok",{mission:"Launch dashboard canli",pct:75,note:"Event semasi tamam",wrong:[],mile:["Funnel dashboard","4 gun"],
       members:[m("Kaan Erol","Data Analyst",4,0)],
       tasks:[t("Funnel dashboard","Kaan E.","Cuma")]}),
   ]},
   {id:"satis",name:"Satis",sub:"₺680K pipeline",rooms:[
     room("enterprise","Enterprise Sales",[0,0,44,44],"ok",{mission:"Q3 hedefi ₺2.4M",pct:55,note:"Fleet A.S. imzada",
       wrong:["Sozlesme onayi lobide bekliyor"],mile:["Fleet A.S. imza","bu hafta"],
       members:[m("Kerem Vural","Sales Lead",6,0),m("Asli Nur","AE",5,0)],
       tasks:[t("Fleet A.S. takibi","Kerem V.","Yarin",true),t("Marina Otopark demo","Asli N.","Yarin 14:00")]}),
     room("cs","Customer Success",[56,0,44,44],"ok",{mission:"Onboarding < 7 gun",pct:70,note:"Yildiz Enerji 3/7",wrong:[],mile:["Yildiz canli","4 gun"],
       members:[m("Berk Has","CS Manager",5,0)],
       tasks:[t("Yildiz Enerji onboarding","Berk H.","Cuma")]}),
     room("revops","RevOps & CRM",[0,50,100,50],"warn",{mission:"Pipeline hijyeni %95",pct:40,note:"14 bayat kayit",
       wrong:["Tahmin dogrulugu dusuk"],mile:["Q3 temizligi","bu hafta"],
       members:[m("Selen Er","RevOps Analyst",4,1)],
       tasks:[t("Q3 pipeline temizligi","Selen E.","Cuma",true)]}),
   ]},
   {id:"finans",name:"Finans",sub:"Runway 14 ay",rooms:[
     room("revenue","Revenue Room",[0,0,44,44],"ok",{mission:"MRR ₺4.1M · ↑%14",pct:74,note:"Buyume saglikli",wrong:[],mile:["Q3 hedefi","yolunda"],
       members:[m("Onur Celik","Finance Lead",5,0)],
       tasks:[t("Q4 butce revizyonu","Onur C.","Cuma"),t("Runway modeli","Onur C.","Bitti",false,true)]}),
     room("muhasebe","Muhasebe",[56,0,44,44],"ok",{mission:"Temmuz kapanisi",pct:60,note:"Mutabakatlar tamam",wrong:[],mile:["Ay kapanisi","4 gun"],
       members:[m("Nazli Ekin","Muhasebe Uzmani",4,0)],
       tasks:[t("Temmuz kapanisi","Nazli E.","15 Agu")]}),
     room("procurement","Satin Alma & Legal",[0,50,100,50],"warn",{mission:"Sozlesme yenilemeleri",pct:50,note:"AWS onay bekliyor",
       wrong:["Onay gecikirse kesinti riski"],mile:["AWS yenileme","3 gun"],
       members:[m("Cem Tok","Operations",3,1)],
       tasks:[t("AWS faturasi onayi","Cem T.","Yarin",true)]}),
   ]},
   {id:"lobi",name:"Lobi",sub:"5 sey seni bekliyor",lobby:true,rooms:[
     room("inbox","Founder Inbox",[0,0,100,58],"risk",{mission:"Kuyrugu sifirla — ~10 dk",pct:0,note:"1 aksiyon 3+ gundur",
       wrong:["Growth butcesi 3 gundur onaysiz — launch'i geciktiriyor"],mile:["Hepsi bugun","kapanabilir"],
       members:[m("Cagan Koyun","Founder",5,1)],
       tasks:[t("Growth butce artisi onayi","Cagan K.","3 gundur",true),t("Fleet A.S. sozlesme imzasi","Cagan K.","bugun",true),
              t("AWS faturasi onayi","Cagan K.","dun"),t("v2.4 go/no-go","Cagan K.","bugun"),
              t("ise alim onayi: Backend Dev","Cagan K.","2 gundur")]}),
     room("meeting","Toplanti Salonu",[0,64,100,36],"ok",{mission:"Bugun 3 toplanti",pct:0,note:"14:00'e kadar musait",wrong:[],mile:["Launch sync","16:00"],
       members:[],tasks:[t("Launch sync","Tum liderler","16:00")]}),
   ]},
  ];

  const TIMES=["Pzt","Car","Per","Bugun"];
  const OV: Record<string,string[]>={launchops:["ok","warn","risk","risk"],gmarketing:["ok","ok","warn","risk"],
    backend:["ok","ok","warn","warn"],content:["ok","ok","ok","ok"],
    revops:["ok","warn","warn","warn"],procurement:["ok","ok","ok","warn"],
    inbox:["warn","warn","risk","risk"]};
  const DELAY: Record<string,number[]>={launchops:[0,0,2,4],gmarketing:[0,0,0,2]};
  const NOTES: (string|null)[]=[null,"Car · Backend refactor uzadi → Backend Squad DiKKAT'e dustu.",
   "Per · Android release kaydi → Launch Ops RiSKTE. Zincir: Backend → Mobile → Launch.",
   "Bugun · Gecikme 4 gune cikti; kreatifler bekledigi icin Growth Marketing de RiSKTE."];

  const PDETAIL: Record<string,{st:string;today:string;working:string[];waiting:[string,string][];goals:[string,number][];recent:string[]}>={
   "Cagan Koyun":{st:"warn",today:"3 toplanti · 6 gorev · 2 onay",
     working:["Launch filmi onayi","Yatirimci sunumu","is Bankasi partnership"],
     waiting:[["Launch filmini onayla","risk"],["Growth butcesini onayla","risk"],["Fleet sozlesmesini imzala","warn"]],
     goals:[["Launch Spark",68],["is Bankasi'ni kapat",45]],
     recent:["Kanal butcesini onayladi","Basin kitine yorum yapti"]},
   "Burak Cavdur":{st:"risk",today:"1 toplanti · 8 gorev · 3 gecikmis",
     working:["Android build final","SPK-231 crash","Store metadata"],
     waiting:[["Backend refactor'in bitmesi","risk"]],
     goals:[["v2.4 Store'da",72]],
     recent:["TestFlight dagitti","Crash raporunu inceledi"]},
  };
  type RoleProfile = {label:string;person:string;homeFloor:string|null;homeRoom:string|null;
    greeting:string;roleSub:string;briefing:string[];floorAccess:Record<string,string>;ownRooms:string[];
    avatar:{skin:string;hair:string;hairStyle:string;acc?:string;accColor?:string;shirt:string;badge?:string}};

  function memojiSVG(a:{skin:string;hair:string;hairStyle:string;acc?:string;accColor?:string;shirt:string;badge?:string}, sz:number=40): string {
    const r=sz/2, cx=r, cy=r;
    const headR=r*.72, eyeY=cy-headR*.08, mouthY=cy+headR*.32;
    let s=`<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" xmlns="http://www.w3.org/2000/svg">`;
    // Neck + shirt
    s+=`<ellipse cx="${cx}" cy="${cy+headR*.95}" rx="${headR*.55}" ry="${headR*.35}" fill="${a.shirt}"/>`;
    // Head
    s+=`<circle cx="${cx}" cy="${cy}" r="${headR}" fill="${a.skin}"/>`;
    // Hair
    if(a.hairStyle==="short"){
      s+=`<path d="M${cx-headR*.85} ${cy-headR*.25} Q${cx-headR*.85} ${cy-headR*1.15} ${cx} ${cy-headR*1.15} Q${cx+headR*.85} ${cy-headR*1.15} ${cx+headR*.85} ${cy-headR*.25}" fill="${a.hair}" stroke="none"/>`;
    }else if(a.hairStyle==="long"){
      s+=`<path d="M${cx-headR*.9} ${cy+headR*.1} Q${cx-headR*.9} ${cy-headR*1.2} ${cx} ${cy-headR*1.15} Q${cx+headR*.9} ${cy-headR*1.2} ${cx+headR*.9} ${cy+headR*.1}" fill="${a.hair}" stroke="none"/>`;
      s+=`<path d="M${cx-headR*.88} ${cy-headR*.1} Q${cx-headR*1.1} ${cy+headR*.6} ${cx-headR*.7} ${cy+headR*.95}" fill="${a.hair}" stroke="none"/>`;
      s+=`<path d="M${cx+headR*.88} ${cy-headR*.1} Q${cx+headR*1.1} ${cy+headR*.6} ${cx+headR*.7} ${cy+headR*.95}" fill="${a.hair}" stroke="none"/>`;
    }else if(a.hairStyle==="buzz"){
      s+=`<path d="M${cx-headR*.75} ${cy-headR*.35} Q${cx-headR*.75} ${cy-headR*.95} ${cx} ${cy-headR*.98} Q${cx+headR*.75} ${cy-headR*.95} ${cx+headR*.75} ${cy-headR*.35}" fill="${a.hair}" stroke="none"/>`;
    }else if(a.hairStyle==="curly"){
      s+=`<path d="M${cx-headR*.88} ${cy-headR*.15} Q${cx-headR*.95} ${cy-headR*1.25} ${cx} ${cy-headR*1.2} Q${cx+headR*.95} ${cy-headR*1.25} ${cx+headR*.88} ${cy-headR*.15}" fill="${a.hair}" stroke="none"/>`;
      for(let i=-2;i<=2;i++){const bx=cx+i*headR*.32,by=cy-headR*1.1+Math.abs(i)*headR*.12;s+=`<circle cx="${bx}" cy="${by}" r="${headR*.18}" fill="${a.hair}"/>`}
    }
    // Eyes
    s+=`<ellipse cx="${cx-headR*.28}" cy="${eyeY}" rx="${headR*.09}" ry="${headR*.11}" fill="#1a1a1a"/>`;
    s+=`<ellipse cx="${cx+headR*.28}" cy="${eyeY}" rx="${headR*.09}" ry="${headR*.11}" fill="#1a1a1a"/>`;
    s+=`<circle cx="${cx-headR*.26}" cy="${eyeY-headR*.03}" r="${headR*.035}" fill="#fff"/>`;
    s+=`<circle cx="${cx+headR*.3}" cy="${eyeY-headR*.03}" r="${headR*.035}" fill="#fff"/>`;
    // Mouth
    s+=`<path d="M${cx-headR*.18} ${mouthY} Q${cx} ${mouthY+headR*.15} ${cx+headR*.18} ${mouthY}" fill="none" stroke="#c44" stroke-width="${headR*.06}" stroke-linecap="round"/>`;
    // Accessories
    if(a.acc==="glasses"){
      const gc=a.accColor||"#444";
      s+=`<circle cx="${cx-headR*.28}" cy="${eyeY}" r="${headR*.17}" fill="none" stroke="${gc}" stroke-width="${headR*.04}"/>`;
      s+=`<circle cx="${cx+headR*.28}" cy="${eyeY}" r="${headR*.17}" fill="none" stroke="${gc}" stroke-width="${headR*.04}"/>`;
      s+=`<line x1="${cx-headR*.11}" y1="${eyeY}" x2="${cx+headR*.11}" y2="${eyeY}" stroke="${gc}" stroke-width="${headR*.03}"/>`;
    }else if(a.acc==="headset"){
      s+=`<path d="M${cx-headR*.82} ${cy-headR*.1} Q${cx-headR*.85} ${cy-headR*1} ${cx} ${cy-headR*1.05} Q${cx+headR*.85} ${cy-headR*1} ${cx+headR*.82} ${cy-headR*.1}" fill="none" stroke="${a.accColor||"#666"}" stroke-width="${headR*.06}"/>`;
      s+=`<ellipse cx="${cx-headR*.85}" cy="${cy+headR*.05}" rx="${headR*.1}" ry="${headR*.15}" fill="${a.accColor||"#666"}"/>`;
      s+=`<ellipse cx="${cx+headR*.85}" cy="${cy+headR*.05}" rx="${headR*.1}" ry="${headR*.15}" fill="${a.accColor||"#666"}"/>`;
    }
    // Badge
    if(a.badge){
      s+=`<circle cx="${cx+headR*.65}" cy="${cy+headR*.65}" r="${headR*.28}" fill="var(--card)" stroke="var(--border)" stroke-width="1"/>`;
      s+=`<text x="${cx+headR*.65}" y="${cy+headR*.73}" text-anchor="middle" font-size="${headR*.28}" fill="var(--ink)">${a.badge}</text>`;
    }
    s+=`</svg>`;
    return s;
  }

  const ROLE_PROFILES: Record<string,RoleProfile>={
    owner:{label:"Owner (Cagan)",person:"Cagan Koyun",homeFloor:null,homeRoom:null,
      greeting:"Gunaydin Cagan.",roleSub:"Sirketin tamami senin masan.",
      briefing:["Sirket nasil gidiyor?","🔴 1 kirmizi zincir: Backend → Mobile → Launch (4 gun)",
        "📥 5 karar seni bekliyor — en eskisi 3 gundur","ilk hamle onerisi: Growth butcesini onayla (~2 dk)"],
      floorAccess:{},ownRooms:[],
      avatar:{skin:"#F4C28B",hair:"#2C1810",hairStyle:"short",acc:"glasses",accColor:"#333",shirt:"#1a1a2e",badge:"👑"}},
    admin:{label:"Admin (Onur)",person:"Onur Celik",homeFloor:null,homeRoom:null,
      greeting:"Gunaydin Onur.",roleSub:"Tum katlar sana acik.",
      briefing:["Sirket geneli yolunda, 1 kritik zincir var.","🔴 Launch 4 gun geride — Backend → Mobile → Launch",
        "📊 Runway 14 ay · MRR ₺4.1M","3 onay kuyrugunda bekliyor"],
      floorAccess:{},ownRooms:[],
      avatar:{skin:"#E8B88A",hair:"#1a1a1a",hairStyle:"buzz",shirt:"#2d3748",badge:"🛡"}},
    lead:{label:"Kat Lideri (Sevval)",person:"Sevval Beyhan",homeFloor:"growth",homeRoom:null,
      greeting:"Gunaydin Sevval.",roleSub:"Growth kati senin alanin.",
      briefing:["Growth · Launch — RiSKTE · 4 gun","Ne ters gidiyor: Android release → Launch Ops → kreatifler zinciri",
        "Ekiplerin: 2 riskte, 1 ileride, 3 yolunda","Bugun senden bekleyen: kreatif brief revizyonu"],
      floorAccess:{urun:"pulse",satis:"pulse",finans:"shape",lobi:"pulse"},ownRooms:[],
      avatar:{skin:"#F0D0A8",hair:"#4A2800",hairStyle:"long",shirt:"#7c3aed",badge:"⚡"}},
    member:{label:"Uye (Burak)",person:"Burak Cavdur",homeFloor:"urun",homeRoom:"mobile",
      greeting:"Gunaydin Burak.",roleSub:"Mobile Squad masanda oturuyorsun.",
      briefing:["🔴 Dikkatini bekleyen: Android build final — yarin, launch'i blokluyor",
        "Bugun: 3 gorev · 1 toplanti","Seni bekleyenler: Backend refactor (Diren)",
        "Ekibin: Mobile Squad · YOLUNDA · v2.4 %72"],
      floorAccess:{growth:"pulse",satis:"pulse",finans:"shape",lobi:"pulse"},ownRooms:["mobile"],
      avatar:{skin:"#D4A574",hair:"#1a1a1a",hairStyle:"curly",acc:"headset",accColor:"var(--accent)",shirt:"#065f46",badge:"💻"}},
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
      today:`${mm.g} gorev`+(mm.late?` · ${mm.late} gecikmis`:""),
      working:[] as string[],waiting:[] as [string,string][],goals:[] as [string,number][],recent:[] as string[]};
  }

  const fPeople = (f: Floor) => f.rooms.reduce((a,r)=>a+r.members.length, 0);

  function orderedFloors(): Floor[] {
    const lobby = FLOORS.filter(f => f.lobby);
    let rest = FLOORS.filter(f => !f.lobby);
    if(state.sort === "risk") rest = [...rest].sort((a,b) => {
      const d = SEV[fSt(b)] - SEV[fSt(a)];
      if(d) return d;
      const da = a.rooms.reduce((s,r) => s+rDelay(r), 0);
      const db = b.rooms.reduce((s,r) => s+rDelay(r), 0);
      return db - da;
    });
    if(state.sort === "people") rest = [...rest].sort((a,b) => fPeople(b) - fPeople(a));
    return [...rest, ...lobby];
  }

  function relayoutFloor(f: Floor) {
    const n = f.rooms.length;
    if(!n) return;
    const layouts: Record<number, number[][]> = {
      1: [[0,0,100,100]],
      2: [[0,0,100,46],[0,54,100,46]],
      3: [[0,0,44,46],[56,0,44,46],[0,54,100,46]],
      4: [[0,0,44,46],[56,0,44,46],[0,54,44,46],[56,54,44,46]],
      5: [[0,0,44,30],[56,0,44,30],[0,36,44,30],[56,36,44,30],[0,72,100,28]],
      6: [[0,0,44,30],[56,0,44,30],[0,36,44,30],[56,36,44,30],[0,72,44,28],[56,72,44,28]],
    };
    if(layouts[n]) { f.rooms.forEach((r,i) => r.rect = layouts[n][i]); return; }
    const rows = Math.ceil(n/2), rh = (100-(rows-1)*6)/rows;
    f.rooms.forEach((r,i) => {
      const row = Math.floor(i/2), col = i%2, y = row*(rh+6);
      r.rect = (i===n-1 && n%2===1) ? [0,y,100,rh] : [col?56:0,y,44,rh];
    });
  }

  const state={view:"hq",floor:null as string|null,room:null as string|null,person:null as string|null,mode:"office",time:3,role:"owner" as string,empathy:null as string|null,sort:"custom" as string};
  const $=(s: string)=>root.querySelector(s) as HTMLElement|null;
  const F=()=>FLOORS.find(f=>f.id===state.floor)!;
  const RM=()=>state.room?F().rooms.find(r=>r.id===state.room)!:null;
  const initials=(n: string)=>n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const avc=(n: string)=>AVC[[...n].reduce((s,c)=>s+c.charCodeAt(0),0)%AVC.length];
  const rSt=(r: Room)=>OV[r.id]?OV[r.id][state.time]:r.st;
  const rDelay=(r: Room)=>DELAY[r.id]?DELAY[r.id][state.time]:0;
  const rLabel=(r: Room)=>{const s=ST[rSt(r)];const d=rDelay(r);return s.t+(d?` · ${d} gun`:"")};
  const fSt=(f: Floor)=>{let mx="ok";f.rooms.forEach(r=>{if(SEV[rSt(r)]>SEV[mx])mx=rSt(r)});return mx};
  const fLabel=(f: Floor)=>{
    const s=fSt(f);
    if(f.id==="growth"&&s==="risk")return rLabel(f.rooms.find(r=>r.id==="launchops")!);
    if(f.lobby)return f.sub;
    if(!f.rooms.length)return "Bos kat — oda ekle";
    return s==="ok"?f.sub:ST[s].t;
  };
  const pSt=(mm: Member)=>pdOf(mm).st;
  const stColor=(s: string)=>s==="risk"?"var(--risk)":s==="warn"?"var(--warn)":"var(--accent)";

  const cam={rot:Math.PI/4,tilt:0.616};
  let camDrag:{x:number;y:number;rot:number;tilt:number}|null=null;
  let wasCamDrag=false;
  let camRaf=0;
  const P=(x: number,y: number,z: number,cx: number,cy: number,s: number): [number,number]=>{
    const ct=Math.cos(cam.rot),sn=Math.sin(cam.rot),sp=Math.sin(cam.tilt),cp=Math.cos(cam.tilt);
    const rx=x*ct-y*sn,ry=x*sn+y*ct,k=s*1.225;
    return[cx+rx*k,cy+ry*sp*k-z*cp*k];
  };
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

  // --- Modal system ---
  function openModal(title: string, fields: {label:string;ph?:string;value?:string}[], onOk: (vals:string[])=>void, opts?: {note?:string;okLabel?:string;danger?:boolean}) {
    const modal = $("#shqModal"); if(!modal) return;
    const o = opts || {};
    let html = `<div class="modal-card"><h3>${title}</h3>`;
    if(o.note) html += `<div class="mnote">${o.note}</div>`;
    fields.forEach((f, i) => {
      html += `<div class="mfield"><label>${f.label}</label><input data-idx="${i}" placeholder="${f.ph||""}" value="${f.value||""}" /></div>`;
    });
    html += `<div class="modal-btns"><button class="btn-ghost" data-act="cancel">iptal</button>`;
    html += o.danger
      ? `<button class="btn-danger" data-act="ok">${o.okLabel||"Sil"}</button>`
      : `<button class="btn-lime" data-act="ok">${o.okLabel||"Kaydet"}</button>`;
    html += `</div></div>`;
    modal.innerHTML = html;
    modal.classList.add("open");

    const inputs = modal.querySelectorAll("input");
    const getVals = () => Array.from(inputs).map(inp => (inp as HTMLInputElement).value.trim());

    modal.querySelector("[data-act=cancel]")?.addEventListener("click", closeModal);
    modal.querySelector("[data-act=ok]")?.addEventListener("click", () => {
      const vals = getVals();
      onOk(vals);
    });
    inputs.forEach(inp => inp.addEventListener("keydown", (e: Event) => {
      const ke = e as KeyboardEvent;
      if(ke.key === "Enter") { onOk(getVals()); }
      if(ke.key === "Escape") { closeModal(); }
    }));
    if(inputs.length) setTimeout(() => (inputs[0] as HTMLInputElement).focus(), 50);
  }
  function closeModal() {
    const modal = $("#shqModal"); if(modal) modal.classList.remove("open");
  }

  // --- Drag state for floor reordering ---
  let drag: {fid:string; el:Element; startY:number; moved:boolean; ord:number; svgEl:SVGSVGElement}|null = null;

  function renderHQ(){
    const sf=orderedFloors();
    const W=170,D=105,H=44,s=1.15,n=sf.length;
    const riskRooms=sf.flatMap(f=>f.rooms).filter(r=>rSt(r)==="risk").length;
    const kpis=$("#hqKpis");
    if(kpis)kpis.innerHTML=`
      <span class="ps-item risk"><span class="ps-dot" style="background:var(--risk)"></span><b>${riskRooms+4}</b> riskte is</span>
      <span class="ps-item ok"><span class="ps-dot" style="background:var(--ok)"></span><b>27</b> tamamlanan</span>
      <span class="ps-item"><span class="ps-dot" style="background:var(--accent)"></span><b>5</b> milestone</span>`;

    const bcPt=P(W/2,D/2,n*H/2,0,0,s);
    const cx=-bcPt[0],cy=-bcPt[1];

    const g=30;
    const corners: [number,number][]=[];
    for(const bx of[-g,W+g])for(const by of[-g,D+g])for(const bz of[0,n*H+40])
      corners.push(P(bx,by,bz,cx,cy,s));
    const vPad=24;
    const vx0=Math.min(...corners.map(c=>c[0]))-vPad;
    const vy0=Math.min(...corners.map(c=>c[1]))-vPad;
    const vx1=Math.max(...corners.map(c=>c[0]))+vPad;
    const vy1=Math.max(...corners.map(c=>c[1]))+vPad;

    const showFront=Math.cos(cam.rot)>0;
    const showRight=Math.sin(cam.rot)>0;

    let svg=`<svg viewBox="${vx0} ${vy0} ${vx1-vx0} ${vy1-vy0}" xmlns="http://www.w3.org/2000/svg">`;
    svg+=`<defs>
      <linearGradient id="glassF" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#B0C4E8" stop-opacity="0.35"/>
        <stop offset="50%" stop-color="#8FAED8" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#A0BEE0" stop-opacity="0.32"/>
      </linearGradient>
      <linearGradient id="glassR" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#98B6D8" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="#7AA0CC" stop-opacity="0.22"/>
      </linearGradient>
      <linearGradient id="warm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFF8E8" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#FFE8B0" stop-opacity="0.5"/>
      </linearGradient>
    </defs>`;
    svg+=`<polygon points="${pts([P(-g,-g,0,cx,cy,s),P(W+g,-g,0,cx,cy,s),P(W+g,D+g,0,cx,cy,s),P(-g,D+g,0,cx,cy,s)])}" fill="#E8EAD8"/>`;

    // Simple landscape elements around the building base
    const treeSvg=(tx: number,ty: number,tz: number)=>{
      const[bx,by]=P(tx,ty,tz,cx,cy,s);
      const[tx2,ty2]=P(tx,ty,tz+20,cx,cy,s);
      return `<line x1="${bx}" y1="${by}" x2="${tx2}" y2="${ty2}" stroke="#8B6914" stroke-width="2" stroke-linecap="round"/>
        <circle cx="${tx2}" cy="${ty2-6}" r="8" fill="#3A8B2A" opacity="0.8"/>
        <circle cx="${tx2-3}" cy="${ty2-3}" r="6" fill="#4DA63A" opacity="0.7"/>
        <circle cx="${tx2+4}" cy="${ty2-4}" r="5" fill="#5CB849" opacity="0.6"/>`;
    };
    const treePositions: [number,number,number][]=[
      [-15,20,0],[-15,50,0],[-15,80,0],
      [W+15,25,0],[W+15,55,0],[W+15,85,0],
      [30,-15,0],[80,-15,0],[130,-15,0],
      [40,D+15,0],[90,D+15,0],[140,D+15,0],
    ];
    treePositions.forEach(([tx,ty,tz])=>{svg+=treeSvg(tx,ty,tz)});

    // Track non-lobby order index for drag
    let nonLobbyIdx = 0;

    for(let i=0;i<n;i++){
      const f=sf[n-1-i],zb=i*H,zt=zb+H;
      const st2=fSt(f),sc=ST[st2].c;
      const isLobby = !!f.lobby;
      const isDraggable = state.sort === "custom" && !isLobby;
      const ordIdx = isLobby ? -1 : nonLobbyIdx++;

      const sideA=showFront
        ?pts([P(0,D,zb,cx,cy,s),P(W,D,zb,cx,cy,s),P(W,D,zt,cx,cy,s),P(0,D,zt,cx,cy,s)])
        :pts([P(W,0,zb,cx,cy,s),P(0,0,zb,cx,cy,s),P(0,0,zt,cx,cy,s),P(W,0,zt,cx,cy,s)]);
      const sideB=showRight
        ?pts([P(W,0,zb,cx,cy,s),P(W,D,zb,cx,cy,s),P(W,D,zt,cx,cy,s),P(W,0,zt,cx,cy,s)])
        :pts([P(0,D,zb,cx,cy,s),P(0,0,zb,cx,cy,s),P(0,0,zt,cx,cy,s),P(0,D,zt,cx,cy,s)]);
      const top=pts([P(0,0,zt,cx,cy,s),P(W,0,zt,cx,cy,s),P(W,D,zt,cx,cy,s),P(0,D,zt,cx,cy,s)]);

      const labelFaceY=showFront?D:0;
      const labelX0=showFront?10:W-10;
      const dotX=showFront?W-8:8;
      const[lx,ly]=P(labelX0,labelFaceY,zb+H*.62,cx,cy,s);
      const[sx,sy]=P(labelX0,labelFaceY,zb+H*.26,cx,cy,s);
      const[dx,dy]=P(dotX,labelFaceY,zb+H*.5,cx,cy,s);
      const riskOutline=st2==="risk"?`<polygon points="${sideA}" fill="rgba(224,52,43,.06)" stroke="var(--risk)" stroke-width="1.4" stroke-dasharray="4 3"/>`:"";

      // Floor control positions
      const fctlBaseX = showFront ? labelX0 : labelX0;
      const[ex,ey]=P(fctlBaseX + (showFront?90:-90), labelFaceY, zb+H*.55, cx, cy, s);
      const[delx,dely]=[ex + 22, ey];

      // Grip position
      const[gx,gy]=P(fctlBaseX + (showFront?-8:8), labelFaceY, zb+H*.5, cx, cy, s);

      // Glass facade windows on the visible faces
      let windows="";
      const windowCount=5;
      const ww2=W/(windowCount+1);
      for(let wi=1;wi<=windowCount;wi++){
        const wx=wi*ww2, wz1=zb+H*0.15, wz2=zb+H*0.85;
        if(showFront){
          windows+=`<polygon points="${pts([P(wx-ww2*0.35,D,wz1,cx,cy,s),P(wx+ww2*0.35,D,wz1,cx,cy,s),P(wx+ww2*0.35,D,wz2,cx,cy,s),P(wx-ww2*0.35,D,wz2,cx,cy,s)])}" fill="url(#glassF)" opacity="0.6"/>`;
          windows+=`<polygon points="${pts([P(wx-ww2*0.3,D,wz1+2,cx,cy,s),P(wx+ww2*0.3,D,wz1+2,cx,cy,s),P(wx+ww2*0.3,D,wz2-2,cx,cy,s),P(wx-ww2*0.3,D,wz2-2,cx,cy,s)])}" fill="url(#warm)" opacity="0.3"/>`;
        }else{
          windows+=`<polygon points="${pts([P(wx-ww2*0.35,0,wz1,cx,cy,s),P(wx+ww2*0.35,0,wz1,cx,cy,s),P(wx+ww2*0.35,0,wz2,cx,cy,s),P(wx-ww2*0.35,0,wz2,cx,cy,s)])}" fill="url(#glassF)" opacity="0.6"/>`;
          windows+=`<polygon points="${pts([P(wx-ww2*0.3,0,wz1+2,cx,cy,s),P(wx+ww2*0.3,0,wz1+2,cx,cy,s),P(wx+ww2*0.3,0,wz2-2,cx,cy,s),P(wx-ww2*0.3,0,wz2-2,cx,cy,s)])}" fill="url(#warm)" opacity="0.3"/>`;
        }
      }
      const sideWindowCount=3;
      const sw2=D/(sideWindowCount+1);
      for(let wi=1;wi<=sideWindowCount;wi++){
        const wy=wi*sw2, wz1=zb+H*0.15, wz2=zb+H*0.85;
        if(showRight){
          windows+=`<polygon points="${pts([P(W,wy-sw2*0.35,wz1,cx,cy,s),P(W,wy+sw2*0.35,wz1,cx,cy,s),P(W,wy+sw2*0.35,wz2,cx,cy,s),P(W,wy-sw2*0.35,wz2,cx,cy,s)])}" fill="url(#glassR)" opacity="0.6"/>`;
          windows+=`<polygon points="${pts([P(W,wy-sw2*0.3,wz1+2,cx,cy,s),P(W,wy+sw2*0.3,wz1+2,cx,cy,s),P(W,wy+sw2*0.3,wz2-2,cx,cy,s),P(W,wy-sw2*0.3,wz2-2,cx,cy,s)])}" fill="url(#warm)" opacity="0.3"/>`;
        }else{
          windows+=`<polygon points="${pts([P(0,wy-sw2*0.35,wz1,cx,cy,s),P(0,wy+sw2*0.35,wz1,cx,cy,s),P(0,wy+sw2*0.35,wz2,cx,cy,s),P(0,wy-sw2*0.35,wz2,cx,cy,s)])}" fill="url(#glassR)" opacity="0.6"/>`;
          windows+=`<polygon points="${pts([P(0,wy-sw2*0.3,wz1+2,cx,cy,s),P(0,wy+sw2*0.3,wz1+2,cx,cy,s),P(0,wy+sw2*0.3,wz2-2,cx,cy,s),P(0,wy-sw2*0.3,wz2-2,cx,cy,s)])}" fill="url(#warm)" opacity="0.3"/>`;
        }
      }
      // Vegetation on floor edges
      let veg="";
      const vegCount=6;
      for(let vi=0;vi<vegCount;vi++){
        const vx=(vi+0.5)*W/vegCount;
        const vs=3+Math.sin(vx*0.1+zb*0.05)*2;
        if(showFront){
          const[vp1x,vp1y]=P(vx,D,zb,cx,cy,s);
          veg+=`<ellipse cx="${vp1x}" cy="${vp1y+vs/2}" rx="4" ry="${vs}" fill="#4DA63A" opacity="0.5"/>`;
        }
      }

      svg+=`<g class="bfloor${isDraggable?" draggable":""}" data-f="${f.id}" data-ord="${ordIdx}">
        <polygon points="${sideA}" fill="#E1E4ED" stroke="#CFD3E0"/>
        <polygon points="${sideB}" fill="#EAECF3" stroke="#CFD3E0"/>
        <polygon class="face-top" points="${top}" fill="#F0F2F8" stroke="#D5D9E4"/>
        ${windows}
        ${veg}
        <polygon class="fl-glow" points="${top}" fill="${st2==="risk"?"rgba(224,52,43,.08)":st2==="warn"?"rgba(233,162,59,.07)":"rgba(109,94,244,.05)"}" style="opacity:0;transition:opacity .3s"/>
        <text class="bf-name" x="${lx}" y="${ly}">${f.name}</text>
        <text class="bf-stat ${st2==="risk"?"risk":st2==="warn"?"warn":"ok"}" x="${sx}" y="${sy}">${fLabel(f)}</text>
        <circle cx="${dx}" cy="${dy}" r="4.5" fill="${sc}"/>
        ${riskOutline}`;

      // Grip handle for draggable floors
      if(isDraggable) {
        svg += `<text class="grip" x="${gx}" y="${gy+4}" text-anchor="middle">⠇</text>`;
      }

      // Floor controls (edit + delete) - not for lobby
      if(!isLobby) {
        svg += `<g class="fctl edit" data-fctl="edit" data-fid="${f.id}">
          <circle cx="${ex}" cy="${ey}" r="10"/>
          <text x="${ex}" y="${ey+3.5}">✎</text>
        </g>
        <g class="fctl del" data-fctl="del" data-fid="${f.id}">
          <circle cx="${delx}" cy="${dely}" r="10"/>
          <text x="${delx}" y="${dely+3.5}">🗑</text>
        </g>`;
      }

      svg+=`</g>`;
    }
    const rz=n*H;
    const antSideA=showFront
      ?pts([P(104,36,rz,cx,cy,s),P(138,36,rz,cx,cy,s),P(138,36,rz+13,cx,cy,s),P(104,36,rz+13,cx,cy,s)])
      :pts([P(138,12,rz,cx,cy,s),P(104,12,rz,cx,cy,s),P(104,12,rz+13,cx,cy,s),P(138,12,rz+13,cx,cy,s)]);
    const antSideB=showRight
      ?pts([P(138,12,rz,cx,cy,s),P(138,36,rz,cx,cy,s),P(138,36,rz+13,cx,cy,s),P(138,12,rz+13,cx,cy,s)])
      :pts([P(104,36,rz,cx,cy,s),P(104,12,rz,cx,cy,s),P(104,12,rz+13,cx,cy,s),P(104,36,rz+13,cx,cy,s)]);
    const antTop=pts([P(104,12,rz+13,cx,cy,s),P(138,12,rz+13,cx,cy,s),P(138,36,rz+13,cx,cy,s),P(104,36,rz+13,cx,cy,s)]);
    const antLight=P(121,24,rz+16,cx,cy,s);
    svg+=`<polygon points="${antSideA}" fill="#D5D9E4" stroke="#CFD3E0"/>
    <polygon points="${antSideB}" fill="#E2E5EE" stroke="#CFD3E0"/>
    <polygon points="${antTop}" fill="#EDEFF5" stroke="#D5D9E4"/>
    <circle cx="${antLight[0]}" cy="${antLight[1]}" r="3" fill="var(--accent)" opacity=".7"/>
    <circle cx="${antLight[0]}" cy="${antLight[1]}" r="8" fill="var(--accent)" opacity=".1"/>`;

    // Drop indicator line for drag-and-drop
    svg += `<line id="dropInd" x1="0" y1="0" x2="0" y2="0"/>`;

    // Role connection indicators
    const rp=activeRole();
    const connSide=showRight?W+8:(-8);
    for(let i=0;i<n;i++){
      const f=sf[n-1-i],zb=i*H,zt=zb+H;
      const acc=rp.floorAccess[f.id];
      if(!acc||acc==="content")continue;
      const mid=(zb+zt)/2;
      const[px,py]=P(connSide,D/2,mid,cx,cy,s);
      const col=acc==="pulse"?"var(--warn)":"var(--dim)";
      const label=acc==="pulse"?"NABIZ":"SEKIL";
      svg+=`<circle cx="${px}" cy="${py}" r="4" fill="${col}" opacity=".5"/>`;
      svg+=`<text class="conn-badge" x="${px}" y="${py+(showRight?-8:14)}" fill="${col}">${label}</text>`;
    }

    svg+=`</svg>`;
    const bld=$("#hqBuilding");
    if(bld)bld.innerHTML=svg;

    // Floor click handlers
    root.querySelectorAll(".bfloor").forEach(el=>{
      const fid=(el as HTMLElement).dataset.f!;
      const vis=floorVis(fid);
      if(vis==="pulse")el.classList.add("frosted");
      else if(vis==="shape")el.classList.add("locked");

      el.addEventListener("click",(e)=>{
        // Check if fctl was clicked
        const fctlEl = (e.target as Element).closest(".fctl");
        if(fctlEl) {
          e.stopPropagation();
          const act = (fctlEl as HTMLElement).dataset.fctl;
          const targetFid = (fctlEl as HTMLElement).dataset.fid!;
          if(act === "edit") renameFloor(targetFid);
          if(act === "del") deleteFloor(targetFid);
          return;
        }
        if(wasCamDrag)return;
        if(drag && drag.moved) return;
        const v=floorVis(fid);
        if(v==="shape"){showDoor(FLOORS.find(f2=>f2.id===fid)!.name,"Bu kat yalnizca ilgili ekibe acik.","Kat liderinden erisim iste.");return}
        goFloor(fid);
      });
      el.addEventListener("mouseenter",e=>showTooltipFloor(e as MouseEvent,fid));
      el.addEventListener("mouseleave",hideTooltip);
    });

    const isDefault=Math.abs(cam.rot-Math.PI/4)<0.02&&Math.abs(cam.tilt-0.616)<0.02;
    const resetBtn=$("#camReset");
    if(resetBtn)resetBtn.classList.toggle("show",!isDefault);
    renderHQTools();
  }

  function renderHQTools() {
    const tools = $("#hqTools"); if(!tools) return;
    tools.innerHTML = `<div class="sortseg" id="sortSeg">
      <span>SIRALA</span>
      <button data-s="custom" class="${state.sort==="custom"?"on":""}">Ozel</button>
      <button data-s="risk" class="${state.sort==="risk"?"on":""}">Riske gore</button>
      <button data-s="people" class="${state.sort==="people"?"on":""}">Kisi sayisi</button>
    </div>
    <button class="addbtn" id="addFloorBtn2">＋ Kat Ekle</button>`;
    tools.querySelectorAll("#sortSeg button").forEach(b => b.addEventListener("click", () => {
      state.sort = (b as HTMLElement).dataset.s!;
      renderHQ();
    }));
    tools.querySelector("#addFloorBtn2")?.addEventListener("click", addFloor);
    const hint = $("#dragHint");
    if(hint) hint.textContent = state.sort === "custom" ? "Ozel modda katlari surukleyerek yeniden sirala" : "";
  }

  // --- Management functions using modal ---
  function addFloor() {
    if(FLOORS.filter(f => !f.lobby).length >= 9) {
      fakeAct("Maksimum 9 kat ekleyebilirsiniz");
      return;
    }
    openModal("Yeni Kat / Departman", [{label:"Departman adi", ph:"or. People & Culture"}], ([name]) => {
      if(!name) return;
      const id = slug(name.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,12) || "dept");
      const newFloor: Floor = {id, name, sub:"Yeni departman", rooms:[]};
      // Insert before lobby
      const lobbyIdx = FLOORS.findIndex(f => f.lobby);
      if(lobbyIdx >= 0) FLOORS.splice(lobbyIdx, 0, newFloor);
      else FLOORS.push(newFloor);
      closeModal();
      renderHQ();
      fakeAct(`"${name}" kati eklendi — ${FLOORS.length}. kat`);
      goFloor(id);
    });
  }

  function renameFloor(fid: string) {
    const f = FLOORS.find(x => x.id === fid);
    if(!f) return;
    openModal("Kati Yeniden Adlandir", [{label:"Yeni ad", value: f.name}], ([name]) => {
      if(!name) return;
      f.name = name;
      closeModal();
      if(state.floor === fid) {
        const ft = $("#floorTitle"); if(ft) ft.textContent = name;
      }
      renderHQ();
      fakeAct(`Kat "${name}" olarak yeniden adlandirildi`);
    });
  }

  function deleteFloor(fid: string) {
    const f = FLOORS.find(x => x.id === fid);
    if(!f || f.lobby) return;
    openModal("Kati Sil", [], () => {
      const idx = FLOORS.findIndex(x => x.id === fid);
      if(idx >= 0) FLOORS.splice(idx, 1);
      closeModal();
      if(state.floor === fid) goHQ();
      else renderHQ();
      fakeAct(`"${f.name}" kati silindi`);
    }, {note: `<b>${f.name}</b> kati ve icindeki tum odalar kalici olarak silinecek. Bu islem geri alinamaz.`, okLabel:"Kati Sil", danger: true});
  }

  function addRoom() {
    const f = F();
    if(!f) return;
    openModal("Yeni Oda / Ekip", [{label:"Oda adi", ph:"or. Frontend Squad"}], ([name]) => {
      if(!name) return;
      const id = slug(name.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,12) || "room");
      const nr = blankRoom(id, name);
      f.rooms.push(nr);
      relayoutFloor(f);
      closeModal();
      renderPlan();
      renderHQ();
      fakeAct(`"${name}" odasi eklendi`);
    });
  }

  function addMember() {
    const r = RM();
    if(!r) return;
    openModal("Uye Ekle", [{label:"Ad Soyad", ph:"or. Ali Veli"}, {label:"Rol", ph:"or. Developer"}], ([name, role]) => {
      if(!name) return;
      r.members.push(m(name, role || "Uye", 0, 0));
      closeModal();
      renderPlan();
      if($("#shqSheet")?.classList.contains("open")) renderSheet();
      fakeAct(`${name} ekibe eklendi`);
    });
  }

  function renderPlan(){
    const f=F();
    const ft=$("#floorTitle");if(ft)ft.textContent=f.name;
    const fs=$("#floorSub");if(fs)fs.textContent=f.rooms.length+" oda · "+f.rooms.reduce((a,r)=>a+r.members.length,0)+" kisi";
    const isPulse=state.mode==="pulse";
    const ph=$("#planHolder");if(!ph)return;

    // Empty floor state
    if(f.rooms.length === 0) {
      ph.innerHTML = `<div class="empty-floor">
        <div class="ico">🏗️</div>
        <p><b>${f.name}</b> kati henuz bos.<br>ilk odayi ekleyerek departmani kur.</p>
        <button class="btn-lime" id="emptyAddRoom">＋ ilk odayi ekle</button>
      </div>`;
      ph.querySelector("#emptyAddRoom")?.addEventListener("click", addRoom);
      return;
    }

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

      const stC=st==="risk"?"rgba(224,52,43,.10)":st==="warn"?"rgba(233,162,59,.08)":"rgba(23,163,74,.06)";
      const stStroke=st==="risk"?"rgba(224,52,43,.35)":st==="warn"?"rgba(233,162,59,.28)":"rgba(0,0,0,.08)";

      let cls="room-g";
      if(rv==="pulse")cls+=" frosted";
      else if(rv==="shape")cls+=" locked";
      if(sel)cls+=" sel";

      svg+=`<g class="${cls}" data-room="${r.id}" data-vis="${rv}" style="cursor:pointer">`;
      svg+=`<rect class="room-poly" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${isPulse?stC:"var(--woodTop)"}" stroke="${sel?"var(--accent)":isPulse?stStroke:"#E1E4ED"}" stroke-width="${sel?1.6:1}"/>`;

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
            svg+=`<ellipse cx="${px}" cy="${py+3}" rx="5" ry="3" fill="#DED2BE" opacity="0.6"/>`;
            svg+=`<ellipse cx="${px}" cy="${py-1}" rx="4" ry="5" fill="${avc(mm.name)}" opacity="0.85"/>`;
            svg+=`<circle cx="${px}" cy="${py-7}" r="3.2" fill="#F4C28B" stroke="#E8D4B0" stroke-width="0.5"/>`;
          }
          svg+=`<circle class="person-dot pd-${mst}" cx="${px}" cy="${py}" r="${dotR}" stroke="${stColor(mst)}"/>`;
          svg+=`<text class="p-init" x="${px}" y="${py+1.3}" style="font-size:${rv==="pulse"?3:3.8}px">${initials(mm.name)}</text>`;
          if(rv==="content"){
            svg+=`<circle cx="${px+3.5}" cy="${py-9}" r="2" fill="${stColor(mst)}" stroke="var(--card)" stroke-width="0.8"/>`;
            svg+=`<text class="p-name" x="${px}" y="${py+dotR+7}" style="font-size:6px;fill:var(--muted);text-anchor:middle;opacity:.8">${mm.name.split(" ")[0]}</text>`;
          }
          svg+=`</g>`;
        });
      }

      if(!isPulse && rv==="content"){
        const openT=(r.tasks||[]).filter(t2=>!t2.done).length;
        const blocked=(r.tasks||[]).filter(t2=>t2.urgent&&!t2.done).length;
        let foot=`${openT} acik`;
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
        if(vis==="shape"){showDoor(f.rooms.find(x=>x.id===rid)!.name,"Bu alan yalnizca ilgili ekibe acik.","Erisim iste");return}
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
        <div class="tt-line">${f.rooms.length} oda · ${f.rooms.reduce((a,r)=>a+r.members.length,0)} kisi</div>`;
    }else{
      tt.innerHTML=`<div class="tt-name">${f.name}</div>
        <div class="tt-stat" style="color:${stC}">${fLabel(f)}</div>
        <div class="tt-line">${f.rooms.length} oda · ${f.rooms.reduce((a,r)=>a+r.members.length,0)} kisi</div>`;
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
        <div class="tt-line">${r.members.length} kisi${r.wrong.length?` · ${r.wrong.length} engel`:""}</div>`;
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
    if(rv==="shape"){showDoor(F().rooms.find(x=>x.id===rid)!.name,"Bu alan yalnizca ilgili ekibe acik.","Erisim iste");return}
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
        <div class="pop-sub">${F().name} kati</div>
        <div class="pop-badge ${st==="ahead"?"ok":st}"><span class="bd"></span>${rLabel(r)}</div>
      </div>
      <div class="pop-body">
        <div class="pop-mission">${r.mission}</div>
        ${r.pct?`<div class="pop-bar"><div class="pb-track"><i style="width:${r.pct}%;background:${stColor(st)}"></i></div><span class="pb-pct">%${r.pct}</span></div>`:""}
        ${r.wrong.length?`<div class="pop-wrong">${r.wrong.map(w=>`<div class="pw-item">${w}</div>`).join("")}</div>`:""}
        ${r.members.length?`<div class="pop-people">${r.members.map(mm=>`<div class="pop-av" style="background:${avc(mm.name)}" title="${mm.name}" data-room="${r.id}" data-person="${mm.name}">${initials(mm.name)}</div>`).join("")}</div>`:""}
        <div class="pop-meta"><span><b>${openT}</b> acik</span>${blocked?`<span class="cb"><b>${blocked}</b> engelli</span>`:""}<span><b>${done}</b> bitti</span></div>
      </div>
      <div class="pop-foot">
        <button class="btn-lime" data-act="enter-room">Gir</button>
        <button class="btn-ghost" data-act="ask-ai">AI'a Sor</button>
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
        <div class="pop-badge ${pd.st}"><span class="bd"></span>${pd.st==="risk"?"Mudahale gerek":pd.st==="warn"?"Dikkat":"Yolunda"}</div>
      </div>
      <div class="pop-body">
        <div class="pp-today">${pd.today}</div>
        ${pd.waiting.length?`<div class="pp-sec"><h6>Bekleyenler</h6>${pd.waiting.map(([w,k])=>`<div class="pp-li"><span class="ldot" style="background:var(--${k})"></span>${w}</div>`).join("")}</div>`:""}
        ${pd.goals.length?`<div class="pp-sec"><h6>Hedefler</h6>${pd.goals.map(([g,p])=>`<div class="goalline">${g}<span class="gbar"><i style="width:${p}%"></i></span><span class="gp">%${p}</span></div>`).join("")}</div>`:""}
      </div>
      <div class="pop-foot">
        <button class="btn-lime" data-act="enter-person">Masasina Git</button>
        <button class="btn-ghost" data-act="msg">Mesaj</button>
        ${state.role==="owner"?`<button class="btn-ghost" data-act="empathy" style="font-size:11px">👁 Gozunden Gor</button>`:""}
      </div>`;
    pop.querySelector("[data-act=close-popup]")?.addEventListener("click",closePopup);
    pop.querySelector("[data-act=enter-person]")?.addEventListener("click",()=>{closePopup();openSheet(rid,pname)});
    pop.querySelector("[data-act=msg]")?.addEventListener("click",()=>fakeAct("Mesaj gonderildi"));
    pop.querySelector("[data-act=empathy]")?.addEventListener("click",()=>{
      closePopup();const targetRole=Object.entries(ROLE_PROFILES).find(([,p])=>p.person===pname);
      if(targetRole){state.empathy=targetRole[0];renderEmpathy();goHQ();playEntrance()}
      else fakeAct("Bu kisi icin empati modu — prototipte yalnizca tanimli roller destekleniyor")});
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
        <span class="sh-status ${pd.st}">${pd.st==="risk"?"● Mudahale gerek":pd.st==="warn"?"● Dikkat":"● Yolunda"}</span>
        <div class="sh-sec"><h6>Bugun</h6><div style="font-size:13px">${pd.today}</div></div>
        ${pd.working.length?`<div class="sh-sec"><h6>Uzerinde calistiklari</h6>${pd.working.map(w=>`<div class="li"><span class="ldot" style="background:var(--accent)"></span>${w}</div>`).join("")}</div>`:""}
        ${pd.waiting.length?`<div class="sh-sec"><h6>Bekleyenler</h6>${pd.waiting.map(([w,k])=>`<div class="li"><span class="ldot" style="background:var(--${k})"></span>${w}</div>`).join("")}</div>`:""}
        ${pd.goals.length?`<div class="sh-sec"><h6>Hedefler</h6>${pd.goals.map(([g,p])=>`<div class="goalline">${g}<span class="gbar" style="max-width:100px"><i style="width:${p}%"></i></span><span class="gp" style="font-variant-numeric:tabular-nums">%${p}</span></div>`).join("")}</div>`:""}
        ${pd.recent.length?`<div class="sh-sec"><h6>Son hareketler</h6>${pd.recent.map(x=>`<div class="li"><span class="ldot" style="background:var(--hover)"></span><span style="color:var(--muted)">${x}</span></div>`).join("")}</div>`:""}
        <div class="sh-sec"><h6>Gorevleri</h6>
          ${(r.tasks||[]).filter(tk=>tk.who.startsWith(mm.name.split(" ")[0])).map(tk=>`
            <div class="li"><span class="ldot" style="background:${tk.done?"var(--ok)":tk.urgent?"var(--risk)":"var(--accent)"}"></span>
            <span>${tk.tt}<div class="lmeta">${tk.day}${tk.urgent?" · acil":""}</div></span></div>`).join("")||`<div style="font-size:12px;color:var(--dim)">Listelenen gorev yok.</div>`}
        </div>`;
      acts.innerHTML=`<button class="btn-lime" data-act="msg">Mesaj</button>
        <button class="btn-ghost" data-act="assign">Gorev Ata</button>
        <button class="btn-ghost" data-act="week">Haftasini Gor</button>
        ${state.role==="owner"?`<button class="btn-ghost" data-act="empathy" style="font-size:11px">👁 Gozunden Gor</button>`:""}`;
      acts.querySelectorAll("[data-act]").forEach(b=>{
        const act=(b as HTMLElement).dataset.act!;
        if(act==="empathy"){b.addEventListener("click",()=>{
          const targetRole=Object.entries(ROLE_PROFILES).find(([,p])=>p.person===mm.name);
          if(targetRole){closeSheet();state.empathy=targetRole[0];renderEmpathy();goHQ();playEntrance()}
          else fakeAct("Bu kisi icin empati modu desteklenmiyor")});return}
        b.addEventListener("click",()=>fakeAct(act==="msg"?"Mesaj gonderildi":act==="assign"?"Gorev atandi":"Hafta gorunumu acildi"));
      });
      back.onclick=()=>{state.person=null;renderSheet();renderCrumbs()};
      return;
    }

    back.classList.remove("show");
    const openT=(r.tasks||[]).filter(x=>!x.done).length,blocked=(r.tasks||[]).filter(x=>x.urgent&&!x.done).length,done=(r.tasks||[]).filter(x=>x.done).length;
    const isInbox=r.id==="inbox";
    body.innerHTML=`
      <div class="sh-title">${r.name}</div>
      <div class="sh-sub">${F().name} kati</div>
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
        <div class="cell"><b>${isInbox?openT+" bekleyen":openT+" acik"}</b><span>${blocked?blocked+" engelli · ":""}${done} bitti</span></div>
      </div>
      ${isInbox?`<div class="sh-sec"><h6>Seni bekleyenler</h6>
        ${(r.tasks||[]).map(tk=>`<div class="li"><span class="ldot" style="background:${tk.urgent?"var(--risk)":"var(--warn)"}"></span>
          <span style="flex:1">${tk.tt}<div class="lmeta">${tk.day}</div></span>
          <button class="btn-ghost" style="padding:4px 10px;font-size:11px" data-act="approve">Onayla</button></div>`).join("")}</div>`:""}`;
    acts.innerHTML=`<button class="btn-lime" data-act="work-list">isleri Gor</button>
      <button class="btn-ghost" data-act="meeting">Toplanti</button>
      <button class="btn-ghost" data-act="ask-sheet">AI'a Sor</button>`;
    body.querySelectorAll("[data-person]").forEach(el=>el.addEventListener("click",()=>{
      state.person=(el as HTMLElement).dataset.person!;renderSheet();renderCrumbs();
    }));
    body.querySelectorAll("[data-act=approve]").forEach(b=>b.addEventListener("click",()=>fakeAct("Onaylandi")));
    acts.querySelector("[data-act=work-list]")?.addEventListener("click",()=>fakeAct("is listesi"));
    acts.querySelector("[data-act=meeting]")?.addEventListener("click",()=>fakeAct("Toplanti baslatildi"));
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
      grp("Acik",all.filter(x=>!x.done&&!x.urgent),"var(--accent)")+
      grp("Bitti",all.filter(x=>x.done),"var(--ok)");
    root.querySelectorAll(".wrow").forEach(el=>el.addEventListener("click",()=>{
      state.mode="office";renderModeUI();applyMode();openSheet((el as HTMLElement).dataset.room!)}));
  }

  function goFloor(id: string){
    const hqInner = $("#hqInner");
    const floorView = $("#floorView");

    if(hqInner && floorView) {
      hqInner.classList.add("fade-scale", "leaving-in");
      setTimeout(() => {
        hqInner.classList.remove("fade-scale", "leaving-in");
        state.floor=id;state.room=null;state.person=null;
        $("#hqView")?.classList.remove("on");floorView.classList.add("on");
        renderModeUI();renderPlan();renderWork();applyMode();renderCrumbs();
        renderFloorButtons();
        floorView.classList.add("entering");
        setTimeout(() => floorView.classList.remove("entering"), 400);
      }, 300);
    } else {
      state.floor=id;state.room=null;state.person=null;
      $("#hqView")?.classList.remove("on");$("#floorView")?.classList.add("on");
      renderModeUI();renderPlan();renderWork();applyMode();renderCrumbs();
      renderFloorButtons();
    }
  }

  function goHQ(){
    closeAsk();closePopup();
    $("#shqSheet")?.classList.remove("open");

    const floorView = $("#floorView");
    const hqView = $("#hqView");

    if(floorView && hqView && state.floor) {
      floorView.classList.add("fade-scale", "leaving-out");
      setTimeout(() => {
        floorView.classList.remove("fade-scale", "leaving-out");
        state.view="hq";state.floor=null;state.room=null;state.person=null;
        floorView.classList.remove("on");hqView.classList.add("on");
        renderHQ();renderCrumbs();
        const hqInner = $("#hqInner");
        if(hqInner) {
          hqInner.classList.add("entering");
          setTimeout(() => hqInner.classList.remove("entering"), 400);
        }
      }, 280);
    } else {
      state.view="hq";state.floor=null;state.room=null;state.person=null;
      $("#floorView")?.classList.remove("on");$("#hqView")?.classList.add("on");
      renderHQ();renderCrumbs();
    }
  }

  function renderFloorButtons() {
    const btns = $("#floorBtns");
    if(!btns) return;
    btns.innerHTML = `<button class="chip" id="renameFloorBtn">✎ Yeniden adlandir</button>
      <button class="chip" id="addRoomBtn">＋ Oda / Ekip</button>`;
    btns.querySelector("#renameFloorBtn")?.addEventListener("click", () => {
      if(state.floor) renameFloor(state.floor);
    });
    btns.querySelector("#addRoomBtn")?.addEventListener("click", addRoom);
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
    if(note&&state.time!==0){n.textContent="Ne degisti? · "+note;n.classList.add("show")}
    else n.classList.remove("show");
  }

  const ASK_QA_OWNER: Record<string,[string,string][]>={
   hq:[["Sirket bugun nasil?","Bir kirmizi zincir var: Backend refactor → Android release → Launch Ops, launch 4 gun geride. Onun disinda Satis ve Finans yolunda; lobide 5 karar seni bekliyor."],
       ["En acil ne?","Growth butce onayi — 3 gundur bekliyor ve launch kreatiflerini blokluyor. 2 dakikanizi alir."],
       ["Dunden beri ne degisti?","Growth Marketing de RiSKTE'ye dustu; gecikme 3'ten 4 gune cikti. Kaynak ayni: Android release."]],
   growth:[["Growth neden riskte?","Kritik yol: Android release gecikti → Launch Ops 4 gun geride → kreatifler launch filmini bekledigi icin Growth Marketing de kaydi."],
       ["Launch'i kim blokluyor?","iki kisi uzerinde dugumleniyor: Burak (Android build final, yarin) ve sen (launch filmi onayi + Growth butcesi)."]],
   room:[["Bu ekip neden bu durumda?","Sheet'teki 'Ne ters gidiyor?' listesi kaynagi gosteriyor."],
       ["Kim yardima ihtiyac duyuyor?","Kirmizi halkali kisiler gecikmis isi olanlar."]]};
  const ASK_QA_MEMBER: Record<string,[string,string][]>={
   hq:[["Sirket bugun nasil?","Urun kati yolunda; senin kritik isin Android build (yarin). Sirket genelinde Growth kati kirmizi gorunuyor — detayi kat liderinde."],
       ["Benim gunum nasil?","3 gorev, 1 toplanti. Android build final yarin bitirilmeli — launch'i blokluyor."],
       ["Finans nasil?","Bu alana erisimin yok. istersen Onur'a soru iletebilirim ya da erisim istegi acabilirim."]],
   room:[["Ekibim nasil?","Mobile Squad yolunda — v2.4 %72'de. Android build yarin bitirilmeli."],
       ["Kime sormaliyim?","Backend refactor icin Diren'e, store metadata icin ipek'e sor."]]};
  const ASK_QA_LEAD: Record<string,[string,string][]>={
   hq:[["Sirket bugun nasil?","Growth katin riskte — 4 gun gecikme. Urun yolunda, Satis yolunda. Finans detayina erisimin yok."],
       ["Katim nasil?","2 ekip riskte (Growth Marketing, Launch Ops), 1 ileride (Product), 3 yolunda. Kritik yol: Android release."],
       ["Dunden beri ne degisti?","Gecikme 3'ten 4 gune cikti. Growth Marketing de RiSKTE'ye dustu."]],
   growth:[["Launch'i kim blokluyor?","Burak (Android build final) ve Cagan (launch filmi onayi + butce). ikisi de yarin/bugun cozulebilir."],
       ["Kreatifler ne zaman hazir?","Launch filmi onayina bagli — Cagan'dan geldiginde kreatif uretimi baslar. Tahmini: 2-3 gun."]],
   room:[["Bu ekip neden bu durumda?","Sheet'teki 'Ne ters gidiyor?' listesi kaynagi gosteriyor."],
       ["Kim yardima ihtiyac duyuyor?","Kirmizi halkali kisiler gecikmis isi olanlar."]]};
  function askQA(){
    const r=state.role;
    if(r==="member")return ASK_QA_MEMBER;
    if(r==="lead")return ASK_QA_LEAD;
    return ASK_QA_OWNER;
  }
  function askContext(){
    if(state.person)return{key:"room",label:`Kisi · ${state.person}`};
    const qa=askQA();
    if(state.room)return{key:qa[state.floor!]?state.floor!:"room",label:`Oda · ${RM()?.name}`};
    if(state.floor)return{key:qa[state.floor]?state.floor:"room",label:`Kat · ${F().name}`};
    return{key:"hq",label:"Sirket geneli"};
  }
  function openAsk(){
    const ctx=askContext();
    const actx=$("#shqAskCtx");if(actx)actx.textContent="Baglam: "+ctx.label;
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
          if(th2){th2.innerHTML+=`<div class="ask-q">${q}</div><div class="ask-a">O kata anahtarin yok. istersen erisim istegi acabilirim.</div>`;th2.scrollTop=th2.scrollHeight}
          (e.target as HTMLInputElement).value="";return}
        closeAsk();goFloorAnywhere(f.id);(e.target as HTMLInputElement).value="";return}
      for(const r of f.rooms){
        if(r.name.toLocaleLowerCase("tr").includes(lq)){
          const rv3=roomVis(f.id,r.id);
          if(rv3==="shape"){const th2=$("#shqAskThread");
            if(th2){th2.innerHTML+=`<div class="ask-q">${q}</div><div class="ask-a">O alana anahtarin yok. istersen erisim istegi acabilirim.</div>`;th2.scrollTop=th2.scrollHeight}
            (e.target as HTMLInputElement).value="";return}
          closeAsk();goFloorAnywhere(f.id,()=>{if(rv3==="content")openSheet(r.id)});(e.target as HTMLInputElement).value="";return}
        for(const mm of r.members)
          if(mm.name.toLocaleLowerCase("tr").includes(lq)){closeAsk();goFloorAnywhere(f.id,()=>openSheet(r.id,mm.name));(e.target as HTMLInputElement).value="";return}
      }}
    const th=$("#shqAskThread");
    if(th){th.innerHTML+=`<div class="ask-q">${q}</div><div class="ask-a">Prototipte bu soru icin hazir yanit yok — gercek urunde Company Graph uzerinde calisan AI'a gider.</div>`;
    th.scrollTop=th.scrollHeight}
    (e.target as HTMLInputElement).value="";
  });
  function goFloorAnywhere(id: string,after?: ()=>void){
    if(!state.floor){goFloor(id);if(after)setTimeout(after,250)}
    else{state.floor=id;state.room=null;state.person=null;$("#shqSheet")?.classList.remove("open");
      renderPlan();renderWork();applyMode();renderCrumbs();renderFloorButtons();if(after)setTimeout(after,80)}
  }

  const keyHandler=(e: KeyboardEvent)=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();if($("#shqAskPanel")?.classList.contains("open")){closeAsk()}else{openAsk()}return}
    if(e.key==="Escape"){
      if($("#shqModal")?.classList.contains("open")){closeModal();return}
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
    d.innerHTML=`<div class="door-icon">🚧</div>
      <div class="door-title">${name}</div>
      <div class="door-sub">${desc}</div>
      <div class="door-actions">
        <button class="btn-lime" data-act="request">${actionLabel}</button>
        <button class="btn-ghost" data-act="close">Kapat</button>
      </div>`;
    d.classList.add("show");
    d.querySelector("[data-act=request]")?.addEventListener("click",()=>{
      fakeAct("Erisim istegi gonderildi — Lobi'deki Inbox'a dustu");closeDoor()});
    d.querySelector("[data-act=close]")?.addEventListener("click",closeDoor);
  }
  function showDoorPulse(rid: string){
    const r=F().rooms.find(x=>x.id===rid)!;
    const st=rSt(r);
    const d=$("#shqDoor");if(!d)return;
    d.innerHTML=`<div class="door-icon">🚧</div>
      <div class="door-title">${r.name}</div>
      <div class="door-sub" style="text-align:left">
        <div style="margin-bottom:6px">${r.members.length} kisi · <span style="color:${stColor(st)};font-weight:700">${ST[rSt(r)].t}</span></div>
        <div style="color:var(--dim);font-size:12px">icerik detaylarini gormek icin erisim gerekiyor.</div>
      </div>
      <div class="door-actions">
        <button class="btn-lime" data-act="request">Erisim iste</button>
        <button class="btn-ghost" data-act="close">Kapat</button>
      </div>`;
    d.classList.add("show");
    d.querySelector("[data-act=request]")?.addEventListener("click",()=>{
      fakeAct("Erisim istegi gonderildi");closeDoor()});
    d.querySelector("[data-act=close]")?.addEventListener("click",closeDoor);
  }
  function closeDoor(){$("#shqDoor")?.classList.remove("show")}

  function playEntrance(){
    const p=activeRole();
    const el=$("#shqEntrance");if(!el)return;
    el.innerHTML=`<div class="ent-avatar">${memojiSVG(p.avatar,72)}</div>
      <div class="ent-greet">${p.greeting}</div>
      <div class="ent-sub">${p.roleSub}</div>
      <div class="ent-brief">${p.briefing.map(b=>`<div class="eb-line">${b}</div>`).join("")}</div>
      <div class="ent-hint">Tikla veya Enter ile basla</div>`;
    el.classList.add("active");el.classList.remove("fade");
    requestAnimationFrame(()=>{
      el.querySelector(".ent-avatar")?.classList.add("in");
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
      el.innerHTML=`<span style="display:inline-flex;align-items:center;gap:4px">${memojiSVG(ep.avatar,18)} ${ep.person} gozunden bakiyorsun</span> <button data-act="exit">Cik</button>`;
      el.classList.add("show");
      el.querySelector("[data-act=exit]")?.addEventListener("click",()=>{
        state.empathy=null;renderEmpathy();goHQ();renderHQ();renderCrumbs()});
    }else{
      el.classList.remove("show");
    }
  }
  function switchRole(role: string){
    state.role=role;state.empathy=null;
    renderRolePicker();
    goHQ();renderEmpathy();
    setTimeout(()=>playEntrance(),100);
  }

  function renderRolePicker(){
    const sw=$("#shqRoleSw");if(!sw)return;
    const keys=Object.keys(ROLE_PROFILES) as string[];
    sw.innerHTML=keys.map(k=>{
      const rp=ROLE_PROFILES[k];
      const on=state.role===k?"on":"";
      return `<div class="role-av ${on}" data-role="${k}" title="${rp.label}">
        ${memojiSVG(rp.avatar,26)}
        <span class="role-badge-icon">${rp.avatar.badge||""}</span>
        <span class="role-tip">${rp.label}</span>
      </div>`;
    }).join("");
    sw.querySelectorAll(".role-av").forEach(el=>{
      el.addEventListener("click",()=>{
        const r=(el as HTMLElement).dataset.role!;
        if(r!==state.role)switchRole(r);
      });
    });
  }
  renderRolePicker();

  renderHQ();renderCrumbs();renderReplay();renderEmpathy();
  playEntrance();

  const bldEl=$("#hqBuilding");
  if(bldEl){
    bldEl.addEventListener("pointerdown",(e: PointerEvent)=>{
      if(state.view!=="hq"&&state.floor)return;
      // Check if clicking on fctl
      if((e.target as Element).closest(".fctl")) return;

      const floorEl = (e.target as Element).closest(".bfloor");
      const isDraggable = floorEl && floorEl.classList.contains("draggable");

      if(isDraggable && state.sort === "custom") {
        // Start drag for floor reordering
        const fid = (floorEl as HTMLElement).dataset.f!;
        const ord = parseInt((floorEl as HTMLElement).dataset.ord || "0", 10);
        const svgEl = bldEl.querySelector("svg") as SVGSVGElement;
        if(svgEl) {
          drag = {fid, el: floorEl!, startY: e.clientY, moved: false, ord, svgEl};
          bldEl.setPointerCapture(e.pointerId);
          wasCamDrag = false;
          hideTooltip();
          return;
        }
      }

      camDrag={x:e.clientX,y:e.clientY,rot:cam.rot,tilt:cam.tilt};
      bldEl.setPointerCapture(e.pointerId);
      bldEl.classList.add("dragging");
      wasCamDrag=false;
      hideTooltip();
    });
    bldEl.addEventListener("pointermove",(e: PointerEvent)=>{
      if(drag) {
        const dy = e.clientY - drag.startY;
        if(Math.abs(dy) > 5) drag.moved = true;
        if(drag.moved) {
          drag.el.classList.add("dragging");
          // Apply translate via transform on the SVG group
          const g = drag.el as SVGGElement;
          g.setAttribute("transform", `translate(0, ${-dy * 0.6})`);
        }
        return;
      }
      if(!camDrag)return;
      const ddx=e.clientX-camDrag.x,ddy=e.clientY-camDrag.y;
      if(ddx*ddx+ddy*ddy>25)wasCamDrag=true;
      cam.rot=camDrag.rot+ddx*0.008;
      cam.tilt=Math.max(0.15,Math.min(1.3,camDrag.tilt-ddy*0.005));
      if(!camRaf)camRaf=requestAnimationFrame(()=>{camRaf=0;renderHQ()});
      const hint=$("#camHint");
      if(hint&&!hint.classList.contains("faded"))hint.classList.add("faded");
    });
    bldEl.addEventListener("pointerup",(e: PointerEvent)=>{
      if(drag) {
        bldEl.releasePointerCapture(e.pointerId);
        if(drag.moved) {
          // Calculate drop position based on drag direction
          const dy = e.clientY - drag.startY;
          const rest = FLOORS.filter(f => !f.lobby);
          const oldIdx = rest.findIndex(f => f.id === drag!.fid);
          // Moving up in screen = moving to higher floor = later in array
          const step = dy < -30 ? -1 : dy > 30 ? 1 : 0;
          if(step !== 0 && oldIdx >= 0) {
            const newIdx = Math.max(0, Math.min(rest.length - 1, oldIdx + step));
            if(newIdx !== oldIdx) {
              // Remove from FLOORS and reinsert
              const floorIdx = FLOORS.indexOf(rest[oldIdx]);
              const [moved] = FLOORS.splice(floorIdx, 1);
              const targetFloor = rest[newIdx];
              const targetIdx = FLOORS.indexOf(targetFloor);
              FLOORS.splice(step > 0 ? targetIdx + 1 : targetIdx, 0, moved);
            }
          }
        }
        drag.el.classList.remove("dragging");
        (drag.el as SVGGElement).removeAttribute("transform");
        drag = null;
        renderHQ();
        return;
      }
      if(camDrag){bldEl.releasePointerCapture(e.pointerId);bldEl.classList.remove("dragging")}
      camDrag=null;
      if(wasCamDrag)setTimeout(()=>{wasCamDrag=false},50);
    });
    bldEl.addEventListener("pointercancel",()=>{
      if(drag) {
        drag.el.classList.remove("dragging");
        (drag.el as SVGGElement).removeAttribute("transform");
        drag = null;
        renderHQ();
      }
      camDrag=null;bldEl.classList.remove("dragging");
      if(wasCamDrag)setTimeout(()=>{wasCamDrag=false},50);
    });
  }
  const resetBtn=$("#camReset");
  if(resetBtn){
    resetBtn.addEventListener("click",()=>{
      const from={rot:cam.rot,tilt:cam.tilt};
      let rotDiff=Math.PI/4-from.rot;
      while(rotDiff>Math.PI)rotDiff-=2*Math.PI;
      while(rotDiff<-Math.PI)rotDiff+=2*Math.PI;
      const tiltDiff=0.616-from.tilt;
      const t0=performance.now(),dur=400;
      const step=(now: number)=>{
        let k=Math.min(1,(now-t0)/dur);k=1-Math.pow(1-k,3);
        cam.rot=from.rot+rotDiff*k;
        cam.tilt=from.tilt+tiltDiff*k;
        renderHQ();
        if(k<1)requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

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
            <button data-m="pulse">Nabiz</button>
            <button data-m="work">is</button>
          </div>
          <div className="role-sw" id="shqRoleSw"></div>
        </div>
        <div id="shqStage" style={{flex:1,position:"relative",minHeight:0,overflow:"hidden"}}>
          <div className="view on" id="hqView">
            <div id="hqInner" style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div className="hq-hero">
                <h2>Sirket nasil gidiyor?</h2>
                <p>Bir kata dokun &mdash; <em>icine gir.</em></p>
              </div>
              <div className="pulse-strip" id="hqKpis"></div>
              <div id="hqBuilding"></div>
              <div className="cam-ctrl">
                <span className="cam-hint" id="camHint">Surukle: dondur</span>
                <button className="cam-reset" id="camReset">&circlearrowleft;</button>
              </div>
            </div>
            <div className="hq-tools" id="hqTools"></div>
            <div className="drag-hint" id="dragHint"></div>
          </div>
          <div className="view" id="floorView">
            <div className="floor-header" style={{width:"100%",padding:"0 24px"}}>
              <h2 id="floorTitle"></h2><span className="fh-sub" id="floorSub"></span>
              <div id="floorBtns" style={{display:"flex",gap:"6px",marginLeft:"auto"}}></div>
            </div>
            <div className="plan-holder" id="planHolder"></div>
            <div id="workWrap"></div>
          </div>
          <div id="shqTooltip"></div>
          <div id="shqPopup"></div>
          <div id="shqDoor"></div>
          <div id="shqModal"></div>
          <div id="shqEntrance"></div>
          <div className="empathy-bar" id="shqEmpathy"></div>
          <aside id="shqSheet">
            <div className="sheet-head"><button className="sh-back" id="shBack"></button><button className="sh-x" id="shqShClose">&times;</button></div>
            <div className="sheet-body" id="sheetBody"></div>
            <div className="sheet-actions" id="sheetActions"></div>
          </aside>
          <div id="shqReplay"></div>
          <div id="shqReplayNote"></div>
          <button id="shqAskBtn">HQ'ya Sor <kbd>&#8984;K</kbd></button>
          <div id="shqAskPanel">
            <div className="ask-head"><b>HQ'ya Sor</b><div className="ask-ctx" id="shqAskCtx"></div></div>
            <div className="ask-thread" id="shqAskThread"></div>
            <div className="ask-sugs" id="shqAskSugs"></div>
            <div className="ask-input"><input id="shqAskInput" placeholder="Sor ya da bir yere git..." /></div>
            <div className="hint-foot">Enter = git/sor &middot; Esc = kapat</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
