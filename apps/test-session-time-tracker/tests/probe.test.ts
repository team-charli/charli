import { SELF, env, runInDurableObject } from "cloudflare:test";
import { keccak256 } from "ethereum-cryptography/keccak";
import { hexToBytes, toHex } from "ethereum-cryptography/utils";
import { describe, it, expect, vi } from "vitest";
import { User } from "../src/types";

describe("Webhook Handler", () => {
  const roomId = "test-room";
  const mockApiKey = "test-api-key";
  const teacherAddress = "0x1234";
  const learnerAddress = "0x5678";
  const teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
  const learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));

  vi.mock('@huddle01/server-sdk/webhooks', () => ({
    WebhookReceiver: class {
      constructor() {}
      receive(body: string) {
        return typeof body === 'string' ? JSON.parse(body) : body;
      }
      createTypedWebhookData(event: string, payload: any) {
        return { event, data: payload[0].data  // Return just the data object from first payload item
        };
      }
    }
  }));

  it("should establish session and handle webhook events", async () => {
    const sessionManagerStub = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    try {
      // 1. Initialize session directly in DO
      await runInDurableObject(sessionManagerStub, async (instance, state) => {
        const user: User = {
          role: 'teacher',
          roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          peerId: null,
          joinedAt: null,
          leftAt: null,
          duration: null,
          sessionDuration: 3600000,
          joinedAtSig: null,
          leftAtSig: null,
        };
        await state.storage.put('user:teacher', user);
      });

      // 2. Send webhook data directly
      await runInDurableObject(sessionManagerStub, async (instance, state) => {
        const webhookData = {
          event: 'peer:joined',
          payload: [{
            data: {
              id: 'peer-1',
              sessionId: 'test-session',
              roomId,
              joinedAt: Date.now(),
              metadata: JSON.stringify({
                hashedAddress: teacherHash,
                role: 'teacher'
              })
            }
          }]
        };

        const request = new Request('http://session-manager/webhook', {
          method: 'POST',
          body: JSON.stringify(webhookData)
        });
        await instance.fetch(request);
      });

      // 3. Verify state
      await runInDurableObject(sessionManagerStub, async (instance, state) => {
        const teacherData = await state.storage.get('user:teacher') as User;
        console.log('Final teacher data:', teacherData);
        expect(teacherData.peerId).toBe('peer-1');
      });

    } finally {
      sessionManagerStub[Symbol.dispose]?.();
    }
  });

  it("should handle webhook through main worker", async () => {
    const sessionManagerStub = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    try {
      // 1. Initialize directly (since we know this works)
      await runInDurableObject(sessionManagerStub, async (instance, state) => {
        const user: User = {
          role: 'teacher',
          roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          peerId: null,
          joinedAt: null,
          leftAt: null,
          duration: null,
          sessionDuration: 3600000,
          joinedAtSig: null,
          leftAtSig: null,
        };
        await state.storage.put('user:teacher', user);
      });

      // 2. Send webhook through main worker
      const webhookResponse = await SELF.fetch("http://test.local/webhook", {
        method: "POST",
        headers: {
          "huddle01-signature": mockApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: 'peer:joined',
          payload: [{
            data: {
              id: 'peer-1',
              sessionId: 'test-session',
              roomId: roomId,
              joinedAt: Date.now(),
              metadata: JSON.stringify({
                hashedAddress: teacherHash,
                role: 'teacher'
              })
            }
          }]
        })
      });
      expect(webhookResponse.status).toBe(200);
      console.log('Webhook response:', await webhookResponse.text());

      // 3. Verify state directly
      await runInDurableObject(sessionManagerStub, async (instance, state) => {
        const teacherData = await state.storage.get('user:teacher') as User;
        console.log('Final teacher data after main worker webhook:', teacherData);
        expect(teacherData.peerId).toBe('peer-1');
      });

    } finally {
      sessionManagerStub[Symbol.dispose]?.();
    }
  });
});
