import assert from "node:assert/strict";
import test from "node:test";

import { HANDLED_REQUESTS_KEY, STORAGE_KEY } from "../src/request-store.js";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

class TestElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.textContent = "";
    this.classList = {
      toggle: (name, enabled) => {
        if (enabled) this.attributes.set(`class:${name}`, "");
        else this.attributes.delete(`class:${name}`);
      },
    };
  }

  append(child) {
    this.children.push(child);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type, event = {}) {
    event.preventDefault ??= () => {
      event.defaultPrevented = true;
    };
    this.listeners.get(type)?.(event);
    return event;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (element) => {
      for (const child of element.children) {
        if (selector === "button" && child.tagName === "button") matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.children.find((child) => child.tagName === selector) ?? null;
  }

  reset() {
    this.values = {};
  }
}

function createTestPage(savedRequests = []) {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(savedRequests));

  const document = {
    activeElement: null,
    createElement(tagName) {
      return new TestElement(tagName, document);
    },
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
  };
  const elements = new Map();
  const add = (selector, tagName = "div") => {
    const element = new TestElement(tagName, document);
    elements.set(selector, element);
    return element;
  };

  const form = add("#request-form", "form");
  form.values = {};
  form.elements = [];
  for (const name of ["requester", "department", "equipment", "neededBy", "priority", "reason"]) {
    const field = new TestElement("input", document);
    field.name = name;
    form.elements.push(field);
    form.elements[name] = field;
    const selector = {
      requester: "#requester",
      neededBy: "#needed-by",
    }[name];
    if (selector) elements.set(selector, field);
  }
  const emptyState = add("#empty-state");
  emptyState.append(add("#empty-state-heading", "h3"));
  add("#form-message", "p");
  add("#request-count", "p");
  add("#request-table-wrapper");
  add("#list-message", "p");

  return {
    document,
    storage,
    elements,
    form,
    tableBody: add("#request-table-body", "tbody"),
  };
}

async function loadApp(page) {
  const previous = {
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    localStorage: Object.getOwnPropertyDescriptor(globalThis, "localStorage"),
    FormData: Object.getOwnPropertyDescriptor(globalThis, "FormData"),
  };
  globalThis.document = page.document;
  globalThis.localStorage = page.storage;
  globalThis.FormData = class {
    constructor(form) {
      this.values = form.values;
    }

    entries() {
      return Object.entries(this.values);
    }
  };

  await import(`../src/app.js?ui-test=${Math.random()}`);

  return () => {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  };
}

function request(id, fields = {}) {
  return {
    id,
    requester: `${id} requester`,
    department: "Operations",
    equipment: `${id} equipment`,
    priority: "Normal",
    neededBy: "2026-09-15",
    reason: `${id} reason`,
    createdAt: "2026-08-17T12:00:00.000Z",
    ...fields,
  };
}

test("dashboard shows required fields in sorted order", async () => {
  const page = createTestPage([
    request("low", { priority: "Low" }),
    request("high", { priority: "High" }),
    request("normal"),
  ]);
  const restore = await loadApp(page);

  try {
    assert.equal(page.elements.get("#empty-state").hidden, true);
    assert.equal(page.elements.get("#request-table-wrapper").hidden, false);
    assert.deepEqual(page.tableBody.children.map((row) => row.children[0].textContent), [
      "high requester",
      "normal requester",
      "low requester",
    ]);
    const cells = page.tableBody.children[0].children;
    assert.deepEqual(cells.slice(0, 4).map((cell) => cell.textContent), [
      "high requester",
      "Operations",
      "high equipment",
      "High",
    ]);
    assert.ok(cells[4].textContent);
    assert.equal(cells[5].textContent, "high reason");
    assert.ok(cells[6].textContent);
  } finally {
    restore();
  }
});

test("marking handled removes the row, retains the request, and focuses the next action", async () => {
  const savedRequests = [request("first", { priority: "High" }), request("second")];
  const page = createTestPage(savedRequests);
  const restore = await loadApp(page);

  try {
    page.tableBody.children[0].children[7].children[0].dispatch("click");

    assert.equal(page.tableBody.children.length, 1);
    assert.deepEqual(JSON.parse(page.storage.getItem(STORAGE_KEY)), savedRequests);
    assert.deepEqual(JSON.parse(page.storage.getItem(HANDLED_REQUESTS_KEY)), ["first"]);
    assert.equal(page.document.activeElement, page.tableBody.querySelectorAll("button")[0]);
  } finally {
    restore();
  }
});

test("handling the last request shows the empty message, hides the table, and focuses the heading", async () => {
  const page = createTestPage([request("only")]);
  const restore = await loadApp(page);

  try {
    page.tableBody.children[0].children[7].children[0].dispatch("click");

    assert.equal(page.tableBody.children.length, 0);
    assert.equal(page.elements.get("#empty-state").hidden, false);
    assert.equal(page.elements.get("#request-table-wrapper").hidden, true);
    assert.equal(page.elements.get("#empty-state-heading").tagName, "h3");
    assert.equal(page.document.activeElement, page.elements.get("#empty-state").children[0]);
  } finally {
    restore();
  }
});

test("submitting the form adds a sorted row without a page reload", async () => {
  const page = createTestPage([
    request("low", { priority: "Low" }),
    request("high-later", { priority: "High", neededBy: "2099-02-01" }),
  ]);
  const restore = await loadApp(page);

  try {
    page.form.values = {
      requester: "Taylor Morgan",
      department: "Finance",
      equipment: "Monitor",
      neededBy: "2099-01-01",
      priority: "High",
      reason: "Replacement display",
    };
    const event = page.form.dispatch("submit");

    assert.equal(event.defaultPrevented, true);
    assert.deepEqual(page.tableBody.children.map((row) => row.children[2].textContent), [
      "Monitor",
      "high-later equipment",
      "low equipment",
    ]);
    assert.equal(JSON.parse(page.storage.getItem(STORAGE_KEY)).length, 3);
  } finally {
    restore();
  }
});
