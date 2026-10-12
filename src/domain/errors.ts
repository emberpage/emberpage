import { Schema } from "effect";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Converts exceptions from native adapters into a typed Effect failure. */
export class BoundaryError extends Schema.TaggedError<BoundaryError>()(
  "BoundaryError",
  {
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {
  static from(cause: unknown, message = errorMessage(cause)) {
    return new BoundaryError({ message, cause });
  }
}
