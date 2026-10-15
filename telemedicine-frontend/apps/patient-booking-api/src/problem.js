// RFC-7807-ish problem+json helper.
export function problem(res, status, title, detail) {
  return res.status(status).json({
    type: "about:blank",
    title,
    status,
    detail: detail ?? title,
  });
}