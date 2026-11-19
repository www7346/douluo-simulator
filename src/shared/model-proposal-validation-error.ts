/** Code-owned evidence for correcting an unadopted proposal. */
export class ModelProposalValidationError extends Error {
 constructor(message:string,readonly correctionContext:unknown){super(message);this.name='ModelProposalValidationError';}
}
