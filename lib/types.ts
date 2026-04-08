export type ContentBlock = {
  id: string;
  title: string;
  summary: string;
  status: "Published" | "Draft";
};

export type ContactMethod = {
  label: string;
  value: string;
  href?: string;
};
