"use client";
import { useState } from "react";
import { EditPartyModal } from "../../parties/EditPartyModal";

export function PartyActions({ party }: { party: any }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <button 
        onClick={() => setEditing(true)} 
        className="mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700 underline"
      >
        Edit Party
      </button>
      {editing && <EditPartyModal party={party} onClose={() => setEditing(false)} />}
    </>
  );
}
