/** Bounded, publishable previews. Full originals remain in Drive. */
export type PreviewPage = {
  id: string;
  kind: 'text' | 'table' | 'image';
  title: string;
  subtitle?: string;
  sourcePage?: number;
  sections?: { heading: string; body: string }[];
  columns?: string[];
  rows?: string[][];
  image?: { src: string; alt: string; caption?: string };
};

/** Stable references separate document order from pages within each document. */
export type Collection = {
  id: string;
  title: string;
  project: string;
  summary: string;
  artifactIds: string[];
  updatedAt: string;
  demoContent: boolean;
};
