/**
 * Spark WorkHub wordmark.
 *
 * "Spark" bold + "WorkHub" regular, in a single line, inheriting
 * currentColor so it adapts to sidebar / topbar / hero contexts.
 *
 * Variants:
 *   <SparkLogo />               full wordmark (default)
 *   <SparkLogo variant="mark" /> compact "S" mark for tight spaces
 *                                (favicon, sidebar collapse, mobile)
 */
type Props = {
  size?: number;         // pixel height — width scales from font
  variant?: "wordmark" | "mark";
  className?: string;
};

export function SparkLogo({ size = 20, variant = "wordmark", className = "" }: Props) {
  if (variant === "mark") {
    // Tight "S" — geometric sans, same weight as the wordmark bold.
    return (
      <span
        aria-hidden
        className={`inline-flex select-none items-center justify-center leading-none tracking-tight ${className}`}
        style={{ fontSize: size, width: size * 1.15, height: size * 1.15, fontWeight: 800 }}
      >
        S
      </span>
    );
  }

  return (
    <span
      className={`inline-flex select-none items-baseline leading-none tracking-tight ${className}`}
      style={{ fontSize: size }}
      aria-label="Spark WorkHub"
    >
      <span style={{ fontWeight: 800 }}>Spark</span>
      <span style={{ fontWeight: 400, marginLeft: size * 0.18 }}>WorkHub</span>
    </span>
  );
}

/**
 * Legacy StackedLogo re-export as SparkLogo mark, so existing usages
 * (Auth hero, sidebar rozet, PWA install) keep working without a
 * mass-edit.
 */
export const StackedLogo = ({
  size = 16,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  color,
}: { size?: number; color?: string }) => <SparkLogo variant="mark" size={size} />;
