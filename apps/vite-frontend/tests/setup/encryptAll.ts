// encryptAll.ts
import { LitNodeClient, encryptString } from "@lit-protocol/lit-node-client";
import { AccessControlConditions } from "@lit-protocol/types";

/**
 * Creates ciphertext for:
 *   1) permit action => gating on learner's address
 *   2) transferFrom => gating on teacher's address
 *   3) final => gating on worker's address
 */
export async function encryptAll(
  client: LitNodeClient,
  learnerAddress: string,
  teacherAddress: string,
  workerAddress: string
): Promise<EncryptedData> {
  // A) Build ACC for each address
  const learnerACC: AccessControlConditions = [
    {
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: "=",
        value: learnerAddress,
      },
    },
  ];

  const teacherACC: AccessControlConditions = [
    {
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: "=",
        value: teacherAddress,
      },
    },
  ];

  const finalACC: AccessControlConditions = [
    {
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: "=",
        value: workerAddress,
      },
    },
  ];

  // 1) Encrypt learnerAddress using learnerACC
  const {
    ciphertext: learnerCipher,
    dataToEncryptHash: learnerHash,
  } = await encryptString(
    {
      dataToEncrypt: learnerAddress,
      accessControlConditions: learnerACC,
    },
    client
  );

  // 2) Encrypt that same learnerAddress using teacherACC
  //    (for "transferFrom" scenario)
  const {
    ciphertext: learnerCipherForTransferFrom,
    dataToEncryptHash: learnerHashForTransferFrom,
  } = await encryptString(
    {
      dataToEncrypt: learnerAddress,
      accessControlConditions: teacherACC,
    },
    client
  );

  // 3) Optionally re-encrypt for final action gating on workerAddress
  //    For example, we store BOTH the learner + teacher address behind finalACC
  const {
    ciphertext: learnerCipherFinal,
    dataToEncryptHash: learnerHashFinal,
  } = await encryptString(
    {
      dataToEncrypt: learnerAddress,
      accessControlConditions: finalACC,
    },
    client
  );

  const {
    ciphertext: teacherCipherFinal,
    dataToEncryptHash: teacherHashFinal,
  } = await encryptString(
    {
      dataToEncrypt: teacherAddress,
      accessControlConditions: finalACC,
    },
    client
  );

  // Return them in your final structure
  return {
    permit: {
      learnerACC,
      learnerCipher,
      learnerHash,
    },
    transferFrom: {
      teacherACC,
      learnerCipherForTransferFrom,
      learnerHashForTransferFrom,
    },
    transferToTeacher: {
      finalACC,
      learnerCipherFinal,
      learnerHashFinal,
      teacherCipherFinal,
      teacherHashFinal,
    },
  };
}

// ----- Example type interface -----
export interface EncryptedData {
  permit: {
    learnerACC: AccessControlConditions;
    learnerCipher: string;
    learnerHash: string;
  };
  transferFrom: {
    teacherACC: AccessControlConditions;
    learnerCipherForTransferFrom: string;
    learnerHashForTransferFrom: string;
  };
  transferToTeacher: {
    finalACC: AccessControlConditions;
    learnerCipherFinal: string;
    learnerHashFinal: string;
    teacherCipherFinal: string;
    teacherHashFinal: string;
  };
}
