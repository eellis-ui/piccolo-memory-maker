import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookOpen, Heart } from "lucide-react";

interface BookOptions {
  titlePageEnabled: boolean;
  titlePageText: string;
  dedicationPageEnabled: boolean;
  dedicationPageText: string;
}

interface BookOptionsPanelProps {
  options: BookOptions;
  onChange: (options: BookOptions) => void;
}

const BookOptionsPanel = ({ options, onChange }: BookOptionsPanelProps) => {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-6">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Book Options
      </h3>

      {/* Title Page */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <Label htmlFor="title-page" className="font-medium">
              Title Page
            </Label>
          </div>
          <Switch
            id="title-page"
            checked={options.titlePageEnabled}
            onCheckedChange={(checked) =>
              onChange({ ...options, titlePageEnabled: checked })
            }
          />
        </div>
        {options.titlePageEnabled && (
          <Input
            value={options.titlePageText}
            onChange={(e) =>
              onChange({ ...options, titlePageText: e.target.value })
            }
            placeholder="My Piccolo'd Colouring Book"
            className="rounded-xl"
          />
        )}
      </div>

      {/* Dedication Page */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <Label htmlFor="dedication-page" className="font-medium">
              Dedication Page
            </Label>
          </div>
          <Switch
            id="dedication-page"
            checked={options.dedicationPageEnabled}
            onCheckedChange={(checked) =>
              onChange({ ...options, dedicationPageEnabled: checked })
            }
          />
        </div>
        {options.dedicationPageEnabled && (
          <Textarea
            value={options.dedicationPageText}
            onChange={(e) =>
              onChange({ ...options, dedicationPageText: e.target.value })
            }
            placeholder="For my little artist..."
            className="rounded-xl resize-none"
            rows={3}
          />
        )}
      </div>

      {/* Page Summary */}
      <div className="text-sm text-muted-foreground border-t border-border pt-4">
        <p>
          Your book will include:{" "}
          <span className="font-medium text-foreground">Cover</span>
          {options.titlePageEnabled && (
            <>, <span className="font-medium text-foreground">Title Page</span></>
          )}
          {options.dedicationPageEnabled && (
            <>, <span className="font-medium text-foreground">Dedication Page</span></>
          )}
          , then your colouring pages.
        </p>
      </div>
    </div>
  );
};

export default BookOptionsPanel;
