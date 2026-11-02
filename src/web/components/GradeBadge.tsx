import displayLabels from '../../shared/display-labels.json';

export interface ValueGrade {id:string;name:string}
export function soulGrade(label:string):ValueGrade|undefined {
  return displayLabels.grades.find((grade:ValueGrade)=>grade.name===label);
}
export default function GradeBadge({grade}:{grade?:ValueGrade|null}) {
  return grade?<span className="grade-badge" data-grade={grade.id}><span aria-hidden="true">◆</span>{grade.name}</span>:null;
}
