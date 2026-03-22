"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FloppyDiskIcon,
  TextBoldIcon,
  TextItalicIcon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  SourceCodeIcon,
  ListViewIcon,
  LeftToRightListBulletIcon,
  QuoteDownIcon,
  LinkIcon,
  CodeIcon,
  EyeIcon,
  Edit03Icon,
} from "@hugeicons/core-free-icons";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Field, FieldLabel } from "~/components/ui/field";
import { Switch } from "~/components/ui/switch";
import { Skeleton } from "~/components/ui/skeleton";
import { ResourceHandler } from "~/components/common";
import { getLocaleFlag } from "~/lib/locales";
import { cn } from "~/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "editor" | "preview" | "split";

interface Props {
  postSlug: string;
  projectSlug: string;
  orgSlug: string;
  orgId: string;
}

// ─── Main editor page ─────────────────────────────────────────────────────────

export const BlogEditor: React.FC<Props> = ({
  postSlug,
  projectSlug,
  orgId,
}) => {
  const { data: projectResponse, isLoading: isProjectLoading } =
    api.project.getBySlug.useQuery({ slug: projectSlug, orgId });

  const projectId = projectResponse?.data?.id ?? "";

  const { data: postResponse, isLoading: isPostLoading } =
    api.blogPost.getBySlug.useQuery(
      { slug: postSlug, projectId, orgId },
      { enabled: !!projectId },
    );

  const { data: langsResponse, isLoading: isLangsLoading } =
    api.projectLanguage.getAll.useQuery(
      { projectId, orgId },
      { enabled: !!projectId },
    );

  const activeLanguages = (langsResponse?.data ?? []).filter(
    (l) => l.status === "active",
  );

  const defaultLocale =
    activeLanguages.find((l) => l.locale === "en")?.locale ??
    activeLanguages[0]?.locale ??
    "en";

  const [activeLocale, setActiveLocale] = useState(defaultLocale);

  useEffect(() => {
    if (
      activeLanguages.length > 0 &&
      !activeLanguages.find((l) => l.locale === activeLocale)
    ) {
      setActiveLocale(defaultLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langsResponse]);

  const isLoading = isProjectLoading || isPostLoading || isLangsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!projectResponse?.data || !postResponse?.data) {
    return <ResourceHandler state="not_found" />;
  }

  const postId = postResponse.data.id;

  return (
    <div className="flex h-full flex-col">
      {/* ── Back + locale tabs ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b">
        <div className="flex items-center">
          <div className="flex items-center overflow-x-auto">
            {activeLanguages.map((lang) => (
              <button
                key={lang.locale}
                type="button"
                onClick={() => setActiveLocale(lang.locale)}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors",
                  activeLocale === lang.locale
                    ? "border-primary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                <span>{getLocaleFlag(lang.locale)}</span>
                <span>{lang.label}</span>
                {lang.isDefault && (
                  <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-xs">
                    Default
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="ml-auto shrink-0 px-4 py-2">
            <code className="text-muted-foreground font-mono text-xs">
              /{postSlug}
            </code>
          </div>
        </div>
      </div>

      {/* ── Per-locale editor ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        <LocaleBlogEditor
          key={`${postId}-${activeLocale}`}
          postId={postId}
          projectId={projectId}
          orgId={orgId}
          locale={activeLocale}
        />
      </div>
    </div>
  );
};

// ─── Per-locale editor ────────────────────────────────────────────────────────

interface LocaleBlogEditorProps {
  postId: string;
  projectId: string;
  orgId: string;
  locale: string;
}

const LocaleBlogEditor: React.FC<LocaleBlogEditorProps> = ({
  postId,
  projectId,
  orgId,
  locale,
}) => {
  const utils = api.useUtils();
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [isDirty, setIsDirty] = useState(false);

  // ── Form state ────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorDesignation, setAuthorDesignation] = useState("");
  const [authorCompany, setAuthorCompany] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [customMeta, setCustomMeta] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");

  // ── Fetch content ─────────────────────────────────────────────────────
  const { data: response, isLoading } = api.blogContent.getOrInit.useQuery({
    postId,
    projectId,
    orgId,
    locale,
  });

  const content = response?.data;

  useEffect(() => {
    if (!content) return;
    setTitle(content.title ?? "");
    setExcerpt(content.excerpt ?? "");
    setCoverImage(content.coverImage ?? "");
    setAuthorName(content.authorName ?? "");
    setAuthorDesignation(content.authorDesignation ?? "");
    setAuthorCompany(content.authorCompany ?? "");
    setTagsInput((content.tags ?? []).join(", "));
    setCustomMeta((content.customMeta as Record<string, string>) ?? {});
    setBody(content.body ?? "");
    setIsDirty(false);
  }, [content]);

  // ── Insert markdown helper ────────────────────────────────────────────
  const insertMarkdown = (before: string, after = "") => {
    const textarea = document.getElementById(
      "blog-body",
    ) as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);
    const replacement = `${before}${selected}${after}`;
    const next = body.slice(0, start) + replacement + body.slice(end);
    setBody(next);
    setIsDirty(true);

    // Restore cursor after state update
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + before.length + selected.length + after.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  // ── Mutations ─────────────────────────────────────────────────────────
  const { mutate: save, isPending: isSaving } =
    api.blogContent.save.useMutation({
      onError: () => toast.error("Failed to save."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Saved.");
        setIsDirty(false);
        void utils.blogContent.getOrInit.invalidate();
        void utils.blogPost.getAll.invalidate();
      },
    });

  const { mutate: publish, isPending: isPublishing } =
    api.blogContent.publish.useMutation({
      onError: () => toast.error("Failed to publish."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Post published.");
        void utils.blogContent.getOrInit.invalidate();
        void utils.blogPost.getAll.invalidate();
      },
    });

  const { mutate: unpublish, isPending: isUnpublishing } =
    api.blogContent.unpublish.useMutation({
      onError: () => toast.error("Failed to unpublish."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Post moved to draft.");
        void utils.blogContent.getOrInit.invalidate();
        void utils.blogPost.getAll.invalidate();
      },
    });

  const { mutate: toggleActive, isPending: isToggling } =
    api.blogContent.toggleActive.useMutation({
      onError: () => toast.error("Failed to update status."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success(res.message ?? "Updated.");
        void utils.blogContent.getOrInit.invalidate();
        void utils.blogPost.getAll.invalidate();
      },
    });

  const handleSave = () => {
    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    save({
      postId,
      projectId,
      orgId,
      locale,
      title: title || undefined,
      excerpt: excerpt || undefined,
      coverImage: coverImage || undefined,
      body: body || undefined,
      authorName: authorName || undefined,
      authorDesignation: authorDesignation || undefined,
      authorCompany: authorCompany || undefined,
      tags: parsedTags,
      customMeta,
    });
  };

  if (isLoading || !content) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isPublished = content.status === "published";
  const isPostActive = content.isActive;

  const renderMarkdown = (md: string): string => {
    if (!md)
      return "<p class='text-muted-foreground'>Nothing to preview yet.</p>";

    const lines = md.split("\n");
    const output: string[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    for (const line of lines) {
      // Code block toggle
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          output.push(`<pre><code>${codeBuffer.join("\n")}</code></pre>`);
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Block-level elements — rendered as-is, no <p> wrapper
      if (line.startsWith("### ")) {
        output.push(`<h3>${inline(line.slice(4))}</h3>`);
      } else if (line.startsWith("## ")) {
        output.push(`<h2>${inline(line.slice(3))}</h2>`);
      } else if (line.startsWith("# ")) {
        output.push(`<h1>${inline(line.slice(2))}</h1>`);
      } else if (line.startsWith("> ")) {
        output.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      } else if (/^\d+\. /.test(line)) {
        output.push(`<li>${inline(line.replace(/^\d+\. /, ""))}</li>`);
      } else if (line.startsWith("- ")) {
        output.push(`<li>${inline(line.slice(2))}</li>`);
      } else if (line.startsWith("---")) {
        output.push("<hr />");
      } else if (line.trim() === "") {
        output.push("<br />");
      } else {
        // Regular paragraph line
        output.push(`<p>${inline(line)}</p>`);
      }
    }

    return output.join("\n");
  };

  // Inline formatting — bold, italic, code, links
  const inline = (text: string): string =>
    text
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

  return (
    <div className="mx-auto flex flex-col gap-6">
      {/* ── Top action bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              !isPostActive
                ? "bg-muted text-muted-foreground"
                : isPublished
                  ? "bg-green-500/10 text-green-600"
                  : "bg-amber-500/10 text-amber-600",
            )}
          >
            {!isPostActive ? "Inactive" : isPublished ? "Published" : "Draft"}
          </span>
          {content.publishedAt && (
            <span className="text-muted-foreground text-xs">
              Published {new Date(content.publishedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Active</span>
            <Switch
              checked={isPostActive}
              disabled={isToggling || !content.id}
              onCheckedChange={(checked) =>
                toggleActive({
                  postId,
                  projectId,
                  orgId,
                  locale,
                  isActive: checked,
                })
              }
            />
          </div>

          {isPublished ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isUnpublishing}
              isLoading={isUnpublishing}
              onClick={() => unpublish({ postId, projectId, orgId, locale })}
            >
              Move to Draft
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={isPublishing || !content.id}
              isLoading={isPublishing}
              onClick={() => publish({ postId, projectId, orgId, locale })}
            >
              Publish
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            isLoading={isSaving}
          >
            <HugeiconsIcon icon={FloppyDiskIcon} />
            {isDirty ? "Save" : "Saved"}
          </Button>
        </div>
      </div>

      {/* ── Title ────────────────────────────────────────────────────────── */}
      <Field>
        <FieldLabel htmlFor="blog-title">Title</FieldLabel>
        <Input
          id="blog-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setIsDirty(true);
          }}
          placeholder="Post title"
        />
      </Field>

      {/* ── Markdown editor ──────────────────────────────────────────────── */}
      <div className="bg-card overflow-hidden rounded-xl border">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b px-3 py-2">
          <ToolbarBtn label="Bold" onClick={() => insertMarkdown("**", "**")}>
            <HugeiconsIcon icon={TextBoldIcon} size={14} />
          </ToolbarBtn>
          <ToolbarBtn label="Italic" onClick={() => insertMarkdown("_", "_")}>
            <HugeiconsIcon icon={TextItalicIcon} size={14} />
          </ToolbarBtn>
          <div className="bg-border mx-1 h-4 w-px" />
          <ToolbarBtn label="H1" onClick={() => insertMarkdown("# ")}>
            <HugeiconsIcon icon={Heading01Icon} size={14} />
          </ToolbarBtn>
          <ToolbarBtn label="H2" onClick={() => insertMarkdown("## ")}>
            <HugeiconsIcon icon={Heading02Icon} size={14} />
          </ToolbarBtn>
          <ToolbarBtn label="H3" onClick={() => insertMarkdown("### ")}>
            <HugeiconsIcon icon={Heading03Icon} size={14} />
          </ToolbarBtn>
          <div className="bg-border mx-1 h-4 w-px" />
          <ToolbarBtn label="Bullet List" onClick={() => insertMarkdown("- ")}>
            <HugeiconsIcon icon={ListViewIcon} size={14} />
          </ToolbarBtn>
          <ToolbarBtn
            label="Ordered List"
            onClick={() => insertMarkdown("1. ")}
          >
            <HugeiconsIcon icon={LeftToRightListBulletIcon} size={14} />
          </ToolbarBtn>
          <div className="bg-border mx-1 h-4 w-px" />
          <ToolbarBtn label="Blockquote" onClick={() => insertMarkdown("> ")}>
            <HugeiconsIcon icon={QuoteDownIcon} size={14} />
          </ToolbarBtn>
          <ToolbarBtn
            label="Inline Code"
            onClick={() => insertMarkdown("`", "`")}
          >
            <HugeiconsIcon icon={SourceCodeIcon} size={14} />
          </ToolbarBtn>
          <ToolbarBtn
            label="Code Block"
            onClick={() => insertMarkdown("```\n", "\n```")}
          >
            <HugeiconsIcon icon={CodeIcon} size={14} />
          </ToolbarBtn>
          <ToolbarBtn
            label="Link"
            onClick={() => insertMarkdown("[", "](url)")}
          >
            <HugeiconsIcon icon={LinkIcon} size={14} />
          </ToolbarBtn>

          {/* View mode toggle */}
          <div className="bg-muted ml-auto flex items-center rounded-lg p-0.5">
            <ViewModeBtn
              active={viewMode === "editor"}
              onClick={() => setViewMode("editor")}
              label="Editor only"
            >
              <HugeiconsIcon icon={Edit03Icon} size={11} />
              Editor
            </ViewModeBtn>
            <ViewModeBtn
              active={viewMode === "split"}
              onClick={() => setViewMode("split")}
              label="Split view"
            >
              <HugeiconsIcon icon={ListViewIcon} size={11} />
              Split
            </ViewModeBtn>
            <ViewModeBtn
              active={viewMode === "preview"}
              onClick={() => setViewMode("preview")}
              label="Preview only"
            >
              <HugeiconsIcon icon={EyeIcon} size={11} />
              Preview
            </ViewModeBtn>
          </div>
        </div>

        {/* Editor / preview area */}
        <div
          className={cn(
            "grid",
            viewMode === "split" ? "grid-cols-2 divide-x" : "grid-cols-1",
          )}
        >
          {/* Editor pane */}
          {viewMode !== "preview" && (
            <Textarea
              id="blog-body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setIsDirty(true);
              }}
              rows={24}
              className="rounded-none border-0 font-mono text-xs focus-visible:ring-0"
              placeholder={`# My Blog Post\n\nStart writing in markdown...\n\n## Section\n\nParagraph text here.`}
              spellCheck={false}
            />
          )}

          {/* Preview pane */}
          {viewMode !== "editor" && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none overflow-auto p-5 text-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
            />
          )}
        </div>
      </div>

      {/* ── Metadata ─────────────────────────────────────────────────────── */}
      <MetadataPanel
        excerpt={excerpt}
        onExcerptChange={(v) => {
          setExcerpt(v);
          setIsDirty(true);
        }}
        coverImage={coverImage}
        onCoverImageChange={(v) => {
          setCoverImage(v);
          setIsDirty(true);
        }}
        authorName={authorName}
        onAuthorNameChange={(v) => {
          setAuthorName(v);
          setIsDirty(true);
        }}
        authorDesignation={authorDesignation}
        onAuthorDesignationChange={(v) => {
          setAuthorDesignation(v);
          setIsDirty(true);
        }}
        authorCompany={authorCompany}
        onAuthorCompanyChange={(v) => {
          setAuthorCompany(v);
          setIsDirty(true);
        }}
        tagsInput={tagsInput}
        onTagsInputChange={(v) => {
          setTagsInput(v);
          setIsDirty(true);
        }}
        customMeta={customMeta}
        onCustomMetaChange={(v) => {
          setCustomMeta(v);
          setIsDirty(true);
        }}
      />
    </div>
  );
};

