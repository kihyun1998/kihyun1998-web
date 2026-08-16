// The "Open Source" section — Packages: reusable libraries/plugins/crates that
// other developers install and build on. See CONTEXT.md ("Package", "Ecosystem")
// and docs/adr/0003-minimal-project-card.md + 0004-open-source-vs-projects.md +
// 0006-link-packages-to-registry.md.
//
// Source of truth: Kihyun's GitHub profile README (the curated list he
// maintains). Order here mirrors that README (ecosystem clusters: Flutter,
// then Rust, then npm).
//
// Rules:
// - Hand-curated, not auto-pulled from GitHub.
// - A card shows exactly two things: `name` and `ecosystem`. No description.
// - Clicking a card goes to `href` — the package's registry page (pub.dev /
//   crates.io / npm), where install info, docs, and version live.

export type Ecosystem = 'Flutter' | 'Rust' | 'npm';

export type Package = {
  name: string;
  ecosystem: Ecosystem;
  href: string;
};

export const packages: Package[] = [
  // Flutter — pub.dev
  { name: 'flutter_bin', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_bin' },
  { name: 'x509_cert_store', ecosystem: 'Flutter', href: 'https://pub.dev/packages/x509_cert_store' },
  { name: 'flutter_alone', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_alone' },
  { name: 'flutter_inactive_timer', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_inactive_timer' },
  { name: 'flutter_ime', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_ime' },
  { name: 'flutter_password_input', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_password_input' },
  { name: 'flutter_license_manager', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_license_manager' },
  { name: 'flutter_oss_manager', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_oss_manager' },
  { name: 'flutter_table_plus', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_table_plus' },
  { name: 'macos_window_toolkit', ecosystem: 'Flutter', href: 'https://pub.dev/packages/macos_window_toolkit' },
  { name: 'flutter_animation_stepper', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_animation_stepper' },
  { name: 'flutter_dropdown_button', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_dropdown_button' },
  { name: 'flutter_checkbox', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_checkbox' },
  { name: 'flutter_folderview', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_folderview' },
  { name: 'flutter_otp_widget', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_otp_widget' },
  { name: 'flutter_root_context_menu', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_root_context_menu' },
  { name: 'flutter_show_menu', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_show_menu' },
  { name: 'flutter_tweakcn_generator', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_tweakcn_generator' },
  { name: 'just_color_picker', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_color_picker' },
  { name: 'just_font_scan', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_font_scan' },
  { name: 'just_save_gallery', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_save_gallery' },
  { name: 'just_tooltip', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_tooltip' },
  { name: 'window_lockable', ecosystem: 'Flutter', href: 'https://pub.dev/packages/window_lockable' },
  { name: 'boring_avatars', ecosystem: 'Flutter', href: 'https://pub.dev/packages/boring_avatars' },
  { name: 'ffi_url_launcher', ecosystem: 'Flutter', href: 'https://pub.dev/packages/ffi_url_launcher' },

  // Rust — crates.io
  { name: 'justpdf', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf' },
  { name: 'justpdf-cli', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-cli' },
  { name: 'justbig2', ecosystem: 'Rust', href: 'https://crates.io/crates/justbig2' },
  { name: 'justjp2', ecosystem: 'Rust', href: 'https://crates.io/crates/justjp2' },
  { name: 'justerm-core', ecosystem: 'Rust', href: 'https://crates.io/crates/justerm-core' },

  // npm
  { name: 'justpdf-compress-wasm', ecosystem: 'npm', href: 'https://www.npmjs.com/package/@kihyun1998/justpdf-compress-wasm' },
  { name: 'justerm-web', ecosystem: 'npm', href: 'https://www.npmjs.com/package/justerm-web' },
  { name: 'justerm-renderer', ecosystem: 'npm', href: 'https://www.npmjs.com/package/justerm-renderer' },
  { name: 'justerm-wasm-decode', ecosystem: 'npm', href: 'https://www.npmjs.com/package/justerm-wasm-decode' },
];
