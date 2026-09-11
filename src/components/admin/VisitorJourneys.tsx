/**
 * Timestamped journey tables for the admin dashboard:
 *  - every visitor session in the last 7 days, who it was (when known), how
 *    far it got and when — click a row for that person's full timeline
 *    across all their sessions, with the time between each step
 *  - every book build in the last 7 days, with photo-upload times and the
 *    step it stalled at
 * The drop-off chips above the sessions table show where the funnel leaks.
 */
import { useState } from "react";
import { ChevronDown, ChevronRight, Repeat, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useJourneys, MILESTONES, type Milestone, type VisitorJourney, type VisitorIdentity,
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

const fmtClock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const duration = (fromIso: string, toIso: string) => {
  const secs = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
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

/** Short, stable handle for an anonymous visitor, e.g. "Visitor 7f3a". */
const anonLabel = (visitorKey: string) => `Visitor ${visitorKey.slice(-4)}`;

const identityLabel = (identity: VisitorIdentity | null, visitorKey: string) =>
  identity?.name || identity?.email || (identity?.orderRef ? `Buyer ${identity.orderRef}` : anonLabel(visitorKey));

const eventLabel = (type: string, path: string | null, orderRef: string | null) => {
  switch (type) {
    case "page_view": return `Viewed ${path || "page"}`;
    case "product_view": return "Viewed product";
    case "builder_upload": return "Uploaded photos";
    case "builder_convert": return "Converted photos to line art";
    case "builder_approve": return "Previewed & approved pages";
    case "builder_cover": return "Chose cover";
    case "add_to_cart": return "Added to cart";
    case "checkout_initiated": return "Started checkout";
    case "purchase": return `Purchased${orderRef ? ` ${orderRef}` : ""}`;
    case "email_saved": return "Saved email";
    default: return type.replace(/_/g, " ");
  }
};

const isKeyEvent = (type: string) => type !== "page_view" && type !== "product_view";

/* ─── Timeline dialog for one person ─── */
const VisitorTimeline = ({ visitor, onClose }: { visitor: VisitorJourney | null; onClose: () => void }) => {
  if (!visitor) return null;
  const label = identityLabel(visitor.identity, visitor.visitorKey);
  const activeTime = visitor.events.length > 1
    ? duration(visitor.firstSeen, visitor.lastSeen)
    : "0s";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {label}
          </DialogTitle>
          <DialogDescription>
            {visitor.identity?.email && visitor.identity.name ? `${visitor.identity.email} · ` : ""}
            {visitor.sessionIds.length} {visitor.sessionIds.length === 1 ? "session" : "sessions"} · first seen {fmtTime(visitor.firstSeen)} · last seen {timeAgo(visitor.lastSeen)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase font-medium text-muted-foreground">Got as far as</p>
            <Badge variant={milestoneVariant(visitor.furthest)} className="font-normal mt-1">{visitor.furthest}</Badge>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase font-medium text-muted-foreground">First seen → last seen</p>
            <p className="text-sm font-semibold mt-1">{activeTime}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase font-medium text-muted-foreground">Landing → purchase</p>
            <p className="text-sm font-semibold mt-1">{visitor.purchasedAt ? duration(visitor.firstSeen, visitor.purchasedAt) : "—"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase font-medium text-muted-foreground">Builder → purchase</p>
            <p className="text-sm font-semibold mt-1">
              {visitor.purchasedAt && visitor.builderStartedAt ? duration(visitor.builderStartedAt, visitor.purchasedAt) : "—"}
            </p>
          </div>
        </div>

        <ol className="mt-2 space-y-0">
          {visitor.events.map((e, i) => {
            const prev = visitor.events[i - 1];
            const newSession = prev && prev.sessionId !== e.sessionId;
            const gap = prev ? duration(prev.at, e.at) : null;
            const key = isKeyEvent(e.type);
            return (
              <li key={`${e.sessionId}-${e.at}-${i}`}>
                {newSession && (
                  <div className="flex items-center gap-2 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Repeat className="w-3 h-3" />
                    New session · {gap} later · {fmtTime(e.at)}
                  </div>
                )}
                <div className={`flex items-start gap-3 py-1.5 ${key ? "" : "opacity-70"}`}>
                  <span className="w-[68px] shrink-0 font-mono text-[11px] text-muted-foreground pt-0.5">{fmtClock(e.at)}</span>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${e.type === "purchase" ? "bg-green-500" : key ? "bg-foreground" : "bg-muted-foreground/40"}`} />
                  <span className={`text-sm flex-1 ${key ? "font-medium" : ""}`}>{eventLabel(e.type, e.path, e.orderRef)}</span>
                  {gap && !newSession && (
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">+{gap}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </DialogContent>
    </Dialog>
  );
};

const VisitorJourneys = ({ enabled }: { enabled: boolean }) => {
  const { sessions, visitors, builds, dropOff, loading } = useJourneys(enabled);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [open, setOpen] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);

  if (loading) return null;

  const visibleSessions = showAllSessions ? sessions : sessions.slice(0, SHOW_LIMIT);
  const selected = selectedVisitor ? visitors.get(selectedVisitor) ?? null : null;

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

          {/* Per-session table — click a row for that person's full timeline */}
          <div className="rounded-xl border bg-background overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>First seen</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Time on site</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Got as far as</TableHead>
                  <TableHead>Reached at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSessions.map((s) => {
                  const v = visitors.get(s.visitorKey);
                  const returning = (v?.sessionIds.length ?? 1) > 1;
                  const label = identityLabel(s.identity, s.visitorKey);
                  const known = !!(s.identity?.name || s.identity?.email || s.identity?.orderRef);
                  return (
                    <TableRow
                      key={s.sessionId}
                      className="cursor-pointer"
                      onClick={() => setSelectedVisitor(s.visitorKey)}
                      title="Open this visitor's timeline"
                    >
                      <TableCell className="text-xs">
                        <span className={`flex items-center gap-1.5 ${known ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {label}
                          {returning && (
                            <span title={`${v?.sessionIds.length} sessions`} className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              <Repeat className="w-2.5 h-2.5" />
                              {v?.sessionIds.length}
                            </span>
                          )}
                        </span>
                        {known && s.identity?.email && s.identity?.name && (
                          <span className="block text-[11px] text-muted-foreground">{s.identity.email}</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtTime(s.firstSeen)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {timeAgo(s.lastSeen)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{duration(s.firstSeen, s.lastSeen)}</TableCell>
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
                  );
                })}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
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

      <VisitorTimeline visitor={selected} onClose={() => setSelectedVisitor(null)} />
    </div>
  );
};

export default VisitorJourneys;
