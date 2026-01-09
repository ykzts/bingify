-- 管理者が全てのアバターを削除できるようにするRLSポリシーを追加

-- 管理者がすべてのユーザーのアバターを削除できるポリシー
CREATE POLICY "Admins can delete any avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
