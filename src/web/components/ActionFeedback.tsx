import ActionError from './ActionError';
export default function ActionFeedback({feedback}:{feedback:{error:string;success:string;dismiss:()=>void}}){
 return <><ActionError message={feedback.error} onDismiss={feedback.dismiss}/>{!feedback.error&&feedback.success&&<p className="captivity__notice" role="status">{feedback.success}</p>}</>;
}
