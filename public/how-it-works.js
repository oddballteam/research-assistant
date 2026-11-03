/* "How this tool works": the footer accordion. Opening the page at #how-it-works shows the steps. */
(function(){
  var btn=document.getElementById("how-btn"),panel=document.getElementById("how-panel"),sec=document.getElementById("how-it-works");
  if(!btn||!panel||!sec)return;
  function set(open){btn.setAttribute("aria-expanded",String(open));panel.hidden=!open}
  btn.addEventListener("click",function(){set(btn.getAttribute("aria-expanded")!=="true")});
  function fromHash(){if(location.hash==="#how-it-works"){set(true);sec.scrollIntoView();btn.focus({preventScroll:true})}}
  fromHash();
  window.addEventListener("hashchange",fromHash);
})();
