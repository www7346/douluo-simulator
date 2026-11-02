/** Retained only as saved configuration data; these IDs have no executable task or prompt. */
export const RETIRED_MODEL_TASK_IDS=['story-continue','story-review','prose-repair','private-repair','party-repair'];
export const RETIRED_PROMPT_IDS=[...RETIRED_MODEL_TASK_IDS,'continue-mode','battle-continue-mode','unit-continue','continue-instruction','review-author','review-party-author','review-scope'];
export function assertActiveModelTask(task:string){if(RETIRED_MODEL_TASK_IDS.includes(task))throw Error('这项生成任务已停用');}
