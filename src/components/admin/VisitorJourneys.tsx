/**
 * Timestamped journey tables for the admin dashboard:
 *  - every visitor session in the last 7 days, with how far it got and when
 *  - every book build in the last 7 days, with photo-upload times and the
 *    step it stalled at
 * The drop-off chips above the sessions table show where the funnel leaks.
 */
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useJourneys, MILESTONES, type Milestone,
} from "@/hooks/use-journeys";

const SHOW_LIMIT = 25;

/* "24 Aug, 21:43" in the viewer's local time */
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const duration = (fromIso: string, toIso: string) => {
  const secs = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

/* Further through the funnel → stronger badge */
const milestoneVariant = (m: Milestone) => {
  const idx = MILESTONES.indexOf(m);
  if (m === "Purchased") return "default" as const;
  if (idx >= MILESTONES.indexOf("Uploaded photos")) return "secondary" as const;
  return "outline" as const;
};

const stepLabel: Record<string, string> = {
  upload: "Uploading photos",
  approve: "Previewing pages",
  cover: "Choosing cover",
  checkout: "At checkout",
};

const VisitorJourneys = ({ enabled }: { enabled: boolean }) => {
  const { sessions, builds, dropOff, loading } = useJourneys(enabled);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [open, setOpen] = useState(true);

  if (loading) return null;

  const visibleSessions = showAllSessions ? sessions : sessions.slice(0, SHOW_LIMIT);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Visitor journeys &middot; last 7 days
      </button>

      {open && (
        <div className="space-y-4">
          {/* Drop-off summary: how far sessions got before leaving */}
          <div className="flex flex-wrap gap-2">
            {MILESTONES.map((m) => {
              const n = dropOff[m];
              if (!n) return null;
              return (
                <Badge key={m} variant={milestoneVariant(m)} className="font-normal">
                  {n} &times; left after &ldquo;{m}&rdquo;
                </Badge>
              );
            })}
          </div>

          {/* Per-session table */}
          <div className="rounded-xl border bg-background overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First seen</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Time on site</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Got as far as</TableHead>
                  <TableHead>Reached at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSessions.map((s) => (
                  <TableRow key={s.sessionId}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {fmtTime(s.firstSeen)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {timeAgo(s.lastSeen)}
                    </TableCell>
                    <TableCell className="text-xs">{duration(s.firstSeen, s.lastSeen)}</TableCell>
                    <TableCell className="text-xs" title={s.paths.join(", ")}>
                      {s.pageViews}
                    </TableCell>
                    <TableCell>
                      <Badge variant={milestoneVariant(s.furthest)} className="font-normal">
                        {s.furthest}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtTime(s.furthestAt)}
                    </TableCell>
                  </TableRow>
                ))}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                      No visitor sessions in the last 7 days
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {sessions.length > SHOW_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllSessions((v) => !v)}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground border-t"
              >
                {showAllSessions
                  ? "Show fewer"
                  : `Show all ${sessions.length} sessions`}
              </button>
            )}
          </div>

          {/* Per-build table */}
          <div className="rounded-xl border bg-background overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Build started</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>Photos added</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {builds.map((b) => (
                  <TableRow key={b.orderId}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {fmtTime(b.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs">{b.photoCount || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {b.firstPhotoAt
                        ? b.lastPhotoAt && b.lastPhotoAt !== b.firstPhotoAt
                          ? `${fmtTime(b.firstPhotoAt)} → ${fmtTime(b.lastPhotoAt)}`
                          : fmtTime(b.firstPhotoAt)
                        : "never"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {stepLabel[b.step] || b.step}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={b.status === "draft" ? "outline" : "default"}
                        className="font-normal"
                      >
                        {b.status === "draft" ? "abandoned" : b.status}
                        {b.shopifyOrderNumber ? ` ${b.shopifyOrderNumber}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {timeAgo(b.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
                {builds.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                      No book builds in the last 7 days
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorJourneys;
