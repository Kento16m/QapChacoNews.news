export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sort_order: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Author {
  full_name: string;
  avatar_url: string | null;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: Category | null;
  author: Author | null;
  tags: Tag[];
  is_featured: boolean;
  is_breaking: boolean;
  reading_time_minutes: number | null;
  seo_title: string | null;
  seo_description: string | null;
  views_count: number;
  published_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  profile_color?: string | null;
  role: "reader" | "editor" | "admin";
}
