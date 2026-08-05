import { describe, it, expect } from 'vitest';
import { parseDirective } from './agent-parse';

describe('parseDirective', () => {
  it('produces noop for empty / gibberish', () => {
    expect(parseDirective('').plan).toEqual([]);
    const noop = parseDirective('bazi anlamsiz seyler yazalim ki nlp bir sey bulmasin').plan;
    expect(noop).toHaveLength(1);
    expect(noop[0].tool).toBe('noop');
  });

  it('parses "acil bug\'ları Mehmet\'e ata"', () => {
    const { plan } = parseDirective("acil bug'ları Mehmet'e ata");
    const step = plan.find(s => s.tool === 'assign_tasks');
    expect(step).toBeDefined();
    expect(step!.params.assignee_name).toBe('Mehmet');
    expect(step!.params.filter?.priority).toContain('urgent');
    expect(step!.params.filter?.tags).toContain('bug');
  });

  it('parses "tamamlananları kapat" as status→done', () => {
    const { plan } = parseDirective('tamamlananları kapat');
    expect(plan[0].tool).toBe('update_task_status');
    expect(plan[0].params.new_status).toBe('done');
    expect(plan[0].params.filter?.status).toContain('done');
  });

  it('parses "high priority tasks assign to Ayse"', () => {
    const { plan } = parseDirective('high priority tasks assign to Ayse');
    const step = plan.find(s => s.tool === 'assign_tasks');
    expect(step).toBeDefined();
    expect(step!.params.assignee_name).toBe('Ayse');
    expect(step!.params.filter?.priority).toContain('high');
  });

  it('parses "#urgent etiket ekle"', () => {
    const { plan } = parseDirective("in progress task'lara #urgent etiket ekle");
    const step = plan.find(s => s.tool === 'add_tag_to_tasks');
    expect(step).toBeDefined();
    expect(step!.params.tag).toBe('urgent');
    expect(step!.params.filter?.status).toContain('in_progress');
  });

  it('parses "bir hafta güncellenmeyen taskları X\'e bildir"', () => {
    const { plan } = parseDirective("bir hafta güncellenmeyen taskları Cagan'e bildir");
    const step = plan.find(s => s.tool === 'notify_user');
    expect(step).toBeDefined();
    expect(step!.params.user_name).toBe('Cagan');
    expect(step!.description).toContain('7g');
  });

  it('extracts assignee from @handle', () => {
    const { plan } = parseDirective('yüksek bug @mehmety ata');
    const step = plan.find(s => s.tool === 'assign_tasks');
    expect(step!.params.assignee_name).toBe('mehmety');
    expect(step!.params.filter?.priority).toContain('high');
  });

  it('description hints at what would happen', () => {
    const { plan } = parseDirective("acil bug'ları Ali'ye ata");
    expect(plan[0].description).toContain('Ali');
    expect(plan[0].description).toContain('urgent');
  });
});
