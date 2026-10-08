// Node verifies tree geometry and resource ownership; browser QA verifies pixels.
if(typeof document==='undefined'){
 const context=new Proxy({
  createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),
  createLinearGradient:()=>({addColorStop:()=>{}}),
  createRadialGradient:()=>({addColorStop:()=>{}}),
 },{get:(target,key)=>Reflect.get(target,key)??(()=>{})});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})} as unknown as Document;
 globalThis.ImageData=class{
  constructor(public data:Uint8ClampedArray,public width:number,public height:number){}
 } as unknown as typeof ImageData;
}
