import type { DetailConfig } from "./types";

/** Contextually types detail formatters while preserving the original config. */
export function defineDetailConfig<const Config extends DetailConfig>(
  config: Config,
): Config {
  return config;
}
