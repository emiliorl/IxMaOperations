import { describe, expect, it } from "vitest";
import { missingColumn } from "./missing-column";

describe("which column is missing", () => {
  it("reads the PostgREST message for a write", () => {
    expect(missingColumn("Could not find the 'client_id' column of 'meetings' in the schema cache")).toBe("client_id");
  });

  it("reads the Postgres message for a read, with or without the table", () => {
    expect(missingColumn("column meetings.client_id does not exist")).toBe("client_id");
    expect(missingColumn('column "milestone_id" does not exist')).toBe("milestone_id");
    expect(missingColumn('column meetings."department_id" does not exist')).toBe("department_id");
  });

  it("is null for anything else", () => {
    expect(missingColumn("duplicate key value violates unique constraint")).toBeNull();
    expect(missingColumn('relation "meetings" does not exist')).toBeNull();
    expect(missingColumn("")).toBeNull();
    expect(missingColumn(null)).toBeNull();
    expect(missingColumn(undefined)).toBeNull();
  });
});
