// testHelpers.ts

import { ClientData } from "apps/session-time-tracker/src/types";
import { keccak256 } from "ethereum-cryptography/keccak";
import { hexToBytes, toHex } from "ethereum-cryptography/utils";

export function getDefaultInitData(overrides: Partial<ClientData> = {}): ClientData {
  const testId = crypto.randomUUID();
    let teacherAddress = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    let learnerAddress  = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

  return {
    clientSideRoomId: `room-${testId}`,
    hashedTeacherAddress: toHex(keccak256(hexToBytes(teacherAddress))),
    hashedLearnerAddress: toHex(keccak256(hexToBytes(learnerAddress))),
    userAddress: learnerAddress,
    sessionDuration: 3600000,

    controllerAddress: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    teacherAddressCiphertext: "g5+ZdFu0Nmq7UyK7klmxj8bQmOhLd4RR9hZX1WQhwk0bZNxn3yInCTWA3VDZOeqpHzG+0ZfjUYu3leHH6T5wzuHN0fKbihHFeVAombJ5d60rqW8EKORfPDTBylHZogJvFsA6KAhSZpn17EhL4DugaWbl71lA1/2Y2Bb/VwI=",
    teacherAddressEncryptHash: "8c848c6713dfde36f2ec008eb5757472efb42c6531eb59917422b9425f2f3b02",
    learnerAddressCiphertext: "g5+ZdFu0Nmq7UyK7klmxj8bQmOhLd4RR9hZX1WQhwk0bZNxn3yInCTWA3VDZOeqpHzG+0ZfjUYu3leHH6T5wzuHN0fKbihHFeVAombJ5d60rqW8EKORfPDTBylHZogJvFsA6KAhSZpn17EhL4DugaWbl71lA1/2Y2Bb/VwI=",
    learnerAddressEncryptHash: "8c848c6713dfde36f2ec008eb5757472efb42c6531eb59917422b9425f2f3b02",

    ...overrides,
  };
}
