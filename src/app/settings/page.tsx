"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, GripVertical, Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";
import {
  ALL_VOCAB_COLUMNS,
  parseColumnsConfig,
  type VocabColumnsConfig,
} from "@/app/vocab/columns";
import { useLanguage } from "@/components/language-provider";
import { getLanguageConfig } from "@/lib/language/config";

const PROVIDER_CONFIG: Record<
  string,
  {
    label: string;
    models: { value: string; label: string }[];
    defaultModel: string;
    keyPlaceholder: string;
    envVar: string;
  }
> = {
  anthropic: {
    label: "Anthropic (Claude)",
    models: [
      { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
    defaultModel: "claude-sonnet-4-5-20250929",
    keyPlaceholder: "sk-ant-...",
    envVar: "ANTHROPIC_API_KEY",
  },
  gemini: {
    label: "Google (Gemini)",
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
    defaultModel: "gemini-2.0-flash",
    keyPlaceholder: "AIza...",
    envVar: "GEMINI_API_KEY",
  },
  deepseek: {
    label: "DeepSeek",
    models: [
      { value: "deepseek-chat", label: "DeepSeek V3" },
      { value: "deepseek-reasoner", label: "DeepSeek R1" },
    ],
    defaultModel: "deepseek-chat",
    keyPlaceholder: "sk-...",
    envVar: "DEEPSEEK_API_KEY",
  },
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { activeLanguage } = useLanguage();
  const langConfig = getLanguageConfig(activeLanguage);
  const langLabels = langConfig.vocabColumns;
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colConfig, setColConfig] = useState<VocabColumnsConfig>({ order: [], hidden: [] });
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setColConfig(parseColumnsConfig(data.vocabColumns));
        setLoading(false);
      });
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const syncColConfig = useCallback(
    (next: VocabColumnsConfig) => {
      setColConfig(next);
      setSettings((prev) => ({
        ...prev,
        vocabColumns: JSON.stringify(next),
      }));
    },
    []
  );

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newOrder = [...colConfig.order];
    const [removed] = newOrder.splice(dragItem.current, 1);
    newOrder.splice(dragOverItem.current, 0, removed);
    syncColConfig({ ...colConfig, order: newOrder });
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const toggleColumn = (id: string) => {
    const def = ALL_VOCAB_COLUMNS.find((c) => c.id === id);
    if (def?.alwaysVisible) return;
    const hiddenSet = new Set(colConfig.hidden);
    if (hiddenSet.has(id)) {
      hiddenSet.delete(id);
    } else {
      hiddenSet.add(id);
    }
    syncColConfig({ ...colConfig, hidden: Array.from(hiddenSet) });
  };

  const getColumnLabel = (id: string): string => {
    if (langLabels && id in langLabels) {
      return langLabels[id as keyof typeof langLabels];
    }
    return ALL_VOCAB_COLUMNS.find((c) => c.id === id)?.label ?? id;
  };

  const currentProvider = settings.aiProvider || "anthropic";
  const providerConfig = PROVIDER_CONFIG[currentProvider];

  const handleProviderChange = (provider: string) => {
    updateSetting("aiProvider", provider);
    updateSetting("aiModel", PROVIDER_CONFIG[provider].defaultModel);
    updateSetting("aiApiKey", "");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose your preferred theme.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>
            Select the target language you are learning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Active Language</Label>
            <Select
              value={settings.activeLanguage || "ar"}
              onValueChange={(v) => updateSetting("activeLanguage", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">Arabic (MSA)</SelectItem>
                <SelectItem value="fa">Farsi (Persian)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vocab Table</CardTitle>
          <CardDescription>
            Show, hide, and reorder columns in the vocabulary table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {colConfig.order.map((id, index) => {
              const def = ALL_VOCAB_COLUMNS.find((c) => c.id === id);
              if (!def) return null;
              const isHidden = colConfig.hidden.includes(id);
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-grab active:cursor-grabbing select-none"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={`flex-1 text-sm ${isHidden ? "text-muted-foreground" : ""}`}>
                    {getColumnLabel(id)}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleColumn(id)}
                    disabled={def.alwaysVisible}
                    className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                    title={def.alwaysVisible ? "Always visible" : isHidden ? "Show column" : "Hide column"}
                  >
                    {isHidden ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>
            Configure the AI service used for translations and conjugation
            generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={currentProvider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDER_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={settings.aiModel || providerConfig.defaultModel}
              onValueChange={(v) => updateSetting("aiModel", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providerConfig.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={settings.aiApiKey || ""}
              onChange={(e) => updateSetting("aiApiKey", e.target.value)}
              placeholder={providerConfig.keyPlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally in the database. You can also set
              the {providerConfig.envVar} environment variable.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Settings"
        )}
      </Button>
    </div>
  );
}
