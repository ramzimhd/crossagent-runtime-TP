import type { ToolCall, ToolDefinition } from "../abstractions/tools.js";

export interface ToolValidationResult {
  readonly isValid: boolean;
  readonly reason?: string;
  readonly issues: ReadonlyArray<string>;
}

export const ToolValidationResult = {
  valid(): ToolValidationResult {
    return { isValid: true, issues: [] };
  },
  invalid(reason: string, issues: ReadonlyArray<string> = []): ToolValidationResult {
    return { isValid: false, reason, issues };
  },
};

const JSON_TYPE_CHECK: Record<string, (value: unknown) => boolean> = {
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number" && !Number.isNaN(v),
  integer: (v) => typeof v === "number" && Number.isInteger(v),
  boolean: (v) => typeof v === "boolean",
  array: (v) => Array.isArray(v),
  object: (v) => typeof v === "object" && v !== null && !Array.isArray(v),
  null: (v) => v === null,
};

function jsonTypeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export class ToolValidator {
  validate(definition: ToolDefinition, call: ToolCall): ToolValidationResult {
    if (!definition) throw new Error("definition must not be null");
    if (!call) throw new Error("call must not be null");

    if (definition.name !== call.toolName) {
      return ToolValidationResult.invalid(
        `Call targets '${call.toolName}' but definition is for '${definition.name}'.`,
      );
    }

    let args: unknown;
    const raw = (call.argumentsJson ?? "").trim();
    try {
      args = JSON.parse(raw === "" ? "{}" : raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return ToolValidationResult.invalid("Arguments are not valid JSON.", [message]);
    }

    let schema: unknown;
    try {
      schema = JSON.parse(definition.parametersJsonSchema);
    } catch {
      return typeof args === "object" && args !== null && !Array.isArray(args)
        ? ToolValidationResult.valid()
        : ToolValidationResult.invalid("Arguments must be a JSON object.");
    }

    if (typeof args !== "object" || args === null || Array.isArray(args)) {
      return ToolValidationResult.invalid("Arguments must be a JSON object.");
    }
    if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
      return ToolValidationResult.valid();
    }

    const schemaObj = schema as Record<string, unknown>;
    const argsObj = args as Record<string, unknown>;

    if (Array.isArray(schemaObj["required"])) {
      const missing: string[] = [];
      for (const name of schemaObj["required"] as unknown[]) {
        if (typeof name === "string" && !(name in argsObj)) {
          missing.push(`missing required property '${name}'`);
        }
      }
      if (missing.length > 0) {
        return ToolValidationResult.invalid("Required properties are missing.", missing);
      }
    }

    const properties = schemaObj["properties"];
    if (
      typeof properties === "object" &&
      properties !== null &&
      !Array.isArray(properties)
    ) {
      const propsObj = properties as Record<string, unknown>;
      const issues: string[] = [];
      for (const [name, value] of Object.entries(argsObj)) {
        const propSchema = propsObj[name];
        if (
          typeof propSchema !== "object" ||
          propSchema === null ||
          Array.isArray(propSchema)
        ) {
          continue;
        }
        const declared = (propSchema as Record<string, unknown>)["type"];
        if (typeof declared !== "string") continue;
        const check = JSON_TYPE_CHECK[declared];
        if (check && !check(value)) {
          issues.push(
            `property '${name}' expected '${declared}' but got '${jsonTypeName(value)}'`,
          );
        }
      }
      if (issues.length > 0) {
        return ToolValidationResult.invalid(
          "One or more properties have incompatible types.",
          issues,
        );
      }
    }

    return ToolValidationResult.valid();
  }
}
