window.nk={},nk.cookie=function(e){let t={get:function(){let t=document.cookie.split("; ");for(let n=0;n<t.length;n++){let o=t[n].split("=");if(o[0]===e)return JSON.parse(decodeURIComponent(o[1]))}return null},set:function(t){if(e.includes("[")&&e.includes("]")){let n=e.split("[")[0],o=e.match(/\[(.*?)\]/)[1].split(",");if(o=o.map((e=>`${n}.${e.replace(/\s/g,"")}`)),Array.isArray(t))for(let e=0;e<t.length;e++){let n=encodeURIComponent(JSON.stringify(t[e])),r=o[e]+"="+n.replace(/%([0-9A-F]{2})/g,(function(e,t){return String.fromCharCode("0x"+t)})),i=new Date;i.setFullYear(i.getFullYear()+2);let l=`${r}; expires=${i.toUTCString()}; path=/; SameSite=None; Secure`;document.cookie=l}}else{let n=encodeURIComponent(JSON.stringify(t)),o=e+"="+n.replace(/%([0-9A-F]{2})/g,(function(e,t){return String.fromCharCode("0x"+t)})),r=new Date;r.setFullYear(r.getFullYear()+2);let i=`${o}; expires=${r.toUTCString()}; path=/; SameSite=None; Secure`;document.cookie=i}},remove:function(){document.cookie=`${e}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`}};return t},nk.cookieSession=function(){const e=`"{${Math.random().toString(36).substring(2,15)}-${Math.random().toString(36).substring(2,15)}}"`,t=decodeURIComponent(document.cookie);let n=new Date;n.setFullYear(n.getFullYear()+2),t.includes("sessionID=")||(document.cookie=`sessionID=${e}; expires=${n.toUTCString()}; path=/; SameSite=None; Secure`)};