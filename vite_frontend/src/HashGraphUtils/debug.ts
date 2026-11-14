export function getCallerName(): string {
  const err = new Error();
  const stack = err.stack;

  if (!stack) {
    return 'unknown';
  }

  // Split the stack into lines.
  // Note: The exact format varies (Chrome vs Firefox vs Node).
  // This regex looks for the function name inside the stack frame.
  const lines = stack.split('\n');

  // Typically:
  // lines[0] = "Error"
  // lines[1] = "    at getCallerName (file:line:col)" <-- The current function
  // lines[2] = "    at actualCaller (file:line:col)" <-- The caller
  if (lines.length < 3) {
    return 'unknown';
  }

  const callerLine = lines[3];

  // Regex to capture function names in V8 (Node/Chrome)
  // Matches: "at functionName (" or "at functionName@"
  const match = callerLine.match(/at\s+(.*?)\s+\(/);
  if (match && match[1]) {
    return match[1];
  }

  // Fallback for anonymous functions or different formats
  return callerLine.trim();
}
