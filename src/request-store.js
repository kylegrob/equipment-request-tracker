export const STORAGE_KEY = "mis4173-equipment-requests";
export const PRIORITIES = ["Low", "Normal", "High"];

export class RequestValidationError extends Error {
  constructor(errors) {
    super("The equipment request is incomplete.");
    this.name = "RequestValidationError";
    this.errors = errors;
  }
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePriority(value) {
  const priority = clean(value);
  return PRIORITIES.includes(priority) ? priority : "Normal";
}

export function validateRequest(input = {}) {
  const errors = {};

  if (!clean(input.requester)) errors.requester = "Enter the requester name.";
  if (!clean(input.department)) errors.department = "Select a department.";
  if (!clean(input.equipment)) errors.equipment = "Enter the equipment needed.";
  if (!clean(input.neededBy)) errors.neededBy = "Select the date needed.";
  if (!clean(input.reason)) errors.reason = "Enter a business reason.";

  const priority = clean(input.priority);
  if (priority && !PRIORITIES.includes(priority)) {
    errors.priority = "Select a valid priority.";
  }

  return errors;
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createRequest(input, options = {}) {
  const errors = validateRequest(input);
  if (Object.keys(errors).length > 0) {
    throw new RequestValidationError(errors);
  }

  const now = options.now ?? new Date();

  return {
    id: options.id ?? createId(),
    requester: clean(input.requester),
    department: clean(input.department),
    equipment: clean(input.equipment),
    priority: normalizePriority(input.priority),
    neededBy: clean(input.neededBy),
    reason: clean(input.reason),
    createdAt: now.toISOString(),
  };
}

export function appendRequest(requests, request) {
  return [request, ...requests];
}

export function loadRequests(storage = globalThis.localStorage) {
  if (!storage) return [];

  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed
          .filter(isRequestRecord)
          .map((request) => ({ ...request, priority: normalizePriority(request.priority) }))
      : [];
  } catch {
    return [];
  }
}

export function saveRequests(requests, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

function isRequestRecord(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.requester === "string" &&
    typeof value.department === "string" &&
    typeof value.equipment === "string" &&
    (value.priority === undefined || PRIORITIES.includes(value.priority)) &&
    typeof value.neededBy === "string" &&
    typeof value.reason === "string" &&
    typeof value.createdAt === "string"
  );
}

