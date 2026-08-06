-- ============================================================================
-- ATTACHMENTS BUCKET — the attachments table existed but no bucket did.
-- Private bucket; object paths MUST be `<workspace_id>/<filename>` and every
-- operation requires active membership in that workspace.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "attachments ws select" ON storage.objects;
CREATE POLICY "attachments ws select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attachments'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "attachments ws insert" ON storage.objects;
CREATE POLICY "attachments ws insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "attachments ws delete" ON storage.objects;
CREATE POLICY "attachments ws delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'attachments'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );
