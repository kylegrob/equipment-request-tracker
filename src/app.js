import {
  RequestValidationError,
  appendRequest,
  createRequest,
  getActiveRequests,
  loadHandledRequestIds,
  loadRequests,
  markRequestHandled,
  saveHandledRequestIds,
  saveRequests,
} from "./request-store.js";

const form = document.querySelector("#request-form");
const message = document.querySelector("#form-message");
const neededByInput = document.querySelector("#needed-by");
const count = document.querySelector("#request-count");
const emptyState = document.querySelector("#empty-state");
const tableWrapper = document.querySelector("#request-table-wrapper");
const tableBody = document.querySelector("#request-table-body");
const listMessage = document.querySelector("#list-message");

let requests = loadRequests();
let handledRequestIds = loadHandledRequestIds();

neededByInput.min = new Date().toISOString().slice(0, 10);
renderRequests();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearFieldErrors();
  setMessage("");

  const input = Object.fromEntries(new FormData(form).entries());

  try {
    const request = createRequest(input);
    requests = appendRequest(requests, request);
    saveRequests(requests);
    form.reset();
    neededByInput.min = new Date().toISOString().slice(0, 10);
    setMessage("Request added.");
    renderRequests();
    document.querySelector("#requester").focus();
  } catch (error) {
    if (error instanceof RequestValidationError) {
      showFieldErrors(error.errors);
      setMessage("Complete all required fields.", true);
      return;
    }

    setMessage("The request could not be saved. Try again.", true);
    console.error(error);
  }
});

function renderRequests() {
  const activeRequests = getActiveRequests(requests, handledRequestIds);
  const hasRequests = activeRequests.length > 0;
  count.textContent = `${activeRequests.length} active ${activeRequests.length === 1 ? "request" : "requests"}`;
  emptyState.hidden = hasRequests;
  tableWrapper.hidden = !hasRequests;
  tableBody.replaceChildren(...activeRequests.map(createRequestRow));
}

function createRequestRow(request) {
  const row = document.createElement("tr");
  const values = [
    request.requester,
    request.department,
    request.equipment,
    request.priority,
    formatDate(request.neededBy),
    request.reason,
    formatDateTime(request.createdAt),
  ];

  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }

  const actionCell = document.createElement("td");
  const handleButton = document.createElement("button");
  handleButton.type = "button";
  handleButton.className = "secondary-button";
  handleButton.textContent = "Mark handled";
  handleButton.setAttribute(
    "aria-label",
    `Mark ${request.equipment} request from ${request.requester} as handled`,
  );
  handleButton.addEventListener("click", () => handleRequest(request.id));
  actionCell.append(handleButton);
  row.append(actionCell);

  return row;
}

function handleRequest(requestId) {
  const activeRequests = getActiveRequests(requests, handledRequestIds);
  const handledIndex = activeRequests.findIndex((request) => request.id === requestId);
  const request = activeRequests[handledIndex];
  if (!request) return;

  const previousHandledRequestIds = handledRequestIds;
  handledRequestIds = markRequestHandled(handledRequestIds, requestId);
  try {
    saveHandledRequestIds(handledRequestIds);
  } catch (error) {
    handledRequestIds = previousHandledRequestIds;
    setListMessage("The request could not be marked handled. Try again.");
    console.error(error);
    return;
  }

  renderRequests();
  setListMessage(`${request.equipment} request marked handled.`);
  const buttons = tableBody.querySelectorAll("button");
  const nextButton = buttons[Math.min(handledIndex, buttons.length - 1)];
  if (nextButton) nextButton.focus();
  else emptyState.querySelector("h3").focus();
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatDateTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function showFieldErrors(errors) {
  const firstInvalidField = Object.keys(errors)[0];

  for (const fieldName of Object.keys(errors)) {
    form.elements[fieldName]?.setAttribute("aria-invalid", "true");
  }

  form.elements[firstInvalidField]?.focus();
}

function clearFieldErrors() {
  for (const element of form.elements) {
    element.removeAttribute?.("aria-invalid");
  }
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function setListMessage(text) {
  listMessage.textContent = text;
}

