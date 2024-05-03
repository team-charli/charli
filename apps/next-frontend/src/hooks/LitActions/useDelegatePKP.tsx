import { litNodeClient } from "@/utils/litClients";

interface IfacePkpAuthNeededCallback {
  expiration: string;
  resources: any;
  resourceAbilityRequests: any;
}

    const pkpAuthNeededCallback = async ({
      expiration,
      resources,
      resourceAbilityRequests,
    }: IfacePkpAuthNeededCallback ) => {
      if (!expiration) {
        throw new Error('expiration is required');
      }
      if (!resources) {
        throw new Error('resources is required');
      }
      if (!resourceAbilityRequests) {
        throw new Error('resourceAbilityRequests is required');
      }
      const response = await litNodeClient.signSessionKey({
        statement: 'Some custom statement.',
        authMethods: [secondWalletControllerAuthMethod],  // authMethods for signing the sessionSigs
        pkpPublicKey: secondWalletPKPInfo.publicKey,  // public key of the wallet which is delegated
        expiration: expiration,
        resources: resources,
        chainId: 1,

        // optional (this would use normal siwe lib, without it, it would use lit-siwe)
        resourceAbilityRequests: resourceAbilityRequests,
      });

      console.log('response:', response);

      return response.authSig;
  };

  const pkpSessionSigs = await litNodeClient.getSessionSigs({
    pkpPublicKey: secondWalletPKPInfo.publicKey,   // public key of the wallet which is delegated
    expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
    chain: 'ethereum',
    resourceAbilityRequests: [
      {
        resource: new LitPKPResource('*'),
        ability: LitAbility.PKPSigning,
      },
    ],
    authNeededCallback: pkpAuthNeededCallback,
    capacityDelegationAuthSig, // here is where we add the delegation to our session request
  });

  console.log("generated session with delegation ", pkpSessionSigs);

  const res = await litNodeClient.executeJs({
    sessionSigs: pkpSessionSigs,
    code: `(async () => {
        const sigShare = await LitActions.signEcdsa({
          toSign: dataToSign,
          publicKey,
          sigName: "sig",
        });
      })();`,
    authMethods: [],
    jsParams: {     // parameters to js function above
      dataToSign: ethers.utils.arrayify(
        ethers.utils.keccak256([1, 2, 3, 4, 5])
      ),
      publicKey: secondWalletPKPInfo.publicKey,
    },
  });

  console.log("signature result ", res);

