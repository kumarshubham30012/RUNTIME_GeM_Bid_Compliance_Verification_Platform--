import type { VerificationMethod } from "../requirements/constants";
import { DemoDocumentProvider } from "./providers/DemoDocumentProvider";
import { DemoGSTProvider } from "./providers/DemoGSTProvider";
import { DemoManualProvider } from "./providers/DemoManualProvider";
import { DemoOEMProvider } from "./providers/DemoOEMProvider";
import { DemoUdyamProvider } from "./providers/DemoUdyamProvider";
import type { VerificationProvider } from "./types";

const providers: Record<VerificationMethod, VerificationProvider> = {
  GST: new DemoGSTProvider(),
  UDYAM: new DemoUdyamProvider(),
  OEM: new DemoOEMProvider(),
  DOCUMENT: new DemoDocumentProvider(),
  MANUAL: new DemoManualProvider(),
};

export function getVerificationProvider(method: VerificationMethod): VerificationProvider {
  return providers[method];
}
