import { display, body } from "@/app/fonts";

// Applies the shared display/body fonts. Theming is global (see globals.css +
// ThemeContext), so this no longer injects palette variables.
type Props = {
  children: React.ReactNode;
  className?: string;
};

export function DaylightWrapper({ children, className }: Props) {
  return (
    <div
      className={`${display.variable} ${body.variable} ${className ?? ""}`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {children}
    </div>
  );
}
