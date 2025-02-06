//Lounge.tsx
import IconHeader from "@/components/IconHeader";
import { useLangNavDataQuery } from "@/hooks/Lounge/QueriesMutations/useLangNavDataQuery";
import { useState } from "react";
import LangNav from "./Interactions/LangNav";
import DropDownButton from "./Interactions/DropDownButton";
import { UserView } from "./UserView";

export const Lounge = () => {
  const [modeView, setModeView] = useState<"Learn" | "Teach">("Learn");
  const [selectedLang, setSelectedLang] = useState<string>("");
  const { languagesToShow, isLoading, error } = useLangNavDataQuery(modeView, setSelectedLang, selectedLang);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      <IconHeader />
      <LangNav
        setSelectedLang={setSelectedLang}
        selectedLang={selectedLang}
        languagesToShow={languagesToShow}
      />
      <DropDownButton modeView={modeView} setModeView={setModeView} />
      <UserView modeView={modeView} selectedLang={selectedLang} />
    </>
  );
};

