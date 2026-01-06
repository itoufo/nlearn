-- =====================================================
-- NLearn Platform - Seed Data
-- =====================================================
-- Initial data for development/testing
-- Created: 2026-01-06
-- =====================================================

-- =====================================================
-- SEED COURSES (既存カリキュラムをコース化)
-- =====================================================

-- Insert main course
INSERT INTO courses (id, title, slug, description, price, status, category, tags, estimated_hours, order_index)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'AI活用人材育成カリキュラム',
    'ai-curriculum',
    'AIリテラシーから実践的なAI活用スキルまで体系的に学べる総合カリキュラム。コミュニケーション力、言語力、セルフコーチング力、PM力の4つのコアコンピテンシーを育成します。',
    0,  -- 無料コース
    'published',
    'AI・機械学習',
    ARRAY['AI', 'リテラシー', '生成AI', 'プロンプト', '入門'],
    30,
    1
);

-- =====================================================
-- SEED CHAPTERS (既存ドキュメントをチャプター化)
-- =====================================================

-- Overview
INSERT INTO chapters (course_id, title, slug, content_path, description, duration_minutes, order_index, is_preview, quiz_id)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'カリキュラム概要', 'overview', '/docs/00_カリキュラム概要.md', 'カリキュラム全体の概要と学習目標', 15, 0, TRUE, NULL);

-- Stage 1: 入門
INSERT INTO chapters (course_id, title, slug, content_path, description, duration_minutes, order_index, is_preview, quiz_id)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AIリテラシー入門', 'ai-literacy', '/docs/01_入門/01_AIリテラシー入門.md', 'AI時代に必要な基礎知識を学ぶ', 45, 1, TRUE, 'ai-literacy'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '生成AIの仕組み', 'generative-ai', '/docs/01_入門/02_生成AIの仕組み.md', 'ChatGPTなど生成AIの基本原理を理解', 45, 2, FALSE, 'generative-ai'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AI倫理と安全性', 'ai-ethics', '/docs/01_入門/03_AI倫理と安全性.md', 'AIを安全に活用するための倫理観', 30, 3, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'プロンプト基礎', 'prompt-basics', '/docs/01_入門/04_プロンプト基礎.md', '効果的なプロンプトの書き方', 45, 4, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AI活用演習', 'ai-practice', '/docs/01_入門/05_AI活用演習.md', '実践的なAI活用演習', 60, 5, FALSE, NULL);

-- Stage 2: 応用
INSERT INTO chapters (course_id, title, slug, content_path, description, duration_minutes, order_index, is_preview, quiz_id)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Chain-of-Thought手法', 'cot', '/docs/02_応用/01_Chain-of-Thought手法.md', '論理的思考を引き出すプロンプト技術', 45, 6, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '情報整理と論理的表現', 'info-logic', '/docs/02_応用/02_情報整理と論理的表現.md', 'AIを活用した情報整理スキル', 45, 7, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'プロジェクト管理とAI', 'pm-ai', '/docs/02_応用/03_プロジェクト管理とAI.md', 'AIを活用したプロジェクト管理', 45, 8, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '業務自動化ツール', 'automation', '/docs/02_応用/04_業務自動化ツール.md', 'AIで業務を自動化する方法', 60, 9, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ビジネス課題解決', 'business', '/docs/02_応用/05_ビジネス課題解決.md', 'AIでビジネス課題を解決する', 60, 10, FALSE, NULL);

-- Stage 3: 発展
INSERT INTO chapters (course_id, title, slug, content_path, description, duration_minutes, order_index, is_preview, quiz_id)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'P-A-I-Cサイクル', 'paic', '/docs/03_発展/01_P-A-I-Cサイクル.md', '継続的改善サイクルの実践', 45, 11, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PBLプロジェクト設計', 'pbl', '/docs/03_発展/02_PBLプロジェクト設計.md', 'プロジェクトベース学習の設計', 60, 12, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ポートフォリオ作成', 'portfolio', '/docs/03_発展/03_ポートフォリオ作成.md', 'スキルを証明するポートフォリオ作成', 60, 13, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AI倫理週間', 'ethics-week', '/docs/03_発展/04_AI倫理週間.md', 'AI倫理の深掘り学習', 45, 14, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'セルフコーチング', 'self-coaching', '/docs/03_発展/05_セルフコーチング.md', '自律的な学習と成長', 45, 15, FALSE, NULL);

-- Assessment
INSERT INTO chapters (course_id, title, slug, content_path, description, duration_minutes, order_index, is_preview, quiz_id)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ルーブリック評価', 'rubric', '/docs/assessment/ルーブリック.md', '学習成果の評価基準', 30, 16, FALSE, NULL),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ワークシート', 'worksheets', '/docs/worksheets/README.md', '実践ワークシート集', 60, 17, FALSE, NULL);

-- =====================================================
-- ADMIN USER (開発用)
-- =====================================================
-- Note: 本番環境では削除すること
-- Admin user は auth.users 経由で作成後、profiles を更新

-- Example: After creating user via Supabase Auth
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
