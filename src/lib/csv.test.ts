import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it.each([
    ["=1+1", "'=1+1"],
    ["+44 20 7946 0000", "'+44 20 7946 0000"],
    ["-2", "'-2"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ['=HYPERLINK("http://x","click")', `"'=HYPERLINK(""http://x"",""click"")"`],
  ])("neutralises formula %s", (input, expected) => expect(csvCell(input)).toBe(expected));

  it("quotes commas, quotes and new lines", () => {
    expect(csvCell("Smith, Jane")).toBe('"Smith, Jane"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("writes dates as ISO and empty values as blank", () => {
    expect(csvCell(new Date("2026-01-02T03:04:05Z"))).toBe("2026-01-02T03:04:05.000Z");
    expect(csvCell(null)).toBe("");
  });
});

describe("toCsv", () => {
  it("writes a header row", () => expect(toCsv([{ a: 1, b: "x" }])).toBe("a,b\r\n1,x"));
  it("returns an empty string for no rows", () => expect(toCsv([])).toBe(""));
});
