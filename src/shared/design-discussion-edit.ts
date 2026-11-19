import {jsonEqual} from './json-identity';

/** A page owns its input, not a newer workflow result in the same discussion. */
export function mergeDesignDiscussionEdit<T extends {request:string}>(current:T,expected:T,next:T):T{
 if(jsonEqual(current,expected))return next;
 const {request:_next,...nextResult}=next,{request:_expected,...expectedResult}=expected;
 if(jsonEqual(nextResult,expectedResult))return next.request===expected.request?current:{...current,request:next.request};
 throw Error('讨论答复已更新，请重新查看后再操作；原答复已保留');
}
