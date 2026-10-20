import { describe, expectTypeOf, it } from "vitest";
import {
  createFileUtils,
  FileType,
  useDownload,
  useDownloadCSV,
  useDownloadExcel,
  useDownloadJSON,
  useDownloadPDF,
  type DownloadApiFunction,
  type DownloadConfig,
  type DownloadConfigFor,
  type DownloadRequestContext,
  type DownloadResult,
} from "../src";

interface ExportQuery {
  reportId: number;
  format?: "short" | "full";
}
const exportReport = async (_query: ExportQuery): Promise<Blob> => new Blob();
const optionalReport = async (_query?: ExportQuery): Promise<Blob> =>
  new Blob();
const noQuery = async (): Promise<Blob> => new Blob();
const config = { fileType: FileType.PDF, fileName: "report" };

// Kept out of runtime execution: tsc checks every positive and negative call.
const assertDownloadContracts = () => {
  useDownload(exportReport, { ...config, params: { reportId: 1 } });
  useDownload(optionalReport, config);
  useDownload(optionalReport, {
    ...config,
    params: { reportId: 1, format: "full" },
  });
  useDownload(noQuery, config);
  // @ts-expect-error required API query cannot be omitted
  useDownload(exportReport, config);
  // @ts-expect-error required API query cannot be explicitly undefined
  useDownload(exportReport, { ...config, params: undefined });
  // @ts-expect-error missing reportId
  useDownload(exportReport, { ...config, params: {} });
  // @ts-expect-error wrong query value
  useDownload(exportReport, { ...config, params: { reportId: "1" } });
  useDownload(exportReport, {
    ...config,
    // @ts-expect-error misspelled extra query key
    params: { reportId: 1, fomrat: "full" },
  });
  // @ts-expect-error optional API query retains its field types
  useDownload(optionalReport, { ...config, params: { reportId: "1" } });
  // @ts-expect-error parameterless API does not accept an unrelated query
  useDownload(noQuery, { ...config, params: { reportId: 1 } });
  // @ts-expect-error unsupported API return payload
  useDownload(async (_query: ExportQuery) => "not a download", {
    ...config,
    params: { reportId: 1 },
  });

  const scoped = createFileUtils();
  scoped.download(exportReport, { ...config, params: { reportId: 1 } });
  scoped.download(optionalReport, config);
  scoped.download(noQuery, config);
  // @ts-expect-error scoped method must preserve a required query
  scoped.download(exportReport, config);
  // @ts-expect-error scoped method must reject a wrong query value
  scoped.download(exportReport, { ...config, params: { reportId: "1" } });
  scoped.download(exportReport, {
    ...config,
    // @ts-expect-error scoped method must reject an extra misspelled key
    params: { reportId: 1, fomrat: "short" },
  });

  for (const quick of [
    useDownloadCSV,
    useDownloadExcel,
    useDownloadJSON,
    useDownloadPDF,
  ]) {
    quick(exportReport, "report", { reportId: 1 });
    quick(optionalReport, "report");
    quick(noQuery, "report");
    // @ts-expect-error each shortcut requires the API query
    quick(exportReport, "report");
    // @ts-expect-error each shortcut preserves query field types
    quick(exportReport, "report", { reportId: "1" });
    // @ts-expect-error each shortcut rejects a misspelled extra query key
    quick(exportReport, "report", { reportId: 1, fomrat: "full" });
    // @ts-expect-error each shortcut rejects a missing required field
    quick(exportReport, "report", {});
  }

  const typedApi: DownloadApiFunction<ExportQuery> = exportReport;
  useDownload(typedApi, { ...config, params: { reportId: 1 } });
  const typedConfig: DownloadConfig<ExportQuery> = {
    ...config,
    params: { reportId: 1 },
  };
  const inferredConfig: DownloadConfigFor<typeof exportReport> = typedConfig;
  useDownload(exportReport, inferredConfig);
  // @ts-expect-error explicitly typed API query remains required
  useDownload(typedApi, config);
  // @ts-expect-error explicitly typed config requires query
  const invalidConfig: DownloadConfig<ExportQuery> = config;
  void invalidConfig;
  const contextApi = async (
    _query: ExportQuery,
    _context?: DownloadRequestContext,
  ) => new Blob();
  useDownload(contextApi, { ...config, params: { reportId: 1 } });
  const requiredContextApi = async (
    _query: ExportQuery,
    _context: DownloadRequestContext,
  ) => new Blob();
  useDownload(requiredContextApi, { ...config, params: { reportId: 1 } });
  scoped.download(requiredContextApi, { ...config, params: { reportId: 1 } });
  useDownloadPDF(requiredContextApi, "report", { reportId: 1 });
  useDownload(
    // @ts-expect-error download cannot supply a third required API argument
    async (
      _query: ExportQuery,
      _context: DownloadRequestContext,
      _extra: string,
    ) => new Blob(),
    { ...config, params: { reportId: 1 } },
  );
};
void assertDownloadContracts;

describe("download result contracts", () => {
  it("returns the same awaitable result from every public entry", () => {
    expectTypeOf<ReturnType<typeof useDownload>>().toEqualTypeOf<
      Promise<DownloadResult>
    >();
    expectTypeOf<
      ReturnType<ReturnType<typeof createFileUtils>["download"]>
    >().toEqualTypeOf<Promise<DownloadResult>>();
    expectTypeOf<ReturnType<typeof useDownloadPDF>>().toEqualTypeOf<
      Promise<DownloadResult>
    >();
  });
});
