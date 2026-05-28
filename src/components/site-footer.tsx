// Shared footer (rendered once in layout.tsx).
export function SiteFooter() {
  return (
    <footer className="mt-24 text-sm text-muted-foreground">
      © {new Date().getFullYear()} Ki Hyun Park
    </footer>
  );
}
