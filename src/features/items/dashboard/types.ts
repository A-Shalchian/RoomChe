export type DashboardItem = {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  image_url_nobg: string | null;
  image_display_url: string | null;
  would_discard: "never" | "maybe" | "soon" | null;
  views: number;
  created_at: string;
  why_kept: string | null;
  notes: string | null;
  locations: { name: string } | null;
};

export type CategoryGroup = {
  category: string;
  items: DashboardItem[];
};
