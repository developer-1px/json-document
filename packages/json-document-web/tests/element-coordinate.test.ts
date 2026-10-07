import {expect,test} from "vitest";
import {projectWebClientDeltaToElement} from "../src/index.js";
test("client movement is converted independently on both scaled axes",()=>{
 expect(projectWebClientDeltaToElement({offsetWidth:120,offsetHeight:40,getBoundingClientRect:()=>({width:60,height:80})},{dx:10,dy:10})).toEqual({dx:20,dy:5});
});
