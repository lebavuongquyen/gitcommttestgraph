export const GUI_RECOVERY_SCRIPT = String.raw`
async function runRecoveryRepair(operation){
  try{
    const result=await api(capability("recoveryRepair"),{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({operation})
    });
    const plan=result.plan;
    $("recoveryStatus").textContent=(plan.safe?"Repair is safe: ":"Repair blocked: ")+
      ((plan.actions||[]).map(item=>item.kind).join(", ")||"no automatic actions")+
      (plan.blockedReasons?.length?"  -  "+plan.blockedReasons.join(" "):"");
    return result;
  }catch(error){
    $("recoveryStatus").textContent=error.message;
    throw error;
  }
}

$("repairPlan").onclick=()=>runRecoveryRepair("plan");
$("repairApply").onclick=async()=>{
  if(!confirm("Apply only evidence-backed recovery repair?"))return;
  const result=await runRecoveryRepair("apply");
  $("recoveryStatus").textContent="Repair completed: "+(result.plan.healthyBefore?"healthy":"review required");
};
`;
