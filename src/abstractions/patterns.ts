import type { AgentContext, AgentResult } from "./agents.js";
import type { IAuditSink } from "./audit.js";
import type { IMemoryProvider } from "./memory.js";
import type { IModelAdapter } from "./models.js";
import type { AgentPolicy, IPolicyEngine } from "./policy.js";
import type { IToolInvoker } from "./tools.js";

/** Classifies the risk profile of an agent pattern. */
export enum PatternRiskLevel {
  Low = 0,
  Medium = 1,
  High = 2,
  Unbounded = 3,
}

/** Static description of a pattern. */
export interface PatternDescriptor {
  readonly patternId: string;
  readonly name: string;
  readonly requiresTools?: boolean;
  readonly requiresMemory?: boolean;
  readonly requiresNativeToolCalling?: boolean;
  readonly requiresJsonMode?: boolean;
  readonly supportsMultiAgent?: boolean;
  readonly isBounded?: boolean;
  readonly maxSteps?: number;
  readonly riskLevel?: PatternRiskLevel;
}

/** Computed requirements for a single (task, model) pair. */
export interface PatternRequirement {
  readonly needsTools: boolean;
  readonly needsMemory: boolean;
  readonly needsJsonMode: boolean;
  readonly needsValidation: boolean;
  readonly needsMultiAgent: boolean;
}

/** Services exposed to a pattern during execution. */
export interface IPatternServices {
  readonly sessionId: string;
  readonly model: IModelAdapter;
  readonly tools: IToolInvoker | null;
  readonly memory: IMemoryProvider | null;
  readonly audit: IAuditSink;
  readonly policy: IPolicyEngine;
  readonly effectivePolicy: AgentPolicy;
}

/** An executable agent pattern. */
export interface IAgentPattern {
  readonly descriptor: PatternDescriptor;
  execute(context: AgentContext, services: IPatternServices): Promise<AgentResult>;
}
