import assert from "node:assert/strict";
import test from "node:test";

import {
  HANDLED_REQUESTS_KEY,
  RequestValidationError,
  STORAGE_KEY,
  appendRequest,
  createRequest,
  getActiveRequests,
  loadHandledRequestIds,
  loadRequests,
  markRequestHandled,
  saveHandledRequestIds,
  saveRequests,
} from "../src/request-store.js";

const validInput = {
  requester: "  Jordan Lee  ",
  department: "Operations",
  equipment: "  Laptop  ",
  neededBy: "2026-09-15",
  reason: "  Replace a failed field computer.  ",
};

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

test("createRequest trims input and adds system fields", () => {
  const request = createRequest(validInput, {
    id: "request-1",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });

  assert.deepEqual(request, {
    id: "request-1",
    requester: "Jordan Lee",
    department: "Operations",
    equipment: "Laptop",
    priority: "Normal",
    neededBy: "2026-09-15",
    reason: "Replace a failed field computer.",
    createdAt: "2026-08-17T12:00:00.000Z",
  });
});

test("createRequest stores a selected priority", () => {
  const request = createRequest({ ...validInput, priority: "High" }, {
    id: "request-priority",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });

  assert.equal(request.priority, "High");
});

test("createRequest rejects an unsupported priority", () => {
  assert.throws(
    () => createRequest({ ...validInput, priority: "Urgent" }),
    (error) => {
      assert.ok(error instanceof RequestValidationError);
      assert.deepEqual(error.errors, { priority: "Select a valid priority." });
      return true;
    },
  );
});

test("createRequest reports missing required fields", () => {
  assert.throws(
    () => createRequest({ ...validInput, requester: "", equipment: " " }),
    (error) => {
      assert.ok(error instanceof RequestValidationError);
      assert.deepEqual(Object.keys(error.errors), ["requester", "equipment"]);
      return true;
    },
  );
});

test("appendRequest returns a new list with the newest request first", () => {
  const original = [{ id: "old" }];
  const result = appendRequest(original, { id: "new" });

  assert.deepEqual(result.map((request) => request.id), ["new", "old"]);
  assert.deepEqual(original.map((request) => request.id), ["old"]);
});

test("saveRequests and loadRequests round-trip valid records", () => {
  const storage = new MemoryStorage();
  const request = createRequest(validInput, {
    id: "request-2",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });

  saveRequests([request], storage);

  assert.deepEqual(loadRequests(storage), [request]);
});

test("loadRequests keeps legacy records visible without changing their saved shape", () => {
  const storage = new MemoryStorage();
  const legacyRequest = {
    id: "legacy-request",
    requester: "Jordan Lee",
    department: "Operations",
    equipment: "Laptop",
    priority: "High",
    neededBy: "2026-09-15",
    reason: "Replace a failed field computer.",
    createdAt: "2026-08-17T12:00:00.000Z",
  };
  const storedValue = JSON.stringify([legacyRequest]);
  storage.setItem(STORAGE_KEY, storedValue);

  assert.deepEqual(loadRequests(storage), [legacyRequest]);
  assert.equal(storage.getItem(STORAGE_KEY), storedValue);
  assert.deepEqual(loadHandledRequestIds(storage), new Set());
});

test("loadRequests safely handles damaged stored data", () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, "not-json");

  assert.deepEqual(loadRequests(storage), []);
});

test("getActiveRequests excludes handled IDs and sorts by priority and needed-by date stably", () => {
  const requests = [
    { id: "normal-late", priority: "Normal", neededBy: "2026-10-10" },
    { id: "low-early", priority: "Low", neededBy: "2026-09-01" },
    { id: "high-late", priority: "High", neededBy: "2026-10-10" },
    { id: "high-early-1", priority: "High", neededBy: "2026-09-01" },
    { id: "high-handled", priority: "High", neededBy: "2026-08-01" },
    { id: "high-early-2", priority: "High", neededBy: "2026-09-01" },
    { id: "normal-early", priority: "Normal", neededBy: "2026-09-01" },
  ];

  assert.deepEqual(
    getActiveRequests(requests, new Set(["high-handled"])).map((request) => request.id),
    ["high-early-1", "high-early-2", "high-late", "normal-early", "normal-late", "low-early"],
  );
  assert.equal(requests[0].id, "normal-late");
});

test("handled state survives reload without changing saved request records", () => {
  const storage = new MemoryStorage();
  const request = createRequest(validInput, {
    id: "request-to-handle",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });
  const originalStoredRequest = JSON.stringify([request]);
  saveRequests([request], storage);

  const handledIds = markRequestHandled(loadHandledRequestIds(storage), request.id);
  saveHandledRequestIds(handledIds, storage);

  assert.deepEqual(loadHandledRequestIds(storage), new Set([request.id]));
  assert.deepEqual(loadRequests(storage), [request]);
  assert.equal(storage.getItem(STORAGE_KEY), originalStoredRequest);
  assert.equal(storage.getItem(HANDLED_REQUESTS_KEY), JSON.stringify([request.id]));
  assert.deepEqual(getActiveRequests(loadRequests(storage), loadHandledRequestIds(storage)), []);
});

test("markRequestHandled returns a new set and does not duplicate handled IDs", () => {
  const original = new Set(["another-request"]);
  const updated = markRequestHandled(original, "request-to-handle");

  assert.deepEqual(updated, new Set(["another-request", "request-to-handle"]));
  assert.deepEqual(original, new Set(["another-request"]));
  assert.equal(markRequestHandled(updated, "request-to-handle"), updated);
});

test("loadHandledRequestIds safely handles damaged data and filters non-string IDs", () => {
  const storage = new MemoryStorage();
  storage.setItem(HANDLED_REQUESTS_KEY, JSON.stringify(["handled-1", 7, null]));

  assert.deepEqual(loadHandledRequestIds(storage), new Set(["handled-1"]));
  storage.setItem(HANDLED_REQUESTS_KEY, "not-json");
  assert.deepEqual(loadHandledRequestIds(storage), new Set());
});

test("getActiveRequests is empty when no unhandled requests remain", () => {
  const requests = [
    { id: "handled-1", priority: "High", neededBy: "2026-09-01" },
    { id: "handled-2", priority: "Low", neededBy: "2026-09-02" },
  ];

  assert.deepEqual(getActiveRequests(requests, new Set(["handled-1", "handled-2"])), []);
  assert.deepEqual(getActiveRequests([]), []);
});

test("an appended unhandled request appears in its priority and date position", () => {
  const existingRequests = [
    { id: "low-request", priority: "Low", neededBy: "2026-09-01" },
    { id: "high-later", priority: "High", neededBy: "2026-10-01" },
  ];
  const newRequest = createRequest({ ...validInput, priority: "High", neededBy: "2026-09-15" }, {
    id: "new-high-request",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });

  assert.deepEqual(
    getActiveRequests(appendRequest(existingRequests, newRequest)).map((request) => request.id),
    ["new-high-request", "high-later", "low-request"],
  );
});

test("loadRequests defaults legacy records without a priority to Normal", () => {
  const storage = new MemoryStorage();
  const legacyRequest = {
    id: "legacy-no-priority",
    requester: "Jordan Lee",
    department: "Operations",
    equipment: "Laptop",
    neededBy: "2026-09-15",
    reason: "Replace a failed field computer.",
    createdAt: "2026-08-17T12:00:00.000Z",
  };
  storage.setItem(STORAGE_KEY, JSON.stringify([legacyRequest]));

  assert.deepEqual(loadRequests(storage), [{ ...legacyRequest, priority: "Normal" }]);
});

