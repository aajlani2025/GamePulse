// Extract a user-friendly message from an Axios error or a generic Error.
export default function getErrorMessage(err, fallback = "Something went wrong") {
  if (!err) return fallback;
  // Axios response object
  const resp = err.response;
  if (resp && resp.data) {
    const data = resp.data;
    // common fields
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (typeof data.error === "string" && data.error.trim()) return data.error;
    if (typeof data.detail === "string" && data.detail.trim()) return data.detail;
    if (Array.isArray(data.errors) && data.errors.length) {
      try {
        return data.errors
          .map((e) => (typeof e === "string" ? e : e.message || JSON.stringify(e)))
          .join("; ");
      } catch (e) {
        // fallback
      }
    }
    if (typeof data === "string" && data.trim()) return data;
  }

  // Axios error message or generic Error
  if (err.message) return err.message;
  return fallback;
}
