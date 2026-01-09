"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Download,
  FileJson,
  FileText,
  Table,
  Copy,
  Check,
  Loader2,
  FileCode,
} from "lucide-react";
import { ExportFormat } from "@/hooks/useExport";

// ============================================================================
// Types
// ============================================================================

export interface ExportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when export is triggered */
  onExport: (format: ExportFormat, options: ExportDialogOptions) => void;
  /** Callback when copy to clipboard is triggered */
  onCopy?: (format: ExportFormat) => void;
  /** Title of the export dialog */
  title?: string;
  /** Description text */
  description?: string;
  /** Number of items being exported */
  itemCount?: number;
  /** Item type name (e.g., "ideas", "sources") */
  itemType?: string;
  /** Available formats (defaults to all) */
  availableFormats?: ExportFormat[];
  /** Whether export is in progress */
  isExporting?: boolean;
  /** Whether copy is in progress */
  isCopying?: boolean;
  /** Show copy option */
  showCopyOption?: boolean;
  /** Custom filename prefix */
  filenamePrefix?: string;
}

export interface ExportDialogOptions {
  /** Include metadata in export */
  includeMetadata: boolean;
  /** Pretty print JSON */
  prettyPrint: boolean;
  /** Include timestamps */
  includeTimestamps: boolean;
  /** Custom filename */
  filename?: string;
}

// ============================================================================
// Format Option Component
// ============================================================================

interface FormatOptionProps {
  format: ExportFormat;
  selected: boolean;
  onSelect: (format: ExportFormat) => void;
}

const formatInfo: Record<
  ExportFormat,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    extension: string;
  }
> = {
  json: {
    label: "JSON",
    description: "Structured data format, ideal for backups",
    icon: FileJson,
    extension: ".json",
  },
  markdown: {
    label: "Markdown",
    description: "Human-readable text with formatting",
    icon: FileCode,
    extension: ".md",
  },
  csv: {
    label: "CSV",
    description: "Spreadsheet compatible format",
    icon: Table,
    extension: ".csv",
  },
  text: {
    label: "Plain Text",
    description: "Simple text without formatting",
    icon: FileText,
    extension: ".txt",
  },
};

function FormatOption({ format, selected, onSelect }: FormatOptionProps) {
  const info = formatInfo[format];
  const Icon = info.icon;

  return (
    <button
      onClick={() => onSelect(format)}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all text-left w-full",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/50 hover:bg-accent/50"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg",
          selected ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{info.label}</span>
          <span className="text-xs text-muted-foreground">{info.extension}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </button>
  );
}

// ============================================================================
// Toggle Component
// ============================================================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </label>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  onCopy,
  title = "Export Data",
  description = "Choose a format and export your data",
  itemCount,
  itemType = "items",
  availableFormats = ["json", "markdown", "csv", "text"],
  isExporting = false,
  isCopying = false,
  showCopyOption = true,
  filenamePrefix = "export",
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("json");
  const [options, setOptions] = useState<ExportDialogOptions>({
    includeMetadata: true,
    prettyPrint: true,
    includeTimestamps: true,
    filename: undefined,
  });
  const [copied, setCopied] = useState(false);

  const handleExport = useCallback(() => {
    onExport(selectedFormat, options);
  }, [selectedFormat, options, onExport]);

  const handleCopy = useCallback(async () => {
    if (onCopy) {
      onCopy(selectedFormat);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [selectedFormat, onCopy]);

  const updateOption = useCallback(
    <K extends keyof ExportDialogOptions>(key: K, value: ExportDialogOptions[K]) => {
      setOptions((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full max-w-lg bg-card rounded-xl border border-border shadow-xl",
            "animate-in fade-in zoom-in-95 duration-200"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">
                {description}
                {itemCount !== undefined && (
                  <span className="ml-1">
                    ({itemCount} {itemType})
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <div className="grid gap-2">
                {availableFormats.map((format) => (
                  <FormatOption
                    key={format}
                    format={format}
                    selected={selectedFormat === format}
                    onSelect={setSelectedFormat}
                  />
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-1 pt-2 border-t border-border">
              <label className="text-sm font-medium">Options</label>

              <Toggle
                checked={options.includeMetadata}
                onChange={(v) => updateOption("includeMetadata", v)}
                label="Include metadata"
                description="Add export date and item count"
              />

              {selectedFormat === "json" && (
                <Toggle
                  checked={options.prettyPrint}
                  onChange={(v) => updateOption("prettyPrint", v)}
                  label="Pretty print"
                  description="Format JSON with indentation"
                />
              )}

              <Toggle
                checked={options.includeTimestamps}
                onChange={(v) => updateOption("includeTimestamps", v)}
                label="Include timestamps"
                description="Add created/updated dates"
              />
            </div>

            {/* Custom Filename */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-sm font-medium">Filename (optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`${filenamePrefix}_${new Date().toISOString().split("T")[0]}`}
                  value={options.filename || ""}
                  onChange={(e) => updateOption("filename", e.target.value || undefined)}
                  className={cn(
                    "flex-1 h-9 px-3 rounded-md border border-input bg-background",
                    "text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {formatInfo[selectedFormat].extension}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30 rounded-b-xl">
            <div className="flex items-center gap-2">
              {showCopyOption && onCopy && (
                <button
                  onClick={handleCopy}
                  disabled={isCopying}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
                    "border border-border hover:bg-accent transition-colors",
                    isCopying && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : isCopying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium",
                  "border border-border hover:bg-accent transition-colors"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                  "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
                  isExporting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Quick Export Button
// ============================================================================

export interface QuickExportButtonProps {
  onClick: () => void;
  isExporting?: boolean;
  label?: string;
  className?: string;
}

export function QuickExportButton({
  onClick,
  isExporting = false,
  label = "Export",
  className,
}: QuickExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isExporting}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
        "border border-border hover:bg-accent transition-colors",
        isExporting && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

export default ExportDialog;
