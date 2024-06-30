import { useLitAccountQuery } from "./LitAuth/useLitAccountQuery";
import { useLitAuthMethodQuery } from "./LitAuth/useLitAuthMethodQuery";
import { useLitSessionSigsQuery } from "./LitAuth/useLitSessionSigsQuery";

export const useInitQueries = () => {
  const authMethodQuery = useLitAuthMethodQuery();
  const litAccountQuery = useLitAccountQuery(authMethodQuery.data);
  const sessionSigsQuery = useLitSessionSigsQuery(authMethodQuery.data, litAccountQuery.data);

  return { authMethodQuery, litAccountQuery, sessionSigsQuery };
};
