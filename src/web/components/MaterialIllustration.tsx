import RelicIllustration from './RelicIllustration';

export default function MaterialIllustration({material,name,large=false}:{material:any;name:string;large?:boolean}) {
  return <RelicIllustration item={material} kind="材料" name={name} large={large}/>;
}
