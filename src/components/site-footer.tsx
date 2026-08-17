// Shared footer (rendered once in layout.tsx).
//
// No copyright year. Every page here is statically generated, so a year
// computed at render is really a year computed at build — frozen until the
// next deploy, while the code reads as if it maintains itself. A field that
// cannot stay true and carries nothing anyway is the kind ADR-0003 argues
// against; the honest fix is to drop it rather than keep it accurate.
export function SiteFooter() {
  return (
    <footer className="mt-24 text-sm text-muted-foreground">
      © Ki Hyun Park
    </footer>
  );
}
