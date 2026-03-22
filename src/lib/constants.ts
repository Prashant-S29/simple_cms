export const FROM_EMAIL = "onboarding@resend.dev";
export const PAGINATION_LIMIT = 50;

export const PROJECT_ADMIN_DASHBOARD_NAVLINKS = [
  {
    label: "Dashboard",
    segment: "",
  },
  {
    label: "Schemas",
    segment: "schema",
  },
  {
    label: "Blogs",
    segment: "blog",
  },
  {
    label: "API Keys",
    segment: "api-keys",
  },
  {
    label: "Settings",
    segment: "settings",
  },
];

export const FILE_EXTENSION_MAP: Record<
  string,
  { fileType: string; formats: string[] }
> = {
  webp: { fileType: "image", formats: ["webp"] },
  jpg: { fileType: "image", formats: ["jpg"] },
  jpeg: { fileType: "image", formats: ["jpeg"] },
  png: { fileType: "image", formats: ["png"] },
  gif: { fileType: "image", formats: ["gif"] },
  svg: { fileType: "image", formats: ["svg"] },
  avif: { fileType: "image", formats: ["avif"] },
  mp4: { fileType: "video", formats: ["mp4"] },
  webm: { fileType: "video", formats: ["webm"] },
  mov: { fileType: "video", formats: ["mov"] },
  avi: { fileType: "video", formats: ["avi"] },
  mkv: { fileType: "video", formats: ["mkv"] },
  pdf: { fileType: "pdf", formats: ["pdf"] },
  mp3: { fileType: "audio", formats: ["mp3"] },
  wav: { fileType: "audio", formats: ["wav"] },
  ogg: { fileType: "audio", formats: ["ogg"] },
  aac: { fileType: "audio", formats: ["aac"] },
  flac: { fileType: "audio", formats: ["flac"] },
  doc: { fileType: "document", formats: ["doc"] },
  docx: { fileType: "document", formats: ["docx"] },
  xls: { fileType: "document", formats: ["xls"] },
  xlsx: { fileType: "document", formats: ["xlsx"] },
  ppt: { fileType: "document", formats: ["ppt"] },
  pptx: { fileType: "document", formats: ["pptx"] },
  txt: { fileType: "document", formats: ["txt"] },
  csv: { fileType: "document", formats: ["csv"] },
};
