import { describe, it, expect } from "vitest";
import { isAdminHost } from "@/lib/admin-host";

describe("isAdminHost", () => {
  it("matches the admin subdomain", () => {
    expect(isAdminHost("admin.piccoload.com")).toBe(true);
    expect(isAdminHost("ADMIN.PICCOLOAD.COM")).toBe(true);
    expect(isAdminHost("admin.localhost")).toBe(true);
  });

  it("ignores the port", () => {
    expect(isAdminHost("admin.localhost:8080")).toBe(true);
    expect(isAdminHost("piccoload.com:443")).toBe(false);
  });

  it("does not match customer-facing hosts", () => {
    expect(isAdminHost("piccoload.com")).toBe(false);
    expect(isAdminHost("www.piccoload.com")).toBe(false);
    expect(isAdminHost("localhost")).toBe(false);
  });

  it("does not match a host that merely contains 'admin'", () => {
    // The shop must never render as the dashboard because of a substring.
    expect(isAdminHost("piccoload-admin.com")).toBe(false);
    expect(isAdminHost("myadmin.piccoload.com")).toBe(false);
    expect(isAdminHost("www.admin-piccoload.com")).toBe(false);
  });
});
