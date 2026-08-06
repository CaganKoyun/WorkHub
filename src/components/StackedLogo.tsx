/**
 * Legacy shim — the old 3-stacked-rectangle mark has been retired in
 * favor of the Spark WorkHub wordmark. Existing imports keep working
 * and get the compact "S" mark; new code should import SparkLogo
 * directly to choose between wordmark / mark variants.
 */
export { StackedLogo } from "./SparkLogo";
