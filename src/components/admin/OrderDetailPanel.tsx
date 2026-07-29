/**
 * Everything about one order, for a staff member with a customer waiting.
 *
 * Storage paths are useless on their own — the bucket is private — so this
 * mints short-lived signed URLs on open, which is what makes "send me my
 * pictures" a thirty-second job rather than a trip through the Supabase
 * console.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, Copy, Download, ExternalLink, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { attentionFor, type AdminOrder, type AdminPhoto } from "@/hooks/use-admin-orders";

interface Props {
  order: AdminOrder | null;
  onClose: () => void;
  onChanged: () => void;
}

/** Signed URLs live an hour — long enough to work an order, short enough not to leak. */
const SIGNED_URL_TTL_SECONDS = 3600;

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5 text-right text-sm">
        <span className="break-all">{value}</span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

const conversionTone: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  converting: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  failed: "bg-destructive/15 text-destructive",
};

const OrderDetailPanel = ({ order, onClose, onChanged }: Props) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [signing, setSigning] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    if (!order) {
      setUrls({});
      return;
    }
    let cancelled = false;
    const sign = async () => {
      setSigning(true);
      const paths = order.photos.flatMap((p) =>
        [p.original_path, p.converted_path].filter((v): v is string => !!v),
      );
      if (paths.length === 0) {
        setSigning(false);
        return;
      }
      // One batch call rather than one per file; an order can hold 40 paths.
      const { data } = await supabase.storage
        .from("order-files")
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const entry of data ?? []) {
        if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
      }
      setUrls(map);
      setSigning(false);
    };
    void sign();
    return () => {
      cancelled = true;
    };
  }, [order]);

  if (!order) return null;

  const attention = attentionFor(order);
  const unconverted = order.photos.filter(
    (p) => p.conversion_status === "pending" || p.conversion_status === "failed",
  );

  const retryConversions = async () => {
    setRetrying(order.id);
    let ok = 0;
    // Sequential on purpose: this is a manual repair on a single order, and a
    // burst of parallel image generations is both costly and rate-limited.
    for (const photo of unconverted) {
      const { data, error } = await supabase.functions.invoke("convert-to-lineart", {
        body: { photoId: photo.id },
      });
      if (!error && data?.success) ok += 1;
    }
    setRetrying(null);
    toast[ok === unconverted.length ? "success" : "warning"](
      `Converted ${ok} of ${unconverted.length}`,
    );
    onChanged();
  };

  const photoUrl = (photo: AdminPhoto) =>
    (photo.converted_path && urls[photo.converted_path]) ||
    (photo.original_path && urls[photo.original_path]) ||
    null;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {order.order_name ?? order.id.slice(0, 8)}
            {order.shopify_order_number && (
              <span className="text-sm font-normal text-muted-foreground">
                {order.shopify_order_number}
              </span>
            )}
            <Badge variant="secondary" className="border-0 text-[10px] uppercase tracking-wider">
              {order.status ?? "unknown"}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {attention && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {attention.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{attention.detail}</p>
            {unconverted.length > 0 && (
              <Button
                size="sm"
                className="mt-2.5"
                onClick={() => void retryConversions()}
                disabled={retrying === order.id}
              >
                {retrying === order.id ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="mr-2 h-3.5 w-3.5" />
                )}
                Generate {unconverted.length} missing page
                {unconverted.length === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        )}

        <section className="mt-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Customer</h3>
          <div className="mt-1.5 divide-y divide-border/60">
            <Field label="Name" value={order.customer_name} />
            <Field label="Email" value={order.customer_email} />
            <Field label="Phone" value={order.customer_phone} />
            <Field label="Order ID" value={order.id} />
          </div>
        </section>

        <Separator className="my-5" />

        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Order</h3>
          <div className="mt-1.5 divide-y divide-border/60">
            <Field label="Placed" value={new Date(order.created_at).toLocaleString("en-GB")} />
            <Field label="Builder step" value={order.builder_step} />
            <Field label="Payment" value={order.payment_status} />
            <Field label="Tracking" value={order.tracking_number} />
            <Field
              label="Shipped"
              value={order.shipped_at ? new Date(order.shipped_at).toLocaleString("en-GB") : null}
            />
            <Field label="Digital" value={order.digital_download ? "Yes" : null} />
          </div>
          {(order.production_pdf_path || order.digital_pdf_path) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {order.production_pdf_path && (
                <PdfLink label="Production PDF" path={order.production_pdf_path} />
              )}
              {order.digital_pdf_path && (
                <PdfLink label="Customer PDF" path={order.digital_pdf_path} />
              )}
            </div>
          )}
        </section>

        <Separator className="my-5" />

        <section className="pb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
              Photos ({order.photos.length})
            </h3>
            {signing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          {order.photos.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No photos uploaded.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {order.photos.map((photo) => {
                const url = photoUrl(photo);
                return (
                  <li key={photo.id} className="overflow-hidden rounded-md border border-border">
                    <div className="relative aspect-[3/4] bg-muted/40">
                      {url ? (
                        <img src={url} alt={`Page ${photo.page_position + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                          no preview
                        </div>
                      )}
                      <span className="absolute left-1 top-1 rounded bg-foreground/75 px-1 text-[10px] text-background">
                        {photo.page_position + 1}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                      <Badge
                        variant="secondary"
                        className={`border-0 px-1 text-[9px] uppercase ${
                          conversionTone[photo.conversion_status] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {photo.conversion_status}
                      </Badge>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={`Download page ${photo.page_position + 1}`}
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
};

/** PDFs are signed on click rather than on open — most orders never need them. */
function PdfLink({ label, path }: { label: string; path: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { data, error } = await supabase.storage
          .from("order-files")
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        setBusy(false);
        if (error || !data?.signedUrl) {
          toast.error(`Could not open ${label}`);
          return;
        }
        window.open(data.signedUrl, "_blank", "noopener");
      }}
    >
      {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="mr-2 h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}

export default OrderDetailPanel;
