-- ============================================================
-- Image Studio — Supabase 初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中执行一次即可。
-- ============================================================

-- 1. 历史记录表
CREATE TABLE IF NOT EXISTS image_history (
  id              TEXT    PRIMARY KEY,
  kind            TEXT    NOT NULL CHECK (kind IN ('generate', 'edit')),
  created_at      BIGINT  NOT NULL,
  prompt          TEXT    NOT NULL,
  model           TEXT    NOT NULL,
  size            TEXT,
  quality         TEXT,
  image_blob_keys TEXT[]  NOT NULL DEFAULT '{}',
  revised_prompt  TEXT,
  params          JSONB   NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_image_history_created_at
  ON image_history (created_at DESC);

-- 2. 创建公开 Storage bucket（存放生成的图片）
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage 策略：允许 service_role 读写（服务端使用此 key）
--    公开 bucket 的 SELECT 对所有人放行，无需额外 policy。
--    以下 policy 允许 service_role 执行上传和删除。
CREATE POLICY IF NOT EXISTS "service_role can insert images"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'images');

CREATE POLICY IF NOT EXISTS "service_role can delete images"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'images');

-- 4. 表级 RLS（Row Level Security）
--    history 表只通过服务端 service_role 访问，不开放匿名访问。
ALTER TABLE image_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "service_role full access"
  ON image_history
  TO service_role
  USING (true)
  WITH CHECK (true);
