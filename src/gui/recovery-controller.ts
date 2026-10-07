export const GUI_RECOVERY_SCRIPT = String.raw`
async function runInterruptedRecovery(operation){
  try{
    const result=await api(capability("recoveryInterrupted"),{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({operation})
    });
    $("recoveryStatus").textContent="Interrupted recovery: "+result.status;
    return result;
  }catch(error){
    $("recoveryStatus").textContent=error.message;
    throw error;
  }
}
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
  await runRecoveryRepair("apply");
};
$("resumeInterrupted").onclick=async()=>{
  if(!confirm("Resume the interrupted GCTG operation?"))return;
  await runInterruptedRecovery("resume");
};
$("rollbackInterrupted").onclick=async()=>{
  if(!confirm("Rollback the interrupted GCTG operation and clear recovery state?"))return;
  await runInterruptedRecovery("rollback");
};
`;
