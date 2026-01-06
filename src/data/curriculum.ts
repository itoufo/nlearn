export interface DocItem {
  id: string;
  title: string;
  courseSlug: string;
}

export interface Section {
  id: string;
  title: string;
  items: DocItem[];
}

// Default course for the AI basics curriculum
export const DEFAULT_COURSE_SLUG = 'ai-basics';

export const curriculum: Section[] = [
  {
    id: 'overview',
    title: 'カリキュラム概要',
    items: [
      { id: 'curriculum-overview', title: 'カリキュラム概要', courseSlug: DEFAULT_COURSE_SLUG },
    ],
  },
  {
    id: 'stage1',
    title: '第1段階：入門',
    items: [
      { id: 'ai-literacy', title: '1. AIリテラシー入門', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'generative-ai', title: '2. 生成AIの仕組み', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'ai-ethics', title: '3. AI倫理と安全性', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'prompt-basics', title: '4. プロンプト基礎', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'ai-practice', title: '5. AI活用演習', courseSlug: DEFAULT_COURSE_SLUG },
    ],
  },
  {
    id: 'stage2',
    title: '第2段階：応用',
    items: [
      { id: 'cot', title: '1. Chain-of-Thought手法', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'info-organization', title: '2. 情報整理と論理的表現', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'project-management', title: '3. プロジェクト管理とAI', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'automation', title: '4. 業務自動化ツール', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'business-problem', title: '5. ビジネス課題解決', courseSlug: DEFAULT_COURSE_SLUG },
    ],
  },
  {
    id: 'stage3',
    title: '第3段階：発展',
    items: [
      { id: 'paic', title: '1. P-A-I-Cサイクル', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'pbl', title: '2. PBLプロジェクト設計', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'portfolio', title: '3. ポートフォリオ作成', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'ethics-week', title: '4. AI倫理週間', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'self-coaching', title: '5. セルフコーチング', courseSlug: DEFAULT_COURSE_SLUG },
    ],
  },
  {
    id: 'assessment',
    title: '評価・演習',
    items: [
      { id: 'evaluation', title: '評価基準', courseSlug: DEFAULT_COURSE_SLUG },
      { id: 'worksheets', title: '演習問題集', courseSlug: DEFAULT_COURSE_SLUG },
    ],
  },
];

export const getDocById = (id: string): DocItem | undefined => {
  for (const section of curriculum) {
    const item = section.items.find((item) => item.id === id);
    if (item) return item;
  }
  return undefined;
};

/**
 * 指定された章IDの次の章を取得
 */
export const getNextDoc = (currentId: string): DocItem | undefined => {
  const allDocs: DocItem[] = [];
  for (const section of curriculum) {
    allDocs.push(...section.items);
  }

  const currentIndex = allDocs.findIndex((doc) => doc.id === currentId);
  if (currentIndex === -1 || currentIndex === allDocs.length - 1) {
    return undefined;
  }

  return allDocs[currentIndex + 1];
};

/**
 * Get all docs for a specific course
 */
export const getDocsByCourse = (courseSlug: string): DocItem[] => {
  const docs: DocItem[] = [];
  for (const section of curriculum) {
    docs.push(...section.items.filter(item => item.courseSlug === courseSlug));
  }
  return docs;
};
