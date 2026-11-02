/** Recoverable response grammar only. Missing coverage and invalid evidence
 * remain substantive review failures and must not trigger another judgment. */
export class StoryReviewFormatError extends Error {
 constructor(message:string){super(message);this.name='StoryReviewFormatError';}
}
