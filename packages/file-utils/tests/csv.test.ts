import { describe, expect, it } from "vitest";
import { useCSV } from "../src/csv";

describe("RFC 4180 CSV", () => {
  it("parses quoted delimiters, escaped quotes and embedded CRLF", () => {
    const csv = useCSV();
    const result = csv.parse(
      'name,notes,spaces\r\nAlice,"line 1\r\nline 2, still quoted","  keep  "\r\nBob,"said ""hi""",plain',
    );

    expect(result).toEqual([
      {
        name: "Alice",
        notes: "line 1\r\nline 2, still quoted",
        spaces: "  keep  ",
      },
      { name: "Bob", notes: 'said "hi"', spaces: "plain" },
    ]);
  });

  it("generates RFC 4180 CRLF records and round-trips multiline fields", () => {
    const csv = useCSV();
    const data = [{ name: "Alice, Inc.", notes: 'line 1\nline "2"' }];
    const generated = csv.generate(data);

    expect(generated).toBe(
      'name,notes\r\n"Alice, Inc.","line 1\nline ""2"""',
    );
    expect(csv.parse(generated)).toEqual(data);
  });

  it("rejects malformed documents, duplicate headers and invalid delimiters", () => {
    const csv = useCSV();
    expect(() => csv.parse('name\r\n"unterminated')).toThrow(SyntaxError);
    expect(() => csv.parse("name,name\r\nA,B")).toThrow("重复表头");
    expect(() => csv.parse("a,b", { delimiter: "" })).toThrow(RangeError);
  });
});
