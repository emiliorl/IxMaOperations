import { describe, expect, it } from "vitest";
import {
  ALLOWED_TYPES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  checkFiles,
  contentMatches,
  extensionOf,
  humanSize,
  prepareFiles,
  sanitizeFileName,
} from "./attachments";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const file = (name: string, bytes: Uint8Array | string) => new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], name);

describe("checkFiles (metadata)", () => {
  it("accepts a normal set of screenshots and logs", () => {
    expect(checkFiles([{ name: "screen.PNG", size: 200_000 }, { name: "error.log", size: 5_000 }])).toBeNull();
  });

  it("rejects too many files", () => {
    const many = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({ name: `a${i}.png`, size: 10 }));
    expect(checkFiles(many)).toBe("too_many");
  });

  it("rejects when the total is over the limit, even if each file is small", () => {
    const half = Math.floor(MAX_TOTAL_BYTES / 2) + 1;
    expect(checkFiles([{ name: "a.png", size: half }, { name: "b.png", size: half }])).toBe("too_big");
    expect(checkFiles([{ name: "a.png", size: MAX_TOTAL_BYTES }])).toBeNull();
    expect(checkFiles([{ name: "a.png", size: MAX_TOTAL_BYTES + 1 }])).toBe("too_big");
  });

  it("rejects executable, script and unknown types, and empty files", () => {
    for (const name of ["setup.exe", "run.bat", "page.html", "logo.svg", "macro.docm", "noextension", "x.png.exe"]) {
      expect(checkFiles([{ name, size: 10 }]), name).toBe("bad_type");
    }
    expect(checkFiles([{ name: "empty.png", size: 0 }])).toBe("empty");
  });

  it("only allows types that are safe to store", () => {
    expect(Object.keys(ALLOWED_TYPES)).not.toContain("svg");
    expect(Object.keys(ALLOWED_TYPES)).not.toContain("html");
    expect(Object.keys(ALLOWED_TYPES)).not.toContain("exe");
  });
});

describe("content must match the extension", () => {
  it("accepts a real PNG and rejects other bytes named .png", () => {
    expect(contentMatches("png", PNG)).toBe(true);
    expect(contentMatches("png", Buffer.from("<script>alert(1)</script>"))).toBe(false);
    expect(contentMatches("jpg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(contentMatches("pdf", Buffer.from("%PDF-1.7 ..."))).toBe(true);
    expect(contentMatches("pdf", PNG)).toBe(false);
  });

  it("rejects a binary renamed to .txt", () => {
    expect(contentMatches("txt", Buffer.from("plain readable log\nline two"))).toBe(true);
    expect(contentMatches("txt", Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0x03]))).toBe(false); // MZ header + NUL
  });
});

describe("prepareFiles (server side)", () => {
  it("returns the sanitized name and the type WE decide, not the browser's claim", async () => {
    const result = await prepareFiles([file("screen shot.png", PNG)]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.files[0].mime).toBe("image/png");
      expect(result.files[0].name).toBe("screen shot.png");
      expect(result.files[0].bytes.length).toBe(PNG.length);
    }
  });

  it("refuses a disguised file", async () => {
    expect(await prepareFiles([file("cute.png", "<html><script>steal()</script></html>")])).toEqual({ ok: false, error: "bad_type" });
  });

  it("refuses an over-limit upload before reading it", async () => {
    const big = new File([new Uint8Array(MAX_TOTAL_BYTES + 1)], "huge.png");
    expect(await prepareFiles([big])).toEqual({ ok: false, error: "too_big" });
  });
});

describe("file names", () => {
  it("strips paths, control characters and header-breaking characters", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Users\\me\\secret.txt")).toBe("secret.txt");
    expect(sanitizeFileName('bad"name\r\n.png')).toBe("badname.png");
    expect(sanitizeFileName("...hidden")).toBe("hidden");
    expect(sanitizeFileName("")).toBe("file");
    expect(sanitizeFileName("a".repeat(300) + ".png").length).toBeLessThanOrEqual(120);
  });

  it("extensionOf is case-insensitive and uses the last dot", () => {
    expect(extensionOf("Report.FINAL.PDF")).toBe("pdf");
    expect(extensionOf("noext")).toBe("");
  });

  it("humanSize", () => {
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(2048)).toBe("2 KB");
    expect(humanSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
