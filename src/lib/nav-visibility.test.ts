import { describe, it, expect } from "vitest";
import { visibleClusters, clusters, PATH_MODULE } from "@/components/nav-config";

const flatPaths = (cs: ReturnType<typeof visibleClusters>) =>
  cs.flatMap((c) => c.sections.flatMap((s) => s.items.map((i) => i.path)));

describe("visibleClusters (modül gating)", () => {
  it("enabled_modules boşsa her şey görünür (seçim yapılmamış)", () => {
    expect(visibleClusters([])).toEqual(clusters);
    expect(visibleClusters(null)).toEqual(clusters);
    expect(visibleClusters(undefined)).toEqual(clusters);
  });

  it("çekirdek path'ler her kombinasyonda görünür", () => {
    const paths = flatPaths(visibleClusters(["work"]));
    for (const core of ["/home", "/inbox", "/decisions", "/ai-chat", "/integrations"]) {
      expect(paths).toContain(core);
    }
  });

  it("kapalı modülün path'leri gizlenir, açığınkiler kalır", () => {
    const paths = flatPaths(visibleClusters(["work", "goals"]));
    expect(paths).toContain("/projects");
    expect(paths).toContain("/goals");
    expect(paths).not.toContain("/crm");
    expect(paths).not.toContain("/finance");
    expect(paths).not.toContain("/employees");
    expect(paths).not.toContain("/assets");
  });

  it("tamamen boşalan cluster listeden düşer", () => {
    const cs = visibleClusters(["crm"]);
    expect(cs.find((c) => c.id === "operations")).toBeUndefined();
    expect(cs.find((c) => c.id === "work")).toBeUndefined();
  });

  it("PATH_MODULE'deki her path gerçekten nav'da tanımlı", () => {
    const all = flatPaths(clusters as unknown as ReturnType<typeof visibleClusters>);
    for (const p of Object.keys(PATH_MODULE)) {
      expect(all).toContain(p);
    }
  });
});
