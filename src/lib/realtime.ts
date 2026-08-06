import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Supabase Realtime subscription helper.
 *
 * Basit kontrat: bir tabloya subscribe olur, INSERT/UPDATE/DELETE
 * olayında callback çağırır. Filter opsiyonel (Supabase format: 'column=eq.uuid').
 * Kanal ismi çakışmasın diye channel prefix'e table+filter dahil edilir.
 *
 * Component unmount olunca subscription otomatik iptal.
 */
export function useRealtime(
  table: string,
  onChange: () => void,
  opts: { filter?: string; enabled?: boolean } = {},
) {
  const { filter, enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const channelName = `wh:${table}${filter ? ':' + filter : ''}:${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as unknown as never,
        { event: '*', schema: 'public', table, filter } as never,
        () => onChange(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled]);
}