// ─── Toolbar button ───────────────────────────────────────────────────────────

const ToolbarBtn: React.FC<{
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}> = ({ onClick, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
  >
    {children}
  </button>
);

// ─── View mode button ─────────────────────────────────────────────────────────

const ViewModeBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}> = ({ active, onClick, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className={cn(
      "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

// ─── Metadata panel ───────────────────────────────────────────────────────────

interface MetadataPanelProps {
  excerpt: string;
  onExcerptChange: (v: string) => void;
  coverImage: string;
  onCoverImageChange: (v: string) => void;
  authorName: string;
  onAuthorNameChange: (v: string) => void;
  authorDesignation: string;
  onAuthorDesignationChange: (v: string) => void;
  authorCompany: string;
  onAuthorCompanyChange: (v: string) => void;
  tagsInput: string;
  onTagsInputChange: (v: string) => void;
  customMeta: Record<string, string>;
  onCustomMetaChange: (v: Record<string, string>) => void;
}

const MetadataPanel: React.FC<MetadataPanelProps> = ({
  excerpt,
  onExcerptChange,
  coverImage,
  onCoverImageChange,
  authorName,
  onAuthorNameChange,
  authorDesignation,
  onAuthorDesignationChange,
  authorCompany,
  onAuthorCompanyChange,
  tagsInput,
  onTagsInputChange,
  customMeta,
  onCustomMetaChange,
}) => {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const addCustomMeta = () => {
    const k = newKey.trim();
    const v = newValue.trim();
    if (!k || !v) return;
    onCustomMetaChange({ ...customMeta, [k]: v });
    setNewKey("");
    setNewValue("");
  };

  const removeCustomMeta = (key: string) => {
    const next = { ...customMeta };
    delete next[key];
    onCustomMetaChange(next);
  };

  return (
    <div className="bg-card rounded-xl border p-5">
      <h3 className="mb-4 font-medium">Metadata</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field>
            <FieldLabel>Excerpt</FieldLabel>
            <Textarea
              value={excerpt}
              onChange={(e) => onExcerptChange(e.target.value)}
              placeholder="Short summary shown in post listings"
              rows={2}
            />
          </Field>
        </div>
        <div className="col-span-2">
          <Field>
            <FieldLabel>Cover Image URL</FieldLabel>
            <Input
              value={coverImage}
              onChange={(e) => onCoverImageChange(e.target.value)}
              placeholder="https://..."
              className="font-mono text-xs"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel>Author Name</FieldLabel>
          <Input
            value={authorName}
            onChange={(e) => onAuthorNameChange(e.target.value)}
            placeholder="Jane Smith"
          />
        </Field>
        <Field>
          <FieldLabel>Designation</FieldLabel>
          <Input
            value={authorDesignation}
            onChange={(e) => onAuthorDesignationChange(e.target.value)}
            placeholder="Senior Engineer"
          />
        </Field>
        <div className="col-span-2">
          <Field>
            <FieldLabel>Company</FieldLabel>
            <Input
              value={authorCompany}
              onChange={(e) => onAuthorCompanyChange(e.target.value)}
              placeholder="Acme Corp"
            />
          </Field>
        </div>
        <div className="col-span-2">
          <Field>
            <FieldLabel>
              Tags{" "}
              <span className="text-muted-foreground font-normal">
                (comma separated)
              </span>
            </FieldLabel>
            <Input
              value={tagsInput}
              onChange={(e) => onTagsInputChange(e.target.value)}
              placeholder="ai, product, engineering"
            />
          </Field>
        </div>
        <div className="col-span-2">
          <p className="mb-2 text-sm font-medium">
            Custom Metadata
            <span className="text-muted-foreground ml-1 text-xs font-normal">
              (extra key-value pairs)
            </span>
          </p>
          {Object.entries(customMeta).map(([k, v]) => (
            <div key={k} className="mb-2 flex items-center gap-2">
              <code className="bg-muted flex-1 rounded px-2 py-1 text-xs">
                {k}
              </code>
              <code className="bg-muted flex-1 rounded px-2 py-1 text-xs">
                {v}
              </code>
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-destructive hover:text-destructive/80 shrink-0"
                onClick={() => removeCustomMeta(k)}
              >
                ×
              </Button>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="key"
              className="font-mono text-xs"
            />
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="value"
              onKeyDown={(e) => {
                if (e.key === "Enter") addCustomMeta();
              }}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={addCustomMeta}
              disabled={!newKey.trim() || !newValue.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
